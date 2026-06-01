import { Injectable } from "@nestjs/common";
import {
  BookingStatus,
  PreReservationStatus,
  PropertyStatus,
  Role,
} from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

type DashboardActor = {
  userId: number;
  role: string;
};

const operationalStatuses: PreReservationStatus[] = [
  PreReservationStatus.ASSIGNED,
  PreReservationStatus.VALIDATING,
  PreReservationStatus.AVAILABLE,
  PreReservationStatus.UNAVAILABLE,
  PreReservationStatus.PAYMENT_PENDING,
];

const confirmedStatuses: PreReservationStatus[] = [
  PreReservationStatus.CONFIRMED,
  PreReservationStatus.PAID,
];

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async summary(actor: DashboardActor) {
    if (actor.role === "ADVISOR") {
      return this.advisorSummary(actor.userId);
    }

    return this.superAdminSummary();
  }

  private async superAdminSummary() {
    const [
      pendingRequests,
      requestsInManagement,
      confirmedRequests,
      cancelledRequests,
      confirmedBookings,
      contactsReceived,
      activeAdvisors,
      activeProperties,
      activeExperiences,
      activePackages,
      latestRequests,
      latestConfirmedBookings,
      latestContacts,
      recentActivity,
    ] = await Promise.all([
      this.prisma.preReservation.count({
        where: {
          status: PreReservationStatus.PENDING_ADVISOR,
          archivedAt: null,
        },
      }),
      this.prisma.preReservation.count({
        where: {
          status: { in: operationalStatuses },
          archivedAt: null,
        },
      }),
      this.prisma.preReservation.count({
        where: {
          status: { in: confirmedStatuses },
          archivedAt: null,
        },
      }),
      this.prisma.preReservation.count({
        where: {
          status: PreReservationStatus.CANCELLED,
          archivedAt: null,
        },
      }),
      this.prisma.booking.findMany({
        where: { status: BookingStatus.CONFIRMED },
        select: {
          id: true,
          reservationCode: true,
          customerName: true,
          productName: true,
          totalPrice: true,
          createdAt: true,
          advisorName: true,
          preReservationId: true,
        },
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.contactRequest.count(),
      this.prisma.user.count({
        where: {
          role: Role.ADVISOR,
          isActive: true,
          deletedAt: null,
        },
      }),
      this.prisma.property.count({
        where: {
          status: { in: [PropertyStatus.ACTIVE, PropertyStatus.FEATURED] },
        },
      }),
      this.prisma.experience.count({ where: { active: true } }),
      this.prisma.package.count({ where: { active: true } }),
      this.latestRequests(),
      this.latestBookings(),
      this.latestContacts(),
      this.recentActivity(),
    ]);

    const estimatedRevenue = confirmedBookings.reduce(
      (acc, booking) => acc + Number(booking.totalPrice || 0),
      0
    );

    return {
      role: "SUPERADMIN",
      metrics: {
        pendingRequests,
        requestsInManagement,
        confirmedRequests,
        cancelledRequests,
        estimatedRevenue,
        contactsReceived,
        activeAdvisors,
        productsActive: {
          properties: activeProperties,
          experiences: activeExperiences,
          packages: activePackages,
        },
      },
      recentActivity,
      latestRequests,
      latestConfirmedBookings,
      latestContacts,
    };
  }

  private async advisorSummary(advisorId: number) {
    const [
      myAssignedRequests,
      myValidatingRequests,
      myConfirmedRequests,
      myPendingManagement,
      myLatestRequests,
      myLatestConfirmedBookings,
    ] = await Promise.all([
      this.prisma.preReservation.count({
        where: {
          assignedToId: advisorId,
          status: { in: operationalStatuses },
          archivedAt: null,
        },
      }),
      this.prisma.preReservation.count({
        where: {
          assignedToId: advisorId,
          status: PreReservationStatus.VALIDATING,
          archivedAt: null,
        },
      }),
      this.prisma.preReservation.count({
        where: {
          assignedToId: advisorId,
          status: { in: confirmedStatuses },
          archivedAt: null,
        },
      }),
      this.prisma.preReservation.count({
        where: {
          assignedToId: advisorId,
          status: {
            in: [
              PreReservationStatus.ASSIGNED,
              PreReservationStatus.AVAILABLE,
              PreReservationStatus.UNAVAILABLE,
              PreReservationStatus.PAYMENT_PENDING,
            ],
          },
          archivedAt: null,
        },
      }),
      this.latestRequests({
        assignedToId: advisorId,
      }),
      this.latestBookings({ advisorId }),
    ]);

    const relatedIds = myLatestRequests.map((request) => request.id);
    const recentActivity =
      relatedIds.length > 0
        ? await this.prisma.auditLog.findMany({
            where: {
              OR: [
                { actorId: advisorId },
                {
                  entityType: "PreReservation",
                  entityId: { in: relatedIds },
                },
              ],
            },
            orderBy: { createdAt: "desc" },
            take: 8,
          })
        : await this.prisma.auditLog.findMany({
            where: { actorId: advisorId },
            orderBy: { createdAt: "desc" },
            take: 8,
          });

    return {
      role: "ADVISOR",
      metrics: {
        myAssignedRequests,
        myValidatingRequests,
        myConfirmedRequests,
        myPendingManagement,
        myRecentClients: myLatestRequests.length,
      },
      recentActivity,
      latestRequests: myLatestRequests,
      latestConfirmedBookings: myLatestConfirmedBookings,
      latestContacts: [],
    };
  }

  private latestRequests(where: Record<string, unknown> = {}) {
    return this.prisma.preReservation.findMany({
      where: {
        ...where,
        archivedAt: null,
      },
      include: {
        items: true,
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    });
  }

  private latestBookings(where: Record<string, unknown> = {}) {
    return this.prisma.booking.findMany({
      where: {
        ...where,
        status: BookingStatus.CONFIRMED,
      },
      select: {
        id: true,
        reservationCode: true,
        preReservationId: true,
        customerName: true,
        productName: true,
        totalPrice: true,
        createdAt: true,
        advisorName: true,
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    });
  }

  private latestContacts() {
    return this.prisma.contactRequest.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        whatsapp: true,
        interestType: true,
        subject: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    });
  }

  private recentActivity() {
    return this.prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
    });
  }
}

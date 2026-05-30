import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  BookingStatus,
  PaymentStatus,
  PreReservationStatus,
  Role,
} from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../common/audit.service";

@Injectable()
export class AdminOperationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService
  ) {}

  async getDashboardMetrics() {
    const [
      pending,
      assigned,
      paymentPending,
      confirmed,
      cancelled,
      paymentsPending,
      advisorsActive,
      paymentsApproved,
      bookingsConfirmed,
      availabilityBlocks,
      properties,
    ] = await Promise.all([
      this.prisma.preReservation.count({
        where: { status: PreReservationStatus.PENDING_ADVISOR },
      }),
      this.prisma.preReservation.count({
        where: { status: PreReservationStatus.ASSIGNED },
      }),
      this.prisma.preReservation.count({
        where: { status: PreReservationStatus.PAYMENT_PENDING },
      }),
      this.prisma.preReservation.count({
        where: { status: PreReservationStatus.CONFIRMED },
      }),
      this.prisma.preReservation.count({
        where: { status: PreReservationStatus.CANCELLED },
      }),
      this.prisma.payment.count({
        where: { status: PaymentStatus.PENDING },
      }),
      this.prisma.user.count({
        where: { role: Role.ADVISOR, isActive: true, deletedAt: null },
      }),
      this.prisma.payment.findMany({
        where: {
          OR: [
            { status: PaymentStatus.APPROVED },
            { status: PaymentStatus.PAID },
          ],
        },
        select: { amount: true },
      }),
      this.prisma.booking.count({
        where: { status: BookingStatus.CONFIRMED },
      }),
      this.prisma.availabilityBlock.count(),
      this.prisma.property.count(),
    ]);

    const totalRevenue = paymentsApproved.reduce(
      (acc, payment) => acc + Number(payment.amount || 0),
      0
    );

    return {
      pending,
      assigned,
      paymentPending,
      confirmed,
      cancelled,
      paymentsPending,
      advisorsActive,
      unattended: pending,
      totalRevenue,
      bookingsConfirmed,
      occupancy:
        properties > 0
          ? Math.round((availabilityBlocks / properties) * 100) / 100
          : 0,
    };
  }

  async listAdvisors() {
    const advisors = await this.prisma.user.findMany({
      where: { role: Role.ADVISOR, deletedAt: null },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        isActive: true,
        deactivatedAt: true,
        preReservationsAssigned: {
          select: {
            id: true,
            status: true,
            customerName: true,
            finalTotal: true,
            totalEstimate: true,
          },
        },
      },
    });

    return advisors.map((advisor) => {
      const assigned = advisor.preReservationsAssigned;

      const operationalStatuses: PreReservationStatus[] = [
        PreReservationStatus.ASSIGNED,
        PreReservationStatus.VALIDATING,
        PreReservationStatus.AVAILABLE,
        PreReservationStatus.UNAVAILABLE,
        PreReservationStatus.PAYMENT_PENDING,
      ];

      return {
        ...advisor,
        metrics: {
          totalAssigned: assigned.length,
          confirmed: assigned.filter(
            (item) => item.status === PreReservationStatus.CONFIRMED
          ).length,
          pending: assigned.filter((item) =>
            operationalStatuses.includes(item.status)
          ).length,
        },
      };
    });
  }

  async setAdvisorStatus(
    advisorId: number,
    isActive: boolean,
    superAdminId?: number
  ) {
    const advisor = await this.prisma.user.findUnique({
      where: { id: advisorId },
    });

    if (!advisor || advisor.role !== Role.ADVISOR || advisor.deletedAt) {
      throw new NotFoundException("Asesor no encontrado");
    }

    const updated = await this.prisma.user.update({
      where: { id: advisorId },
      data: {
        isActive,
        deactivatedAt: isActive ? null : new Date(),
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        deactivatedAt: true,
      },
    });

    await this.audit.record({
      actor: { userId: superAdminId, role: "SUPERADMIN" },
      action: isActive ? "ADVISOR_ACTIVATED" : "ADVISOR_DEACTIVATED",
      entityType: "User",
      entityId: advisorId,
    });

    return updated;
  }

  async reassignPreReservation(
    id: string,
    advisorId: number,
    superAdminId: number
  ) {
    const [preReservation, advisor] = await Promise.all([
      this.prisma.preReservation.findUnique({ where: { id } }),
      this.prisma.user.findUnique({ where: { id: advisorId } }),
    ]);

    if (!preReservation) {
      throw new NotFoundException("Solicitud no encontrada");
    }

    if (!advisor || advisor.role !== Role.ADVISOR || !advisor.isActive) {
      throw new BadRequestException("El nuevo asesor debe estar activo");
    }

    const history = Array.isArray(preReservation.reassignmentHistory)
      ? preReservation.reassignmentHistory
      : [];

    const updated = await this.prisma.preReservation.update({
      where: { id },
      data: {
        assignedToId: advisorId,
        status:
          preReservation.status === PreReservationStatus.PENDING_ADVISOR
            ? PreReservationStatus.ASSIGNED
            : preReservation.status,
        reassignmentHistory: [
          ...history,
          {
            fromAdvisorId: preReservation.assignedToId,
            toAdvisorId: advisorId,
            changedById: superAdminId,
            changedAt: new Date().toISOString(),
          },
        ],
      },
      include: {
        items: true,
        assignedTo: true,
        payments: { orderBy: { createdAt: "desc" } },
      },
    });

    await this.audit.record({
      actor: { userId: superAdminId, role: "SUPERADMIN" },
      action: "PRE_RESERVATION_REASSIGNED",
      entityType: "PreReservation",
      entityId: id,
      metadata: {
        fromAdvisorId: preReservation.assignedToId,
        toAdvisorId: advisorId,
      },
    });

    return updated;
  }

  async cancelReservation(id: string, reason: string, superAdminId: number) {
    const cancellationReason =
      reason?.trim() || "Registro cancelado por Super Admin";

    const pre = await this.prisma.preReservation.findUnique({
      where: { id },
      include: { booking: true },
    });

    if (!pre) {
      throw new NotFoundException("Solicitud no encontrada");
    }

    const cancelledAt = new Date();

    const updated = await this.prisma.$transaction(async (tx) => {
      if (pre.booking) {
        await tx.availabilityBlock.deleteMany({
          where: {
            notes: `booking-${pre.booking.id}`,
          },
        });

        await tx.booking.update({
          where: { id: pre.booking.id },
          data: {
            status: BookingStatus.CANCELLED,
            cancellationReason,
            cancelledAt,
            cancelledById: superAdminId,
          },
        });
      }

      return tx.preReservation.update({
        where: { id },
        data: {
          status: PreReservationStatus.CANCELLED,
          cancellationReason,
          cancelledAt,
          cancelledById: superAdminId,
        },
        include: {
          items: true,
          assignedTo: true,
          payments: { orderBy: { createdAt: "desc" } },
        },
      });
    });

    await this.audit.record({
      actor: { userId: superAdminId, role: "SUPERADMIN" },
      action: "PRE_RESERVATION_CANCELLED",
      entityType: "PreReservation",
      entityId: id,
      metadata: {
        reason: cancellationReason,
        bookingId: pre.booking?.id,
      },
    });

    return updated;
  }

  async archivePreReservation(id: string, reason: string, superAdminId: number) {
    const pre = await this.prisma.preReservation.findUnique({
      where: { id },
      include: { booking: true },
    });

    if (!pre) {
      throw new NotFoundException("Solicitud no encontrada");
    }

    if (pre.status !== PreReservationStatus.CANCELLED) {
      throw new BadRequestException(
        "Primero cancela la solicitud antes de archivarla"
      );
    }

    const archiveReason =
      reason?.trim() || "Registro archivado por Super Admin";

    const updated = await this.prisma.preReservation.update({
      where: { id },
      data: {
        archiveReason,
        archivedAt: new Date(),
        archivedById: superAdminId,
      },
      include: {
        items: true,
        assignedTo: true,
        payments: { orderBy: { createdAt: "desc" } },
        booking: true,
      },
    });

    await this.audit.record({
      actor: { userId: superAdminId, role: "SUPERADMIN" },
      action: "PRE_RESERVATION_ARCHIVED",
      entityType: "PreReservation",
      entityId: id,
      metadata: {
        reason: archiveReason,
        bookingId: pre.booking?.id,
      },
    });

    return updated;
  }

  async listPayments() {
    return this.prisma.payment.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        preReservation: {
          include: {
            assignedTo: true,
            items: true,
          },
        },
        booking: true,
      },
    });
  }

  async listReservations() {
    return this.prisma.preReservation.findMany({
      where: { archivedAt: null },
      orderBy: { createdAt: "desc" },
      include: {
        items: true,
        assignedTo: true,
        payments: { orderBy: { createdAt: "desc" } },
        booking: true,
      },
    });
  }

  async getCompanySettings() {
    return this.prisma.companySettings.upsert({
      where: { id: 1 },
      update: {},
      create: {
        id: 1,
        companyName: "Cartagena Tailored Travel",
      },
    });
  }

  async updateCompanySettings(data: any) {
    return this.prisma.companySettings.upsert({
      where: { id: 1 },
      update: {
        logoUrl: data.logoUrl ?? null,
        companyName: data.companyName || "Cartagena Tailored Travel",
        legalId: data.legalId ?? null,
        address: data.address ?? null,
        phones: data.phones ?? null,
        email: data.email ?? null,
        policies: data.policies ?? null,
        invoiceFooter: data.invoiceFooter ?? null,
        legalInfo: data.legalInfo ?? null,
      },
      create: {
        id: 1,
        logoUrl: data.logoUrl ?? null,
        companyName: data.companyName || "Cartagena Tailored Travel",
        legalId: data.legalId ?? null,
        address: data.address ?? null,
        phones: data.phones ?? null,
        email: data.email ?? null,
        policies: data.policies ?? null,
        invoiceFooter: data.invoiceFooter ?? null,
        legalInfo: data.legalInfo ?? null,
      },
    });
  }
}

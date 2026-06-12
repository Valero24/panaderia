import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { randomBytes } from "crypto";
import { BookingStatus, BookingType, Prisma, ReviewStatus } from "@prisma/client";

import { AuditService } from "../common/audit.service";
import { PrismaService } from "../prisma/prisma.service";
import { ListReviewsDto } from "./dto/list-reviews.dto";
import { SubmitReviewDto } from "./dto/submit-review.dto";
import { UpdateReviewStatusDto } from "./dto/update-review-status.dto";

type ReviewActor = {
  userId?: number;
  role?: string;
  name?: string;
  email?: string;
};

@Injectable()
export class ReviewsService {
  private readonly tokenTtlDays = 30;

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService
  ) {}

  async generateBookingReviewToken(bookingId: number, actor?: ReviewActor) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        reviews: {
          select: {
            id: true,
            status: true,
          },
        },
      },
    });

    if (!booking) {
      throw new NotFoundException("Reserva no encontrada");
    }

    this.assertBookingCanReceiveReview(booking);

    if (booking.reviewSubmittedAt || booking.reviews.length > 0) {
      await this.audit.record({
        actor,
        action: "REVIEW_TOKEN_DUPLICATE_ATTEMPT",
        entityType: "Booking",
        entityId: booking.id,
        message: "Intento de generar token de reseña para una reserva ya reseñada",
        metadata: {
          reservationCode: booking.reservationCode,
          reviewCount: booking.reviews.length,
        },
      });

      throw new BadRequestException("Esta reserva ya tiene una reseña registrada");
    }

    const now = new Date();

    if (
      booking.reviewToken &&
      booking.reviewTokenExpiresAt &&
      booking.reviewTokenExpiresAt > now
    ) {
      await this.audit.record({
        actor,
        action: "REVIEW_TOKEN_REUSED",
        entityType: "Booking",
        entityId: booking.id,
        message: "Link activo de resena devuelto sin regenerar token",
        metadata: {
          reservationCode: booking.reservationCode,
          expiresAt: booking.reviewTokenExpiresAt,
        },
      });

      return {
        token: booking.reviewToken,
        reviewLink: this.buildReviewUrl(booking.reviewToken),
        reviewUrl: this.buildReviewUrl(booking.reviewToken),
        expiresAt: booking.reviewTokenExpiresAt,
        booking: this.toPublicSummary(booking),
      };
    }

    const expiresAt = this.addDays(now, this.tokenTtlDays);
    const token = await this.createUniqueToken();

    const updated = await this.prisma.booking.update({
      where: { id: booking.id },
      data: {
        reviewToken: token,
        reviewTokenExpiresAt: expiresAt,
        reviewRequestSentAt: now,
      },
      select: this.publicBookingSelect(),
    });

    await this.audit.record({
      actor,
      action: "REVIEW_LINK_GENERATED",
      entityType: "Booking",
      entityId: booking.id,
      message: "Token privado de reseña generado",
      metadata: {
        reservationCode: booking.reservationCode,
        expiresAt,
      },
    });

    return {
      token,
      reviewLink: this.buildReviewUrl(token),
      reviewUrl: this.buildReviewUrl(token),
      expiresAt,
      booking: this.toPublicSummary(updated),
    };
  }

  async findAll(query: ListReviewsDto = {}) {
    const where: Prisma.ReviewWhereInput = {};

    if (query.status) where.status = query.status;
    if (query.targetType) where.targetType = query.targetType;
    if (query.rating) where.rating = query.rating;
    const featuredFilter = query.isFeatured ?? query.featured;
    if (featuredFilter === "true") where.featured = true;
    if (featuredFilter === "false") where.featured = false;
    if (query.from || query.to) {
      where.submittedAt = {};

      if (query.from) {
        where.submittedAt.gte = new Date(query.from);
      }

      if (query.to) {
        const endDate = new Date(query.to);
        endDate.setHours(23, 59, 59, 999);
        where.submittedAt.lte = endDate;
      }
    }

    const search = query.search?.trim();
    if (search) {
      where.OR = [
        { customerName: { contains: search, mode: "insensitive" } },
        { customerEmail: { contains: search, mode: "insensitive" } },
        { publicName: { contains: search, mode: "insensitive" } },
        { title: { contains: search, mode: "insensitive" } },
        { comment: { contains: search, mode: "insensitive" } },
        { booking: { reservationCode: { contains: search, mode: "insensitive" } } },
        { booking: { productName: { contains: search, mode: "insensitive" } } },
      ];
    }

    const page = query.page || 1;
    const limit = query.limit || 50;
    const skip = (page - 1) * limit;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.review.findMany({
        where,
        include: {
          booking: {
            select: {
              id: true,
              reservationCode: true,
              type: true,
              productName: true,
              checkIn: true,
              checkOut: true,
              customerName: true,
              customerEmail: true,
              customerPhone: true,
            },
          },
        },
        orderBy: {
          submittedAt: "desc",
        },
        skip,
        take: limit,
      }),
      this.prisma.review.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getStats(actor?: ReviewActor) {
    const [
      total,
      pending,
      approved,
      rejected,
      hidden,
      featured,
      approvedFeatured,
      approvedAverage,
      approvedDistribution,
      approvedByType,
      recentApproved,
    ] = await this.prisma.$transaction([
      this.prisma.review.count(),
      this.prisma.review.count({ where: { status: ReviewStatus.PENDING } }),
      this.prisma.review.count({ where: { status: ReviewStatus.APPROVED } }),
      this.prisma.review.count({ where: { status: ReviewStatus.REJECTED } }),
      this.prisma.review.count({ where: { status: ReviewStatus.HIDDEN } }),
      this.prisma.review.count({ where: { featured: true } }),
      this.prisma.review.count({
        where: { status: ReviewStatus.APPROVED, featured: true },
      }),
      this.prisma.review.aggregate({
        where: { status: ReviewStatus.APPROVED },
        _avg: { rating: true },
      }),
      this.prisma.review.groupBy({
        by: ["rating"],
        where: { status: ReviewStatus.APPROVED },
        orderBy: { rating: "asc" },
        _count: { rating: true },
      }),
      this.prisma.review.groupBy({
        by: ["targetType"],
        where: { status: ReviewStatus.APPROVED },
        orderBy: { targetType: "asc" },
        _count: { targetType: true },
        _avg: { rating: true },
      }),
      this.prisma.review.count({
        where: {
          status: ReviewStatus.APPROVED,
          submittedAt: {
            gte: this.addDays(new Date(), -30),
          },
        },
      }),
    ]);
    const averageApprovedRating = this.roundRating(approvedAverage._avg.rating || 0);
    const aggregateRatingReadiness = this.buildAggregateRatingReadiness({
      reviewCount: approved,
      averageRating: averageApprovedRating,
    });

    return {
      total,
      pending,
      approved,
      rejected,
      hidden,
      featured,
      approvedFeatured,
      recentApproved,
      averageApprovedRating,
      approvedDistribution: this.normalizeDistribution(approvedDistribution),
      approvedByType: this.normalizeByType(approvedByType),
      aggregateRatingReadiness,
    };
  }

  async getAdminRankings(actor?: ReviewActor) {
    const take = 5;
    const minimumApprovedReviews = this.minimumApprovedReviewsForSchema();
    const select = {
      id: true,
      title: true,
      slug: true,
      averageRating: true,
      reviewCount: true,
      ratingDistribution: true,
    };
    const reviewedWhere = {
      reviewCount: {
        gt: 0,
      },
    };
    const schemaEligibleWhere = {
      reviewCount: {
        gte: minimumApprovedReviews,
      },
      averageRating: {
        gt: 0,
      },
    };
    const [
      topRatedProperties,
      topRatedExperiences,
      topRatedPackages,
      mostReviewedProperties,
      mostReviewedExperiences,
      mostReviewedPackages,
      schemaEligibleProperties,
      schemaEligibleExperiences,
      schemaEligiblePackages,
    ] =
      await this.prisma.$transaction([
        this.prisma.property.findMany({
          where: reviewedWhere,
          select,
          orderBy: [{ averageRating: "desc" }, { reviewCount: "desc" }, { id: "asc" }],
          take,
        }),
        this.prisma.experience.findMany({
          where: reviewedWhere,
          select,
          orderBy: [{ averageRating: "desc" }, { reviewCount: "desc" }, { id: "asc" }],
          take,
        }),
        this.prisma.package.findMany({
          where: reviewedWhere,
          select,
          orderBy: [{ averageRating: "desc" }, { reviewCount: "desc" }, { id: "asc" }],
          take,
        }),
        this.prisma.property.findMany({
          where: reviewedWhere,
          select,
          orderBy: [{ reviewCount: "desc" }, { averageRating: "desc" }, { id: "asc" }],
          take,
        }),
        this.prisma.experience.findMany({
          where: reviewedWhere,
          select,
          orderBy: [{ reviewCount: "desc" }, { averageRating: "desc" }, { id: "asc" }],
          take,
        }),
        this.prisma.package.findMany({
          where: reviewedWhere,
          select,
          orderBy: [{ reviewCount: "desc" }, { averageRating: "desc" }, { id: "asc" }],
          take,
        }),
        this.prisma.property.findMany({
          where: schemaEligibleWhere,
          select,
          orderBy: [{ reviewCount: "desc" }, { averageRating: "desc" }, { id: "asc" }],
          take,
        }),
        this.prisma.experience.findMany({
          where: schemaEligibleWhere,
          select,
          orderBy: [{ reviewCount: "desc" }, { averageRating: "desc" }, { id: "asc" }],
          take,
        }),
        this.prisma.package.findMany({
          where: schemaEligibleWhere,
          select,
          orderBy: [{ reviewCount: "desc" }, { averageRating: "desc" }, { id: "asc" }],
          take,
        }),
      ]);

    await this.audit.record({
      actor,
      action: "REVIEW_RANKINGS_VIEWED",
      entityType: "Review",
      entityId: "rankings",
      message: "Rankings internos de opiniones consultados",
      metadata: {
        take,
      },
    });

    return {
      topRatedProperties: topRatedProperties.map((item) =>
        this.toRankingItem(BookingType.PROPERTY, item)
      ),
      topRatedExperiences: topRatedExperiences.map((item) =>
        this.toRankingItem(BookingType.EXPERIENCE, item)
      ),
      topRatedPackages: topRatedPackages.map((item) =>
        this.toRankingItem(BookingType.PACKAGE, item)
      ),
      mostReviewedProperties: mostReviewedProperties.map((item) =>
        this.toRankingItem(BookingType.PROPERTY, item)
      ),
      mostReviewedExperiences: mostReviewedExperiences.map((item) =>
        this.toRankingItem(BookingType.EXPERIENCE, item)
      ),
      mostReviewedPackages: mostReviewedPackages.map((item) =>
        this.toRankingItem(BookingType.PACKAGE, item)
      ),
      schemaEligibleProperties: schemaEligibleProperties.map((item) =>
        this.toRankingItem(BookingType.PROPERTY, item)
      ),
      schemaEligibleExperiences: schemaEligibleExperiences.map((item) =>
        this.toRankingItem(BookingType.EXPERIENCE, item)
      ),
      schemaEligiblePackages: schemaEligiblePackages.map((item) =>
        this.toRankingItem(BookingType.PACKAGE, item)
      ),
    };
  }

  async findOne(id: number, actor?: ReviewActor) {
    const review = await this.prisma.review.findUnique({
      where: { id },
      include: {
        booking: {
          select: {
            id: true,
            reservationCode: true,
            type: true,
            productName: true,
            checkIn: true,
            checkOut: true,
            guests: true,
            customerName: true,
            customerEmail: true,
            customerPhone: true,
            advisorId: true,
            advisorName: true,
          },
        },
      },
    });

    if (!review) {
      throw new NotFoundException("Resena no encontrada");
    }

    const auditLogs = await this.prisma.auditLog.findMany({
      where: {
        entityType: "Review",
        entityId: String(id),
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 25,
    });

    await this.audit.record({
      actor,
      action: "REVIEW_DETAIL_VIEWED",
      entityType: "Review",
      entityId: id,
      message: "Detalle de resena consultado",
      metadata: {
        bookingId: review.bookingId,
        reservationCode: review.booking?.reservationCode,
      },
    });

    return {
      ...review,
      auditLogs,
    };
  }

  async getPublicSummary(targetType: string, targetId: number) {
    const type = this.parseTargetType(targetType);
    const cache = await this.getTargetReviewCache(type, targetId);
    const reviewCount = cache?.reviewCount ?? 0;
    const averageRating = this.roundRating(Number(cache?.averageRating ?? 0));
    const aggregateRatingReadiness = this.buildAggregateRatingReadiness({
      reviewCount,
      averageRating,
    });

    return {
      reviewCount,
      averageRating,
      distribution: this.normalizeCachedDistribution(cache?.ratingDistribution),
      aggregateRatingReadiness,
    };
  }

  async getPublicReviews(targetType: string, targetId: number) {
    const type = this.parseTargetType(targetType);

    return this.prisma.review.findMany({
      where: {
        targetType: type,
        targetId,
        status: ReviewStatus.APPROVED,
      },
      select: {
        id: true,
        customerName: true,
        customerCountry: true,
        rating: true,
        title: true,
        comment: true,
        submittedAt: true,
        createdAt: true,
        featured: true,
      },
      orderBy: [
        {
          featured: "desc",
        },
        {
          submittedAt: "desc",
        },
      ],
    }).then((reviews) =>
      reviews.map((review) => ({
        id: review.id,
        customerName: review.customerName,
        customerCountry: review.customerCountry,
        rating: review.rating,
        title: review.title,
        comment: review.comment,
        isFeatured: review.featured,
        submittedAt: review.submittedAt,
        createdAt: review.createdAt,
      }))
    );
  }

  async updateStatus(id: number, dto: UpdateReviewStatusDto, actor?: ReviewActor) {
    const current = await this.prisma.review.findUnique({
      where: { id },
      include: {
        booking: {
          select: {
            reservationCode: true,
          },
        },
      },
    });

    if (!current) {
      throw new NotFoundException("Resena no encontrada");
    }

    const now = new Date();
    const updated = await this.prisma.review.update({
      where: { id },
      data: {
        status: dto.status,
        approvedAt: dto.status === ReviewStatus.APPROVED ? now : null,
        approvedById: dto.status === ReviewStatus.APPROVED ? (actor?.userId ?? null) : null,
        approvedByName:
          dto.status === ReviewStatus.APPROVED
            ? actor?.name || actor?.email || actor?.role || null
            : null,
        rejectedAt: dto.status === ReviewStatus.REJECTED ? now : null,
        rejectionReason: dto.status === ReviewStatus.REJECTED ? dto.reason || null : null,
        featured: dto.status === ReviewStatus.APPROVED ? current.featured : false,
        moderatedAt: now,
        moderatedById: actor?.userId ?? null,
        metadata: {
          ...(this.safeObject(current.metadata) || {}),
          moderationReason: dto.reason || null,
        },
      },
      include: {
        booking: {
          select: {
            id: true,
            reservationCode: true,
            productName: true,
          },
        },
      },
    });

    await this.refreshReviewCacheIfApprovedAggregateChanged(current, updated, actor);

    const action =
      dto.status === ReviewStatus.APPROVED
        ? "REVIEW_APPROVED"
        : dto.status === ReviewStatus.REJECTED
          ? "REVIEW_REJECTED"
          : dto.status === ReviewStatus.HIDDEN
            ? "REVIEW_HIDDEN"
            : "REVIEW_SET_PENDING";

    const message =
      dto.status === ReviewStatus.APPROVED
        ? "Resena aprobada"
        : dto.status === ReviewStatus.REJECTED
          ? "Resena rechazada"
          : dto.status === ReviewStatus.HIDDEN
            ? "Resena ocultada"
            : "Resena marcada como pendiente";

    await this.audit.record({
      actor,
      action,
      entityType: "Review",
      entityId: id,
      message,
      previousValue: {
        status: current.status,
        featured: current.featured,
      },
      newValue: {
        status: updated.status,
        featured: updated.featured,
      },
      metadata: {
        bookingId: updated.bookingId,
        reservationCode: current.booking?.reservationCode,
        reason: dto.reason,
      },
    });

    return updated;
  }

  async updateFeatured(id: number, featured: boolean, actor?: ReviewActor) {
    const current = await this.prisma.review.findUnique({
      where: { id },
      include: {
        booking: {
          select: {
            reservationCode: true,
          },
        },
      },
    });

    if (!current) {
      throw new NotFoundException("Resena no encontrada");
    }

    if (featured && current.status !== ReviewStatus.APPROVED) {
      throw new BadRequestException("Solo se pueden destacar resenas aprobadas");
    }

    const updated = await this.prisma.review.update({
      where: { id },
      data: { featured },
      include: {
        booking: {
          select: {
            id: true,
            reservationCode: true,
            productName: true,
          },
        },
      },
    });

    await this.audit.record({
      actor,
      action: featured ? "REVIEW_FEATURED" : "REVIEW_UNFEATURED",
      entityType: "Review",
      entityId: id,
      message: featured ? "Resena destacada" : "Resena retirada de destacados",
      previousValue: {
        featured: current.featured,
      },
      newValue: {
        featured: updated.featured,
      },
      metadata: {
        bookingId: updated.bookingId,
        reservationCode: current.booking?.reservationCode,
      },
    });

    return updated;
  }

  async remove(id: number, actor?: ReviewActor) {
    const current = await this.prisma.review.findUnique({
      where: { id },
      include: {
        booking: {
          select: {
            id: true,
            reservationCode: true,
          },
        },
      },
    });

    if (!current) {
      throw new NotFoundException("Resena no encontrada");
    }

    await this.prisma.review.delete({
      where: { id },
    });

    await this.refreshReviewCacheIfApprovedAggregateChanged(current, undefined, actor);

    await this.audit.record({
      actor,
      action: "REVIEW_DELETED",
      entityType: "Review",
      entityId: id,
      message: "Resena eliminada desde admin",
      previousValue: {
        status: current.status,
        featured: current.featured,
        rating: current.rating,
      },
      metadata: {
        bookingId: current.bookingId,
        reservationCode: current.booking?.reservationCode,
      },
    });

    return {
      success: true,
      id,
    };
  }

  async recalculateAllTargetRatings(actor?: ReviewActor) {
    const [properties, experiences, packages] = await this.prisma.$transaction([
      this.prisma.property.findMany({ select: { id: true } }),
      this.prisma.experience.findMany({ select: { id: true } }),
      this.prisma.package.findMany({ select: { id: true } }),
    ]);

    const summary: {
      propertiesUpdated: number;
      experiencesUpdated: number;
      packagesUpdated: number;
      errors: Array<{ targetType: BookingType; targetId: number; message: string }>;
    } = {
      propertiesUpdated: 0,
      experiencesUpdated: 0,
      packagesUpdated: 0,
      errors: [],
    };

    for (const property of properties) {
      try {
        const result = await this.recalculateTargetRating(BookingType.PROPERTY, property.id, actor);
        summary.propertiesUpdated += result.updatedRows;
      } catch (error) {
        summary.errors.push(this.toRecalculationError(BookingType.PROPERTY, property.id, error));
      }
    }

    for (const experience of experiences) {
      try {
        const result = await this.recalculateTargetRating(BookingType.EXPERIENCE, experience.id, actor);
        summary.experiencesUpdated += result.updatedRows;
      } catch (error) {
        summary.errors.push(this.toRecalculationError(BookingType.EXPERIENCE, experience.id, error));
      }
    }

    for (const packageItem of packages) {
      try {
        const result = await this.recalculateTargetRating(BookingType.PACKAGE, packageItem.id, actor);
        summary.packagesUpdated += result.updatedRows;
      } catch (error) {
        summary.errors.push(this.toRecalculationError(BookingType.PACKAGE, packageItem.id, error));
      }
    }

    await this.audit.record({
      actor,
      action: "REVIEW_RATING_RECALCULATED",
      entityType: "Review",
      entityId: "ratings-cache",
      message: "Cache de calificaciones recalculado manualmente",
      metadata: summary,
    });

    return summary;
  }

  async recalculateTargetRating(
    targetType: string | BookingType,
    targetId: number,
    actor?: ReviewActor
  ) {
    const type =
      typeof targetType === "string" ? this.parseTargetType(targetType) : targetType;
    const where: Prisma.ReviewWhereInput = {
      targetType: type,
      targetId,
      status: ReviewStatus.APPROVED,
    };

    const [count, average, distributionRows] = await this.prisma.$transaction([
      this.prisma.review.count({ where }),
      this.prisma.review.aggregate({
        where,
        _avg: { rating: true },
      }),
      this.prisma.review.groupBy({
        by: ["rating"],
        where,
        orderBy: { rating: "asc" },
        _count: { rating: true },
      }),
    ]);

    const data = {
      averageRating: new Prisma.Decimal((average._avg.rating || 0).toFixed(2)),
      reviewCount: count,
      ratingDistribution: this.normalizeDistribution(distributionRows),
    };

    let updatedRows = 0;

    if (type === BookingType.PROPERTY) {
      const result = await this.prisma.property.updateMany({ where: { id: targetId }, data });
      updatedRows = result.count;
    } else if (type === BookingType.EXPERIENCE) {
      const result = await this.prisma.experience.updateMany({ where: { id: targetId }, data });
      updatedRows = result.count;
    } else {
      const result = await this.prisma.package.updateMany({ where: { id: targetId }, data });
      updatedRows = result.count;
    }

    if (updatedRows > 0) {
      const schemaReadiness = this.buildAggregateRatingReadiness({
        reviewCount: data.reviewCount,
        averageRating: Number(data.averageRating),
      });

      await this.audit.record({
        actor,
        action: "REVIEW_RATING_CACHE_UPDATED",
        entityType: String(type),
        entityId: targetId,
        message: "Cache de calificacion de producto actualizado",
        newValue: {
          averageRating: Number(data.averageRating),
          reviewCount: data.reviewCount,
          ratingDistribution: data.ratingDistribution,
        },
        metadata: {
          targetType: type,
          targetId,
        },
      });

      await this.audit.record({
        actor,
        action: schemaReadiness.eligible
          ? "REVIEW_SCHEMA_ELIGIBLE"
          : "REVIEW_SCHEMA_NOT_ELIGIBLE",
        entityType: String(type),
        entityId: targetId,
        message: schemaReadiness.eligible
          ? "Producto elegible para AggregateRating con resenas aprobadas reales"
          : "Producto no elegible para AggregateRating",
        metadata: {
          targetType: type,
          targetId,
          ...schemaReadiness,
        },
      });
    }

    return {
      targetType: type,
      targetId,
      averageRating: Number(data.averageRating),
      reviewCount: data.reviewCount,
      ratingDistribution: data.ratingDistribution,
      updatedRows,
    };
  }

  async validateToken(token: string) {
    const booking = await this.findBookingByToken(token);

    this.assertTokenIsUsable(booking);

    return {
      valid: true,
      expiresAt: booking.reviewTokenExpiresAt,
      booking: this.toPublicSummary(booking),
    };
  }

  async validateTokenStatus(token: string, metadata?: Record<string, unknown>) {
    let booking: Awaited<ReturnType<typeof this.findBookingByToken>>;

    try {
      booking = await this.findBookingByToken(token);
    } catch (error) {
      await this.recordUnknownTokenValidation(metadata);
      throw error;
    }

    const reviewAvailability = this.getReviewAvailability(booking);

    await this.audit.record({
      action: "REVIEW_TOKEN_VALIDATED",
      entityType: "Booking",
      entityId: booking.id,
      message: "Token privado de resena validado",
      metadata: {
        ...metadata,
        reservationCode: booking.reservationCode,
        canReview: reviewAvailability.canReview,
        reason: reviewAvailability.reason,
      },
    });

    if (reviewAvailability.reason === "TOKEN_EXPIRED") {
      await this.recordReviewTokenExpired(booking, metadata);
    }

    return {
      tokenStatus: reviewAvailability.canReview ? "VALID" : "INVALID",
      bookingCode: booking.reservationCode,
      customerName: booking.customerName,
      productType: booking.type,
      productTitle: booking.productName,
      startDate: booking.checkIn,
      endDate: booking.checkOut,
      guests: booking.guests,
      canReview: reviewAvailability.canReview,
      reason: reviewAvailability.reason,
    };
  }

  async submitReview(token: string, dto: SubmitReviewDto, metadata?: Record<string, unknown>) {
    let booking: Awaited<ReturnType<typeof this.findBookingByToken>>;

    try {
      booking = await this.findBookingByToken(token);
    } catch (error) {
      await this.recordUnknownTokenSubmissionRejected(metadata);
      throw error;
    }

    try {
      this.assertTokenIsUsable(booking);
    } catch (error) {
      if (!booking.reviewTokenExpiresAt || booking.reviewTokenExpiresAt <= new Date()) {
        await this.recordReviewTokenExpired(booking, metadata);
      }
      await this.recordReviewSubmissionRejected(booking, error, metadata);
      throw error;
    }

    const now = new Date();
    const title = this.sanitizeText(dto.title || "");
    const comment = this.sanitizeText(dto.comment);
    const publicName = this.sanitizeText(dto.publicName || booking.customerName || "");
    const categoryRatings = this.sanitizeCategoryRatings(dto.categoryRatings);

    if (comment.length < 10) {
      await this.recordReviewSubmissionRejected(booking, "COMMENT_TOO_SHORT", metadata);
      throw new BadRequestException("La resena debe tener al menos 10 caracteres");
    }

    const review = await this.prisma.$transaction(async (tx) => {
      const existingReview = await tx.review.findFirst({
        where: { bookingId: booking.id },
        select: { id: true },
      });

      if (existingReview) {
        await this.recordReviewSubmissionRejected(
          booking,
          "REVIEW_ALREADY_SUBMITTED",
          metadata
        );
        throw new BadRequestException("Esta reserva ya tiene una resena registrada");
      }

      const created = await tx.review.create({
        data: {
          bookingId: booking.id,
          targetType: booking.type,
          targetId: booking.referenceId,
          customerName: booking.customerName,
          customerEmail: booking.customerEmail,
          customerPhone: booking.customerPhone,
          customerCountry: booking.preReservation?.customerCountry ?? null,
          publicName: publicName || null,
          rating: dto.rating,
          title: title || null,
          comment,
          categoryRatings: this.toJson(categoryRatings),
          status: ReviewStatus.PENDING,
          submittedAt: now,
          metadata: this.toJson(metadata),
        },
      });

      await tx.booking.update({
        where: { id: booking.id },
        data: {
          reviewSubmittedAt: now,
          reviewToken: null,
          reviewTokenExpiresAt: null,
        },
      });

      return created;
    });

    await this.audit.record({
      action: "REVIEW_SUBMITTED",
      entityType: "Review",
      entityId: review.id,
      message: "Reseña post-servicio enviada por cliente",
      metadata: {
        bookingId: booking.id,
        reservationCode: booking.reservationCode,
        targetType: booking.type,
        targetId: booking.referenceId,
        rating: dto.rating,
        status: ReviewStatus.PENDING,
      },
    });

    return {
      success: true,
      status: review.status,
      message: "Reseña recibida. Será revisada antes de publicarse.",
    };
  }

  private async findBookingByToken(token: string) {
    if (!token || token.length < 24) {
      throw new NotFoundException("Link de reseña inválido");
    }

    const booking = await this.prisma.booking.findUnique({
      where: { reviewToken: token },
      select: this.publicBookingSelect(),
    });

    if (!booking) {
      throw new NotFoundException("Link de reseña inválido o ya utilizado");
    }

    return booking;
  }

  private assertBookingCanReceiveReview(booking: {
    status: BookingStatus;
    checkIn: Date;
    checkOut?: Date | null;
  }) {
    if (booking.status !== BookingStatus.CONFIRMED) {
      throw new BadRequestException("Solo reservas confirmadas pueden recibir reseñas");
    }

    if (!this.hasBookingFinished(booking)) {
      throw new BadRequestException(
        "La reseña solo puede solicitarse cuando la reserva ya finalizó"
      );
    }
  }

  private assertTokenIsUsable(booking: {
    status: BookingStatus;
    checkIn: Date;
    checkOut?: Date | null;
    reviewSubmittedAt?: Date | null;
    reviewTokenExpiresAt?: Date | null;
    reviews?: { id: number }[];
  }) {
    this.assertBookingCanReceiveReview(booking);

    if (booking.reviewSubmittedAt || (booking.reviews?.length ?? 0) > 0) {
      throw new BadRequestException("Esta reserva ya tiene una reseña registrada");
    }

    if (!booking.reviewTokenExpiresAt || booking.reviewTokenExpiresAt <= new Date()) {
      throw new BadRequestException("El link de reseña expiró");
    }
  }

  private getReviewAvailability(booking: {
    status: BookingStatus;
    checkIn: Date;
    checkOut?: Date | null;
    reviewSubmittedAt?: Date | null;
    reviewTokenExpiresAt?: Date | null;
    reviews?: { id: number }[];
  }):
    | { canReview: true; reason: "CAN_REVIEW" }
    | {
        canReview: false;
        reason:
          | "TOKEN_NOT_FOUND"
          | "TOKEN_EXPIRED"
          | "BOOKING_NOT_CONFIRMED"
          | "BOOKING_NOT_FINISHED"
          | "REVIEW_ALREADY_SUBMITTED";
      } {
    if (!booking.reviewTokenExpiresAt || booking.reviewTokenExpiresAt <= new Date()) {
      return {
        canReview: false,
        reason: "TOKEN_EXPIRED",
      };
    }

    if (booking.status !== BookingStatus.CONFIRMED) {
      return {
        canReview: false,
        reason: "BOOKING_NOT_CONFIRMED",
      };
    }

    if (!this.hasBookingFinished(booking)) {
      return {
        canReview: false,
        reason: "BOOKING_NOT_FINISHED",
      };
    }

    if (booking.reviewSubmittedAt || (booking.reviews?.length ?? 0) > 0) {
      return {
        canReview: false,
        reason: "REVIEW_ALREADY_SUBMITTED",
      };
    }

    return {
      canReview: true,
      reason: "CAN_REVIEW",
    };
  }

  private hasBookingFinished(booking: { checkIn: Date; checkOut?: Date | null }) {
    const serviceEnd = booking.checkOut || booking.checkIn;

    return serviceEnd.getTime() < Date.now();
  }

  private parseTargetType(value: string) {
    const normalized = value?.toUpperCase();

    if (
      normalized === BookingType.PROPERTY ||
      normalized === BookingType.EXPERIENCE ||
      normalized === BookingType.PACKAGE
    ) {
      return normalized as BookingType;
    }

    throw new BadRequestException("Tipo de producto invalido");
  }

  private async getTargetReviewCache(targetType: BookingType, targetId: number) {
    const select = {
      averageRating: true,
      reviewCount: true,
      ratingDistribution: true,
    };

    if (targetType === BookingType.PROPERTY) {
      return this.prisma.property.findUnique({ where: { id: targetId }, select });
    }

    if (targetType === BookingType.EXPERIENCE) {
      return this.prisma.experience.findUnique({ where: { id: targetId }, select });
    }

    return this.prisma.package.findUnique({ where: { id: targetId }, select });
  }

  private async refreshReviewCacheIfApprovedAggregateChanged(
    previous: {
      status: ReviewStatus;
      targetType: BookingType;
      targetId: number;
    },
    current?: {
      status: ReviewStatus;
      targetType: BookingType;
      targetId: number;
    },
    actor?: ReviewActor
  ) {
    const targets = new Map<string, { targetType: BookingType; targetId: number }>();

    if (previous.status === ReviewStatus.APPROVED) {
      targets.set(`${previous.targetType}:${previous.targetId}`, {
        targetType: previous.targetType,
        targetId: previous.targetId,
      });
    }

    if (current?.status === ReviewStatus.APPROVED) {
      targets.set(`${current.targetType}:${current.targetId}`, {
        targetType: current.targetType,
        targetId: current.targetId,
      });
    }

    await Promise.all(
      Array.from(targets.values()).map((target) =>
        this.recalculateTargetRating(target.targetType, target.targetId, actor)
      )
    );
  }

  private normalizeCachedDistribution(value: Prisma.JsonValue | null | undefined) {
    const source =
      value && typeof value === "object" && !Array.isArray(value)
        ? (value as Record<string, unknown>)
        : {};

    return [5, 4, 3, 2, 1].reduce(
      (acc, rating) => ({
        ...acc,
        [rating]: Number(source[String(rating)] || 0),
      }),
      {} as Record<1 | 2 | 3 | 4 | 5, number>
    );
  }

  private toRankingItem(
    targetType: BookingType,
    item: {
      id: number;
      title: string;
      slug?: string | null;
      averageRating: Prisma.Decimal;
      reviewCount: number;
      ratingDistribution: Prisma.JsonValue | null;
    }
  ) {
    const averageRating = this.roundRating(Number(item.averageRating || 0));
    const schemaReadiness = this.buildAggregateRatingReadiness({
      reviewCount: item.reviewCount,
      averageRating,
    });

    return {
      targetType,
      id: item.id,
      title: item.title,
      slug: item.slug || null,
      averageRating,
      reviewCount: item.reviewCount,
      ratingDistribution: this.normalizeCachedDistribution(item.ratingDistribution),
      aggregateRatingReady: schemaReadiness.eligible,
    };
  }

  private buildAggregateRatingReadiness(target: {
    reviewCount?: number | null;
    averageRating?: number | Prisma.Decimal | null;
  }) {
    const minimumApprovedReviews = this.minimumApprovedReviewsForSchema();
    const reviewCount = Number(target.reviewCount || 0);
    const averageRating = Number(target.averageRating || 0);
    const eligible = this.canUseAggregateRating(target);

    return {
      enabled: eligible,
      minimumApprovedReviews,
      approvedReviews: reviewCount,
      averageRating: this.roundRating(averageRating),
      eligible,
      reason: eligible
        ? "Elegible para rating SEO: cuenta con reseñas aprobadas suficientes y promedio visible."
        : `Requiere al menos ${minimumApprovedReviews} resenas aprobadas reales y promedio mayor que 0.`,
    };
  }

  private canUseAggregateRating(target: {
    reviewCount?: number | null;
    averageRating?: number | Prisma.Decimal | null;
  }) {
    const reviewCount = Number(target.reviewCount || 0);
    const averageRating = Number(target.averageRating || 0);

    return (
      reviewCount >= this.minimumApprovedReviewsForSchema() &&
      Number.isFinite(averageRating) &&
      averageRating > 0
    );
  }

  private toRecalculationError(targetType: BookingType, targetId: number, error: unknown) {
    return {
      targetType,
      targetId,
      message: error instanceof Error ? error.message : "Error desconocido",
    };
  }

  private normalizeDistribution(
    rows: Array<{ rating: number; _count?: { rating?: number } | true }>
  ) {
    return [5, 4, 3, 2, 1].reduce(
      (acc, rating) => ({
        ...acc,
        [rating]: this.countValue(rows.find((row) => row.rating === rating)?._count, "rating"),
      }),
      {} as Record<1 | 2 | 3 | 4 | 5, number>
    );
  }

  private normalizeByType(
    rows: Array<{
      targetType: BookingType;
      _count?: { targetType?: number } | true;
      _avg?: { rating?: number | null };
    }>
  ) {
    return [BookingType.PROPERTY, BookingType.EXPERIENCE, BookingType.PACKAGE].reduce(
      (acc, type) => {
        const row = rows.find((item) => item.targetType === type);
        return {
          ...acc,
          [type]: {
            count: this.countValue(row?._count, "targetType"),
            averageRating: this.roundRating(row?._avg?.rating || 0),
          },
        };
      },
      {} as Record<BookingType, { count: number; averageRating: number }>
    );
  }

  private countValue(
    value: { rating?: number; targetType?: number } | true | undefined,
    key: "rating" | "targetType"
  ) {
    if (!value || value === true) return 0;
    return Number(value[key] || 0);
  }

  private roundRating(value: number) {
    return Math.round(value * 10) / 10;
  }

  private minimumApprovedReviewsForSchema() {
    const value = Number(process.env.REVIEW_SCHEMA_MIN_APPROVED || 5);
    return Number.isFinite(value) && value > 0 ? value : 5;
  }

  private async createUniqueToken() {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const token = randomBytes(32).toString("base64url");
      const existing = await this.prisma.booking.findUnique({
        where: { reviewToken: token },
        select: { id: true },
      });

      if (!existing) return token;
    }

    throw new BadRequestException("No fue posible generar un token de reseña");
  }

  private addDays(date: Date, days: number) {
    const copy = new Date(date);
    copy.setDate(copy.getDate() + days);
    return copy;
  }

  private buildReviewUrl(token: string) {
    const frontendUrl =
      process.env.FRONTEND_URL ||
      process.env.CORS_ORIGIN?.split(",")[0]?.trim() ||
      "http://localhost:3001";

    return `${frontendUrl.replace(/\/$/, "")}/review/${token}`;
  }

  private publicBookingSelect() {
    return {
      id: true,
      reservationCode: true,
      type: true,
      referenceId: true,
      productName: true,
      checkIn: true,
      checkOut: true,
      guests: true,
      customerName: true,
      customerEmail: true,
      customerPhone: true,
      status: true,
      reviewTokenExpiresAt: true,
      reviewRequestSentAt: true,
      reviewSubmittedAt: true,
      preReservation: {
        select: {
          customerCountry: true,
        },
      },
      reviews: {
        select: {
          id: true,
        },
      },
    } satisfies Prisma.BookingSelect;
  }

  private toPublicSummary(booking: {
    id: number;
    reservationCode?: string | null;
    type: unknown;
    productName?: string | null;
    checkIn: Date;
    checkOut?: Date | null;
    guests: number;
    customerName?: string | null;
    customerEmail?: string | null;
  }) {
    return {
      id: booking.id,
      reservationCode: booking.reservationCode,
      type: booking.type,
      productName: booking.productName,
      checkIn: booking.checkIn,
      checkOut: booking.checkOut,
      guests: booking.guests,
      customerName: booking.customerName,
      customerEmail: booking.customerEmail,
    };
  }

  private async recordReviewSubmissionRejected(
    booking: {
      id: number;
      reservationCode?: string | null;
      type?: unknown;
      referenceId?: number;
    },
    reason: unknown,
    metadata?: Record<string, unknown>
  ) {
    await this.audit.record({
      action: "REVIEW_SUBMISSION_REJECTED",
      entityType: "Booking",
      entityId: booking.id,
      message: "Envio de resena rechazado",
      metadata: {
        ...metadata,
        reservationCode: booking.reservationCode,
        targetType: booking.type,
        targetId: booking.referenceId,
        reason:
          reason instanceof Error
            ? reason.message
            : typeof reason === "string"
              ? reason
              : "UNKNOWN",
      },
    });
  }

  private async recordUnknownTokenValidation(metadata?: Record<string, unknown>) {
    await this.audit.record({
      action: "REVIEW_TOKEN_VALIDATED",
      entityType: "ReviewToken",
      entityId: "unknown",
      message: "Intento de validar enlace de resena invalido",
      metadata: {
        ...metadata,
        canReview: false,
        reason: "NOT_FOUND",
      },
    });
  }

  private async recordUnknownTokenSubmissionRejected(
    metadata?: Record<string, unknown>
  ) {
    await this.audit.record({
      action: "REVIEW_SUBMISSION_REJECTED",
      entityType: "ReviewToken",
      entityId: "unknown",
      message: "Envio de resena rechazado por enlace invalido",
      metadata: {
        ...metadata,
        reason: "NOT_FOUND",
      },
    });
  }

  private async recordReviewTokenExpired(
    booking: {
      id: number;
      reservationCode?: string | null;
      reviewTokenExpiresAt?: Date | null;
    },
    metadata?: Record<string, unknown>
  ) {
    await this.audit.record({
      action: "REVIEW_TOKEN_EXPIRED",
      entityType: "Booking",
      entityId: booking.id,
      message: "Token privado de resena expirado",
      metadata: {
        ...metadata,
        reservationCode: booking.reservationCode,
        expiresAt: booking.reviewTokenExpiresAt,
      },
    });
  }

  private sanitizeText(value?: string | null) {
    if (!value) return "";

    return value
      .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]*>/g, "")
      .replace(/[<>]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  private sanitizeCategoryRatings(value: unknown) {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return undefined;
    }

    const safe: Record<string, unknown> = {};

    for (const [key, rawValue] of Object.entries(value)) {
      const safeKey = this.sanitizeText(key).slice(0, 60);
      if (!safeKey) continue;

      if (typeof rawValue === "number" && Number.isFinite(rawValue)) {
        safe[safeKey] = Math.min(5, Math.max(1, rawValue));
        continue;
      }

      if (typeof rawValue === "string") {
        const numericValue = Number(rawValue);
        safe[safeKey] = Number.isFinite(numericValue)
          ? Math.min(5, Math.max(1, numericValue))
          : this.sanitizeText(rawValue).slice(0, 120);
        continue;
      }

      if (typeof rawValue === "boolean") {
        safe[safeKey] = rawValue;
      }
    }

    return Object.keys(safe).length > 0 ? safe : undefined;
  }

  private toJson(value: unknown) {
    if (!value || typeof value !== "object") return undefined;
    return value as Prisma.InputJsonValue;
  }

  private safeObject(value: unknown) {
    return value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  }
}

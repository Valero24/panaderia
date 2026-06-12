import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  BookingType,
  CrmTemplateChannel,
  LeadActivityType,
  LeadPriority,
  LeadSource,
  LeadStatus,
  LeadTaskStatus,
  Prisma,
} from "@prisma/client";

import { AuditService } from "../common/audit.service";
import { PrismaService } from "../prisma/prisma.service";
import { CreateLeadActivityDto } from "./dto/create-lead-activity.dto";
import { CreateLeadTaskDto } from "./dto/create-lead-task.dto";
import { CreateLeadDto } from "./dto/create-lead.dto";
import { UpdateLeadDto } from "./dto/update-lead.dto";
import ExcelJS from "exceljs";

type Actor = {
  userId?: number;
  role?: string;
  email?: string;
  name?: string;
};

type LeadQuery = {
  status?: LeadStatus;
  source?: LeadSource;
  priority?: LeadPriority;
  assignedAdvisorId?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  productType?: BookingType;
  page?: string;
  limit?: string;
};

type TaskQuery = {
  assignedToId?: string;
  status?: LeadTaskStatus;
  dueToday?: string;
  overdue?: string;
};

type TemplateInput = {
  name?: string;
  channel?: CrmTemplateChannel;
  content?: string;
  isActive?: boolean;
};

@Injectable()
export class CrmService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService
  ) {}

  async getDashboard(actor: Actor) {
    const where = this.accessibleLeadWhere(actor);
    const now = new Date();

    const [
      total,
      newLeads,
      reserved,
      lost,
      overdueFollowUps,
      byStatus,
      byAdvisor,
      bySource,
    ] = await Promise.all([
      this.prisma.lead.count({ where }),
      this.prisma.lead.count({ where: { ...where, status: "NEW" } }),
      this.prisma.lead.count({ where: { ...where, status: "RESERVED" } }),
      this.prisma.lead.count({ where: { ...where, status: "LOST" } }),
      this.prisma.lead.count({
        where: {
          ...where,
          status: { notIn: ["RESERVED", "LOST", "ARCHIVED"] },
          nextFollowUpAt: { lt: now },
        },
      }),
      this.prisma.lead.groupBy({
        by: ["status"],
        where,
        _count: { _all: true },
      }),
      this.prisma.lead.groupBy({
        by: ["assignedAdvisorId"],
        where,
        _count: { _all: true },
      }),
      this.prisma.lead.groupBy({
        by: ["source"],
        where,
        _count: { _all: true },
        orderBy: { _count: { source: "desc" } },
      }),
    ]);

    return {
      total,
      newLeads,
      reserved,
      lost,
      overdueFollowUps,
      conversionRate: total ? Math.round((reserved / total) * 100) : 0,
      byStatus,
      byAdvisor,
      bySource,
      topSource: bySource[0]?.source || null,
    };
  }

  async getProductivity(actor: Actor) {
    await this.audit.record({
      actor,
      action: "CRM_PRODUCTIVITY_VIEWED",
      entityType: "CRM",
      entityId: actor.userId || "global",
      message: "Dashboard de productividad CRM consultado",
    });

    const where = this.accessibleLeadWhere(actor);
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(now);
    todayEnd.setHours(23, 59, 59, 999);
    const sevenDays = new Date(now);
    sevenDays.setDate(sevenDays.getDate() + 7);
    const recent = new Date(now);
    recent.setDate(recent.getDate() - 7);

    const taskWhere = this.accessibleTaskWhere(actor);
    const [
      tasksToday,
      overdueTasks,
      upcomingFollowUps,
      newWithoutContact,
      urgentLeads,
      staleLeads,
      upcomingTrips,
      negotiation,
      recentLost,
      workload,
    ] = await Promise.all([
      this.prisma.leadTask.count({
        where: { ...taskWhere, status: "PENDING", dueAt: { gte: todayStart, lte: todayEnd } },
      }),
      this.prisma.leadTask.count({
        where: { ...taskWhere, status: "PENDING", dueAt: { lt: now } },
      }),
      this.prisma.lead.count({
        where: { ...where, nextFollowUpAt: { gte: now, lte: sevenDays } },
      }),
      this.prisma.lead.count({
        where: {
          ...where,
          status: "NEW",
          lastContactedAt: null,
          createdAt: { lt: this.hoursAgo(24) },
        },
      }),
      this.prisma.lead.count({
        where: { ...where, OR: [{ priority: "URGENT" }, { priorityScore: { gte: 81 } }] },
      }),
      this.findNoFollowUpLeads(actor, 10),
      this.prisma.lead.findMany({
        where: {
          ...where,
          travelStartDate: { gte: now, lte: sevenDays },
          status: { notIn: ["LOST", "ARCHIVED"] },
        },
        include: this.leadInclude(),
        take: 10,
        orderBy: { travelStartDate: "asc" },
      }),
      this.prisma.lead.count({ where: { ...where, status: "NEGOTIATION" } }),
      this.prisma.lead.count({ where: { ...where, status: "LOST", updatedAt: { gte: recent } } }),
      this.getAdvisorWorkload(actor),
    ]);

    return {
      tasksToday,
      overdueTasks,
      upcomingFollowUps,
      newWithoutContact,
      urgentLeads,
      staleLeadsCount: staleLeads.length,
      staleLeads,
      upcomingTrips,
      negotiation,
      recentLost,
      workload,
      alerts: [
        overdueTasks ? `Tienes ${overdueTasks} tareas vencidas.` : null,
        newWithoutContact ? `${newWithoutContact} leads nuevos necesitan primer contacto.` : null,
        urgentLeads ? `${urgentLeads} oportunidades urgentes requieren atención.` : null,
      ].filter(Boolean),
    };
  }

  async getMyPanel(actor: Actor) {
    const scopedActor = actor.role === "ADVISOR" ? actor : { ...actor, role: "ADVISOR" };
    const where = this.accessibleLeadWhere(scopedActor);
    const taskWhere = this.accessibleTaskWhere(scopedActor);
    const [total, contacted, qualified, proposals, reserved, lost, pending, completed, overdue] =
      await Promise.all([
        this.prisma.lead.count({ where }),
        this.prisma.lead.count({ where: { ...where, status: "CONTACTED" } }),
        this.prisma.lead.count({ where: { ...where, status: "QUALIFIED" } }),
        this.prisma.lead.count({ where: { ...where, status: "PROPOSAL_SENT" } }),
        this.prisma.lead.count({ where: { ...where, status: "RESERVED" } }),
        this.prisma.lead.count({ where: { ...where, status: "LOST" } }),
        this.prisma.leadTask.count({ where: { ...taskWhere, status: "PENDING" } }),
        this.prisma.leadTask.count({ where: { ...taskWhere, status: "COMPLETED" } }),
        this.prisma.leadTask.count({
          where: { ...taskWhere, status: "PENDING", dueAt: { lt: new Date() } },
        }),
      ]);

    return {
      leadsAssigned: total,
      leadsNew: await this.prisma.lead.count({ where: { ...where, status: "NEW" } }),
      leadsContacted: contacted,
      leadsQualified: qualified,
      proposalsSent: proposals,
      leadsConverted: reserved,
      leadsLost: lost,
      tasksPending: pending,
      tasksCompleted: completed,
      tasksOverdue: overdue,
      conversionRate: total ? Math.round((reserved / total) * 100) : 0,
      averageFirstContactHours: await this.averageFirstContactHours(where),
    };
  }

  async getActivityFeed(query: any, actor: Actor) {
    const leadWhere = this.accessibleLeadWhere(actor);
    const where: Prisma.LeadActivityWhereInput = { lead: leadWhere };
    if (query.type) where.type = query.type;
    if (query.leadId) where.leadId = Number(query.leadId);
    if (query.from || query.to) {
      where.createdAt = {};
      if (query.from) where.createdAt.gte = new Date(query.from);
      if (query.to) where.createdAt.lte = new Date(query.to);
    }

    return this.prisma.leadActivity.findMany({
      where,
      include: {
        lead: { select: { id: true, fullName: true, status: true, priority: true } },
        createdBy: { select: { id: true, name: true, email: true, role: true } },
      },
      orderBy: { createdAt: "desc" },
      take: Math.min(this.positiveInt(query.limit, 100), 200),
    });
  }

  async getAgenda(query: any, actor: Actor) {
    const now = new Date();
    const days = query.view === "day" ? 1 : 7;
    const end = new Date(now);
    end.setDate(end.getDate() + days);
    const taskWhere = this.accessibleTaskWhere(actor);
    const leadWhere = this.accessibleLeadWhere(actor);

    const [tasks, followUps, trips] = await Promise.all([
      this.prisma.leadTask.findMany({
        where: { ...taskWhere, dueAt: { gte: now, lte: end } },
        include: { lead: { select: { id: true, fullName: true, phone: true } } },
        orderBy: { dueAt: "asc" },
      }),
      this.prisma.lead.findMany({
        where: { ...leadWhere, nextFollowUpAt: { gte: now, lte: end } },
        include: this.leadInclude(),
        orderBy: { nextFollowUpAt: "asc" },
      }),
      this.prisma.lead.findMany({
        where: { ...leadWhere, travelStartDate: { gte: now, lte: end } },
        include: this.leadInclude(),
        orderBy: { travelStartDate: "asc" },
      }),
    ]);

    return { tasks, followUps, trips };
  }

  async findNoFollowUpLeads(actor: Actor, take = 50) {
    const leads = await this.prisma.lead.findMany({
      where: {
        ...this.accessibleLeadWhere(actor),
        status: { in: ["NEW", "CONTACTED", "QUALIFIED", "PROPOSAL_SENT", "NEGOTIATION"] },
      },
      include: {
        ...this.leadInclude(),
        activities: { orderBy: { createdAt: "desc" }, take: 1 },
        tasks: { where: { status: "PENDING" }, orderBy: { dueAt: "asc" }, take: 1 },
      },
      take: 200,
      orderBy: { updatedAt: "asc" },
    });

    return leads
      .filter((lead) => this.needsFollowUp(lead))
      .map((lead) => this.withProductivity(lead))
      .slice(0, take);
  }

  async getAdvisorWorkload(actor: Actor) {
    if (actor.role === "ADVISOR") {
      return [];
    }

    const advisors = await this.prisma.user.findMany({
      where: { role: "ADVISOR", isActive: true },
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
    });

    return Promise.all(
      advisors.map(async (advisor) => {
        const [activeLeads, pendingTasks, overdueTasks, urgentLeads] = await Promise.all([
          this.prisma.lead.count({
            where: {
              assignedAdvisorId: advisor.id,
              status: { notIn: ["RESERVED", "LOST", "ARCHIVED"] },
            },
          }),
          this.prisma.leadTask.count({ where: { assignedToId: advisor.id, status: "PENDING" } }),
          this.prisma.leadTask.count({
            where: { assignedToId: advisor.id, status: "PENDING", dueAt: { lt: new Date() } },
          }),
          this.prisma.lead.count({
            where: { assignedAdvisorId: advisor.id, OR: [{ priority: "URGENT" }, { priorityScore: { gte: 81 } }] },
          }),
        ]);

        return { advisor, activeLeads, pendingTasks, overdueTasks, urgentLeads };
      })
    );
  }

  async findLeads(query: LeadQuery, actor: Actor) {
    const page = this.positiveInt(query.page, 1);
    const limit = Math.min(this.positiveInt(query.limit, 20), 100);
    const where: Prisma.LeadWhereInput = {
      ...this.accessibleLeadWhere(actor),
      ...this.queryLeadWhere(query),
    };

    const [items, total] = await Promise.all([
      this.prisma.lead.findMany({
        where,
        include: this.leadInclude(),
        orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.lead.count({ where }),
    ]);

    return {
      items: items.map((lead) => this.withProductivity(lead)),
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  async createLead(dto: CreateLeadDto, actor: Actor) {
    this.assertHasContact(dto);

    const lead = await this.prisma.lead.create({
      data: this.mapLeadData(dto, {
        source: dto.source || "MANUAL",
        status: dto.status || "NEW",
      }),
      include: this.leadInclude(),
    });

    await this.createSystemActivity(lead.id, "NOTE", "Lead creado", dto.message, actor);
    await this.audit.record({
      actor,
      action: "CRM_LEAD_CREATED",
      entityType: "Lead",
      entityId: lead.id,
      message: "Lead creado en CRM",
      metadata: this.auditLeadMeta(lead),
    });

    return this.withProductivity(lead);
  }

  async createOrUpdateFromPublicContact(data: {
    fullName?: string;
    email?: string;
    phone?: string;
    source?: LeadSource;
    interestedProductType?: BookingType;
    interestedProductId?: number;
    message?: string;
  }) {
    const existing = await this.findOpenLeadByContact(data.email, data.phone);

    if (existing) {
      const updated = await this.prisma.lead.update({
        where: { id: existing.id },
        data: {
          message: this.mergeText(existing.message, data.message),
          interestedProductType: data.interestedProductType || existing.interestedProductType,
          interestedProductId: data.interestedProductId || existing.interestedProductId,
        },
      });
      await this.createSystemActivity(
        existing.id,
        "NOTE",
        "Nueva consulta pública agregada",
        data.message
      );
      return updated;
    }

    return this.prisma.lead.create({
      data: {
        fullName: this.clean(data.fullName),
        email: this.normalizeEmail(data.email),
        phone: this.clean(data.phone),
        source: data.source || "WEBSITE",
        status: "NEW",
        priority: "MEDIUM",
        interestedProductType: data.interestedProductType,
        interestedProductId: data.interestedProductId,
        message: this.cleanLong(data.message),
      },
    });
  }

  async findLead(id: number, actor: Actor) {
    const lead = await this.prisma.lead.findFirst({
      where: { id, ...this.accessibleLeadWhere(actor) },
      include: {
        ...this.leadInclude(),
        activities: {
          include: { createdBy: { select: { id: true, name: true, email: true, role: true } } },
          orderBy: { createdAt: "desc" },
        },
        tasks: {
          include: { assignedTo: { select: { id: true, name: true, email: true, role: true } } },
          orderBy: [{ status: "asc" }, { dueAt: "asc" }],
        },
        convertedBooking: {
          select: { id: true, reservationCode: true, status: true, createdAt: true },
        },
      },
    });

    if (!lead) throw new NotFoundException("Lead no encontrado");
    return this.withProductivity(lead);
  }

  async updateLead(id: number, dto: UpdateLeadDto, actor: Actor) {
    await this.ensureLeadAccess(id, actor);
    const updated = await this.prisma.lead.update({
      where: { id },
      data: this.mapLeadData(dto),
      include: this.leadInclude(),
    });

    await this.audit.record({
      actor,
      action: "CRM_LEAD_UPDATED",
      entityType: "Lead",
      entityId: id,
      message: "Lead actualizado",
      metadata: this.auditLeadMeta(updated),
    });

    return this.withProductivity(updated);
  }

  async archiveLead(id: number, actor: Actor) {
    if (actor.role === "ADVISOR") {
      throw new ForbiddenException("Un asesor no puede archivar leads");
    }

    await this.ensureLeadAccess(id, actor);
    return this.changeStatus(id, "ARCHIVED", actor);
  }

  async changeStatus(id: number, status: LeadStatus, actor: Actor, lostReason?: string) {
    await this.ensureLeadAccess(id, actor);
    const previous = await this.prisma.lead.findUnique({ where: { id } });
    if (!previous) throw new NotFoundException("Lead no encontrado");
    if (status === "LOST" && !lostReason?.trim()) {
      throw new BadRequestException("Debes indicar el motivo de pérdida");
    }

    const updated = await this.prisma.lead.update({
      where: { id },
      data: {
        status,
        lostReason: status === "LOST" ? this.clean(lostReason) : previous.lostReason,
      },
      include: this.leadInclude(),
    });

    await this.createSystemActivity(
      id,
      status === "LOST" ? "LOST_REASON" : "STATUS_CHANGE",
      status === "LOST" ? "Lead marcado como perdido" : "Estado actualizado",
      status === "LOST"
        ? lostReason
        : `Estado anterior: ${previous.status}. Nuevo estado: ${status}.`,
      actor
    );

    await this.audit.record({
      actor,
      action: status === "LOST" ? "CRM_LEAD_MARKED_LOST" : "CRM_LEAD_STATUS_CHANGED",
      entityType: "Lead",
      entityId: id,
      message: "Estado de lead actualizado",
      metadata: {
        previousStatus: previous.status,
        status,
        lostReason: status === "LOST" ? this.clean(lostReason) : undefined,
      },
    });

    return updated;
  }

  async assignLead(id: number, assignedAdvisorId: number | null, actor: Actor) {
    if (actor.role === "ADVISOR") {
      throw new ForbiddenException("Un asesor no puede reasignar leads");
    }

    await this.ensureLeadAccess(id, actor);
    const updated = await this.prisma.lead.update({
      where: { id },
      data: { assignedAdvisorId },
      include: this.leadInclude(),
    });

    await this.createSystemActivity(
      id,
      "STATUS_CHANGE",
      "Asesor asignado",
      assignedAdvisorId ? `Asesor asignado #${assignedAdvisorId}` : "Lead sin asesor",
      actor
    );
    await this.audit.record({
      actor,
      action: "CRM_LEAD_ASSIGNED",
      entityType: "Lead",
      entityId: id,
      message: "Lead asignado a asesor",
      metadata: { assignedAdvisorId },
    });

    return updated;
  }

  async convertToBooking(id: number, bookingId: number, actor: Actor) {
    await this.ensureLeadAccess(id, actor);
    const booking = await this.prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking) throw new NotFoundException("Reserva no encontrada");

    const updated = await this.prisma.lead.update({
      where: { id },
      data: { convertedBookingId: bookingId, status: "RESERVED" },
      include: this.leadInclude(),
    });

    await this.createSystemActivity(
      id,
      "BOOKING_CREATED",
      "Lead convertido a reserva",
      `Reserva asociada #${bookingId}`,
      actor
    );
    await this.audit.record({
      actor,
      action: "CRM_LEAD_CONVERTED_TO_BOOKING",
      entityType: "Lead",
      entityId: id,
      metadata: { bookingId },
    });

    return updated;
  }

  async findActivities(leadId: number, actor: Actor) {
    await this.ensureLeadAccess(leadId, actor);
    return this.prisma.leadActivity.findMany({
      where: { leadId },
      include: { createdBy: { select: { id: true, name: true, email: true, role: true } } },
      orderBy: { createdAt: "desc" },
    });
  }

  async createActivity(leadId: number, dto: CreateLeadActivityDto, actor: Actor) {
    await this.ensureLeadAccess(leadId, actor);
    const activity = await this.prisma.leadActivity.create({
      data: {
        leadId,
        type: dto.type,
        title: this.clean(dto.title) || "Actividad",
        description: this.cleanLong(dto.description),
        scheduledAt: this.dateOrUndefined(dto.scheduledAt),
        completedAt: this.dateOrUndefined(dto.completedAt),
        createdById: actor.userId,
      },
    });

    if (["CALL", "WHATSAPP", "EMAIL"].includes(dto.type)) {
      await this.prisma.lead.update({
        where: { id: leadId },
        data: { lastContactedAt: new Date() },
      });
    }

    await this.audit.record({
      actor,
      action: "CRM_ACTIVITY_CREATED",
      entityType: "LeadActivity",
      entityId: activity.id,
      metadata: { leadId, type: activity.type },
    });

    return activity;
  }

  async updateActivity(id: number, dto: Partial<CreateLeadActivityDto>, actor: Actor) {
    const activity = await this.prisma.leadActivity.findUnique({ where: { id } });
    if (!activity) throw new NotFoundException("Actividad no encontrada");
    await this.ensureLeadAccess(activity.leadId, actor);

    return this.prisma.leadActivity.update({
      where: { id },
      data: {
        type: dto.type,
        title: dto.title ? this.clean(dto.title) : undefined,
        description: dto.description !== undefined ? this.cleanLong(dto.description) : undefined,
        scheduledAt: this.dateOrUndefined(dto.scheduledAt),
        completedAt: this.dateOrUndefined(dto.completedAt),
      },
    });
  }

  async deleteActivity(id: number, actor: Actor) {
    const activity = await this.prisma.leadActivity.findUnique({ where: { id } });
    if (!activity) throw new NotFoundException("Actividad no encontrada");
    await this.ensureLeadAccess(activity.leadId, actor);
    return this.prisma.leadActivity.delete({ where: { id } });
  }

  async findTasks(query: TaskQuery, actor: Actor) {
    const where: Prisma.LeadTaskWhereInput = {};
    if (actor.role === "ADVISOR") where.assignedToId = actor.userId;
    if (query.assignedToId && actor.role !== "ADVISOR") {
      where.assignedToId = Number(query.assignedToId);
    }
    if (query.status) where.status = query.status;

    const now = new Date();
    if (query.dueToday === "true") {
      const start = new Date(now);
      start.setHours(0, 0, 0, 0);
      const end = new Date(now);
      end.setHours(23, 59, 59, 999);
      where.dueAt = { gte: start, lte: end };
    }
    if (query.overdue === "true") {
      where.status = "PENDING";
      where.dueAt = { lt: now };
    }

    return this.prisma.leadTask.findMany({
      where,
      include: {
        lead: { select: { id: true, fullName: true, phone: true, status: true, priority: true } },
        assignedTo: { select: { id: true, name: true, email: true, role: true } },
      },
      orderBy: [{ dueAt: "asc" }, { createdAt: "desc" }],
    });
  }

  async findLeadTasks(leadId: number, actor: Actor) {
    await this.ensureLeadAccess(leadId, actor);
    return this.prisma.leadTask.findMany({
      where: { leadId },
      include: { assignedTo: { select: { id: true, name: true, email: true, role: true } } },
      orderBy: [{ status: "asc" }, { dueAt: "asc" }],
    });
  }

  async createTask(leadId: number, dto: CreateLeadTaskDto, actor: Actor) {
    await this.ensureLeadAccess(leadId, actor);
    const assignedToId = dto.assignedToId || actor.userId;
    const task = await this.prisma.leadTask.create({
      data: {
        leadId,
        title: this.clean(dto.title) || "Tarea",
        description: this.cleanLong(dto.description),
        dueAt: this.dateOrUndefined(dto.dueAt),
        status: dto.status || "PENDING",
        assignedToId,
        reminderAt: this.dateOrUndefined(dto.reminderAt || dto.dueAt),
        reminderType: dto.reminderType || "IN_APP",
      },
    });

    await this.createSystemActivity(
      leadId,
      "TASK",
      "Tarea creada",
      task.title,
      actor
    );
    await this.audit.record({
      actor,
      action: "CRM_TASK_CREATED",
      entityType: "LeadTask",
      entityId: task.id,
      metadata: { leadId, assignedToId },
    });

    return task;
  }

  async updateTask(id: number, dto: Partial<CreateLeadTaskDto>, actor: Actor) {
    const task = await this.prisma.leadTask.findUnique({ where: { id } });
    if (!task) throw new NotFoundException("Tarea no encontrada");
    await this.ensureLeadAccess(task.leadId, actor);

    return this.prisma.leadTask.update({
      where: { id },
      data: {
        title: dto.title ? this.clean(dto.title) : undefined,
        description: dto.description !== undefined ? this.cleanLong(dto.description) : undefined,
        dueAt: this.dateOrUndefined(dto.dueAt),
        status: dto.status,
        assignedToId: dto.assignedToId,
        reminderAt: this.dateOrUndefined(dto.reminderAt),
        reminderType: dto.reminderType,
      },
    });
  }

  async completeTask(id: number, actor: Actor) {
    const task = await this.prisma.leadTask.findUnique({ where: { id } });
    if (!task) throw new NotFoundException("Tarea no encontrada");
    await this.ensureLeadAccess(task.leadId, actor);

    const updated = await this.prisma.leadTask.update({
      where: { id },
      data: { status: "COMPLETED", completedAt: new Date() },
    });
    await this.audit.record({
      actor,
      action: "CRM_TASK_COMPLETED",
      entityType: "LeadTask",
      entityId: id,
      metadata: { leadId: task.leadId },
    });
    return updated;
  }

  async deleteTask(id: number, actor: Actor) {
    const task = await this.prisma.leadTask.findUnique({ where: { id } });
    if (!task) throw new NotFoundException("Tarea no encontrada");
    await this.ensureLeadAccess(task.leadId, actor);
    return this.prisma.leadTask.delete({ where: { id } });
  }

  async rescheduleTask(id: number, dueAt: string, actor: Actor) {
    const task = await this.prisma.leadTask.findUnique({ where: { id } });
    if (!task) throw new NotFoundException("Tarea no encontrada");
    await this.ensureLeadAccess(task.leadId, actor);
    const updated = await this.prisma.leadTask.update({
      where: { id },
      data: { dueAt: this.dateOrUndefined(dueAt), reminderAt: this.dateOrUndefined(dueAt) },
    });
    await this.audit.record({
      actor,
      action: "CRM_TASK_RESCHEDULED",
      entityType: "LeadTask",
      entityId: id,
      metadata: { leadId: task.leadId, dueAt },
    });
    return updated;
  }

  async bulkReassignLeads(leadIds: number[], assignedAdvisorId: number, actor: Actor) {
    if (actor.role === "ADVISOR") throw new ForbiddenException("No autorizado");
    const uniqueIds = Array.from(new Set(leadIds.map(Number).filter(Boolean)));
    if (!uniqueIds.length) throw new BadRequestException("Selecciona al menos un lead");

    await this.prisma.lead.updateMany({
      where: { id: { in: uniqueIds } },
      data: { assignedAdvisorId },
    });

    await Promise.all(
      uniqueIds.map((leadId) =>
        this.createSystemActivity(
          leadId,
          "STATUS_CHANGE",
          "Lead reasignado masivamente",
          `Nuevo asesor #${assignedAdvisorId}`,
          actor
        )
      )
    );

    await this.audit.record({
      actor,
      action: "CRM_LEADS_BULK_REASSIGNED",
      entityType: "Lead",
      entityId: uniqueIds.join(","),
      metadata: { leadIds: uniqueIds, assignedAdvisorId },
    });

    await this.createNotification(
      assignedAdvisorId,
      "CRM_LEAD_ASSIGNED",
      "Nuevos leads asignados",
      `Se te asignaron ${uniqueIds.length} leads.`,
      "Lead",
      uniqueIds[0]
    );

    return { updated: uniqueIds.length };
  }

  async listTemplates(channel?: CrmTemplateChannel) {
    return this.prisma.crmMessageTemplate.findMany({
      where: { isActive: true, ...(channel ? { channel } : {}) },
      orderBy: { name: "asc" },
    });
  }

  async createTemplate(input: TemplateInput, actor: Actor) {
    if (actor.role === "ADVISOR") throw new ForbiddenException("No autorizado");
    if (!input.name?.trim() || !input.channel || !input.content?.trim()) {
      throw new BadRequestException("Nombre, canal y contenido son requeridos");
    }
    const template = await this.prisma.crmMessageTemplate.create({
      data: {
        name: this.clean(input.name)!,
        channel: input.channel,
        content: this.cleanLong(input.content)!,
        isActive: input.isActive ?? true,
      },
    });
    await this.audit.record({
      actor,
      action: "CRM_TEMPLATE_CREATED",
      entityType: "CrmMessageTemplate",
      entityId: template.id,
      metadata: { channel: template.channel, name: template.name },
    });
    return template;
  }

  async useTemplate(templateId: number, leadId: number, actor: Actor) {
    await this.ensureLeadAccess(leadId, actor);
    const [template, lead] = await Promise.all([
      this.prisma.crmMessageTemplate.findUnique({ where: { id: templateId } }),
      this.prisma.lead.findUnique({ where: { id: leadId }, include: this.leadInclude() }),
    ]);
    if (!template || !lead) throw new NotFoundException("Plantilla o lead no encontrado");
    const content = this.renderTemplate(template.content, lead, actor);
    await this.createActivity(
      leadId,
      {
        type: template.channel === "EMAIL" ? "EMAIL" : template.channel === "WHATSAPP" ? "WHATSAPP" : "NOTE",
        title: `Plantilla usada: ${template.name}`,
        description: content,
      },
      actor
    );
    await this.audit.record({
      actor,
      action: "CRM_TEMPLATE_USED",
      entityType: "CrmMessageTemplate",
      entityId: template.id,
      metadata: { leadId, channel: template.channel },
    });
    return { template, content };
  }

  async listNotifications(actor: Actor) {
    return this.prisma.crmNotification.findMany({
      where: { userId: actor.userId || -1 },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
  }

  async createNotification(
    userId: number,
    type: any,
    title: string,
    message: string,
    entityType?: string,
    entityId?: string | number
  ) {
    const notification = await this.prisma.crmNotification.create({
      data: {
        userId,
        type,
        title,
        message,
        entityType,
        entityId: entityId ? String(entityId) : null,
      },
    });
    await this.audit.record({
      action: "CRM_NOTIFICATION_CREATED",
      entityType: "CrmNotification",
      entityId: notification.id,
      metadata: { userId, type, entityType, entityId },
    });
    return notification;
  }

  async exportLeads(query: LeadQuery, actor: Actor) {
    if (actor.role === "ADVISOR") throw new ForbiddenException("No autorizado");
    const where: Prisma.LeadWhereInput = {
      ...this.accessibleLeadWhere(actor),
      ...this.queryLeadWhere(query),
    };
    const leads = await this.prisma.lead.findMany({
      where,
      include: this.leadInclude(),
      orderBy: { createdAt: "desc" },
      take: 1000,
    });
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Leads");
    sheet.columns = [
      { header: "ID", key: "id", width: 10 },
      { header: "Nombre", key: "fullName", width: 28 },
      { header: "Correo", key: "email", width: 28 },
      { header: "Telefono", key: "phone", width: 20 },
      { header: "Estado", key: "status", width: 18 },
      { header: "Prioridad", key: "priority", width: 14 },
      { header: "Score", key: "priorityScore", width: 10 },
      { header: "Salud", key: "healthStatus", width: 12 },
      { header: "Asesor", key: "advisor", width: 28 },
      { header: "Creado", key: "createdAt", width: 22 },
    ];
    leads.map((lead) => this.withProductivity(lead)).forEach((lead: any) => {
      sheet.addRow({
        id: lead.id,
        fullName: lead.fullName,
        email: lead.email,
        phone: lead.phone,
        status: lead.status,
        priority: lead.priority,
        priorityScore: lead.priorityScore,
        healthStatus: lead.healthStatus,
        advisor: lead.assignedAdvisor?.email || "",
        createdAt: lead.createdAt?.toISOString?.() || lead.createdAt,
      });
    });
    sheet.getRow(1).font = { bold: true };
    await this.audit.record({
      actor,
      action: "CRM_EXPORT_GENERATED",
      entityType: "Lead",
      entityId: "export",
      metadata: { rows: leads.length },
    });
    return Buffer.from(await workbook.xlsx.writeBuffer());
  }

  private accessibleTaskWhere(actor: Actor): Prisma.LeadTaskWhereInput {
    if (actor.role === "ADVISOR") {
      return { assignedToId: actor.userId || -1 };
    }
    return {};
  }

  private withProductivity(lead: any) {
    const priorityScore = this.calculateLeadPriorityScore(lead);
    const healthStatus = this.calculateLeadHealth(lead, priorityScore);
    return {
      ...lead,
      priorityScore,
      healthStatus,
      slaStatus: this.calculateSlaStatus(lead),
    };
  }

  private calculateLeadPriorityScore(lead: any) {
    let score = 0;
    const now = new Date();
    const lastContact = lead.lastContactedAt ? new Date(lead.lastContactedAt) : null;
    const travelStart = lead.travelStartDate ? new Date(lead.travelStartDate) : null;

    if (lead.priority === "URGENT") score += 30;
    else if (lead.priority === "HIGH") score += 22;
    else if (lead.priority === "MEDIUM") score += 12;
    else score += 4;

    if (travelStart) {
      const days = (travelStart.getTime() - now.getTime()) / 86400000;
      if (days <= 7 && days >= 0) score += 24;
      else if (days <= 30 && days >= 0) score += 14;
    }

    const budget = Number(lead.budget || 0);
    if (budget >= 10000000) score += 15;
    else if (budget >= 3000000) score += 8;
    if (Number(lead.guests || 0) >= 6) score += 8;

    if (["NEGOTIATION", "PROPOSAL_SENT"].includes(lead.status)) score += 12;
    if (lead.source === "WHATSAPP" || lead.source === "REFERRAL") score += 6;
    if (lead.interestedProductType) score += 5;

    if (!lastContact) score += lead.status === "NEW" ? 10 : 4;
    else {
      const hours = (now.getTime() - lastContact.getTime()) / 3600000;
      if (hours > 72) score += 12;
      else if (hours > 24) score += 6;
    }

    return Math.max(0, Math.min(100, Math.round(score)));
  }

  private calculateLeadHealth(lead: any, score: number) {
    if (["LOST", "ARCHIVED"].includes(lead.status)) return "GRAY";
    if (this.calculateSlaStatus(lead) === "VENCIDO") return "RED";
    if (score >= 81) return "RED";
    if (score >= 61 || lead.nextFollowUpAt) return "YELLOW";
    return "GREEN";
  }

  private calculateSlaStatus(lead: any) {
    if (["RESERVED", "LOST", "ARCHIVED"].includes(lead.status)) return "CERRADO";
    const now = new Date();
    const lastActivity = lead.activities?.[0]?.createdAt
      ? new Date(lead.activities[0].createdAt)
      : lead.lastContactedAt
        ? new Date(lead.lastContactedAt)
        : null;

    if (lead.status === "NEW") {
      const limit = lead.priority === "URGENT" ? this.hoursAgo(4) : this.hoursAgo(24);
      return (lead.lastContactedAt ? new Date(lead.lastContactedAt) : new Date(lead.createdAt)) < limit
        ? "VENCIDO"
        : "AL_DIA";
    }

    if (lead.status === "PROPOSAL_SENT") {
      return (!lastActivity || lastActivity < this.hoursAgo(48)) ? "VENCIDO" : "AL_DIA";
    }

    if (lead.status === "NEGOTIATION") {
      return (!lastActivity || lastActivity < this.hoursAgo(72)) ? "VENCIDO" : "AL_DIA";
    }

    return "AL_DIA";
  }

  private needsFollowUp(lead: any) {
    const lastActivity = lead.activities?.[0]?.createdAt
      ? new Date(lead.activities[0].createdAt)
      : lead.lastContactedAt
        ? new Date(lead.lastContactedAt)
        : null;
    const hasPendingTask = Array.isArray(lead.tasks) && lead.tasks.length > 0;

    if (lead.status === "NEW") {
      return !lastActivity && new Date(lead.createdAt) < this.hoursAgo(24);
    }
    if (lead.status === "CONTACTED") return !hasPendingTask;
    if (lead.status === "QUALIFIED") return !hasPendingTask;
    if (lead.status === "PROPOSAL_SENT") return !hasPendingTask || !lastActivity || lastActivity < this.hoursAgo(48);
    if (lead.status === "NEGOTIATION") return !lastActivity || lastActivity < this.hoursAgo(72);
    return false;
  }

  private async averageFirstContactHours(where: Prisma.LeadWhereInput) {
    const leads = await this.prisma.lead.findMany({
      where: { ...where, lastContactedAt: { not: null } },
      select: { createdAt: true, lastContactedAt: true },
      take: 500,
    });
    if (!leads.length) return null;
    const total = leads.reduce((acc, lead) => {
      return acc + ((lead.lastContactedAt!.getTime() - lead.createdAt.getTime()) / 3600000);
    }, 0);
    return Math.round(total / leads.length);
  }

  private renderTemplate(template: string, lead: any, actor: Actor) {
    const product = lead.interestedProductType
      ? `${lead.interestedProductType} #${lead.interestedProductId || ""}`
      : "tu solicitud";
    return template
      .replace(/\{nombre\}/g, lead.fullName || "Hola")
      .replace(/\{producto\}/g, product)
      .replace(/\{fecha_inicio\}/g, lead.travelStartDate ? new Date(lead.travelStartDate).toLocaleDateString("es-CO") : "")
      .replace(/\{asesor\}/g, actor.name || actor.email || "Cartagena Tailored Travel");
  }

  private hoursAgo(hours: number) {
    return new Date(Date.now() - hours * 3600000);
  }

  private accessibleLeadWhere(actor: Actor): Prisma.LeadWhereInput {
    if (actor.role === "ADVISOR") {
      return { assignedAdvisorId: actor.userId || -1 };
    }
    return {};
  }

  private queryLeadWhere(query: LeadQuery): Prisma.LeadWhereInput {
    const where: Prisma.LeadWhereInput = {};
    if (query.status) where.status = query.status;
    if (query.source) where.source = query.source;
    if (query.priority) where.priority = query.priority;
    if (query.productType) where.interestedProductType = query.productType;
    if (query.assignedAdvisorId) where.assignedAdvisorId = Number(query.assignedAdvisorId);
    if (query.dateFrom || query.dateTo) {
      where.createdAt = {};
      if (query.dateFrom) where.createdAt.gte = new Date(query.dateFrom);
      if (query.dateTo) where.createdAt.lte = new Date(query.dateTo);
    }
    if (query.search) {
      where.OR = [
        { fullName: { contains: query.search, mode: "insensitive" } },
        { email: { contains: query.search, mode: "insensitive" } },
        { phone: { contains: query.search, mode: "insensitive" } },
        { message: { contains: query.search, mode: "insensitive" } },
      ];
    }
    return where;
  }

  private async ensureLeadAccess(id: number, actor: Actor) {
    const lead = await this.prisma.lead.findFirst({
      where: { id, ...this.accessibleLeadWhere(actor) },
      select: { id: true },
    });
    if (!lead) throw new NotFoundException("Lead no encontrado");
  }

  private leadInclude() {
    return {
      assignedAdvisor: { select: { id: true, name: true, email: true, role: true } },
      _count: { select: { activities: true, tasks: true } },
    };
  }

  private mapLeadData(dto: Partial<CreateLeadDto>, defaults: Partial<CreateLeadDto> = {}) {
    return {
      fullName: dto.fullName !== undefined ? this.clean(dto.fullName) : undefined,
      email: dto.email !== undefined ? this.normalizeEmail(dto.email) : undefined,
      phone: dto.phone !== undefined ? this.clean(dto.phone) : undefined,
      country: dto.country !== undefined ? this.clean(dto.country) : undefined,
      city: dto.city !== undefined ? this.clean(dto.city) : undefined,
      preferredLanguage:
        dto.preferredLanguage !== undefined ? this.clean(dto.preferredLanguage) || "es" : undefined,
      source: dto.source || defaults.source,
      status: dto.status || defaults.status,
      priority: dto.priority || defaults.priority,
      assignedAdvisorId: dto.assignedAdvisorId,
      interestedProductType: dto.interestedProductType,
      interestedProductId: dto.interestedProductId,
      travelStartDate: this.dateOrUndefined(dto.travelStartDate),
      travelEndDate: this.dateOrUndefined(dto.travelEndDate),
      guests: dto.guests,
      budget: dto.budget !== undefined ? new Prisma.Decimal(dto.budget) : undefined,
      message: dto.message !== undefined ? this.cleanLong(dto.message) : undefined,
      notes: dto.notes !== undefined ? this.cleanLong(dto.notes) : undefined,
      nextFollowUpAt: this.dateOrUndefined(dto.nextFollowUpAt),
    };
  }

  private assertHasContact(dto: CreateLeadDto) {
    if (!dto.fullName?.trim() && !dto.email?.trim() && !dto.phone?.trim()) {
      throw new BadRequestException("Debes indicar nombre, correo o teléfono");
    }
  }

  private async findOpenLeadByContact(email?: string, phone?: string) {
    const normalizedEmail = this.normalizeEmail(email);
    const cleanPhone = this.clean(phone);
    if (!normalizedEmail && !cleanPhone) return null;

    return this.prisma.lead.findFirst({
      where: {
        status: { notIn: ["RESERVED", "LOST", "ARCHIVED"] },
        OR: [
          ...(normalizedEmail ? [{ email: normalizedEmail }] : []),
          ...(cleanPhone ? [{ phone: cleanPhone }] : []),
        ],
      },
      orderBy: { createdAt: "desc" },
    });
  }

  private async createSystemActivity(
    leadId: number,
    type: LeadActivityType,
    title: string,
    description?: string | null,
    actor?: Actor
  ) {
    return this.prisma.leadActivity.create({
      data: {
        leadId,
        type,
        title,
        description: this.cleanLong(description || undefined),
        createdById: actor?.userId,
      },
    });
  }

  private auditLeadMeta(lead: any) {
    return {
      leadId: lead.id,
      status: lead.status,
      source: lead.source,
      priority: lead.priority,
      assignedAdvisorId: lead.assignedAdvisorId,
      interestedProductType: lead.interestedProductType,
      interestedProductId: lead.interestedProductId,
    };
  }

  private dateOrUndefined(value?: string) {
    if (!value) return undefined;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? undefined : date;
  }

  private clean(value?: string | null) {
    return value?.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim() || undefined;
  }

  private cleanLong(value?: string | null) {
    return value?.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "").trim() || undefined;
  }

  private normalizeEmail(value?: string | null) {
    return value?.trim().toLowerCase() || undefined;
  }

  private mergeText(current?: string | null, next?: string | null) {
    const cleanNext = this.cleanLong(next);
    if (!cleanNext) return current || undefined;
    return [current, cleanNext].filter(Boolean).join("\n\n--- Nueva consulta ---\n");
  }

  private positiveInt(value: unknown, fallback: number) {
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
  }
}

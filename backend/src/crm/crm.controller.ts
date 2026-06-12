import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Request,
  Res,
} from "@nestjs/common";
import { CrmTemplateChannel, LeadStatus } from "@prisma/client";
import type { Response } from "express";

import { Roles } from "../auth/roles.decorator";
import { CrmService } from "./crm.service";
import { CreateLeadActivityDto } from "./dto/create-lead-activity.dto";
import { CreateLeadTaskDto } from "./dto/create-lead-task.dto";
import { CreateLeadDto } from "./dto/create-lead.dto";
import { UpdateLeadDto } from "./dto/update-lead.dto";

function actorFromRequest(req: any) {
  return {
    userId: req.user?.userId,
    role: req.user?.role,
    email: req.user?.email,
    name: req.user?.name,
  };
}

@Roles("SUPERADMIN", "ADMIN", "ADVISOR")
@Controller("crm")
export class CrmController {
  constructor(private readonly crm: CrmService) {}

  @Get("dashboard")
  dashboard(@Request() req: any) {
    return this.crm.getDashboard(actorFromRequest(req));
  }

  @Get("productivity")
  productivity(@Request() req: any) {
    return this.crm.getProductivity(actorFromRequest(req));
  }

  @Get("productivity/my-panel")
  myPanel(@Request() req: any) {
    return this.crm.getMyPanel(actorFromRequest(req));
  }

  @Get("activity")
  activity(@Query() query: any, @Request() req: any) {
    return this.crm.getActivityFeed(query, actorFromRequest(req));
  }

  @Get("agenda")
  agenda(@Query() query: any, @Request() req: any) {
    return this.crm.getAgenda(query, actorFromRequest(req));
  }

  @Get("leads/no-followup")
  noFollowUp(@Request() req: any) {
    return this.crm.findNoFollowUpLeads(actorFromRequest(req));
  }

  @Get("workload")
  workload(@Request() req: any) {
    return this.crm.getAdvisorWorkload(actorFromRequest(req));
  }

  @Post("leads/bulk-reassign")
  bulkReassign(
    @Body() body: { leadIds: number[]; assignedAdvisorId: number },
    @Request() req: any
  ) {
    return this.crm.bulkReassignLeads(
      body.leadIds || [],
      Number(body.assignedAdvisorId),
      actorFromRequest(req)
    );
  }

  @Get("templates")
  templates(@Query("channel") channel?: CrmTemplateChannel) {
    return this.crm.listTemplates(channel);
  }

  @Post("templates")
  createTemplate(@Body() body: any, @Request() req: any) {
    return this.crm.createTemplate(body, actorFromRequest(req));
  }

  @Post("templates/:id/use")
  useTemplate(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: { leadId: number },
    @Request() req: any
  ) {
    return this.crm.useTemplate(id, Number(body.leadId), actorFromRequest(req));
  }

  @Get("notifications")
  notifications(@Request() req: any) {
    return this.crm.listNotifications(actorFromRequest(req));
  }

  @Get("export/leads.xlsx")
  async exportLeads(@Query() query: any, @Request() req: any, @Res() res: Response) {
    const buffer = await this.crm.exportLeads(query, actorFromRequest(req));
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader("Content-Disposition", `attachment; filename="crm-leads.xlsx"`);
    res.send(buffer);
  }

  @Get("leads")
  findLeads(@Query() query: any, @Request() req: any) {
    return this.crm.findLeads(query, actorFromRequest(req));
  }

  @Post("leads")
  createLead(@Body() body: CreateLeadDto, @Request() req: any) {
    return this.crm.createLead(body, actorFromRequest(req));
  }

  @Get("leads/:id")
  findLead(@Param("id", ParseIntPipe) id: number, @Request() req: any) {
    return this.crm.findLead(id, actorFromRequest(req));
  }

  @Patch("leads/:id")
  updateLead(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: UpdateLeadDto,
    @Request() req: any
  ) {
    return this.crm.updateLead(id, body, actorFromRequest(req));
  }

  @Delete("leads/:id")
  archiveLead(@Param("id", ParseIntPipe) id: number, @Request() req: any) {
    return this.crm.archiveLead(id, actorFromRequest(req));
  }

  @Patch("leads/:id/status")
  changeStatus(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: { status: LeadStatus; lostReason?: string },
    @Request() req: any
  ) {
    return this.crm.changeStatus(id, body.status, actorFromRequest(req), body.lostReason);
  }

  @Patch("leads/:id/assign")
  assignLead(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: { assignedAdvisorId?: number | null },
    @Request() req: any
  ) {
    return this.crm.assignLead(id, body.assignedAdvisorId ?? null, actorFromRequest(req));
  }

  @Patch("leads/:id/convert")
  convertToBooking(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: { bookingId: number },
    @Request() req: any
  ) {
    return this.crm.convertToBooking(id, Number(body.bookingId), actorFromRequest(req));
  }

  @Get("leads/:id/activities")
  findActivities(@Param("id", ParseIntPipe) id: number, @Request() req: any) {
    return this.crm.findActivities(id, actorFromRequest(req));
  }

  @Post("leads/:id/activities")
  createActivity(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: CreateLeadActivityDto,
    @Request() req: any
  ) {
    return this.crm.createActivity(id, body, actorFromRequest(req));
  }

  @Patch("activities/:id")
  updateActivity(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: Partial<CreateLeadActivityDto>,
    @Request() req: any
  ) {
    return this.crm.updateActivity(id, body, actorFromRequest(req));
  }

  @Delete("activities/:id")
  deleteActivity(@Param("id", ParseIntPipe) id: number, @Request() req: any) {
    return this.crm.deleteActivity(id, actorFromRequest(req));
  }

  @Get("tasks")
  findTasks(@Query() query: any, @Request() req: any) {
    return this.crm.findTasks(query, actorFromRequest(req));
  }

  @Get("leads/:id/tasks")
  findLeadTasks(@Param("id", ParseIntPipe) id: number, @Request() req: any) {
    return this.crm.findLeadTasks(id, actorFromRequest(req));
  }

  @Post("leads/:id/tasks")
  createTask(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: CreateLeadTaskDto,
    @Request() req: any
  ) {
    return this.crm.createTask(id, body, actorFromRequest(req));
  }

  @Patch("tasks/:id")
  updateTask(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: Partial<CreateLeadTaskDto>,
    @Request() req: any
  ) {
    return this.crm.updateTask(id, body, actorFromRequest(req));
  }

  @Patch("tasks/:id/reschedule")
  rescheduleTask(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: { dueAt: string },
    @Request() req: any
  ) {
    return this.crm.rescheduleTask(id, body.dueAt, actorFromRequest(req));
  }

  @Patch("tasks/:id/complete")
  completeTask(@Param("id", ParseIntPipe) id: number, @Request() req: any) {
    return this.crm.completeTask(id, actorFromRequest(req));
  }

  @Delete("tasks/:id")
  deleteTask(@Param("id", ParseIntPipe) id: number, @Request() req: any) {
    return this.crm.deleteTask(id, actorFromRequest(req));
  }
}

import {
  BadRequestException,
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Request,
  Res,
} from "@nestjs/common";
import type { Response } from "express";

import { PreReservationsService } from "./pre-reservations.service";
import { Public } from "../auth/public.decorator";
import { Roles } from "../auth/roles.decorator";

@Controller("pre-reservations")
export class PreReservationsController {
  constructor(
    private readonly service: PreReservationsService
  ) {}

  // ===============================
  // CREATE
  // ===============================
  @Public()
  @Post()
  create(@Body() body: any) {
    return this.service.create(body);
  }

  // ===============================
  // GET ALL
  // ===============================
  @Roles("ADVISOR", "SUPERADMIN")
  @Get()
  findAll(@Request() req) {
    return this.service.findAll(req.user);
  }

  @Roles("SUPERADMIN")
  @Get("operational-notifications")
  findOperationalNotifications(@Request() req) {
    return this.service.findOperationalNotifications(req.user);
  }

  // ===============================
  // INVOICE PDF
  // ===============================
  @Roles("ADVISOR", "SUPERADMIN")
  @Get(":id/invoice/view")
  async viewInvoice(
    @Param("id") id: string,
    @Request() req,
    @Res() res: Response
  ) {
    const file = await this.service.getInvoiceFile(id, req.user);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `inline; filename="${file.filename}"`
    );

    return res.sendFile(file.path);
  }

  @Roles("ADVISOR", "SUPERADMIN")
  @Get(":id/invoice/download")
  async downloadInvoice(
    @Param("id") id: string,
    @Request() req,
    @Res() res: Response
  ) {
    const file = await this.service.getInvoiceFile(id, req.user);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${file.filename}"`
    );

    return res.sendFile(file.path);
  }

  // ===============================
  // GET ONE
  // ===============================
  @Roles("ADVISOR", "SUPERADMIN")
  @Get(":id")
  findOne(
    @Param("id") id: string,
    @Request() req
  ) {
    return this.service.findOne(id, req.user);
  }

  // ===============================
  // ASSIGN
  // ===============================
  @Roles("ADVISOR", "SUPERADMIN")
  @Patch(":id/assign-me")
  assignMe(
    @Param("id") id: string,
    @Request() req
  ) {
    return this.service.assignToCurrentAdvisor(
      id,
      req.user
    );
  }

  @Roles("SUPERADMIN")
  @Patch(":id/assign/:userId")
  assign(
    @Param("id") id: string,
    @Param("userId") userId: string
  ) {
    return this.service.assign(id, Number(userId));
  }

  // ===============================
  // STATUS FLOW
  // ===============================
  @Roles("ADVISOR", "SUPERADMIN")
  @Patch(":id/status/validating")
  markValidating(
    @Param("id") id: string,
    @Request() req
  ) {
    return this.service.markValidating(id, req.user);
  }

  @Roles("ADVISOR", "SUPERADMIN")
  @Patch(":id/status/available")
  markAvailable(
    @Param("id") id: string,
    @Request() req
  ) {
    return this.service.markAvailable(id, req.user);
  }

  @Roles("ADVISOR", "SUPERADMIN")
  @Patch(":id/status/unavailable")
  markUnavailable(
    @Param("id") id: string,
    @Request() req
  ) {
    return this.service.markUnavailable(id, req.user);
  }

  @Roles("ADVISOR", "SUPERADMIN")
  @Patch(":id/status/payment-pending")
  markPaymentPending(
    @Param("id") id: string,
    @Request() req
  ) {
    return this.service.markPaymentPending(id, req.user);
  }

  @Roles("ADVISOR", "SUPERADMIN")
  @Post(":id/generate-booking")
  generateBooking(
    @Param("id") id: string,
    @Request() req
  ) {
    return this.service.generateManualBooking(id, req.user);
  }

  @Roles("ADVISOR", "SUPERADMIN")
  @Post(":id/notifications/email")
  sendManualBookingEmail(
    @Param("id") id: string,
    @Request() req
  ) {
    return this.service.sendManualBookingEmail(id, req.user);
  }

  @Roles("ADVISOR", "SUPERADMIN")
  @Post(":id/notifications/whatsapp")
  sendManualBookingWhatsapp(
    @Param("id") id: string,
    @Request() req
  ) {
    return this.service.sendManualBookingWhatsapp(id, req.user);
  }

  @Roles("ADVISOR", "SUPERADMIN")
  @Patch(":id/quote")
  updateAssistedQuote(
    @Param("id") id: string,
    @Body() body: any,
    @Request() req
  ) {
    return this.service.updateAssistedQuote(
      id,
      body,
      req.user
    );
  }

  // ===============================
  // ITEMS
  // ===============================
  @Roles("ADVISOR", "SUPERADMIN")
  @Post("items")
  addItem(
    @Body() body: any,
    @Request() req
  ) {
    return this.service.addItem(body, req.user);
  }

  @Roles("ADVISOR", "SUPERADMIN")
  @Patch("items/:itemId")
  updateItem(
    @Param("itemId") itemId: string,
    @Body() body: any,
    @Request() req
  ) {
    return this.service.updateItem(
      Number(itemId),
      body,
      req.user
    );
  }

  @Roles("ADVISOR", "SUPERADMIN")
  @Delete("items/:itemId")
  removeItem(
    @Param("itemId") itemId: string,
    @Request() req
  ) {
    return this.service.removeItem(
      Number(itemId),
      req.user
    );
  }

  // ===============================
  // CONFIRM
  // ===============================
  @Roles("SUPERADMIN")
  @Post(":id/confirm")
  confirm(
    @Param("id") id: string,
    @Request() req
  ) {
    throw new BadRequestException(
      "La confirmacion manual esta deshabilitada. Usa webhook de pago aprobado."
    );
  }
}

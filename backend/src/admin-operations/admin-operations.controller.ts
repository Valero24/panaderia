import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Request,
} from "@nestjs/common";
import { Roles } from "../auth/roles.decorator";
import { AdminOperationsService } from "./admin-operations.service";

@Roles("SUPERADMIN")
@Controller("admin-operations")
export class AdminOperationsController {
  constructor(
    private readonly adminOperationsService: AdminOperationsService
  ) {}

  @Get("dashboard")
  dashboard() {
    return this.adminOperationsService.getDashboardMetrics();
  }

  @Get("advisors")
  advisors() {
    return this.adminOperationsService.listAdvisors();
  }

  @Patch("advisors/:id/status")
  setAdvisorStatus(
    @Param("id", ParseIntPipe) id: number,
    @Body("isActive") isActive: boolean,
    @Request() req
  ) {
    return this.adminOperationsService.setAdvisorStatus(
      id,
      Boolean(isActive),
      req.user.userId
    );
  }

  @Patch("pre-reservations/:id/reassign")
  reassign(
    @Param("id") id: string,
    @Body("advisorId") advisorId: number,
    @Request() req
  ) {
    return this.adminOperationsService.reassignPreReservation(
      id,
      Number(advisorId),
      req.user.userId
    );
  }

  @Patch("pre-reservations/:id/cancel")
  cancel(
    @Param("id") id: string,
    @Body("reason") reason: string,
    @Request() req
  ) {
    return this.adminOperationsService.cancelReservation(
      id,
      reason,
      req.user.userId
    );
  }

  @Patch("pre-reservations/:id/archive")
  archive(
    @Param("id") id: string,
    @Body("reason") reason: string,
    @Request() req
  ) {
    return this.adminOperationsService.archivePreReservation(
      id,
      reason,
      req.user.userId
    );
  }

  @Get("payments")
  payments() {
    return this.adminOperationsService.listPayments();
  }

  @Get("reservations")
  reservations() {
    return this.adminOperationsService.listReservations();
  }

  @Get("company-settings")
  companySettings() {
    return this.adminOperationsService.getCompanySettings();
  }

  @Patch("company-settings")
  updateCompanySettings(@Body() body: any) {
    return this.adminOperationsService.updateCompanySettings(body);
  }
}

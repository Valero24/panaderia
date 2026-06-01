import { Controller, Get, Request } from "@nestjs/common";
import { Roles } from "../auth/roles.decorator";
import { DashboardService } from "./dashboard.service";

@Roles("SUPERADMIN", "ADVISOR")
@Controller("dashboard")
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get("summary")
  summary(@Request() req) {
    return this.dashboardService.summary(req.user);
  }
}

import { Controller, Get } from "@nestjs/common";
import { Public } from "../auth/public.decorator";
import { Roles } from "../auth/roles.decorator";
import { HealthService } from "./health.service";

@Controller()
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Public()
  @Get("health")
  health() {
    return this.healthService.publicHealth();
  }

  @Roles("SUPERADMIN")
  @Get("system-health")
  systemHealth() {
    return this.healthService.systemHealth();
  }
}

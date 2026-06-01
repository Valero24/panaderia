import { Body, Controller, Get, Patch, Request } from "@nestjs/common";
import { Roles } from "../auth/roles.decorator";
import { SystemSettingsService } from "./system-settings.service";

@Roles("SUPERADMIN")
@Controller("system-settings")
export class SystemSettingsController {
  constructor(private readonly settingsService: SystemSettingsService) {}

  @Get()
  getSettings() {
    return this.settingsService.getSettings();
  }

  @Patch()
  updateSettings(@Body() body: any, @Request() req) {
    return this.settingsService.updateSettings(body, {
      userId: req.user.userId,
      role: req.user.role,
      email: req.user.email,
    });
  }
}

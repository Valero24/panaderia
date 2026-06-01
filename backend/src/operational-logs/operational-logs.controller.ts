import { Controller, Get, Query } from "@nestjs/common";
import { Roles } from "../auth/roles.decorator";
import { OperationalLogsService } from "./operational-logs.service";

@Roles("SUPERADMIN")
@Controller("operational-logs")
export class OperationalLogsController {
  constructor(private readonly logsService: OperationalLogsService) {}

  @Get()
  findAll(@Query() query: any) {
    return this.logsService.findAll(query);
  }
}

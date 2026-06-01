import { Module } from "@nestjs/common";
import { OperationalLogsController } from "./operational-logs.controller";
import { OperationalLogsService } from "./operational-logs.service";

@Module({
  controllers: [OperationalLogsController],
  providers: [OperationalLogsService],
})
export class OperationalLogsModule {}

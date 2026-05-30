import { Module } from "@nestjs/common";
import { AvailabilityService } from "./availability-engine.service";
import { PrismaModule } from "../prisma/prisma.module";

@Module({
  imports: [PrismaModule],
  providers: [AvailabilityService],
  exports: [AvailabilityService],
})
export class AvailabilityEngineModule {}
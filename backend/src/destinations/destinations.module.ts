import { Module } from "@nestjs/common";

import { CommonModule } from "../common/common.module";
import { PrismaModule } from "../prisma/prisma.module";
import { DestinationsController } from "./destinations.controller";
import { DestinationsService } from "./destinations.service";

@Module({
  imports: [PrismaModule, CommonModule],
  controllers: [DestinationsController],
  providers: [DestinationsService],
})
export class DestinationsModule {}

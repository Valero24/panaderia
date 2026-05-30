import { Module } from "@nestjs/common";
import { BookingsService } from "./bookings.service";
import { BookingsController } from "./bookings.controller";
import { PrismaModule } from "../prisma/prisma.module";

// 🔥 IMPORTANTE
import { AvailabilityModule } from "../availability/availability.module";

@Module({
  imports: [
    PrismaModule,
    AvailabilityModule, // 🔥 AQUÍ ESTÁ LA MAGIA
  ],
  controllers: [BookingsController],
  providers: [BookingsService],
})
export class BookingsModule {}
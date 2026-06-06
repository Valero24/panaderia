import { Module } from "@nestjs/common";
import { PreReservationsService } from "./pre-reservations.service";
import { PreReservationsController } from "./pre-reservations.controller";
import { PrismaModule } from "../prisma/prisma.module";
import { AvailabilityEngineModule } from "../availability-engine/availability-engine.module";
import { CalendarModule } from "../calendar/calendar.module";
import { InvoiceService } from "../invoice/invoice.service";
import { NotificationsModule } from "../notifications/notifications.module";
import { CurrencyModule } from "../currency/currency.module";
import { MailModule } from "../mail/mail.module";

@Module({
  imports: [
    PrismaModule,
    AvailabilityEngineModule,
    CalendarModule,
    NotificationsModule,
    CurrencyModule,
    MailModule,
  ],
  controllers: [PreReservationsController],
  providers: [PreReservationsService, InvoiceService],

  // 🔥 CLAVE
  exports: [PreReservationsService],
})
export class PreReservationsModule {}

import { Module } from "@nestjs/common";

import { PaymentsController } from "./payments.controller";
import { PaymentsService } from "./payments.service";

import { PrismaModule } from "../prisma/prisma.module";
import { MailModule } from "../mail/mail.module";
import { InvoiceService } from "../invoice/invoice.service";
import { NotificationsModule } from "../notifications/notifications.module";

// 🔥 IMPORTAR
import { PreReservationsModule } from "../pre-reservations/pre-reservations.module";

@Module({
  imports: [
    PrismaModule,
    MailModule,
    NotificationsModule,

    // 🔥 CLAVE
    PreReservationsModule,
  ],
  controllers: [PaymentsController],
  providers: [PaymentsService, InvoiceService],
})
export class PaymentsModule {}

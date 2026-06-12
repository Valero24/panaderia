import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { EmailModule } from "../email/email.module";
import { NotificationsService } from "./notifications.service";
import { WhatsappService } from "./whatsapp.service";

@Module({
  imports: [PrismaModule, EmailModule],
  providers: [NotificationsService, WhatsappService],
  exports: [NotificationsService],
})
export class NotificationsModule {}

import { Module } from "@nestjs/common";

import { MailModule } from "../mail/mail.module";
import { PrismaModule } from "../prisma/prisma.module";
import { EmailController } from "./email.controller";
import { EmailLogService } from "./email-log.service";
import { EmailService } from "./email.service";

@Module({
  imports: [PrismaModule, MailModule],
  controllers: [EmailController],
  providers: [EmailService, EmailLogService],
  exports: [EmailService, EmailLogService],
})
export class EmailModule {}

import { Module } from "@nestjs/common";

import { CrmModule } from "../crm/crm.module";
import { MailModule } from "../mail/mail.module";
import { PrismaModule } from "../prisma/prisma.module";
import { ContactController } from "./contact.controller";
import { ContactService } from "./contact.service";

@Module({
  imports: [PrismaModule, MailModule, CrmModule],
  controllers: [ContactController],
  providers: [ContactService],
})
export class ContactModule {}

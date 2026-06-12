import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { EmailModule } from "../email/email.module";
import { AdminOperationsController } from "./admin-operations.controller";
import { AdminOperationsService } from "./admin-operations.service";

@Module({
  imports: [PrismaModule, EmailModule],
  controllers: [AdminOperationsController],
  providers: [AdminOperationsService],
})
export class AdminOperationsModule {}

import { Injectable } from "@nestjs/common";
import { EmailEntityType, EmailStatus } from "@prisma/client";

import { PrismaService } from "../prisma/prisma.service";
import { EmailTemplateKey } from "./email.types";

@Injectable()
export class EmailLogService {
  constructor(private readonly prisma: PrismaService) {}

  findDuplicate(data: {
    templateKey: EmailTemplateKey;
    entityType: EmailEntityType;
    entityId: string | number;
    to: string;
  }) {
    return this.prisma.emailLog.findFirst({
      where: {
        templateKey: data.templateKey,
        entityType: data.entityType,
        entityId: String(data.entityId),
        to: data.to,
        status: { in: [EmailStatus.SENT, EmailStatus.PENDING] },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  createPending(data: {
    to: string;
    cc?: string;
    bcc?: string;
    subject: string;
    templateKey: EmailTemplateKey;
    provider: string;
    entityType: EmailEntityType;
    entityId: string | number;
    preReservationId?: string | null;
    bookingId?: number | null;
  }) {
    return this.prisma.emailLog.create({
      data: {
        to: data.to,
        cc: data.cc,
        bcc: data.bcc,
        subject: data.subject,
        templateKey: data.templateKey,
        provider: data.provider,
        entityType: data.entityType,
        entityId: String(data.entityId),
        preReservationId: data.preReservationId || null,
        bookingId: data.bookingId || null,
        status: EmailStatus.PENDING,
      },
    });
  }

  mark(logId: number, status: EmailStatus, errorMessage?: string | null) {
    return this.prisma.emailLog.update({
      where: { id: logId },
      data: {
        status,
        errorMessage: errorMessage || null,
        sentAt: status === EmailStatus.SENT ? new Date() : undefined,
      },
    });
  }
}

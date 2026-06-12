import { Injectable, Logger } from "@nestjs/common";

import { CrmService } from "../crm/crm.service";
import { MailService } from "../mail/mail.service";
import { PrismaService } from "../prisma/prisma.service";
import { CreateContactRequestDto } from "./dto/create-contact-request.dto";

@Injectable()
export class ContactService {
  private readonly logger = new Logger(ContactService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
    private readonly crmService: CrmService
  ) {}

  async create(data: CreateContactRequestDto) {
    const contact = await this.prisma.contactRequest.create({
      data: {
        name: data.name.trim(),
        email: data.email.trim().toLowerCase(),
        whatsapp: data.whatsapp.trim(),
        subject: data.subject.trim(),
        message: data.message.trim(),
        interestType: data.interestType,
      },
    });

    void this.crmService.createOrUpdateFromPublicContact({
      fullName: contact.name,
      email: contact.email,
      phone: contact.whatsapp,
      source: "WEBSITE",
      message: `${contact.subject}\n\n${contact.message}`,
    }).catch((error) => {
      const message =
        error instanceof Error ? error.message : "Error creando lead desde contacto";
      this.logger.warn(`No se pudo crear lead desde contacto ${contact.id}: ${message}`);
    });

    try {
      const result = await this.mailService.sendInternalContactRequest({
        id: contact.id,
        name: contact.name,
        email: contact.email,
        whatsapp: contact.whatsapp,
        subject: contact.subject,
        message: contact.message,
        interestType: contact.interestType,
        createdAt: contact.createdAt,
      });

      if ((result as any)?.skipped) {
        return {
          ...contact,
          mail: result,
        };
      }

      return this.prisma.contactRequest.update({
        where: { id: contact.id },
        data: {
          emailSentAt: new Date(),
          emailLastError: null,
        },
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Error enviando correo";

      this.logger.warn(
        `No se pudo enviar correo interno de contacto ${contact.id}: ${message}`
      );

      return this.prisma.contactRequest.update({
        where: { id: contact.id },
        data: {
          emailLastError: message,
        },
      });
    }
  }

  findAll() {
    return this.prisma.contactRequest.findMany({
      orderBy: { createdAt: "desc" },
    });
  }
}

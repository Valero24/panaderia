import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import * as ical from "node-ical";
import { AvailabilitySource } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

type CalendarConflict = {
  startDate: Date;
  endDate: Date;
  summary?: string;
  source: "ICAL";
};

@Injectable()
export class CalendarService {
  private readonly logger = new Logger(CalendarService.name);
  private readonly icalTimeoutMs = 10000;

  constructor(
    private readonly prisma: PrismaService
  ) {}

  private overlaps(
    startA: Date,
    endA: Date,
    startB: Date,
    endB: Date
  ) {
    return startA < endB && endA > startB;
  }

  private normalizeEvent(event: any): CalendarConflict | null {
    if (
      event.type !== "VEVENT" ||
      !event.start ||
      !event.end
    ) {
      return null;
    }

    const startDate = new Date(event.start);
    const endDate = new Date(event.end);

    if (
      Number.isNaN(startDate.getTime()) ||
      Number.isNaN(endDate.getTime()) ||
      endDate <= startDate
    ) {
      return null;
    }

    return {
      startDate,
      endDate,
      summary: event.summary,
      source: "ICAL",
    };
  }

  async getExternalEvents(calendarUrl: string) {
    if (!calendarUrl?.trim()) {
      return [];
    }

    let parsedUrl: URL;

    try {
      parsedUrl = new URL(calendarUrl);
    } catch {
      throw new BadRequestException("URL iCal invalida");
    }

    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      throw new BadRequestException("URL iCal invalida");
    }

    let events: any;

    try {
      events = await Promise.race([
        ical.async.fromURL(calendarUrl),
        new Promise((_, reject) =>
          setTimeout(
            () => reject(new Error("ICAL_TIMEOUT")),
            this.icalTimeoutMs
          )
        ),
      ]);
    } catch (error: any) {
      this.logger.warn(
        `No se pudo descargar iCal: ${error?.message || "UNKNOWN_ERROR"}`
      );

      throw new BadRequestException(
        "No se pudo validar el calendario iCal externo. Intenta nuevamente o revisa la URL del alojamiento."
      );
    }

    return Object.keys(events)
      .map((key) => this.normalizeEvent((events as any)[key]))
      .filter(Boolean) as CalendarConflict[];
  }

  async checkPropertyIcalAvailability(
    propertyId: number,
    checkIn: Date,
    checkOut: Date
  ) {
    if (!checkIn || !checkOut || checkOut <= checkIn) {
      throw new BadRequestException("Fechas invalidas para validar iCal");
    }

    const property = await this.prisma.property.findUnique({
      where: { id: propertyId },
      select: {
        id: true,
        title: true,
        icalUrl: true,
      },
    });

    if (!property) {
      throw new NotFoundException("Propiedad no encontrada");
    }

    if (!property.icalUrl) {
      return {
        available: true,
        source: "NO_ICAL_URL",
        conflicts: [],
      };
    }

    const events = await this.getExternalEvents(property.icalUrl);
    const conflicts = events.filter((event) =>
      this.overlaps(
        event.startDate,
        event.endDate,
        checkIn,
        checkOut
      )
    );

    return {
      available: conflicts.length === 0,
      source: "ICAL",
      conflicts,
    };
  }

  async exportCalendar(propertyId: number) {
    const blocks = await this.prisma.availabilityBlock.findMany({
      where: {
        type: "PROPERTY",
        referenceId: propertyId,
      },
      orderBy: {
        startDate: "asc",
      },
    });

    let ics = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Cartagena Tailored Travel//EN
`;

    for (const block of blocks) {
      const start = block.startDate
        .toISOString()
        .split("T")[0]
        .replace(/-/g, "");

      const end = block.endDate
        .toISOString()
        .split("T")[0]
        .replace(/-/g, "");

      ics += `
BEGIN:VEVENT
DTSTART:${start}
DTEND:${end}
SUMMARY:Reserved
END:VEVENT
`;
    }

    ics += `
END:VCALENDAR
`;

    return ics;
  }

  async importCalendar(
    propertyId: number,
    calendarUrl: string
  ) {
    const events = await this.getExternalEvents(calendarUrl);
    let imported = 0;

    for (const event of events) {
      const exists = await this.prisma.availabilityBlock.findFirst({
        where: {
          type: "PROPERTY",
          referenceId: propertyId,
          startDate: event.startDate,
          endDate: event.endDate,
        },
      });

      if (!exists) {
        await this.prisma.availabilityBlock.create({
          data: {
            type: "PROPERTY",
            referenceId: propertyId,
            propertyId,
            startDate: event.startDate,
            endDate: event.endDate,
            source: AvailabilitySource.AIRBNB,
            notes: event.summary || "Importado automaticamente desde iCal",
          },
        });

        imported++;
      }
    }

    return {
      success: true,
      imported,
      message: "Calendario importado correctamente",
    };
  }

  async syncPropertyCalendar(propertyId: number) {
    const property = await this.prisma.property.findUnique({
      where: { id: propertyId },
      select: {
        id: true,
        icalUrl: true,
      },
    });

    if (!property) {
      throw new NotFoundException("Propiedad no encontrada");
    }

    if (!property.icalUrl) {
      throw new BadRequestException("La propiedad no tiene iCal configurado");
    }

    return this.importCalendar(property.id, property.icalUrl);
  }
}

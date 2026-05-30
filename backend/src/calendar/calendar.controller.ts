import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  ParseIntPipe,
  Res,
} from "@nestjs/common";

import type { Response } from "express";
import { CalendarService } from "./calendar.service";
import { Roles } from "../auth/roles.decorator";

@Controller("calendar")
export class CalendarController {
  constructor(
    private readonly calendarService: CalendarService
  ) {}

  /*
    EXPORT → tu web hacia Airbnb
  */
  @Roles("ADVISOR", "SUPERADMIN")
  @Get("export/:propertyId")
  async exportCalendar(
    @Param(
      "propertyId",
      ParseIntPipe
    )
    propertyId: number,

    @Res() res: Response
  ) {
    const ics =
      await this.calendarService.exportCalendar(
        propertyId
      );

    res.setHeader(
      "Content-Type",
      "text/calendar"
    );

    res.setHeader(
      "Content-Disposition",
      `attachment; filename=property-${propertyId}.ics`
    );

    res.send(ics);
  }

  /*
    IMPORT → Airbnb hacia tu web
  */
  @Roles("ADVISOR", "SUPERADMIN")
  @Post("import/:propertyId")
  async importCalendar(
    @Param(
      "propertyId",
      ParseIntPipe
    )
    propertyId: number,

    @Body("calendarUrl")
    calendarUrl: string
  ) {
    return this.calendarService.importCalendar(
      propertyId,
      calendarUrl
    );
  }

  @Roles("ADVISOR", "SUPERADMIN")
  @Post("sync/:propertyId")
  async syncCalendar(
    @Param(
      "propertyId",
      ParseIntPipe
    )
    propertyId: number
  ) {
    return this.calendarService.syncPropertyCalendar(
      propertyId
    );
  }
}

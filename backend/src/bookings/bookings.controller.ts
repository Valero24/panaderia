import {
  BadRequestException,
  Controller,
  Post,
  Body,
  Get,
  Request,
  Param,
  Patch,
  ParseIntPipe,
} from "@nestjs/common";
import { BookingsService } from "./bookings.service";
import { CreateBookingDto } from "./dto/create-booking.dto";
import { BookingStatus } from "@prisma/client";
import { Roles } from "../auth/roles.decorator";

@Controller("bookings")
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Roles("SUPERADMIN")
  @Post()
  create(@Body() dto: CreateBookingDto, @Request() req) {
    throw new BadRequestException(
      "La creacion directa de Booking esta deshabilitada. El Booking confirmado se crea desde webhook Wompi aprobado."
    );
  }

  @Roles("ADVISOR", "SUPERADMIN")
  @Get()
  findAll() {
    return this.bookingsService.findAll();
  }

  @Roles("SUPERADMIN")
  @Post(":id/status")
  updateStatus(
    @Param("id", ParseIntPipe) id: number,
    @Body("status") status: BookingStatus
  ) {
    return this.bookingsService.updateStatus(id, status);
  }

  @Roles("SUPERADMIN")
  @Patch(":id/cancel")
  cancel(
    @Param("id", ParseIntPipe) id: number,
    @Body("reason") reason: string,
    @Request() req
  ) {
    return this.bookingsService.cancel(
      id,
      reason,
      req.user.userId
    );
  }
}

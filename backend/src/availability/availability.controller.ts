import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
} from "@nestjs/common";

import { BookingType } from "@prisma/client";
import { Public } from "../auth/public.decorator";
import { AvailabilityService } from "./availability.service";
import { Roles } from "../auth/roles.decorator";

@Controller("availability")
export class AvailabilityController {
  constructor(private readonly service: AvailabilityService) {}

  @Public()
  @Get()
  check(
    @Query("type") type: BookingType,
    @Query("referenceId") referenceId: string,
    @Query("checkIn") checkIn: string,
    @Query("checkOut") checkOut: string
  ) {
    if (!type || !referenceId || !checkIn || !checkOut) {
      throw new BadRequestException("Faltan parametros");
    }

    return this.service.checkAvailability({
      type,
      referenceId: Number(referenceId),
      checkIn: new Date(checkIn),
      checkOut: new Date(checkOut),
    });
  }

  @Public()
  @Post("check")
  checkFromBody(@Body() body: any) {
    const type = body.type ?? BookingType.PROPERTY;
    const referenceId = body.referenceId ?? body.propertyId;

    if (!referenceId || !body.checkIn || !body.checkOut) {
      throw new BadRequestException("Faltan parametros");
    }

    return this.service.checkAvailability({
      type,
      referenceId: Number(referenceId),
      checkIn: new Date(body.checkIn),
      checkOut: new Date(body.checkOut),
    });
  }

  @Public()
  @Post("calculate-price")
  calculate(@Body() dto: any) {
    return this.service.calculatePrice({
      ...dto,
      checkIn: new Date(dto.checkIn),
      checkOut: new Date(dto.checkOut),
    });
  }

  @Get(":propertyId")
  findBlocksByProperty(
    @Param("propertyId", ParseIntPipe) propertyId: number
  ) {
    return this.service.findBlocksByProperty(propertyId);
  }

  @Roles("ADVISOR", "SUPERADMIN")
  @Post()
  createBlock(@Body() body: any) {
    return this.service.createBlock(body);
  }

  @Roles("ADVISOR", "SUPERADMIN")
  @Delete(":id")
  removeBlock(@Param("id", ParseIntPipe) id: number) {
    return this.service.removeBlock(id);
  }
}

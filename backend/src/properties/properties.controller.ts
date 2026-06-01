import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from "@nestjs/common";

import { PropertiesService } from "./properties.service";
import { CreatePropertyDto } from "./dto/create-property.dto";

import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { Public } from "../auth/public.decorator";

@Controller("properties")
export class PropertiesController {
  constructor(
    private readonly propertiesService: PropertiesService
  ) {}

  /*
    ==============================
    PUBLIC (NO AUTH)
    ==============================
  */

  @Public()
  @Get()
  findAll(@Query("features") features?: string) {
    return this.propertiesService.findAll(features);
  }

  @Public()
  @Get(":id")
  findOne(
    @Param("id", ParseIntPipe) id: number
  ) {
    return this.propertiesService.findOne(id);
  }

  /*
    ==============================
    ADMIN / SUPERADMIN
    ==============================
  */

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("ADMIN", "SUPERADMIN")
  @Post()
  create(
    @Body() createPropertyDto: CreatePropertyDto,
    @Request() req
  ) {
    return this.propertiesService.create(createPropertyDto, {
      userId: req.user.userId,
      role: req.user.role,
      email: req.user.email,
    });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("ADMIN", "SUPERADMIN")
  @Patch(":id")
  update(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: any,
    @Request() req
  ) {
    return this.propertiesService.update(id, body, {
      userId: req.user.userId,
      role: req.user.role,
      email: req.user.email,
    });
  }

  /*
    ==============================
    SOLO SUPERADMIN
    ==============================
  */

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPERADMIN")
  @Delete(":id")
  remove(
    @Param("id", ParseIntPipe) id: number,
    @Request() req
  ) {
    return this.propertiesService.remove(id, {
      userId: req.user.userId,
      role: req.user.role,
      email: req.user.email,
    });
  }
}

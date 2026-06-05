import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Request,
} from "@nestjs/common";

import { ExtrasService } from "./extras.service";

import { Public } from "../auth/public.decorator";
import { Roles } from "../auth/roles.decorator";

@Controller("extras")
export class ExtrasController {
  constructor(
    private readonly extrasService: ExtrasService
  ) {}

  // =========================================
  // CREATE EXTRA
  // =========================================

  @Roles("ADMIN", "SUPERADMIN")
  @Post()
  create(
    @Body()
    body: {
      name: string;
      description?: string;
      translations?: Record<string, Record<string, string>>;
      price: number;
      priceCop?: number;
      baseCurrency?: string;
      propertyId?: number;
      experienceId?: number;
      packageId?: number;
      active?: boolean;
    },
    @Request() req
  ) {
    return this.extrasService.create(body, {
      userId: req.user.userId,
      role: req.user.role,
      email: req.user.email,
    });
  }

  // =========================================
  // GET ALL EXTRAS
  // =========================================

  @Public()
  @Get()
  findAll() {
    return this.extrasService.findAll();
  }

  // =========================================
  // GET EXTRAS BY PROPERTY
  // =========================================

  @Public()
  @Get("property/:id")
  findByProperty(
    @Param("id", ParseIntPipe)
    id: number
  ) {
    return this.extrasService.findByProperty(id);
  }

  // =========================================
  // GET EXTRAS BY EXPERIENCE
  // =========================================

  @Public()
  @Get("experience/:id")
  findByExperience(
    @Param("id", ParseIntPipe)
    id: number
  ) {
    return this.extrasService.findByExperience(id);
  }

  // =========================================
  // GET EXTRAS BY PACKAGE
  // =========================================

  @Public()
  @Get("package/:id")
  findByPackage(
    @Param("id", ParseIntPipe)
    id: number
  ) {
    return this.extrasService.findByPackage(id);
  }

  // =========================================
  // GET ONE EXTRA
  // =========================================

  @Public()
  @Get(":id")
  findOne(
    @Param("id", ParseIntPipe)
    id: number
  ) {
    return this.extrasService.findOne(id);
  }

  // =========================================
  // UPDATE EXTRA
  // =========================================

  @Roles("ADMIN", "SUPERADMIN")
  @Patch(":id")
  update(
    @Param("id", ParseIntPipe)
    id: number,

    @Body()
    body: {
      name: string;
      description?: string;
      translations?: Record<string, Record<string, string>>;
      price: number;
      priceCop?: number;
      baseCurrency?: string;
      propertyId?: number;
      experienceId?: number;
      packageId?: number;
      active?: boolean;
    },
    @Request() req
  ) {
    return this.extrasService.update(
      id,
      body,
      {
        userId: req.user.userId,
        role: req.user.role,
        email: req.user.email,
      }
    );
  }

  // =========================================
  // DELETE EXTRA
  // =========================================

  @Roles("ADMIN", "SUPERADMIN")
  @Delete(":id")
  remove(
    @Param("id", ParseIntPipe)
    id: number,
    @Request() req
  ) {
    return this.extrasService.remove(id, {
      userId: req.user.userId,
      role: req.user.role,
      email: req.user.email,
    });
  }
}

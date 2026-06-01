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
} from "@nestjs/common";

import { Public } from "../auth/public.decorator";
import { Roles } from "../auth/roles.decorator";
import { CreateExperienceDto } from "./dto/create-experience.dto";
import { UpdateExperienceDto } from "./dto/update-experience.dto";
import { ExperiencesService } from "./experiences.service";

@Controller("experiences")
export class ExperiencesController {
  constructor(private readonly experiencesService: ExperiencesService) {}

  @Public()
  @Get()
  findAllPublic(@Query("features") features?: string) {
    return this.experiencesService.findAllPublic(features);
  }

  @Roles("ADMIN", "SUPERADMIN", "ADVISOR")
  @Get("admin/all")
  findAllAdmin() {
    return this.experiencesService.findAllAdmin();
  }

  @Public()
  @Get(":id")
  findOnePublic(@Param("id", ParseIntPipe) id: number) {
    return this.experiencesService.findOnePublic(id);
  }

  @Roles("ADMIN", "SUPERADMIN", "ADVISOR")
  @Get("admin/:id")
  findOneAdmin(@Param("id", ParseIntPipe) id: number) {
    return this.experiencesService.findOneAdmin(id);
  }

  @Roles("ADMIN", "SUPERADMIN")
  @Post()
  create(@Body() body: CreateExperienceDto, @Request() req) {
    return this.experiencesService.create(body, {
      userId: req.user.userId,
      role: req.user.role,
      email: req.user.email,
    });
  }

  @Roles("ADMIN", "SUPERADMIN")
  @Patch(":id")
  update(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: UpdateExperienceDto,
    @Request() req
  ) {
    return this.experiencesService.update(id, body, {
      userId: req.user.userId,
      role: req.user.role,
      email: req.user.email,
    });
  }

  @Roles("ADMIN", "SUPERADMIN")
  @Delete(":id")
  remove(@Param("id", ParseIntPipe) id: number, @Request() req) {
    return this.experiencesService.remove(id, {
      userId: req.user.userId,
      role: req.user.role,
      email: req.user.email,
    });
  }
}

import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
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
  findAllPublic() {
    return this.experiencesService.findAllPublic();
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
  create(@Body() body: CreateExperienceDto) {
    return this.experiencesService.create(body);
  }

  @Roles("ADMIN", "SUPERADMIN")
  @Patch(":id")
  update(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: UpdateExperienceDto
  ) {
    return this.experiencesService.update(id, body);
  }

  @Roles("ADMIN", "SUPERADMIN")
  @Delete(":id")
  remove(@Param("id", ParseIntPipe) id: number) {
    return this.experiencesService.remove(id);
  }
}

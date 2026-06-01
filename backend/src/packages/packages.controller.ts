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
import { CreatePackageDto } from "./dto/create-package.dto";
import { PackagesService } from "./packages.service";
import { UpdatePackageDto } from "./dto/update-package.dto";

@Controller("packages")
export class PackagesController {
  constructor(private readonly packagesService: PackagesService) {}

  @Public()
  @Get()
  findAllPublic(@Query("features") features?: string) {
    return this.packagesService.findAllPublic(features);
  }

  @Roles("ADMIN", "SUPERADMIN", "ADVISOR")
  @Get("admin/all")
  findAllAdmin() {
    return this.packagesService.findAllAdmin();
  }

  @Public()
  @Get(":id")
  findOnePublic(@Param("id", ParseIntPipe) id: number) {
    return this.packagesService.findOnePublic(id);
  }

  @Roles("ADMIN", "SUPERADMIN", "ADVISOR")
  @Get("admin/:id")
  findOneAdmin(@Param("id", ParseIntPipe) id: number) {
    return this.packagesService.findOneAdmin(id);
  }

  @Roles("ADMIN", "SUPERADMIN")
  @Post()
  create(@Body() body: CreatePackageDto, @Request() req) {
    return this.packagesService.create(body, {
      userId: req.user.userId,
      role: req.user.role,
      email: req.user.email,
    });
  }

  @Roles("ADMIN", "SUPERADMIN")
  @Patch(":id")
  update(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: UpdatePackageDto,
    @Request() req
  ) {
    return this.packagesService.update(id, body, {
      userId: req.user.userId,
      role: req.user.role,
      email: req.user.email,
    });
  }

  @Roles("ADMIN", "SUPERADMIN")
  @Delete(":id")
  remove(@Param("id", ParseIntPipe) id: number, @Request() req) {
    return this.packagesService.remove(id, {
      userId: req.user.userId,
      role: req.user.role,
      email: req.user.email,
    });
  }
}

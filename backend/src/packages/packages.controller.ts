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
import { CreatePackageDto } from "./dto/create-package.dto";
import { PackagesService } from "./packages.service";
import { UpdatePackageDto } from "./dto/update-package.dto";

@Controller("packages")
export class PackagesController {
  constructor(private readonly packagesService: PackagesService) {}

  @Public()
  @Get()
  findAllPublic() {
    return this.packagesService.findAllPublic();
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
  create(@Body() body: CreatePackageDto) {
    return this.packagesService.create(body);
  }

  @Roles("ADMIN", "SUPERADMIN")
  @Patch(":id")
  update(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: UpdatePackageDto
  ) {
    return this.packagesService.update(id, body);
  }

  @Roles("ADMIN", "SUPERADMIN")
  @Delete(":id")
  remove(@Param("id", ParseIntPipe) id: number) {
    return this.packagesService.remove(id);
  }
}

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

import { PropertyImagesService } from "./property-images.service";
import { Public } from "../auth/public.decorator";
import { Roles } from "../auth/roles.decorator";

@Controller("property-images")
export class PropertyImagesController {
  constructor(
    private readonly propertyImagesService: PropertyImagesService
  ) {}

  @Roles("ADMIN", "SUPERADMIN")
  @Post()
  create(@Body() body: any) {
    return this.propertyImagesService.create(body);
  }

  @Public()
  @Get(":propertyId")
  findByProperty(
    @Param("propertyId", ParseIntPipe)
    propertyId: number
  ) {
    return this.propertyImagesService.findByProperty(
      propertyId
    );
  }

  @Roles("ADMIN", "SUPERADMIN")
  @Patch(":id/primary")
  setPrimary(
    @Param("id", ParseIntPipe)
    id: number
  ) {
    return this.propertyImagesService.setPrimary(id);
  }

  @Roles("ADMIN", "SUPERADMIN")
  @Patch(":id")
  update(
    @Param("id", ParseIntPipe)
    id: number,
    @Body() body: any
  ) {
    return this.propertyImagesService.update(id, body);
  }

  @Roles("ADMIN", "SUPERADMIN")
  @Delete(":id")
  remove(
    @Param("id", ParseIntPipe)
    id: number
  ) {
    return this.propertyImagesService.remove(id);
  }
}

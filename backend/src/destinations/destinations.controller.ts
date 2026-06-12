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
import { CreateDestinationDto } from "./dto/create-destination.dto";
import { UpdateProductDestinationsDto } from "./dto/update-product-destinations.dto";
import { UpdateDestinationRelationsDto } from "./dto/update-destination-relations.dto";
import { UpdateDestinationStatusDto } from "./dto/update-destination-status.dto";
import { UpdateDestinationDto } from "./dto/update-destination.dto";
import { DestinationsService } from "./destinations.service";

function actorFromRequest(req: any) {
  return {
    userId: req.user?.userId,
    role: req.user?.role,
    email: req.user?.email,
    name: req.user?.name,
  };
}

@Controller("destinations")
export class DestinationsController {
  constructor(private readonly service: DestinationsService) {}

  @Public()
  @Get()
  findAllPublic(@Query("featured") featured?: string) {
    return featured === "true"
      ? this.service.findFeaturedPublic()
      : this.service.findAllPublic();
  }

  @Roles("SUPERADMIN", "ADMIN", "ADVISOR")
  @Get("admin/all")
  findAllAdmin() {
    return this.service.findAllAdmin();
  }

  @Roles("SUPERADMIN", "ADMIN", "ADVISOR")
  @Get("admin/:id")
  findOneAdmin(@Param("id", ParseIntPipe) id: number) {
    return this.service.findOneAdmin(id);
  }

  @Roles("SUPERADMIN", "ADMIN", "ADVISOR")
  @Get(":id/relations")
  findRelations(@Param("id", ParseIntPipe) id: number) {
    return this.service.findRelations(id);
  }

  @Roles("SUPERADMIN", "ADMIN", "ADVISOR")
  @Get("product/:type/:productId")
  findProductDestinations(
    @Param("type") type: string,
    @Param("productId", ParseIntPipe) productId: number
  ) {
    return this.service.findProductDestinations(type, productId);
  }

  @Public()
  @Get(":slug")
  findOnePublic(@Param("slug") slug: string) {
    return this.service.findOnePublic(slug);
  }

  @Roles("SUPERADMIN", "ADMIN")
  @Post()
  create(@Body() body: CreateDestinationDto, @Request() req: any) {
    return this.service.create(body, actorFromRequest(req));
  }

  @Roles("SUPERADMIN", "ADMIN")
  @Patch(":id/status")
  updateStatus(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: UpdateDestinationStatusDto,
    @Request() req: any
  ) {
    return this.service.updateStatus(id, body.isActive, actorFromRequest(req));
  }

  @Roles("SUPERADMIN", "ADMIN")
  @Patch(":id/relations")
  updateRelations(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: UpdateDestinationRelationsDto,
    @Request() req: any
  ) {
    return this.service.updateRelations(id, body, actorFromRequest(req));
  }

  @Roles("SUPERADMIN", "ADMIN")
  @Patch("product/:type/:productId")
  updateProductDestinations(
    @Param("type") type: string,
    @Param("productId", ParseIntPipe) productId: number,
    @Body() body: UpdateProductDestinationsDto,
    @Request() req: any
  ) {
    return this.service.updateProductDestinations(
      type,
      productId,
      body,
      actorFromRequest(req)
    );
  }

  @Roles("SUPERADMIN", "ADMIN")
  @Patch(":id")
  update(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: UpdateDestinationDto,
    @Request() req: any
  ) {
    return this.service.update(id, body, actorFromRequest(req));
  }

  @Roles("SUPERADMIN", "ADMIN")
  @Delete(":id")
  remove(@Param("id", ParseIntPipe) id: number, @Request() req: any) {
    return this.service.remove(id, actorFromRequest(req));
  }
}

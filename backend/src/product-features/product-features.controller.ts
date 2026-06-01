import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  Query,
  Request,
} from "@nestjs/common";

import { Public } from "../auth/public.decorator";
import { Roles } from "../auth/roles.decorator";
import type {
  ProductFeatureAssignmentInput,
  ProductFeatureInput,
  ProductFeatureSetAssignmentsInput,
} from "./dto/product-feature.dto";
import { ProductFeaturesService } from "./product-features.service";

function actorFromRequest(req: any) {
  return {
    userId: req.user?.userId,
    role: req.user?.role,
    email: req.user?.email,
    name: req.user?.name,
  };
}

@Controller()
export class ProductFeaturesController {
  constructor(private readonly service: ProductFeaturesService) {}

  @Public()
  @Get("public-filters")
  getPublicFilters(@Query("type") type?: string) {
    return this.service.getPublicFilters(type);
  }

  @Roles("SUPERADMIN")
  @Get("product-features")
  findAll(@Query("appliesTo") appliesTo?: string) {
    return this.service.findAllAdmin(appliesTo);
  }

  @Roles("SUPERADMIN")
  @Get("product-features/assignments")
  findAssignments(
    @Query("productType") productType?: string,
    @Query("productId") productId?: string
  ) {
    return this.service.findAssignments(productType, productId);
  }

  @Roles("SUPERADMIN")
  @Get("product-features/:id")
  findOne(@Param("id", ParseIntPipe) id: number) {
    return this.service.findOneAdmin(id);
  }

  @Roles("SUPERADMIN")
  @Post("product-features")
  create(@Body() body: ProductFeatureInput, @Request() req: any) {
    return this.service.create(body, actorFromRequest(req));
  }

  @Roles("SUPERADMIN")
  @Patch("product-features/:id")
  update(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: ProductFeatureInput,
    @Request() req: any
  ) {
    return this.service.update(id, body, actorFromRequest(req));
  }

  @Roles("SUPERADMIN")
  @Patch("product-features/:id/status")
  setStatus(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: { active: boolean },
    @Request() req: any
  ) {
    return this.service.setStatus(id, Boolean(body.active), actorFromRequest(req));
  }

  @Roles("SUPERADMIN")
  @Delete("product-features/:id")
  remove(@Param("id", ParseIntPipe) id: number, @Request() req: any) {
    return this.service.remove(id, actorFromRequest(req));
  }

  @Roles("SUPERADMIN")
  @Post("product-features/assignments")
  assign(@Body() body: ProductFeatureAssignmentInput, @Request() req: any) {
    return this.service.assign(body, actorFromRequest(req));
  }

  @Roles("SUPERADMIN")
  @Delete("product-features/assignments")
  unassign(@Body() body: ProductFeatureAssignmentInput, @Request() req: any) {
    return this.service.unassign(body, actorFromRequest(req));
  }

  @Roles("SUPERADMIN")
  @Put("product-features/assignments")
  setAssignments(
    @Body() body: ProductFeatureSetAssignmentsInput,
    @Request() req: any
  ) {
    return this.service.setAssignments(body, actorFromRequest(req));
  }
}

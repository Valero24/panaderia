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
import { BlogService } from "./blog.service";
import { CreateBlogPostDto } from "./dto/create-blog-post.dto";
import { UpdateBlogPostStatusDto } from "./dto/update-blog-post-status.dto";
import { UpdateBlogPostDto } from "./dto/update-blog-post.dto";

function actorFromRequest(req: any) {
  return {
    userId: req.user?.userId,
    role: req.user?.role,
    email: req.user?.email,
    name: req.user?.name,
  };
}

@Controller("blog")
export class BlogController {
  constructor(private readonly service: BlogService) {}

  @Public()
  @Get()
  findAllPublic(@Query("featured") featured?: string) {
    return featured === "true"
      ? this.service.findFeaturedPublic()
      : this.service.findAllPublic();
  }

  @Roles("SUPERADMIN", "ADMIN")
  @Get("admin/all")
  findAllAdmin() {
    return this.service.findAllAdmin();
  }

  @Roles("SUPERADMIN", "ADMIN")
  @Get("admin/:id")
  findOneAdmin(@Param("id", ParseIntPipe) id: number) {
    return this.service.findOneAdmin(id);
  }

  @Public()
  @Get(":slug")
  findOnePublic(@Param("slug") slug: string) {
    return this.service.findOnePublic(slug);
  }

  @Roles("SUPERADMIN", "ADMIN")
  @Post()
  create(@Body() body: CreateBlogPostDto, @Request() req: any) {
    return this.service.create(body, actorFromRequest(req));
  }

  @Roles("SUPERADMIN", "ADMIN")
  @Patch(":id/status")
  updateStatus(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: UpdateBlogPostStatusDto,
    @Request() req: any
  ) {
    return this.service.updateStatus(id, body.isPublished, actorFromRequest(req));
  }

  @Roles("SUPERADMIN", "ADMIN")
  @Patch(":id/publish")
  publish(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: UpdateBlogPostStatusDto,
    @Request() req: any
  ) {
    return this.service.updateStatus(id, body.isPublished, actorFromRequest(req));
  }

  @Roles("SUPERADMIN", "ADMIN")
  @Patch(":id/feature")
  feature(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: { isFeatured?: boolean },
    @Request() req: any
  ) {
    return this.service.updateFeature(id, Boolean(body.isFeatured), actorFromRequest(req));
  }

  @Roles("SUPERADMIN", "ADMIN")
  @Patch(":id")
  update(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: UpdateBlogPostDto,
    @Request() req: any
  ) {
    return this.service.update(id, body, actorFromRequest(req));
  }

  @Roles("SUPERADMIN")
  @Delete(":id")
  remove(@Param("id", ParseIntPipe) id: number, @Request() req: any) {
    return this.service.remove(id, actorFromRequest(req));
  }
}

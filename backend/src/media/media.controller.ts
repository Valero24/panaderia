import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseEnumPipe,
  ParseIntPipe,
  Patch,
  Post,
  Req,
} from "@nestjs/common";
import { MediaOwnerType } from "@prisma/client";

import { Roles } from "../auth/roles.decorator";
import { CreateMediaDto } from "./dto/create-media.dto";
import { UpdateMediaDto } from "./dto/update-media.dto";
import { MediaService } from "./media.service";

@Controller("media")
export class MediaController {
  constructor(private readonly media: MediaService) {}

  @Roles("ADVISOR", "ADMIN", "SUPERADMIN")
  @Get(":ownerType/:ownerId")
  getOwnerMedia(
    @Param("ownerType", new ParseEnumPipe(MediaOwnerType))
    ownerType: MediaOwnerType,
    @Param("ownerId", ParseIntPipe)
    ownerId: number
  ) {
    return this.media.getOwnerMedia(ownerType, ownerId);
  }

  @Roles("ADMIN", "SUPERADMIN")
  @Post(":ownerType/:ownerId")
  create(
    @Param("ownerType", new ParseEnumPipe(MediaOwnerType))
    ownerType: MediaOwnerType,
    @Param("ownerId", ParseIntPipe)
    ownerId: number,
    @Body() body: CreateMediaDto,
    @Req() request: any
  ) {
    return this.media.create(ownerType, ownerId, body, request.user);
  }

  @Roles("ADMIN", "SUPERADMIN")
  @Post(":ownerType/:ownerId/replace")
  replaceOwnerMedia(
    @Param("ownerType", new ParseEnumPipe(MediaOwnerType))
    ownerType: MediaOwnerType,
    @Param("ownerId", ParseIntPipe)
    ownerId: number,
    @Body() body: { items?: CreateMediaDto[] },
    @Req() request: any
  ) {
    return this.media.replaceOwnerMedia(
      ownerType,
      ownerId,
      Array.isArray(body.items) ? body.items : [],
      request.user
    );
  }

  @Roles("ADMIN", "SUPERADMIN")
  @Patch(":id")
  update(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: UpdateMediaDto,
    @Req() request: any
  ) {
    return this.media.update(id, body, request.user);
  }

  @Roles("ADMIN", "SUPERADMIN")
  @Patch(":id/main")
  setMain(@Param("id", ParseIntPipe) id: number, @Req() request: any) {
    return this.media.setMainMedia(id, request.user);
  }

  @Roles("ADMIN", "SUPERADMIN")
  @Patch(":id/order")
  reorder(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: { sortOrder?: number },
    @Req() request: any
  ) {
    return this.media.reorder(id, Number(body.sortOrder) || 0, request.user);
  }

  @Roles("ADMIN", "SUPERADMIN")
  @Delete(":id")
  remove(@Param("id", ParseIntPipe) id: number, @Req() request: any) {
    return this.media.remove(id, request.user);
  }
}

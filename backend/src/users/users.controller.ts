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
import { Roles } from "../auth/roles.decorator";
import { UsersService } from "./users.service";

@Roles("SUPERADMIN")
@Controller("users")
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get("advisors")
  listAdvisors() {
    return this.usersService.listAdvisors();
  }

  @Post("advisors")
  createAdvisor(@Body() body: any) {
    return this.usersService.createAdvisor(body);
  }

  @Patch("advisors/:id")
  updateAdvisor(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: any
  ) {
    return this.usersService.updateAdvisor(id, body);
  }

  @Patch("advisors/:id/status")
  setAdvisorStatus(
    @Param("id", ParseIntPipe) id: number,
    @Body("isActive") isActive: boolean
  ) {
    return this.usersService.setAdvisorStatus(id, Boolean(isActive));
  }

  @Delete("advisors/:id")
  removeAdvisor(
    @Param("id", ParseIntPipe) id: number,
    @Request() req
  ) {
    return this.usersService.removeAdvisor(id, req.user.userId);
  }
}

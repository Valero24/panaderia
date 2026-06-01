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
  createAdvisor(@Body() body: any, @Request() req) {
    return this.usersService.createAdvisor(body, {
      userId: req.user.userId,
      role: req.user.role,
      email: req.user.email,
    });
  }

  @Patch("advisors/:id")
  updateAdvisor(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: any,
    @Request() req
  ) {
    return this.usersService.updateAdvisor(id, body, {
      userId: req.user.userId,
      role: req.user.role,
      email: req.user.email,
    });
  }

  @Patch("advisors/:id/status")
  setAdvisorStatus(
    @Param("id", ParseIntPipe) id: number,
    @Body("isActive") isActive: boolean,
    @Request() req
  ) {
    return this.usersService.setAdvisorStatus(id, Boolean(isActive), {
      userId: req.user.userId,
      role: req.user.role,
      email: req.user.email,
    });
  }

  @Delete("advisors/:id")
  removeAdvisor(
    @Param("id", ParseIntPipe) id: number,
    @Request() req
  ) {
    return this.usersService.removeAdvisor(id, {
      userId: req.user.userId,
      role: req.user.role,
      email: req.user.email,
    });
  }
}

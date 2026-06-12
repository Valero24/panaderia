import { Body, Controller, Get, Param, Post, Request } from "@nestjs/common";

import { Roles } from "../auth/roles.decorator";
import { EmailService } from "./email.service";
import { EmailTemplateKey } from "./email.types";

@Roles("SUPERADMIN", "ADMIN")
@Controller("email")
export class EmailController {
  constructor(private readonly email: EmailService) {}

  @Get("pre-reservations/:id/logs")
  logs(@Param("id") id: string) {
    return this.email.listLogsForPreReservation(id);
  }

  @Post("pre-reservations/:id/resend")
  resend(
    @Param("id") id: string,
    @Body() body: { templateKey: EmailTemplateKey },
    @Request() req: any
  ) {
    return this.email.resendPreReservationEmail(id, body.templateKey, req.user);
  }
}

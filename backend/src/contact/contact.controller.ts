import { Body, Controller, Get, Post } from "@nestjs/common";

import { Public } from "../auth/public.decorator";
import { Roles } from "../auth/roles.decorator";
import { ContactService } from "./contact.service";
import { CreateContactRequestDto } from "./dto/create-contact-request.dto";

@Controller("contact")
export class ContactController {
  constructor(private readonly contactService: ContactService) {}

  @Public()
  @Post()
  create(@Body() body: CreateContactRequestDto) {
    return this.contactService.create(body);
  }

  @Roles("ADMIN", "SUPERADMIN", "ADVISOR")
  @Get()
  findAll() {
    return this.contactService.findAll();
  }
}

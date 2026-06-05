import { Body, Controller, Get, Param, Patch, Post, Query, Request } from "@nestjs/common";
import { Roles } from "../auth/roles.decorator";
import type { ListInvoicesDto } from "./dto/list-invoices.dto";
import type { UpdateInvoicePaymentStatusDto } from "./dto/update-invoice-payment-status.dto";
import type { UpdateInvoiceStatusDto } from "./dto/update-invoice-status.dto";
import { InvoicesService } from "./invoices.service";

@Roles("SUPERADMIN")
@Controller("invoices")
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @Get()
  findAll(@Query() query: ListInvoicesDto, @Request() req) {
    return this.invoicesService.findAll(query, req.user);
  }

  @Get(":id")
  findOne(@Param("id") id: string, @Request() req) {
    return this.invoicesService.findOne(Number(id), req.user);
  }

  @Post("from-booking/:bookingId")
  createFromBooking(@Param("bookingId") bookingId: string, @Request() req) {
    return this.invoicesService.createFromBooking(Number(bookingId), req.user);
  }

  @Patch(":id/status")
  updateStatus(
    @Param("id") id: string,
    @Body() body: UpdateInvoiceStatusDto,
    @Request() req
  ) {
    return this.invoicesService.updateStatus(Number(id), body.status, req.user);
  }

  @Patch(":id/payment-status")
  updatePaymentStatus(
    @Param("id") id: string,
    @Body() body: UpdateInvoicePaymentStatusDto,
    @Request() req
  ) {
    return this.invoicesService.updatePaymentStatus(
      Number(id),
      body.paymentStatus,
      req.user
    );
  }
}

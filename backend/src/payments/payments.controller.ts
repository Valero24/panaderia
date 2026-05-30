import {
  BadRequestException,
  Body,
  Controller,
  Headers,
  Param,
  Post,
  Req,
} from "@nestjs/common";

import { Request } from "express";
import { Public } from "../auth/public.decorator";
import { PaymentsService } from "./payments.service";
import { Roles } from "../auth/roles.decorator";

@Controller("payments")
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Roles("ADVISOR", "SUPERADMIN")
  @Post("create-payment-intent")
  createPaymentIntent(
    @Body("preReservationId") preReservationId: string
  ) {
    if (!preReservationId) {
      throw new BadRequestException("preReservationId es requerido");
    }

    return this.paymentsService.createPaymentIntent(preReservationId);
  }

  @Roles("ADVISOR", "SUPERADMIN")
  @Post("wompi/pre-reservations/:id/link")
  createWompiPaymentLink(
    @Param("id") id: string,
    @Req() req: Request & { user?: any }
  ) {
    return this.paymentsService.createWompiPaymentLink(
      id,
      req.user
    );
  }

  @Public()
  @Post("wompi/webhook")
  handleWompiWebhook(
    @Body() body: any,
    @Headers("x-event-checksum") checksum?: string
  ) {
    return this.paymentsService.handleWompiWebhook(
      body,
      checksum
    );
  }

  @Public()
  @Post("webhook")
  async handleWebhook(
    @Req() req: Request & { rawBody?: Buffer },
    @Headers("stripe-signature") signature: string
  ) {
    if (!signature) {
      throw new BadRequestException("Missing stripe signature");
    }

    if (!req.rawBody) {
      throw new BadRequestException(
        "Raw body no disponible. Configura rawBody en main.ts"
      );
    }

    return this.paymentsService.handleWebhook(req, signature);
  }
}

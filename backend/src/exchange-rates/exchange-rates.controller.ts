import { Body, Controller, Get, Param, Patch, Post, Query, Request } from "@nestjs/common";
import { Roles } from "../auth/roles.decorator";
import type { CreateExchangeRateDto } from "./dto/create-exchange-rate.dto";
import { ExchangeRatesService } from "./exchange-rates.service";

@Roles("SUPERADMIN")
@Controller("exchange-rates")
export class ExchangeRatesController {
  constructor(private readonly exchangeRatesService: ExchangeRatesService) {}

  @Get()
  findAll(@Query() query: any) {
    return this.exchangeRatesService.findAll(query);
  }

  @Get("active/:fromCurrency")
  getActiveRate(@Param("fromCurrency") fromCurrency: string) {
    return this.exchangeRatesService.getActiveRate(fromCurrency, "COP");
  }

  @Post()
  create(@Body() body: CreateExchangeRateDto, @Request() req) {
    return this.exchangeRatesService.create(body, {
      userId: req.user.userId,
      role: req.user.role,
      email: req.user.email,
    });
  }

  @Patch(":id/status")
  updateStatus(
    @Param("id") id: string,
    @Body("isActive") isActive: boolean,
    @Request() req
  ) {
    return this.exchangeRatesService.updateStatus(id, Boolean(isActive), {
      userId: req.user.userId,
      role: req.user.role,
      email: req.user.email,
    });
  }
}

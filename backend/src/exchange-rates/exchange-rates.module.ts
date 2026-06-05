import { Module } from "@nestjs/common";
import { CommonModule } from "../common/common.module";
import { PrismaModule } from "../prisma/prisma.module";
import { ExchangeRatesController } from "./exchange-rates.controller";
import { ExchangeRatesService } from "./exchange-rates.service";

@Module({
  imports: [PrismaModule, CommonModule],
  controllers: [ExchangeRatesController],
  providers: [ExchangeRatesService],
  exports: [ExchangeRatesService],
})
export class ExchangeRatesModule {}

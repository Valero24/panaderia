import { Global, Module } from "@nestjs/common";

import { CommonModule } from "../common/common.module";
import { PrismaModule } from "../prisma/prisma.module";
import { TranslationProviders } from "./translation.providers";
import { TranslationQueue } from "./translation.queue";
import { TranslationsController } from "./translations.controller";
import { TranslationsService } from "./translations.service";

@Global()
@Module({
  imports: [PrismaModule, CommonModule],
  controllers: [TranslationsController],
  providers: [TranslationsService, TranslationProviders, TranslationQueue],
  exports: [TranslationsService],
})
export class TranslationsModule {}

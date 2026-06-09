import { Body, Controller, Get, Param, ParseIntPipe, Post, Query } from "@nestjs/common";
import { TranslationEntityType, TranslationJobStatus } from "@prisma/client";

import { Roles } from "../auth/roles.decorator";
import { BulkEnqueueTranslationsDto } from "./dto/bulk-enqueue-translations.dto";
import { RegenerateTranslationsDto } from "./dto/regenerate-translations.dto";
import { TranslateEntityDto } from "./dto/translate-entity.dto";
import { TranslateFaqDto } from "./dto/translate-faq.dto";
import { TranslateTextDto } from "./dto/translate-text.dto";
import { TranslationsService } from "./translations.service";

@Controller("translations")
@Roles("SUPERADMIN", "ADMIN")
export class TranslationsController {
  constructor(private readonly service: TranslationsService) {}

  @Get("config")
  config() {
    return {
      provider: this.service.getProvider(),
      autoTranslationEnabled: this.service.isAutoTranslationEnabled(),
      sourceLanguage: this.service.getDefaultSourceLanguage(),
      targetLocales: this.service.getTargetLocales(),
      fields: this.service.getDefaultFields(),
    };
  }

  @Post("text")
  translateText(@Body() body: TranslateTextDto) {
    return this.service.translateText(
      body.text,
      body.targetLocale as "en" | "fr" | "pt" | "it",
      body.sourceLocale || "es"
    );
  }

  @Post("faq")
  translateFaq(@Body() body: TranslateFaqDto) {
    if (!body.targetLocale) {
      return this.service.translateFaqToLocales(
        body.faq,
        body.targetLocales,
        body.sourceLocale || "es"
      );
    }

    return this.service.translateFaq(
      body.faq,
      body.targetLocale as "en" | "fr" | "pt" | "it",
      body.sourceLocale || "es"
    );
  }

  @Post("entity")
  translateEntity(@Body() body: TranslateEntityDto) {
    return this.service.translateEntity(body);
  }

  @Get("jobs")
  jobs(@Query("status") status?: TranslationJobStatus, @Query("limit") limit?: string) {
    return this.service.findJobs(status, Number(limit) || 50);
  }

  @Post("jobs/process-pending")
  processPending(@Body("limit") limit?: number) {
    return this.service.processPendingJobs(Number(limit) || 5);
  }

  @Post("bulk-enqueue")
  bulkEnqueue(@Body() body: BulkEnqueueTranslationsDto) {
    return this.service.bulkEnqueueExistingEntities({
      items: body.items || [],
      overwrite: body.overwrite,
    });
  }

  @Post("import/enqueue")
  enqueueImportedSpanishContent(@Body() body: BulkEnqueueTranslationsDto) {
    return this.service.enqueueImportedSpanishContent({
      items: body.items || [],
    });
  }

  @Post(":entityType/:entityId/regenerate")
  regenerate(
    @Param("entityType") entityType: TranslationEntityType,
    @Param("entityId", ParseIntPipe) entityId: number,
    @Body() body: RegenerateTranslationsDto
  ) {
    return this.service.regenerateEntityTranslations({
      entityType,
      entityId,
      fields: body.fields,
      overwrite: body.overwrite,
    });
  }
}

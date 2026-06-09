import { IsArray, IsIn, IsOptional } from "class-validator";

export class TranslateFaqDto {
  @IsArray()
  faq: unknown[];

  @IsOptional()
  @IsIn(["es"])
  sourceLocale?: string;

  @IsOptional()
  @IsIn(["en", "fr", "pt", "it"])
  targetLocale?: string;

  @IsOptional()
  @IsArray()
  @IsIn(["en", "fr", "pt", "it"], { each: true })
  targetLocales?: string[];
}

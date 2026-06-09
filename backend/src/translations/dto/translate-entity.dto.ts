import {
  IsArray,
  IsBoolean,
  IsIn,
  IsObject,
  IsOptional,
  IsString,
} from "class-validator";

export class TranslateEntityDto {
  @IsObject()
  source: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  existingTranslations?: Record<string, unknown>;

  @IsOptional()
  @IsArray()
  fields?: string[];

  @IsOptional()
  @IsArray()
  @IsIn(["en", "fr", "pt", "it"], { each: true })
  targetLocales?: string[];

  @IsOptional()
  @IsString()
  sourceLocale?: string;

  @IsOptional()
  @IsBoolean()
  overwrite?: boolean;
}

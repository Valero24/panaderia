import { Type } from "class-transformer";
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  ValidateNested,
} from "class-validator";
import { TranslationEntityType } from "@prisma/client";

class BulkTranslationItemDto {
  @IsEnum(TranslationEntityType)
  entityType: TranslationEntityType;

  @IsInt()
  entityId: number;

  @IsOptional()
  @IsArray()
  fields?: string[];
}

export class BulkEnqueueTranslationsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BulkTranslationItemDto)
  items: BulkTranslationItemDto[];

  @IsOptional()
  @IsBoolean()
  overwrite?: boolean;
}

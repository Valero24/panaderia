import {
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from "class-validator";
import { BulkImportType } from "@prisma/client";

export class CreateBulkImportJobDto {
  @IsEnum(BulkImportType)
  type!: BulkImportType;

  @IsString()
  @MaxLength(255)
  originalFileName!: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  fileSize?: number;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  mimeType?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  source?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

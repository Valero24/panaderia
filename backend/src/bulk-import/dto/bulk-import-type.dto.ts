import { IsEnum, IsOptional, IsString } from "class-validator";
import { BulkImportStatus, BulkImportType } from "@prisma/client";

export class BulkImportTypeQueryDto {
  @IsOptional()
  @IsEnum(BulkImportType)
  type?: BulkImportType;

  @IsOptional()
  @IsEnum(BulkImportStatus)
  status?: BulkImportStatus;

  @IsOptional()
  @IsString()
  fromDate?: string;

  @IsOptional()
  @IsString()
  toDate?: string;

  @IsOptional()
  @IsString()
  createdById?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  page?: string;

  @IsOptional()
  @IsString()
  limit?: string;
}

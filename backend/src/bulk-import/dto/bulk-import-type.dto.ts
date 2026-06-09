import { IsEnum, IsOptional } from "class-validator";
import { BulkImportStatus, BulkImportType } from "@prisma/client";

export class BulkImportTypeQueryDto {
  @IsOptional()
  @IsEnum(BulkImportType)
  type?: BulkImportType;

  @IsOptional()
  @IsEnum(BulkImportStatus)
  status?: BulkImportStatus;
}

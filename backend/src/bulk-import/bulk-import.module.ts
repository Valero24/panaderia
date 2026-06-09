import { Module } from "@nestjs/common";

import { CommonModule } from "../common/common.module";
import { PrismaModule } from "../prisma/prisma.module";
import { BulkImportTemplatesService } from "./bulk-import-templates.service";
import { BulkImportController } from "./bulk-import.controller";
import { BulkImportService } from "./bulk-import.service";

@Module({
  imports: [PrismaModule, CommonModule],
  controllers: [BulkImportController],
  providers: [BulkImportService, BulkImportTemplatesService],
})
export class BulkImportModule {}

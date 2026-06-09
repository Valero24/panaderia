import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Request,
  Res,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { BulkImportType } from "@prisma/client";
import type { Response } from "express";

import { Roles } from "../auth/roles.decorator";
import { BulkImportTemplatesService } from "./bulk-import-templates.service";
import { BulkImportService } from "./bulk-import.service";
import { BulkImportTypeQueryDto } from "./dto/bulk-import-type.dto";
import { CreateBulkImportJobDto } from "./dto/create-bulk-import-job.dto";

function actorFromRequest(req: any) {
  return {
    userId: req.user?.userId,
    role: req.user?.role,
    email: req.user?.email,
    name: req.user?.name,
  };
}

@Roles("SUPERADMIN")
@Controller("bulk-import")
export class BulkImportController {
  constructor(
    private readonly service: BulkImportService,
    private readonly templates: BulkImportTemplatesService
  ) {}

  @Get("types")
  getTypes(@Request() req: any) {
    return this.service.getTypes(actorFromRequest(req));
  }

  @Get("rules")
  getRules() {
    return this.service.getRules();
  }

  @Get("templates/:type")
  async downloadTemplate(
    @Param("type") type: BulkImportType,
    @Request() req: any,
    @Res() res: Response
  ) {
    const buffer = await this.templates.buildTemplate(type);
    const fileName = this.templates.getTemplateFileName(type);
    await this.service.recordTemplateDownloaded(type, actorFromRequest(req));

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
    res.send(Buffer.from(buffer));
  }

  @Get("jobs")
  findJobs(@Query() query: BulkImportTypeQueryDto, @Request() req: any) {
    return this.service.findJobs(query, actorFromRequest(req));
  }

  @Get("jobs/:id")
  findJobById(@Param("id", ParseIntPipe) id: number) {
    return this.service.findJobById(id);
  }

  @Post("jobs")
  createJob(@Body() body: CreateBulkImportJobDto, @Request() req: any) {
    return this.service.createJob(body, actorFromRequest(req));
  }

  @Post("jobs/:id/upload")
  @UseInterceptors(
    FileInterceptor("file", {
      limits: {
        fileSize: 10 * 1024 * 1024,
      },
    })
  )
  uploadJobFile(
    @Param("id", ParseIntPipe) id: number,
    @UploadedFile() file: any,
    @Request() req: any
  ) {
    return this.service.uploadAndValidateJob(id, file, actorFromRequest(req));
  }

  @Post("jobs/:id/confirm")
  confirmJob(@Param("id", ParseIntPipe) id: number, @Request() req: any) {
    return this.service.confirmImport(id, actorFromRequest(req));
  }
}

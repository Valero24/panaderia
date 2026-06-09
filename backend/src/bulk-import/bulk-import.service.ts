import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  BulkImportStatus,
  BulkImportType,
  MediaType,
  Prisma,
  TranslationEntityType,
  TranslationStatus,
} from "@prisma/client";
import ExcelJS from "exceljs";
import { promises as fs } from "fs";
import path from "path";

import { AuditService } from "../common/audit.service";
import { PrismaService } from "../prisma/prisma.service";
import { BulkImportTemplatesService } from "./bulk-import-templates.service";
import { BulkImportTypeQueryDto } from "./dto/bulk-import-type.dto";
import { CreateBulkImportJobDto } from "./dto/create-bulk-import-job.dto";

type AuditActor = {
  userId?: number;
  role?: string;
  name?: string;
  email?: string;
};

type TemplateColumnSpec = {
  header: string;
  required: boolean;
  maxLength: number | null;
  allowedValues: string[];
};

type BulkImportValidationError = {
  code: string;
  message: string;
  column?: string;
  row?: number;
};

type RowInspection = {
  totalRows: number;
  dataRowNumbers: number[];
  invalidRowNumbers: Set<number>;
  errors: BulkImportValidationError[];
  warnings: BulkImportValidationError[];
  previewRows: BulkImportPreviewRow[];
};

type BulkImportPreviewRow = {
  row: number;
  displayName: string;
  expectedSlug: string;
  status: "VALID" | "INVALID";
  errors: BulkImportValidationError[];
  warnings: BulkImportValidationError[];
};

type ParsedBulkImportRow = {
  rowNumber: number;
  values: Record<string, string>;
};

type BulkImportExecutionError = {
  row: number;
  message: string;
};

const acceptedExtensions = [".xlsx"];
const maxUploadBytes = 10 * 1024 * 1024;

const bulkImportTypes: Record<
  BulkImportType,
  {
    label: string;
    description: string;
    templateSlug: string;
    enabled: boolean;
  }
> = {
  PROPERTY: {
    label: "Alojamientos",
    description: "Crear alojamientos masivamente desde Excel.",
    templateSlug: "alojamientos",
    enabled: true,
  },
  EXPERIENCE: {
    label: "Experiencias",
    description: "Crear experiencias masivamente desde Excel.",
    templateSlug: "experiencias",
    enabled: true,
  },
  PACKAGE: {
    label: "Paquetes",
    description: "Crear paquetes masivamente desde Excel.",
    templateSlug: "paquetes",
    enabled: true,
  },
  DESTINATION: {
    label: "Destinos",
    description: "Crear destinos masivamente desde Excel.",
    templateSlug: "destinos",
    enabled: true,
  },
  BLOG: {
    label: "Blog",
    description: "Crear artículos de blog masivamente desde Excel.",
    templateSlug: "blog",
    enabled: true,
  },
};

@Injectable()
export class BulkImportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly templates: BulkImportTemplatesService
  ) {}

  async getTypes(actor?: AuditActor | null) {
    await this.audit.record({
      actor,
      action: "BULK_IMPORT_MODULE_OPENED",
      entityType: "BulkImport",
      entityId: "module",
      message: "Módulo de carga masiva abierto",
      metadata: {
        supportedTypes: Object.keys(bulkImportTypes),
      },
    });

    return this.buildTypes();
  }

  getRules() {
    return {
      acceptedExtensions,
      maxUploadMb: maxUploadBytes / 1024 / 1024,
      supportedTypes: this.buildTypes(),
      currentScope: [
        "listar tipos de carga",
        "registrar intentos de carga",
        "mostrar historial base",
        "preparar validaciones futuras",
      ],
      securityRules: [
        "solo archivos .xlsx",
        "no ejecutar macros",
        "no procesar fórmulas",
        "no procesar contenido real todavía",
        "no guardar contenido de filas en auditoría",
      ],
      disabledActions: [
        "crear registros reales",
        "actualizar productos existentes",
        "disparar traducción automática",
      ],
    };
  }

  async findJobs(query: BulkImportTypeQueryDto = {}, actor?: AuditActor | null) {
    await this.audit.record({
      actor,
      action: "BULK_IMPORT_HISTORY_VIEWED",
      entityType: "BulkImportJob",
      entityId: "history",
      message: "Historial de carga masiva consultado",
      metadata: {
        type: query.type || null,
        status: query.status || null,
      },
    });

    return this.prisma.bulkImportJob.findMany({
      where: {
        ...(query.type ? { type: query.type } : {}),
        ...(query.status ? { status: query.status } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
  }

  async findJobById(id: number) {
    const job = await this.prisma.bulkImportJob.findUnique({
      where: { id },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });

    if (!job) {
      throw new NotFoundException("Carga masiva no encontrada");
    }

    return job;
  }

  async recordTemplateDownloaded(type: BulkImportType, actor?: AuditActor | null) {
    await this.audit.record({
      actor,
      action: "BULK_TEMPLATE_DOWNLOADED",
      entityType: "BulkImportTemplate",
      entityId: type,
      message: "Plantilla de carga masiva descargada",
      metadata: {
        type,
        downloadedAt: new Date().toISOString(),
      },
    });
  }

  async uploadAndValidateJob(
    id: number,
    file: any,
    actor?: AuditActor | null
  ) {
    const job = await this.prisma.bulkImportJob.findUnique({ where: { id } });

    if (!job) {
      throw new NotFoundException("Carga masiva no encontrada");
    }

    if (job.status === BulkImportStatus.COMPLETED) {
      throw new BadRequestException("No se puede modificar una carga completada");
    }

    this.validateUploadedFile(file);
    const storageKey = await this.saveBulkImportFile(id, file.buffer);

    await this.prisma.bulkImportJob.update({
      where: { id },
      data: {
        status: BulkImportStatus.VALIDATING,
        originalFileName: this.cleanFileName(file.originalname),
        fileSize: file.size,
        mimeType: file.mimetype || null,
        startedAt: new Date(),
        metadata: this.toJson({
          storageKey,
          uploadedAt: new Date().toISOString(),
        }),
      },
    });

    await this.audit.record({
      actor,
      action: "BULK_IMPORT_FILE_UPLOADED",
      entityType: "BulkImportJob",
      entityId: id,
      message: "Archivo de carga masiva recibido",
      metadata: {
        type: job.type,
        jobId: id,
        originalFileName: this.cleanFileName(file.originalname),
        fileSize: file.size,
        mimeType: file.mimetype || null,
      },
    });

    await this.audit.record({
      actor,
      action: "BULK_IMPORT_VALIDATION_STARTED",
      entityType: "BulkImportJob",
      entityId: id,
      message: "Validación de carga masiva iniciada",
      metadata: {
        type: job.type,
        jobId: id,
        startedAt: new Date().toISOString(),
      },
    });

    const validationResult = await this.validateWorkbook(job.type, file.buffer);
    const hasErrors = validationResult.errors.length > 0;
    const hasValidRows = validationResult.validRows > 0;

    const updatedJob = await this.prisma.bulkImportJob.update({
      where: { id },
      data: {
        status: hasValidRows
          ? BulkImportStatus.VALIDATED
          : BulkImportStatus.FAILED_VALIDATION,
        originalFileName: this.cleanFileName(file.originalname),
        fileSize: file.size,
        mimeType: file.mimetype || null,
        totalRows: validationResult.totalRows,
        validRows: validationResult.validRows,
        invalidRows: validationResult.invalidRows,
        validationSummary: this.toJson({
          status: hasValidRows ? "VALIDATED" : "FAILED_VALIDATION",
          type: job.type,
          expectedSheet: validationResult.expectedSheet,
          hasInstructionsSheet: validationResult.hasInstructionsSheet,
          headersMatched: validationResult.headersMatched,
          totalRows: validationResult.totalRows,
          validRows: validationResult.validRows,
          invalidRows: validationResult.invalidRows,
          errorsCount: validationResult.errors.length,
          warningCount: validationResult.warnings.length,
          checkedAt: new Date().toISOString(),
          message: hasErrors
            ? "Archivo validado con errores. Solo se importarán las filas válidas."
            : "Archivo validado correctamente. Listo para confirmar importación.",
        }),
        errorSummary: this.toJson({
          errors: validationResult.errors.slice(0, 200),
          warnings: validationResult.warnings.slice(0, 200),
          previewRows: validationResult.previewRows.slice(0, 100),
        }),
        validatedAt: new Date(),
        finishedAt: new Date(),
      },
    });

    await this.audit.record({
      actor,
      action: hasValidRows
        ? "BULK_IMPORT_VALIDATED"
        : "BULK_IMPORT_VALIDATION_FAILED",
      entityType: "BulkImportJob",
      entityId: id,
      message: hasValidRows
        ? "Archivo de carga masiva validado con filas disponibles"
        : "Archivo de carga masiva validado sin filas válidas",
      metadata: {
        type: job.type,
        jobId: id,
        status: updatedJob.status,
        totalRows: validationResult.totalRows,
        validRows: validationResult.validRows,
        invalidRows: validationResult.invalidRows,
        errorCount: validationResult.errors.length,
        warningCount: validationResult.warnings.length,
      },
    });

    return {
      ...updatedJob,
      validationResult,
      importExecutionEnabled: hasValidRows,
    };
  }

  async createJob(dto: CreateBulkImportJobDto, actor?: AuditActor | null) {
    const originalFileName = dto.originalFileName?.trim();

    if (!originalFileName) {
      throw new BadRequestException("Nombre de archivo requerido");
    }

    const lowerName = originalFileName.toLowerCase();
    const hasValidExtension = acceptedExtensions.some((extension) =>
      lowerName.endsWith(extension)
    );

    if (!hasValidExtension) {
      throw new BadRequestException("El archivo debe ser XLSX");
    }

    const job = await this.prisma.bulkImportJob.create({
      data: {
        type: dto.type,
        status: BulkImportStatus.UPLOADED,
        originalFileName,
        fileSize: dto.fileSize ?? null,
        mimeType: dto.mimeType?.trim() || null,
        source: dto.source?.trim() || "ADMIN_UPLOAD",
        validationSummary: {
          status: "PENDING",
          message:
            "Archivo registrado. La validación detallada se implementará en el siguiente bloque.",
          acceptedExtensions,
        },
        metadata: this.toJson({
          uploadMode: "BASE_REGISTRATION_ONLY",
          originalLastModified:
            typeof dto.metadata?.originalLastModified === "number"
              ? dto.metadata.originalLastModified
              : undefined,
        }),
        createdById: actor?.userId ?? null,
        createdByEmail: actor?.email ?? null,
        createdByRole: actor?.role ?? null,
      },
    });

    await this.audit.record({
      actor,
      action: "BULK_IMPORT_JOB_CREATED",
      entityType: "BulkImportJob",
      entityId: job.id,
      message: "Intento de carga masiva registrado",
      newValue: {
        id: job.id,
        type: job.type,
        status: job.status,
        originalFileName: job.originalFileName,
        fileSize: job.fileSize,
      },
    });

    return {
      ...job,
      importExecutionEnabled: false,
      message:
        "Carga registrada para validación. Este bloque no ejecuta importación real.",
    };
  }

  async confirmImport(id: number, actor?: AuditActor | null) {
    const job = await this.prisma.bulkImportJob.findUnique({ where: { id } });

    if (!job) {
      throw new NotFoundException("Carga masiva no encontrada");
    }

    if (job.status !== BulkImportStatus.VALIDATED) {
      throw new BadRequestException("La carga debe estar validada antes de importar");
    }

    if (job.validRows <= 0) {
      throw new BadRequestException("No hay filas válidas para importar");
    }

    const storageKey = this.getStorageKey(job.metadata);
    if (!storageKey) {
      throw new BadRequestException("No se encontró el archivo validado para importar");
    }

    const fileBuffer = await this.readBulkImportFile(storageKey);
    const validationResult = await this.validateWorkbook(job.type, fileBuffer);

    if (validationResult.validRows <= 0) {
      throw new BadRequestException("La validación actual no contiene filas válidas");
    }

    await this.prisma.bulkImportJob.update({
      where: { id },
      data: {
        status: BulkImportStatus.IMPORTING,
        startedAt: new Date(),
      },
    });

    await this.audit.record({
      actor,
      action: "BULK_IMPORT_STARTED",
      entityType: "BulkImportJob",
      entityId: id,
      message: "Importación masiva iniciada",
      metadata: {
        jobId: id,
        type: job.type,
        validRows: validationResult.validRows,
        invalidRows: validationResult.invalidRows,
      },
    });

    const validRowNumbers = new Set(validationResult.validRowNumbers);
    const rows = await this.readWorkbookRows(job.type, fileBuffer, validRowNumbers);
    const executionErrors: BulkImportExecutionError[] = [];
    let createdRows = 0;
    let failedRows = 0;

    for (const row of rows) {
      try {
        await this.prisma.$transaction(async (tx) => {
          await this.createImportedRow(tx, job.type, row);
        });
        createdRows += 1;
      } catch (error) {
        failedRows += 1;
        executionErrors.push({
          row: row.rowNumber,
          message: this.cleanErrorMessage(error),
        });
      }
    }

    const finalStatus =
      createdRows > 0 ? BulkImportStatus.COMPLETED : BulkImportStatus.FAILED;

    const updatedJob = await this.prisma.bulkImportJob.update({
      where: { id },
      data: {
        status: finalStatus,
        totalRows: validationResult.totalRows,
        validRows: validationResult.validRows,
        invalidRows: validationResult.invalidRows,
        createdRows,
        failedRows,
        completedAt: new Date(),
        finishedAt: new Date(),
        errorSummary: this.toJson({
          ...(this.asRecord(job.errorSummary) || {}),
          importErrors: executionErrors.slice(0, 200),
          importSummary: {
            createdRows,
            failedRows,
            attemptedRows: rows.length,
          },
        }),
      },
    });

    await this.audit.record({
      actor,
      action:
        finalStatus === BulkImportStatus.COMPLETED
          ? "BULK_IMPORT_COMPLETED"
          : "BULK_IMPORT_FAILED",
      entityType: "BulkImportJob",
      entityId: id,
      message:
        finalStatus === BulkImportStatus.COMPLETED
          ? "Importación masiva completada"
          : "Importación masiva fallida",
      metadata: {
        jobId: id,
        type: job.type,
        createdRows,
        failedRows,
        validRows: validationResult.validRows,
        invalidRows: validationResult.invalidRows,
      },
    });

    return {
      ...updatedJob,
      importResult: {
        createdRows,
        failedRows,
        errors: executionErrors.slice(0, 50),
      },
    };
  }

  private buildTypes() {
    return Object.entries(bulkImportTypes).map(([type, config]) => ({
      type,
      ...config,
      acceptedExtensions,
      importExecutionEnabled: false,
    }));
  }

  private validateUploadedFile(file: any) {
    if (!file) {
      throw new BadRequestException("Archivo requerido");
    }

    const originalFileName = this.cleanFileName(file.originalname);
    const lowerName = originalFileName.toLowerCase();

    if (!lowerName.endsWith(".xlsx")) {
      throw new BadRequestException("Solo se aceptan archivos .xlsx");
    }

    if (
      lowerName.endsWith(".xls") ||
      lowerName.endsWith(".csv") ||
      lowerName.endsWith(".xlsm")
    ) {
      throw new BadRequestException("Formato de archivo no permitido");
    }

    if (!file.size || file.size > maxUploadBytes) {
      throw new BadRequestException("El archivo supera el límite de 10 MB");
    }

    if (!file.buffer || !Buffer.isBuffer(file.buffer)) {
      throw new BadRequestException("No fue posible leer el archivo");
    }
  }

  private async validateWorkbook(type: BulkImportType, buffer: Buffer) {
    const spec = this.templates.getTemplateSpec(type);
    const errors: BulkImportValidationError[] = [];
    const warnings: BulkImportValidationError[] = [];
    const workbook = new ExcelJS.Workbook();

    try {
      const arrayBuffer = buffer.buffer.slice(
        buffer.byteOffset,
        buffer.byteOffset + buffer.byteLength
      );
      await workbook.xlsx.load(arrayBuffer as any);
    } catch {
      return {
        expectedSheet: spec.sheetName,
        hasInstructionsSheet: false,
        headersMatched: false,
        totalRows: 0,
        validRows: 0,
        invalidRows: 0,
        errors: [
          {
            code: "INVALID_XLSX",
            message: "El archivo no es un Excel .xlsx válido.",
          },
        ],
        warnings,
        warningsCount: warnings.length,
        previewRows: [],
        validRowNumbers: [],
      };
    }

    const instructionsSheet = workbook.getWorksheet("Instrucciones");
    const dataSheet = workbook.getWorksheet(spec.sheetName);

    if (!instructionsSheet) {
      errors.push({
        code: "MISSING_INSTRUCTIONS_SHEET",
        message: "Falta la hoja Instrucciones.",
      });
    }

    if (!dataSheet) {
      errors.push({
        code: "MISSING_DATA_SHEET",
        message: "La plantilla no corresponde al tipo seleccionado.",
      });

      return {
        expectedSheet: spec.sheetName,
        hasInstructionsSheet: Boolean(instructionsSheet),
        headersMatched: false,
        totalRows: 0,
        validRows: 0,
        invalidRows: 0,
        errors,
        warnings,
        warningsCount: warnings.length,
        previewRows: [],
        validRowNumbers: [],
      };
    }

    const actualHeaders = this.readHeaders(dataSheet, spec.headers.length);
    const extraHeaders = this.readExtraHeaders(dataSheet, spec.headers.length);

    spec.headers.forEach((expectedHeader, index) => {
      const actualHeader = actualHeaders[index];

      if (!actualHeader) {
        errors.push({
          code: "MISSING_HEADER",
          column: expectedHeader,
          message: `Falta la columna oficial ${expectedHeader}.`,
        });
        return;
      }

      if (actualHeader !== expectedHeader) {
        errors.push({
          code: "MODIFIED_HEADER",
          column: expectedHeader,
          message: `Encabezado modificado. Se esperaba ${expectedHeader} y se recibió ${actualHeader}.`,
        });
      }
    });

    extraHeaders.forEach((header) => {
      errors.push({
        code: "EXTRA_HEADER",
        column: header,
        message: `Columna no oficial detectada: ${header}.`,
      });
    });

    const rowStats = await this.inspectDataRows(type, dataSheet, spec.columns);
    errors.push(...rowStats.errors);
    warnings.push(...rowStats.warnings);

    const headerErrors = errors.filter((error) =>
      ["MISSING_HEADER", "MODIFIED_HEADER", "EXTRA_HEADER"].includes(error.code)
    );
    const invalidRows =
      headerErrors.length > 0
        ? rowStats.totalRows
        : rowStats.invalidRowNumbers.size;
    const previewRows =
      headerErrors.length > 0
        ? rowStats.previewRows.map((previewRow) => ({
            ...previewRow,
            status: "INVALID" as const,
          }))
        : rowStats.previewRows;
    const validRowNumbers =
      headerErrors.length > 0
        ? []
        : rowStats.dataRowNumbers.filter(
            (rowNumber) => !rowStats.invalidRowNumbers.has(rowNumber)
          );

    return {
      expectedSheet: spec.sheetName,
      hasInstructionsSheet: Boolean(instructionsSheet),
      headersMatched: headerErrors.length === 0,
      totalRows: rowStats.totalRows,
      validRows: Math.max(0, rowStats.totalRows - invalidRows),
      invalidRows,
      warningsCount: warnings.length,
      errors,
      warnings,
      previewRows,
      validRowNumbers,
    };
  }

  private readHeaders(sheet: ExcelJS.Worksheet, expectedLength: number) {
    const row = sheet.getRow(1);
    const headers: string[] = [];

    for (let index = 1; index <= expectedLength; index += 1) {
      headers.push(String(row.getCell(index).text || "").trim());
    }

    return headers;
  }

  private readExtraHeaders(sheet: ExcelJS.Worksheet, expectedLength: number) {
    const row = sheet.getRow(1);
    const extras: string[] = [];

    for (let index = expectedLength + 1; index <= row.cellCount; index += 1) {
      const value = String(row.getCell(index).text || "").trim();
      if (value) extras.push(value);
    }

    return extras;
  }

  private async inspectDataRows(
    type: BulkImportType,
    sheet: ExcelJS.Worksheet,
    columns: TemplateColumnSpec[]
  ): Promise<RowInspection> {
    const errors: BulkImportValidationError[] = [];
    const warnings: BulkImportValidationError[] = [];
    const invalidRowNumbers = new Set<number>();
    let totalRows = 0;
    const dataRowNumbers: number[] = [];
    const excelSlugs = new Map<string, number>();
    const slugsToCheck = new Map<string, number>();
    const relationSlugsToCheck = new Map<string, Set<string>>();
    const previewBaseRows: Array<{
      row: number;
      displayName: string;
      expectedSlug: string;
    }> = [];

    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;

      let hasData = false;
      const valuesByHeader: Record<string, string> = {};
      const rawByHeader: Record<string, unknown> = {};

      columns.forEach((column, index) => {
        const cell = row.getCell(index + 1);
        const value = cell.value as any;
        const text = this.getCellText(cell).trim();

        valuesByHeader[column.header] = text;
        rawByHeader[column.header] = value;

        if (value !== null && value !== undefined && text) {
          hasData = true;
        }

        if (value && typeof value === "object" && "formula" in value) {
          hasData = true;
          this.addRowError(
            errors,
            invalidRowNumbers,
            rowNumber,
            "FORMULA_NOT_ALLOWED",
            "No se permiten fórmulas. Ingresa el valor final como texto o número.",
            column.header
          );
        }
      });

      if (!hasData) return;

      totalRows += 1;
      dataRowNumbers.push(rowNumber);
      previewBaseRows.push({
        row: rowNumber,
        displayName: this.getPreviewName(type, valuesByHeader),
        expectedSlug: this.getExpectedSlug(valuesByHeader),
      });

      columns.forEach((column) => {
        const value = valuesByHeader[column.header];

        if (column.required && !value) {
          this.addRowError(
            errors,
            invalidRowNumbers,
            rowNumber,
            "REQUIRED_FIELD_EMPTY",
            `Fila ${rowNumber} — ${column.header}: campo obligatorio vacío.`,
            column.header
          );
          return;
        }

        if (column.maxLength && value.length > column.maxLength) {
          this.addRowError(
            errors,
            invalidRowNumbers,
            rowNumber,
            "MAX_LENGTH_EXCEEDED",
            `Fila ${rowNumber} — ${column.header} supera ${column.maxLength} caracteres.`,
            column.header
          );
        }

        if (column.allowedValues.length && value) {
          const normalizedValue = value.toUpperCase();
          const allowedValues = column.allowedValues.map((option) =>
            option.toUpperCase()
          );

          if (!allowedValues.includes(normalizedValue)) {
            this.addRowError(
              errors,
              invalidRowNumbers,
              rowNumber,
              "INVALID_ALLOWED_VALUE",
              `Fila ${rowNumber} — ${column.header} debe ser ${column.allowedValues.join(" o ")}.`,
              column.header
            );
          }
        }
      });

      this.validateNumericFields(valuesByHeader, errors, invalidRowNumbers, rowNumber);
      this.validateMinMaxPair(
        valuesByHeader,
        errors,
        invalidRowNumbers,
        rowNumber,
        "capacidad_minima",
        "capacidad_maxima"
      );
      this.validateMinMaxPair(
        valuesByHeader,
        errors,
        invalidRowNumbers,
        rowNumber,
        "personas_minimas",
        "personas_maximas"
      );
      this.validateDateField(
        valuesByHeader,
        rawByHeader,
        errors,
        invalidRowNumbers,
        rowNumber,
        "fecha_publicacion"
      );
      this.validateTimeField(
        valuesByHeader,
        rawByHeader,
        errors,
        invalidRowNumbers,
        rowNumber,
        "check_in"
      );
      this.validateTimeField(
        valuesByHeader,
        rawByHeader,
        errors,
        invalidRowNumbers,
        rowNumber,
        "check_out"
      );

      this.validateSlugField(
        type,
        valuesByHeader,
        errors,
        warnings,
        invalidRowNumbers,
        rowNumber,
        excelSlugs,
        slugsToCheck
      );
      this.validateMediaFields(
        valuesByHeader,
        errors,
        warnings,
        invalidRowNumbers,
        rowNumber
      );
      this.validateFaqFields(
        valuesByHeader,
        errors,
        invalidRowNumbers,
        rowNumber
      );
      this.validatePackageComponents(
        type,
        valuesByHeader,
        errors,
        invalidRowNumbers,
        rowNumber
      );
      this.validateOptionalTranslations(
        valuesByHeader,
        warnings,
        rowNumber
      );
      this.validateListFields(
        valuesByHeader,
        errors,
        warnings,
        invalidRowNumbers,
        rowNumber,
        relationSlugsToCheck
      );
    });

    await this.validateExistingEntitySlugs(
      type,
      slugsToCheck,
      errors,
      invalidRowNumbers
    );
    await this.validateRelationSlugs(relationSlugsToCheck, warnings);
    const previewRows = this.buildPreviewRows(
      previewBaseRows,
      errors,
      warnings,
      invalidRowNumbers
    );

    return {
      totalRows,
      dataRowNumbers,
      invalidRowNumbers,
      errors,
      warnings,
      previewRows,
    };
  }

  private addRowError(
    errors: BulkImportValidationError[],
    invalidRowNumbers: Set<number>,
    row: number,
    code: string,
    message: string,
    column?: string
  ) {
    invalidRowNumbers.add(row);

    if (errors.length >= 200) return;

    errors.push({
      code,
      row,
      column,
      message,
    });
  }

  private buildPreviewRows(
    baseRows: Array<{ row: number; displayName: string; expectedSlug: string }>,
    errors: BulkImportValidationError[],
    warnings: BulkImportValidationError[],
    invalidRowNumbers: Set<number>
  ): BulkImportPreviewRow[] {
    return baseRows.slice(0, 100).map((baseRow) => {
      const rowErrors = errors.filter((error) => error.row === baseRow.row);
      const rowWarnings = warnings.filter((warning) => warning.row === baseRow.row);

      return {
        ...baseRow,
        status: invalidRowNumbers.has(baseRow.row) ? "INVALID" : "VALID",
        errors: rowErrors.slice(0, 10),
        warnings: rowWarnings.slice(0, 10),
      };
    });
  }

  private getPreviewName(type: BulkImportType, valuesByHeader: Record<string, string>) {
    const candidate =
      type === "BLOG"
        ? valuesByHeader.titulo || valuesByHeader.nombre
        : valuesByHeader.nombre || valuesByHeader.titulo;

    return this.truncatePreviewText(candidate || "Sin nombre", 120);
  }

  private getExpectedSlug(valuesByHeader: Record<string, string>) {
    if (valuesByHeader.slug) return valuesByHeader.slug;

    const base =
      valuesByHeader.nombre ||
      valuesByHeader.titulo ||
      valuesByHeader.extracto ||
      "slug-pendiente";

    return this.slugify(base);
  }

  private slugify(value: string) {
    const slug = value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 150);

    return slug || "slug-pendiente";
  }

  private truncatePreviewText(value: string, maxLength: number) {
    return value.length > maxLength ? `${value.slice(0, maxLength - 1)}…` : value;
  }

  private validateNumericFields(
    valuesByHeader: Record<string, string>,
    errors: BulkImportValidationError[],
    invalidRowNumbers: Set<number>,
    rowNumber: number
  ) {
    const numericFields = [
      "precio_cop",
      "capacidad",
      "habitaciones",
      "banos",
      "capacidad_minima",
      "capacidad_maxima",
      "personas_minimas",
      "personas_maximas",
      "orden",
      "estadia_minima",
    ];

    numericFields.forEach((field) => {
      if (!(field in valuesByHeader)) return;

      const value = valuesByHeader[field];
      if (!value) return;

      const numberValue = this.parseNumber(value);

      if (numberValue === null) {
        this.addRowError(
          errors,
          invalidRowNumbers,
          rowNumber,
          "INVALID_NUMBER",
          `Fila ${rowNumber} — ${field} debe ser un número válido.`,
          field
        );
        return;
      }

      if (numberValue < 0) {
        this.addRowError(
          errors,
          invalidRowNumbers,
          rowNumber,
          "NEGATIVE_NUMBER",
          `Fila ${rowNumber} — ${field} no puede ser negativo.`,
          field
        );
      }
    });
  }

  private validateMinMaxPair(
    valuesByHeader: Record<string, string>,
    errors: BulkImportValidationError[],
    invalidRowNumbers: Set<number>,
    rowNumber: number,
    minField: string,
    maxField: string
  ) {
    if (!(minField in valuesByHeader) || !(maxField in valuesByHeader)) return;

    const minValue = valuesByHeader[minField]
      ? this.parseNumber(valuesByHeader[minField])
      : null;
    const maxValue = valuesByHeader[maxField]
      ? this.parseNumber(valuesByHeader[maxField])
      : null;

    if (minValue === null || maxValue === null) return;

    if (minValue > maxValue) {
      this.addRowError(
        errors,
        invalidRowNumbers,
        rowNumber,
        "MIN_GREATER_THAN_MAX",
        `Fila ${rowNumber} — ${minField} no puede ser mayor que ${maxField}.`,
        minField
      );
    }
  }

  private validateDateField(
    valuesByHeader: Record<string, string>,
    rawByHeader: Record<string, unknown>,
    errors: BulkImportValidationError[],
    invalidRowNumbers: Set<number>,
    rowNumber: number,
    field: string
  ) {
    if (!(field in valuesByHeader)) return;

    const value = valuesByHeader[field];
    if (!value) return;

    if (!this.isValidDateValue(rawByHeader[field], value)) {
      this.addRowError(
        errors,
        invalidRowNumbers,
        rowNumber,
        "INVALID_DATE",
        `Fila ${rowNumber} — ${field} tiene formato inválido.`,
        field
      );
    }
  }

  private validateTimeField(
    valuesByHeader: Record<string, string>,
    rawByHeader: Record<string, unknown>,
    errors: BulkImportValidationError[],
    invalidRowNumbers: Set<number>,
    rowNumber: number,
    field: string
  ) {
    if (!(field in valuesByHeader)) return;

    const value = valuesByHeader[field];
    if (!value) return;

    if (!this.isValidTimeValue(rawByHeader[field], value)) {
      this.addRowError(
        errors,
        invalidRowNumbers,
        rowNumber,
        "INVALID_TIME",
        `Fila ${rowNumber} — ${field} tiene formato inválido.`,
        field
      );
    }
  }

  private validateSlugField(
    type: BulkImportType,
    valuesByHeader: Record<string, string>,
    errors: BulkImportValidationError[],
    warnings: BulkImportValidationError[],
    invalidRowNumbers: Set<number>,
    rowNumber: number,
    excelSlugs: Map<string, number>,
    slugsToCheck: Map<string, number>
  ) {
    if (!("slug" in valuesByHeader)) return;

    const slug = valuesByHeader.slug.trim();

    if (!slug) {
      this.addWarning(
        warnings,
        rowNumber,
        "SLUG_AUTO_GENERATED",
        `Fila ${rowNumber} — slug vacío: se generará automáticamente.`,
        "slug"
      );
      return;
    }

    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      this.addRowError(
        errors,
        invalidRowNumbers,
        rowNumber,
        "INVALID_SLUG_FORMAT",
        `Fila ${rowNumber} — slug debe estar en minúsculas, sin espacios ni caracteres especiales.`,
        "slug"
      );
    }

    const firstRow = excelSlugs.get(slug);
    if (firstRow) {
      this.addRowError(
        errors,
        invalidRowNumbers,
        rowNumber,
        "DUPLICATED_SLUG_IN_EXCEL",
        `Fila ${rowNumber} — slug duplicado. Ya existe en la fila ${firstRow}.`,
        "slug"
      );
      return;
    }

    excelSlugs.set(slug, rowNumber);
    slugsToCheck.set(`${type}:${slug}`, rowNumber);
  }

  private validateMediaFields(
    valuesByHeader: Record<string, string>,
    errors: BulkImportValidationError[],
    warnings: BulkImportValidationError[],
    invalidRowNumbers: Set<number>,
    rowNumber: number
  ) {
    let mainMediaCount = 0;
    let mediaUrlCount = 0;

    [1, 2, 3].forEach((index) => {
      const typeField = `media_${index}_tipo`;
      const urlField = `media_${index}_url`;
      const mainField = `media_${index}_principal`;
      const mediaType = valuesByHeader[typeField];
      const mediaUrl = valuesByHeader[urlField];
      const mediaMain = valuesByHeader[mainField];

      if (mediaUrl) mediaUrlCount += 1;

      if (mediaUrl && !mediaType) {
        this.addRowError(
          errors,
          invalidRowNumbers,
          rowNumber,
          "MEDIA_TYPE_REQUIRED",
          `Fila ${rowNumber} — ${typeField} es obligatorio si ${urlField} existe.`,
          typeField
        );
      }

      if (mediaType && !mediaUrl) {
        this.addRowError(
          errors,
          invalidRowNumbers,
          rowNumber,
          "MEDIA_URL_REQUIRED",
          `Fila ${rowNumber} — ${urlField} es obligatorio si ${typeField} existe.`,
          urlField
        );
      }

      if (mediaUrl && !this.isValidUrl(mediaUrl)) {
        this.addRowError(
          errors,
          invalidRowNumbers,
          rowNumber,
          "INVALID_MEDIA_URL",
          `Fila ${rowNumber} — ${urlField} no es una URL válida.`,
          urlField
        );
      }

      if (mediaMain.toUpperCase() === "SI") {
        mainMediaCount += 1;
      }
    });

    if (mainMediaCount > 1) {
      this.addRowError(
        errors,
        invalidRowNumbers,
        rowNumber,
        "MULTIPLE_MAIN_MEDIA",
        `Fila ${rowNumber} — solo puede existir una media principal.`,
        "media_principal"
      );
    }

    if (mediaUrlCount > 0 && mainMediaCount === 0) {
      this.addWarning(
        warnings,
        rowNumber,
        "MAIN_MEDIA_MISSING",
        `Fila ${rowNumber} — sin imagen o video principal marcado.`,
        "media_principal"
      );
    }
  }

  private validateFaqFields(
    valuesByHeader: Record<string, string>,
    errors: BulkImportValidationError[],
    invalidRowNumbers: Set<number>,
    rowNumber: number
  ) {
    Object.entries(valuesByHeader)
      .filter(([field]) => field === "faq" || /^[a-z]{2}_faq$/.test(field))
      .forEach(([field, value]) => {
        if (!value) return;

        const blocks = value
          .split(";")
          .map((block) => block.trim())
          .filter(Boolean);

        if (blocks.length === 0) return;

        blocks.forEach((block) => {
          const parts = block.split("|").map((part) => part.trim());
          const hasExactlyQuestionAndAnswer = parts.length === 2;
          const [question, answer] = parts;

          if (!hasExactlyQuestionAndAnswer || !question || !answer) {
            this.addRowError(
              errors,
              invalidRowNumbers,
              rowNumber,
              "INVALID_FAQ_FORMAT",
              `Fila ${rowNumber} — ${field} debe usar el formato pregunta|respuesta; pregunta|respuesta.`,
              field
            );
          }
        });
      });
  }

  private validatePackageComponents(
    type: BulkImportType,
    valuesByHeader: Record<string, string>,
    errors: BulkImportValidationError[],
    invalidRowNumbers: Set<number>,
    rowNumber: number
  ) {
    if (type !== "PACKAGE") return;

    [1, 2, 3].forEach((index) => {
      const typeField = `componente_${index}_tipo`;
      const nameField = `componente_${index}_nombre`;
      const dayField = `componente_${index}_dia`;
      const orderField = `componente_${index}_orden`;
      const componentType = valuesByHeader[typeField];
      const componentName = valuesByHeader[nameField];

      if (componentType && !componentName) {
        this.addRowError(
          errors,
          invalidRowNumbers,
          rowNumber,
          "PACKAGE_COMPONENT_NAME_REQUIRED",
          `Fila ${rowNumber} — ${nameField} es obligatorio si ${typeField} existe.`,
          nameField
        );
      }

      [dayField, orderField].forEach((field) => {
        const value = valuesByHeader[field];
        if (!value) return;

        const numberValue = this.parseNumber(value);
        if (numberValue === null) {
          this.addRowError(
            errors,
            invalidRowNumbers,
            rowNumber,
            "PACKAGE_COMPONENT_NUMBER_INVALID",
            `Fila ${rowNumber} — ${field} debe ser numérico.`,
            field
          );
          return;
        }

        if (numberValue < 0) {
          this.addRowError(
            errors,
            invalidRowNumbers,
            rowNumber,
            "PACKAGE_COMPONENT_NUMBER_NEGATIVE",
            `Fila ${rowNumber} — ${field} no puede ser negativo.`,
            field
          );
        }
      });
    });
  }

  private validateOptionalTranslations(
    valuesByHeader: Record<string, string>,
    warnings: BulkImportValidationError[],
    rowNumber: number
  ) {
    const translationFields = Object.keys(valuesByHeader).filter((field) =>
      /^(en|fr|pt|it)_/.test(field)
    );

    if (translationFields.length === 0) return;

    const filledTranslations = translationFields.filter(
      (field) => valuesByHeader[field]
    );

    if (filledTranslations.length > 0) return;

    this.addWarning(
      warnings,
      rowNumber,
      "TRANSLATIONS_EMPTY",
      `Fila ${rowNumber} — traducciones vacías: el motor de traducción automática podrá generarlas después.`,
      "translations"
    );
  }

  private validateListFields(
    valuesByHeader: Record<string, string>,
    errors: BulkImportValidationError[],
    warnings: BulkImportValidationError[],
    invalidRowNumbers: Set<number>,
    rowNumber: number,
    relationSlugsToCheck: Map<string, Set<string>>
  ) {
    const listFields = [
      "destinos_relacionados",
      "alojamientos_relacionados",
      "experiencias_relacionadas",
      "paquetes_relacionados",
      "tags",
      "palabras_clave",
      "caracteristicas",
      "servicios_incluidos",
      "extras_disponibles",
    ];
    const relationFields: Record<string, BulkImportType> = {
      destinos_relacionados: "DESTINATION",
      alojamientos_relacionados: "PROPERTY",
      experiencias_relacionadas: "EXPERIENCE",
      paquetes_relacionados: "PACKAGE",
    };

    listFields.forEach((field) => {
      if (!(field in valuesByHeader)) return;

      const value = valuesByHeader[field];
      if (!value) return;

      const items = value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
      const seen = new Set<string>();

      items.forEach((item) => {
        const normalizedItem = item.toLowerCase();

        if (seen.has(normalizedItem)) {
          this.addRowError(
            errors,
            invalidRowNumbers,
            rowNumber,
            "DUPLICATED_LIST_ITEM",
            `Fila ${rowNumber} — ${field} contiene el valor duplicado ${item}.`,
            field
          );
          return;
        }

        seen.add(normalizedItem);
      });

      if (field in relationFields) {
        const relationType = relationFields[field];
        const relationKey = `${relationType}:${field}:${rowNumber}`;

        relationSlugsToCheck.set(
          relationKey,
          new Set(items.map((item) => item.toLowerCase()))
        );

        items.forEach((item) => {
          if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(item)) {
            this.addWarning(
              warnings,
              rowNumber,
              "RELATION_SLUG_FORMAT_WARNING",
              `Fila ${rowNumber} — ${field} contiene un slug de relación con formato no recomendado: ${item}.`,
              field
            );
          }
        });
      }
    });
  }

  private async validateExistingEntitySlugs(
    type: BulkImportType,
    slugsToCheck: Map<string, number>,
    errors: BulkImportValidationError[],
    invalidRowNumbers: Set<number>
  ) {
    if (!this.prisma || slugsToCheck.size === 0) return;

    const slugs = Array.from(slugsToCheck.keys()).map((key) => key.split(":")[1]);
    const existingSlugs = await this.findExistingSlugs(type, slugs);

    existingSlugs.forEach((slug) => {
      const rowNumber = slugsToCheck.get(`${type}:${slug}`);
      if (!rowNumber) return;

      this.addRowError(
        errors,
        invalidRowNumbers,
        rowNumber,
        "DUPLICATED_SLUG_IN_DATABASE",
        `Fila ${rowNumber} — slug duplicado en base de datos.`,
        "slug"
      );
    });
  }

  private async validateRelationSlugs(
    relationSlugsToCheck: Map<string, Set<string>>,
    warnings: BulkImportValidationError[]
  ) {
    if (!this.prisma || relationSlugsToCheck.size === 0) return;

    const grouped = new Map<BulkImportType, Set<string>>();

    relationSlugsToCheck.forEach((slugs, key) => {
      const [type] = key.split(":") as [BulkImportType];

      if (!grouped.has(type)) grouped.set(type, new Set<string>());
      slugs.forEach((slug) => grouped.get(type)?.add(slug));
    });

    const existingByType = new Map<BulkImportType, Set<string>>();

    for (const [type, slugs] of grouped.entries()) {
      const existing = await this.findExistingSlugs(type, Array.from(slugs));
      existingByType.set(type, new Set(existing));
    }

    relationSlugsToCheck.forEach((slugs, key) => {
      const [type, field, rowText] = key.split(":");
      const rowNumber = Number(rowText);
      const existing = existingByType.get(type as BulkImportType) || new Set<string>();

      slugs.forEach((slug) => {
        if (existing.has(slug)) return;

        this.addWarning(
          warnings,
          rowNumber,
          "RELATION_NOT_FOUND",
          `Fila ${rowNumber} — ${field} referencia un slug no encontrado: ${slug}.`,
          field
        );
      });
    });
  }

  private async findExistingSlugs(type: BulkImportType, slugs: string[]) {
    if (!this.prisma || slugs.length === 0) return [];

    const uniqueSlugs = Array.from(new Set(slugs));

    switch (type) {
      case "PROPERTY": {
        const rows = await this.prisma.property.findMany({
          where: { slug: { in: uniqueSlugs } },
          select: { slug: true },
        });
        return rows.map((row) => row.slug).filter(Boolean) as string[];
      }
      case "EXPERIENCE": {
        const rows = await this.prisma.experience.findMany({
          where: { slug: { in: uniqueSlugs } },
          select: { slug: true },
        });
        return rows.map((row) => row.slug).filter(Boolean) as string[];
      }
      case "PACKAGE": {
        const rows = await this.prisma.package.findMany({
          where: { slug: { in: uniqueSlugs } },
          select: { slug: true },
        });
        return rows.map((row) => row.slug).filter(Boolean) as string[];
      }
      case "DESTINATION": {
        const rows = await this.prisma.destination.findMany({
          where: { slug: { in: uniqueSlugs } },
          select: { slug: true },
        });
        return rows.map((row) => row.slug).filter(Boolean) as string[];
      }
      case "BLOG": {
        const rows = await this.prisma.blogPost.findMany({
          where: { slug: { in: uniqueSlugs } },
          select: { slug: true },
        });
        return rows.map((row) => row.slug).filter(Boolean) as string[];
      }
      default:
        return [];
    }
  }

  private addWarning(
    warnings: BulkImportValidationError[],
    row: number,
    code: string,
    message: string,
    column?: string
  ) {
    if (warnings.length >= 200) return;

    warnings.push({
      code,
      row,
      column,
      message,
    });
  }

  private getCellText(cell: ExcelJS.Cell) {
    const value = cell.value as any;

    if (value === null || value === undefined) return "";
    if (value instanceof Date) return value.toISOString();
    if (typeof value !== "object") return String(cell.text || value || "");
    if ("formula" in value) return String(value.result ?? "");
    if ("text" in value) return String(value.text ?? "");
    if ("richText" in value && Array.isArray(value.richText)) {
      return value.richText
        .map((part: { text?: string }) => part.text || "")
        .join("");
    }

    return String(cell.text || "");
  }

  private parseNumber(value: string) {
    const trimmedValue = value.trim();
    if (!trimmedValue) return null;

    let normalized = trimmedValue.replace(/\s/g, "");

    if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(normalized)) {
      normalized = normalized.replace(/\./g, "").replace(",", ".");
    } else if (/^\d{1,3}(,\d{3})+(\.\d+)?$/.test(normalized)) {
      normalized = normalized.replace(/,/g, "");
    } else if (normalized.includes(",") && !normalized.includes(".")) {
      normalized = normalized.replace(",", ".");
    }

    const numberValue = Number(normalized);
    return Number.isFinite(numberValue) ? numberValue : null;
  }

  private isValidDateValue(rawValue: unknown, text: string) {
    if (rawValue instanceof Date) return !Number.isNaN(rawValue.getTime());
    if (typeof rawValue === "number") return rawValue > 0;

    const trimmedValue = text.trim();
    if (!trimmedValue) return true;

    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmedValue)) {
      return !Number.isNaN(Date.parse(`${trimmedValue}T00:00:00Z`));
    }

    return !Number.isNaN(Date.parse(trimmedValue));
  }

  private isValidTimeValue(rawValue: unknown, text: string) {
    if (rawValue instanceof Date) return !Number.isNaN(rawValue.getTime());
    if (typeof rawValue === "number") return rawValue >= 0 && rawValue < 1;

    const trimmedValue = text.trim();
    if (!trimmedValue) return true;

    return /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/.test(trimmedValue);
  }

  private isValidUrl(value: string) {
    try {
      const url = new URL(value);
      return ["http:", "https:"].includes(url.protocol);
    } catch {
      return false;
    }
  }

  private async readWorkbookRows(
    type: BulkImportType,
    buffer: Buffer,
    validRowNumbers: Set<number>
  ): Promise<ParsedBulkImportRow[]> {
    const spec = this.templates.getTemplateSpec(type);
    const workbook = new ExcelJS.Workbook();
    const arrayBuffer = buffer.buffer.slice(
      buffer.byteOffset,
      buffer.byteOffset + buffer.byteLength
    );
    await workbook.xlsx.load(arrayBuffer as any);
    const sheet = workbook.getWorksheet(spec.sheetName);

    if (!sheet) return [];

    const rows: ParsedBulkImportRow[] = [];

    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1 || !validRowNumbers.has(rowNumber)) return;

      const values = spec.columns.reduce<Record<string, string>>(
        (acc, column, index) => {
          acc[column.header] = this.getCellText(row.getCell(index + 1)).trim();
          return acc;
        },
        {}
      );

      rows.push({ rowNumber, values });
    });

    return rows;
  }

  private async createImportedRow(
    tx: Prisma.TransactionClient,
    type: BulkImportType,
    row: ParsedBulkImportRow
  ) {
    switch (type) {
      case "PROPERTY":
        return this.createImportedProperty(tx, row);
      case "EXPERIENCE":
        return this.createImportedExperience(tx, row);
      case "PACKAGE":
        return this.createImportedPackage(tx, row);
      case "DESTINATION":
        return this.createImportedDestination(tx, row);
      case "BLOG":
        return this.createImportedBlogPost(tx, row);
      default:
        throw new BadRequestException("Tipo de importación no soportado");
    }
  }

  private async createImportedDestination(
    tx: Prisma.TransactionClient,
    row: ParsedBulkImportRow
  ) {
    const values = row.values;
    const media = this.parseMedia(values);
    const translations = this.parseTranslations(values, "DESTINATION");
    const destination = await tx.destination.create({
      data: {
        name: values.nombre,
        slug: this.resolveSlug(values.slug, values.nombre),
        shortDescription: this.emptyToNull(values.descripcion_corta),
        description: this.emptyToNull(values.descripcion),
        location: this.emptyToNull(values.ubicacion),
        isActive: this.parseBoolean(values.activo, true),
        isFeatured: this.parseBoolean(values.destacado, false),
        sortOrder: this.parseInteger(values.orden, 0),
        seoTitle: this.emptyToNull(values.seo_titulo),
        seoDescription: this.emptyToNull(values.seo_descripcion),
        seoContent: this.emptyToNull(values.contenido_seo),
        faq: this.toJsonOrNull(this.parseFaq(values.faq)),
        heroImage: media.find((item) => item.isPrimary)?.url || media[0]?.url || null,
        gallery: this.toJsonOrNull(media),
        translations: this.toJsonOrNull(translations),
        translationsMeta: this.toJsonOrNull(this.buildManualTranslationsMeta(translations)),
      },
    });

    await this.createDestinationRelations(tx, destination.id, values);
    await this.queuePostImportTranslation(tx, "DESTINATION", destination.id, values, translations);
    return destination;
  }

  private async createImportedProperty(
    tx: Prisma.TransactionClient,
    row: ParsedBulkImportRow
  ) {
    const values = row.values;
    const price = this.parseNumber(values.precio_cop) ?? 0;
    const capacity = this.parseInteger(values.capacidad, 1);
    const media = this.parseMedia(values);
    const translations = this.parseTranslations(values, "PROPERTY");
    const property = await tx.property.create({
      data: {
        title: values.nombre,
        slug: this.resolveSlug(values.slug, values.nombre),
        description: values.descripcion || values.descripcion_corta,
        city: values.ubicacion || "Cartagena",
        area: values.barrio || values.ubicacion || "Cartagena",
        address: this.emptyToNull(values.ubicacion),
        pricePerNight: price,
        priceCop: price,
        basePrice: price,
        cleaningFee: 0,
        serviceFee: 0,
        taxes: 0,
        maxGuests: capacity,
        maxCapacity: capacity,
        bedrooms: this.parseInteger(values.habitaciones, 1),
        bathrooms: this.parseInteger(values.banos, 1),
        minimumNights: this.parseInteger(values.estadia_minima, 1),
        checkInTime: this.emptyToNull(values.check_in),
        checkOutTime: this.emptyToNull(values.check_out),
        status: this.parseBoolean(values.activo, true)
          ? this.parseBoolean(values.destacado, false)
            ? "FEATURED"
            : "ACTIVE"
          : "DRAFT",
        seoTitle: this.emptyToNull(values.seo_titulo),
        seoDescription: this.emptyToNull(values.seo_descripcion),
        seoContent: this.emptyToNull(values.contenido_seo),
        locationDescription: this.emptyToNull(values.descripcion_ubicacion),
        nearbyAttractions: this.emptyToNull(values.atracciones_cercanas),
        guestRecommendations: this.emptyToNull(values.recomendaciones_huesped),
        faq: this.toJsonOrNull(this.parseFaq(values.faq)),
        translations: this.toJsonOrNull(translations),
        translationsMeta: this.toJsonOrNull(this.buildManualTranslationsMeta(translations)),
        images: {
          create: media.map((item, index) => ({
            url: item.url,
            mediaType: item.type,
            title: item.title,
            description: item.description,
            isPrimary: item.isPrimary,
            sortOrder: index + 1,
          })),
        },
        features: {
          create: [
            ...this.parseList(values.caracteristicas),
            ...this.parseList(values.servicios_incluidos),
          ].map((name) => ({ name })),
        },
        extras: {
          create: this.parseExtraServices(values.extras_disponibles),
        },
      },
    });

    await this.linkProductToDestinations(tx, "PROPERTY", property.id, values.destinos_relacionados);
    await this.queuePostImportTranslation(tx, "PROPERTY", property.id, values, translations);
    return property;
  }

  private async createImportedExperience(
    tx: Prisma.TransactionClient,
    row: ParsedBulkImportRow
  ) {
    const values = row.values;
    const price = this.parseNumber(values.precio_cop) ?? 0;
    const media = this.parseMedia(values);
    const translations = this.parseTranslations(values, "EXPERIENCE");
    const experience = await tx.experience.create({
      data: {
        title: values.nombre,
        slug: this.resolveSlug(values.slug, values.nombre),
        shortDescription: values.descripcion_corta,
        description: values.descripcion || values.descripcion_corta,
        location: values.ubicacion || "Cartagena",
        duration: values.duracion || values.duracion_descripcion || "Por definir",
        maxGuests:
          this.parseInteger(values.capacidad_maxima, 0) ||
          this.parseInteger(values.capacidad_minima, 1),
        basePrice: price,
        priceCop: price,
        category: values.categoria_experiencia || "GENERAL",
        mainImage: media.find((item) => item.isPrimary)?.url || media[0]?.url || null,
        active: this.parseBoolean(values.activo, true),
        policies: this.emptyToNull(values.condiciones),
        recommendations: this.emptyToNull(values.recomendaciones),
        seoTitle: this.emptyToNull(values.seo_titulo),
        seoDescription: this.emptyToNull(values.seo_descripcion),
        seoContent: this.emptyToNull(values.contenido_seo),
        itinerary: this.emptyToNull(values.itinerario),
        included: this.emptyToNull(values.incluye),
        notIncluded: this.emptyToNull(values.no_incluye),
        meetingPoint: this.emptyToNull(values.punto_encuentro),
        durationDescription: this.emptyToNull(values.duracion_descripcion),
        schedule: this.emptyToNull(values.horarios),
        conditions: this.emptyToNull(values.condiciones),
        faq: this.toJsonOrNull(this.parseFaq(values.faq)),
        experienceCategory: this.emptyToNull(values.categoria_experiencia),
        translations: this.toJsonOrNull(translations),
        translationsMeta: this.toJsonOrNull(this.buildManualTranslationsMeta(translations)),
        images: {
          create: media.map((item, index) => ({
            url: item.url,
            mediaType: item.type,
            title: item.title,
            description: item.description,
            isPrimary: item.isPrimary,
            sortOrder: index + 1,
          })),
        },
        extras: {
          create: this.parseExtraServices(values.servicios_premium),
        },
      },
    });

    await this.linkProductToDestinations(tx, "EXPERIENCE", experience.id, values.destinos_relacionados);
    await this.queuePostImportTranslation(tx, "EXPERIENCE", experience.id, values, translations);
    return experience;
  }

  private async createImportedPackage(
    tx: Prisma.TransactionClient,
    row: ParsedBulkImportRow
  ) {
    const values = row.values;
    const price = this.parseNumber(values.precio_cop) ?? 0;
    const media = this.parseMedia(values);
    const translations = this.parseTranslations(values, "PACKAGE");
    const packageRecord = await tx.package.create({
      data: {
        title: values.nombre,
        slug: this.resolveSlug(values.slug, values.nombre),
        shortDescription: values.descripcion_corta,
        description: values.descripcion || values.descripcion_corta,
        duration: values.duracion || "Por definir",
        location: "Cartagena",
        minPeople: this.parseIntegerOrNull(values.personas_minimas),
        maxGuests:
          this.parseInteger(values.personas_maximas, 0) ||
          this.parseInteger(values.personas_minimas, 1),
        basePrice: price,
        priceCop: price,
        mainImage: media.find((item) => item.isPrimary)?.url || media[0]?.url || null,
        category: "GENERAL",
        isFeatured: this.parseBoolean(values.destacado, false),
        includes: this.emptyToNull(values.incluye),
        notIncludes: this.emptyToNull(values.no_incluye),
        itinerary: this.emptyToNull(values.itinerario),
        policies: this.emptyToNull(values.politicas),
        recommendations: this.emptyToNull(values.recomendaciones),
        seoTitle: this.emptyToNull(values.seo_titulo),
        seoDescription: this.emptyToNull(values.seo_descripcion),
        seoContent: this.emptyToNull(values.contenido_seo),
        faq: this.toJsonOrNull(this.parseFaq(values.faq)),
        active: this.parseBoolean(values.activo, true),
        translations: this.toJsonOrNull(translations),
        translationsMeta: this.toJsonOrNull(this.buildManualTranslationsMeta(translations)),
        images: {
          create: media.map((item, index) => ({
            url: item.url,
            mediaType: item.type,
            title: item.title,
            description: item.description,
            isPrimary: item.isPrimary,
            sortOrder: index + 1,
          })),
        },
        components: {
          create: this.parsePackageComponents(values),
        },
      },
    });

    await this.linkProductToDestinations(tx, "PACKAGE", packageRecord.id, values.destinos_relacionados);
    await this.queuePostImportTranslation(tx, "PACKAGE", packageRecord.id, values, translations);
    return packageRecord;
  }

  private async createImportedBlogPost(
    tx: Prisma.TransactionClient,
    row: ParsedBulkImportRow
  ) {
    const values = row.values;
    const media = this.parseMedia(values);
    const isPublished = this.parseBoolean(values.publicado, false);
    const translations = this.parseTranslations(values, "BLOG");
    const post = await tx.blogPost.create({
      data: {
        title: values.titulo,
        slug: this.resolveSlug(values.slug, values.titulo),
        excerpt: this.emptyToNull(values.extracto),
        content: values.contenido,
        coverImage: media.find((item) => item.isPrimary)?.url || media[0]?.url || null,
        category: this.emptyToNull(values.categoria),
        tags: this.toJsonOrNull(this.parseList(values.tags)),
        seoTitle: this.emptyToNull(values.seo_titulo),
        seoDescription: this.emptyToNull(values.seo_descripcion),
        seoKeywords: this.toJsonOrNull(this.parseList(values.palabras_clave)),
        authorName: this.emptyToNull(values.autor),
        isPublished,
        publishedAt: isPublished
          ? this.parseDate(values.fecha_publicacion) || new Date()
          : null,
        isFeatured: this.parseBoolean(values.destacado, false),
        translations: this.toJsonOrNull(translations),
        translationsMeta: this.toJsonOrNull(this.buildManualTranslationsMeta(translations)),
      },
    });

    await this.queuePostImportTranslation(tx, "BLOG", post.id, values, translations);
    return post;
  }

  private cleanFileName(fileName: string) {
    return String(fileName || "")
      .split(/[/\\]/)
      .pop()
      ?.trim() || "";
  }

  private async saveBulkImportFile(jobId: number, buffer: Buffer) {
    const storageDir = path.join(process.cwd(), "uploads", "bulk-import");
    await fs.mkdir(storageDir, { recursive: true });
    const storageKey = `bulk-import-job-${jobId}.xlsx`;
    await fs.writeFile(path.join(storageDir, storageKey), buffer);
    return storageKey;
  }

  private async readBulkImportFile(storageKey: string) {
    if (!/^[a-zA-Z0-9._-]+\.xlsx$/.test(storageKey)) {
      throw new BadRequestException("Archivo de carga no válido");
    }

    return fs.readFile(path.join(process.cwd(), "uploads", "bulk-import", storageKey));
  }

  private getStorageKey(metadata: unknown) {
    const metadataRecord = this.asRecord(metadata);
    const storageKey = metadataRecord?.storageKey;
    return typeof storageKey === "string" ? storageKey : null;
  }

  private asRecord(value: unknown) {
    return value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, any>)
      : null;
  }

  private resolveSlug(slug: string | undefined, fallback: string) {
    return slug?.trim() || this.slugify(fallback);
  }

  private emptyToNull(value: string | undefined) {
    const trimmed = value?.trim();
    return trimmed ? trimmed : null;
  }

  private parseBoolean(value: string | undefined, defaultValue: boolean) {
    const normalized = value?.trim().toUpperCase();
    if (normalized === "SI") return true;
    if (normalized === "NO") return false;
    return defaultValue;
  }

  private parseInteger(value: string | undefined, defaultValue: number) {
    const parsed = this.parseNumber(value || "");
    if (parsed === null) return defaultValue;
    return Math.trunc(parsed);
  }

  private parseIntegerOrNull(value: string | undefined) {
    const parsed = this.parseNumber(value || "");
    return parsed === null ? null : Math.trunc(parsed);
  }

  private parseDate(value: string | undefined) {
    if (!value) return null;
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  private parseList(value: string | undefined) {
    if (!value) return [];
    return Array.from(
      new Set(
        value
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean)
      )
    );
  }

  private parseFaq(value: string | undefined) {
    if (!value) return null;
    const items = value
      .split(";")
      .map((block) => block.trim())
      .filter(Boolean)
      .map((block) => {
        const [question, answer] = block.split("|").map((part) => part.trim());
        return question && answer ? { question, answer } : null;
      })
      .filter(Boolean);

    return items.length ? items : null;
  }

  private parseMedia(values: Record<string, string>) {
    const media = [1, 2, 3]
      .map((index) => ({
        type: values[`media_${index}_tipo`] || "IMAGE",
        url: values[`media_${index}_url`],
        title: this.emptyToNull(values[`media_${index}_titulo`]),
        description: this.emptyToNull(values[`media_${index}_descripcion`]),
        isPrimary: this.parseBoolean(values[`media_${index}_principal`], false),
      }))
      .filter((item) => item.url)
      .map((item) => ({
        ...item,
        type: item.type === "VIDEO" ? MediaType.VIDEO : MediaType.IMAGE,
      }));

    if (media.length && !media.some((item) => item.isPrimary)) {
      media[0].isPrimary = true;
    }

    let primaryAlreadyAssigned = false;
    return media.map((item) => {
      if (!item.isPrimary) return item;
      if (primaryAlreadyAssigned) return { ...item, isPrimary: false };
      primaryAlreadyAssigned = true;
      return item;
    });
  }

  private parsePackageComponents(values: Record<string, string>) {
    return [1, 2, 3]
      .map((index) => ({
        title: values[`componente_${index}_nombre`],
        shortDescription: this.emptyToNull(values[`componente_${index}_descripcion`]),
        description: this.emptyToNull(values[`componente_${index}_descripcion`]),
        componentType: this.emptyToNull(values[`componente_${index}_tipo`]),
        day: this.parseIntegerOrNull(values[`componente_${index}_dia`]),
        sortOrder: this.parseInteger(values[`componente_${index}_orden`], index),
        active: true,
      }))
      .filter((item) => item.title);
  }

  private parseExtraServices(value: string | undefined) {
    return this.parseList(value).map((name) => ({
      name,
      price: 0,
      priceCop: 0,
      baseCurrency: "COP",
      active: true,
    }));
  }

  private parseTranslations(values: Record<string, string>, type: BulkImportType) {
    const translations: Record<string, Record<string, unknown>> = {};
    const localeFieldMap = this.getTranslationFieldMap(type);

    ["en", "fr", "pt", "it"].forEach((locale) => {
      const translated: Record<string, unknown> = {};

      Object.entries(localeFieldMap).forEach(([columnSuffix, targetField]) => {
        const rawValue = values[`${locale}_${columnSuffix}`];
        if (!rawValue) return;

        translated[targetField] =
          columnSuffix === "faq" ? this.parseFaq(rawValue) : rawValue;
      });

      if (Object.keys(translated).length > 0) {
        translations[locale] = translated;
      }
    });

    return Object.keys(translations).length ? translations : null;
  }

  private buildManualTranslationsMeta(
    translations: Record<string, Record<string, unknown>> | null
  ) {
    if (!translations) return null;
    const now = new Date().toISOString();

    return Object.fromEntries(
      Object.keys(translations).map((locale) => [
        locale,
        {
          manual: true,
          updatedAt: now,
          source: "bulk-import",
        },
      ])
    );
  }

  private async queuePostImportTranslation(
    tx: Prisma.TransactionClient,
    type: BulkImportType,
    entityId: number,
    values: Record<string, string>,
    manualTranslations: Record<string, Record<string, unknown>> | null
  ) {
    if (!this.isAutoTranslationEnabled() || manualTranslations) return;

    const source = this.buildTranslationSource(type, values);
    const fields = Object.keys(source).filter((field) =>
      this.hasUsableTranslationValue(source[field])
    );

    if (!fields.length) return;

    await tx.translationJob.create({
      data: {
        entityType: this.toTranslationEntityType(type),
        entityId,
        sourceLanguage: process.env.TRANSLATION_DEFAULT_SOURCE || "es",
        targetLanguages: this.getTranslationTargets() as Prisma.InputJsonValue,
        fields: fields as Prisma.InputJsonValue,
        sourceSnapshot: source as Prisma.InputJsonValue,
        overwrite: false,
      },
    });

    await this.markEntityTranslationPending(tx, type, entityId);
  }

  private isAutoTranslationEnabled() {
    return String(process.env.AUTO_TRANSLATION_ENABLED || "")
      .trim()
      .toLowerCase() === "true";
  }

  private getTranslationTargets() {
    const configured = (process.env.TRANSLATION_TARGETS || "en,fr,pt,it")
      .split(",")
      .map((locale) => locale.trim().toLowerCase())
      .filter(Boolean);

    return configured.length ? configured : ["en", "fr", "pt", "it"];
  }

  private toTranslationEntityType(type: BulkImportType) {
    if (type === "PROPERTY") return TranslationEntityType.PROPERTY;
    if (type === "EXPERIENCE") return TranslationEntityType.EXPERIENCE;
    if (type === "PACKAGE") return TranslationEntityType.PACKAGE;
    if (type === "DESTINATION") return TranslationEntityType.DESTINATION;
    return TranslationEntityType.BLOG;
  }

  private buildTranslationSource(type: BulkImportType, values: Record<string, string>) {
    const common: Record<string, unknown> = {
      title: values.nombre,
      shortDescription: values.descripcion_corta,
      description: values.descripcion || values.descripcion_corta,
      seoTitle: values.seo_titulo,
      seoDescription: values.seo_descripcion,
      seoContent: values.contenido_seo,
      faq: this.parseFaq(values.faq),
      recommendations: values.recomendaciones || values.recomendaciones_huesped,
      itinerary: values.itinerario,
    };

    if (type === "PROPERTY") {
      return this.compactTranslationSource({
        ...common,
        locationDescription: values.descripcion_ubicacion,
        nearbyAttractions: values.atracciones_cercanas,
        guestRecommendations: values.recomendaciones_huesped,
      });
    }

    if (type === "EXPERIENCE") {
      return this.compactTranslationSource({
        ...common,
        included: values.incluye,
        notIncluded: values.no_incluye,
        meetingPoint: values.punto_encuentro,
        durationDescription: values.duracion_descripcion,
        schedule: values.horarios,
        conditions: values.condiciones,
        experienceCategory: values.categoria_experiencia,
      });
    }

    if (type === "PACKAGE") {
      return this.compactTranslationSource({
        ...common,
        includes: values.incluye,
        notIncludes: values.no_incluye,
        policies: values.politicas,
      });
    }

    if (type === "DESTINATION") {
      return this.compactTranslationSource({
        name: values.nombre,
        shortDescription: values.descripcion_corta,
        description: values.descripcion,
        location: values.ubicacion,
        seoTitle: values.seo_titulo,
        seoDescription: values.seo_descripcion,
        seoContent: values.contenido_seo,
        faq: this.parseFaq(values.faq),
      });
    }

    return this.compactTranslationSource({
      title: values.titulo,
      excerpt: values.extracto,
      content: values.contenido,
      seoTitle: values.seo_titulo,
      seoDescription: values.seo_descripcion,
    });
  }

  private compactTranslationSource(source: Record<string, unknown>) {
    return Object.fromEntries(
      Object.entries(source).filter(([, value]) => this.hasUsableTranslationValue(value))
    );
  }

  private hasUsableTranslationValue(value: unknown) {
    if (typeof value === "string") return Boolean(value.trim());
    if (Array.isArray(value)) return value.length > 0;
    if (value && typeof value === "object") return Object.keys(value).length > 0;
    return value !== undefined && value !== null;
  }

  private async markEntityTranslationPending(
    tx: Prisma.TransactionClient,
    type: BulkImportType,
    entityId: number
  ) {
    const data = {
      translationStatus: TranslationStatus.PENDING_TRANSLATION,
      translationRequestedAt: new Date(),
      translationError: null,
    };

    if (type === "PROPERTY") {
      await tx.property.update({ where: { id: entityId }, data });
      return;
    }

    if (type === "EXPERIENCE") {
      await tx.experience.update({ where: { id: entityId }, data });
      return;
    }

    if (type === "PACKAGE") {
      await tx.package.update({ where: { id: entityId }, data });
      return;
    }

    if (type === "DESTINATION") {
      await tx.destination.update({ where: { id: entityId }, data });
      return;
    }

    await tx.blogPost.update({ where: { id: entityId }, data });
  }

  private getTranslationFieldMap(type: BulkImportType) {
    const common: Record<string, string> = {
      nombre: type === "DESTINATION" ? "name" : "title",
      descripcion_corta: "shortDescription",
      descripcion: "description",
      seo_titulo: "seoTitle",
      seo_descripcion: "seoDescription",
      contenido_seo: "seoContent",
      faq: "faq",
    };

    if (type === "BLOG") {
      return {
        titulo: "title",
        extracto: "excerpt",
        contenido: "content",
        seo_titulo: "seoTitle",
        seo_descripcion: "seoDescription",
      };
    }

    return {
      ...common,
      itinerario: "itinerary",
      incluye: type === "PACKAGE" ? "includes" : "included",
      no_incluye: type === "PACKAGE" ? "notIncludes" : "notIncluded",
      politicas: "policies",
      condiciones: "conditions",
      recomendaciones: "recommendations",
    };
  }

  private async createDestinationRelations(
    tx: Prisma.TransactionClient,
    destinationId: number,
    values: Record<string, string>
  ) {
    const [properties, experiences, packages] = await Promise.all([
      this.findIdsBySlugs(tx, "PROPERTY", this.parseList(values.alojamientos_relacionados)),
      this.findIdsBySlugs(tx, "EXPERIENCE", this.parseList(values.experiencias_relacionadas)),
      this.findIdsBySlugs(tx, "PACKAGE", this.parseList(values.paquetes_relacionados)),
    ]);

    if (properties.length) {
      await tx.destinationProperty.createMany({
        data: properties.map((propertyId, index) => ({
          destinationId,
          propertyId,
          sortOrder: index + 1,
        })),
        skipDuplicates: true,
      });
    }

    if (experiences.length) {
      await tx.destinationExperience.createMany({
        data: experiences.map((experienceId, index) => ({
          destinationId,
          experienceId,
          sortOrder: index + 1,
        })),
        skipDuplicates: true,
      });
    }

    if (packages.length) {
      await tx.destinationPackage.createMany({
        data: packages.map((packageId, index) => ({
          destinationId,
          packageId,
          sortOrder: index + 1,
        })),
        skipDuplicates: true,
      });
    }
  }

  private async linkProductToDestinations(
    tx: Prisma.TransactionClient,
    type: "PROPERTY" | "EXPERIENCE" | "PACKAGE",
    productId: number,
    destinationSlugs: string | undefined
  ) {
    const destinationIds = await this.findIdsBySlugs(
      tx,
      "DESTINATION",
      this.parseList(destinationSlugs)
    );

    if (!destinationIds.length) return;

    if (type === "PROPERTY") {
      await tx.destinationProperty.createMany({
        data: destinationIds.map((destinationId, index) => ({
          destinationId,
          propertyId: productId,
          sortOrder: index + 1,
        })),
        skipDuplicates: true,
      });
    }

    if (type === "EXPERIENCE") {
      await tx.destinationExperience.createMany({
        data: destinationIds.map((destinationId, index) => ({
          destinationId,
          experienceId: productId,
          sortOrder: index + 1,
        })),
        skipDuplicates: true,
      });
    }

    if (type === "PACKAGE") {
      await tx.destinationPackage.createMany({
        data: destinationIds.map((destinationId, index) => ({
          destinationId,
          packageId: productId,
          sortOrder: index + 1,
        })),
        skipDuplicates: true,
      });
    }
  }

  private async findIdsBySlugs(
    tx: Prisma.TransactionClient,
    type: BulkImportType,
    slugs: string[]
  ) {
    if (!slugs.length) return [];

    if (type === "PROPERTY") {
      return (await tx.property.findMany({
        where: { slug: { in: slugs } },
        select: { id: true },
      })).map((item) => item.id);
    }

    if (type === "EXPERIENCE") {
      return (await tx.experience.findMany({
        where: { slug: { in: slugs } },
        select: { id: true },
      })).map((item) => item.id);
    }

    if (type === "PACKAGE") {
      return (await tx.package.findMany({
        where: { slug: { in: slugs } },
        select: { id: true },
      })).map((item) => item.id);
    }

    if (type === "DESTINATION") {
      return (await tx.destination.findMany({
        where: { slug: { in: slugs } },
        select: { id: true },
      })).map((item) => item.id);
    }

    return [];
  }

  private toJsonOrNull(value: unknown) {
    return value ? (value as Prisma.InputJsonValue) : undefined;
  }

  private cleanErrorMessage(error: unknown) {
    if (error instanceof Error) {
      return error.message.replace(/\s+/g, " ").slice(0, 240);
    }

    return "Error interno controlado durante la importación";
  }

  private toJson(value: unknown) {
    if (value === undefined) return undefined;
    return value as Prisma.InputJsonValue;
  }
}

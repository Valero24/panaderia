"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  History,
  Loader2,
  UploadCloud,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { apiUrl } from "@/lib/api";
import {
  acceptedExtensions,
  authHeaders,
  BulkImportType,
  BulkImportTypeOption,
  fallbackTypes,
  fetchBulkImportTypes,
  formatFileSize,
} from "./bulk-import-shared";

type ValidationResult = {
  valid: boolean;
  errors: string[];
};

type UploadValidationResult = {
  expectedSheet: string;
  hasInstructionsSheet: boolean;
  headersMatched: boolean;
  totalRows: number;
  validRows: number;
  invalidRows: number;
  warningsCount?: number;
  errors: Array<{
    code: string;
    message: string;
    column?: string;
    row?: number;
  }>;
  warnings?: Array<{
    code: string;
    message: string;
    column?: string;
    row?: number;
  }>;
  previewRows?: Array<{
    row: number;
    displayName: string;
    expectedSlug: string;
    status: "VALID" | "INVALID";
    errors: Array<{
      code: string;
      message: string;
      column?: string;
      row?: number;
    }>;
    warnings: Array<{
      code: string;
      message: string;
      column?: string;
      row?: number;
    }>;
  }>;
};

type BulkImportJobStatus =
  | "DRAFT"
  | "UPLOADED"
  | "VALIDATING"
  | "VALIDATED"
  | "FAILED_VALIDATION"
  | "IMPORTING"
  | "COMPLETED"
  | "PARTIALLY_COMPLETED"
  | "CANCELLED"
  | "FAILED";

const workflowSteps = [
  "Seleccionar tipo",
  "Descargar plantilla",
  "Subir archivo",
  "Validar archivo",
  "Vista previa",
  "Confirmar importación",
  "Resultado final",
];

function validateFile(file: File | null): ValidationResult {
  if (!file) {
    return {
      valid: false,
      errors: ["Selecciona un archivo antes de validar."],
    };
  }

  const fileName = file.name.toLowerCase();
  const hasValidExtension = acceptedExtensions.some((extension) =>
    fileName.endsWith(extension)
  );

  if (!hasValidExtension) {
    return {
      valid: false,
      errors: ["El archivo debe ser XLSX."],
    };
  }

  if (file.size === 0) {
    return {
      valid: false,
      errors: ["El archivo está vacío."],
    };
  }

  return {
    valid: true,
    errors: [],
  };
}

export default function CargaMasivaPage() {
  const uploadPanelRef = useRef<HTMLDivElement | null>(null);
  const [types, setTypes] = useState<BulkImportTypeOption[]>(fallbackTypes);
  const [selectedType, setSelectedType] = useState<BulkImportType>("PROPERTY");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [importMessage, setImportMessage] = useState("");
  const [backendMessage, setBackendMessage] = useState("");
  const [uploadResult, setUploadResult] =
    useState<UploadValidationResult | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [validatedJobStatus, setValidatedJobStatus] =
    useState<BulkImportJobStatus | null>(null);
  const [validatedJobId, setValidatedJobId] = useState<number | null>(null);
  const [confirmingImport, setConfirmingImport] = useState(false);
  const [importResult, setImportResult] = useState<{
    createdRows: number;
    failedRows: number;
    errors?: Array<{ row: number; message: string }>;
  } | null>(null);
  const [openInstructions, setOpenInstructions] =
    useState<BulkImportType | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [downloadingType, setDownloadingType] = useState<BulkImportType | null>(
    null
  );

  const selectedTypeConfig = useMemo(
    () => types.find((item) => item.type === selectedType) || fallbackTypes[0],
    [selectedType, types]
  );

  const fileSummary = useMemo(() => {
    if (!selectedFile) return "Ningún archivo seleccionado";
    return `${selectedFile.name} · ${formatFileSize(selectedFile.size)}`;
  }, [selectedFile]);
  const canPrepareImport =
    validatedJobStatus === "VALIDATED" &&
    Boolean(uploadResult?.validRows) &&
    Boolean(validatedJobId);

  useEffect(() => {
    fetchBulkImportTypes()
      .then(setTypes)
      .catch(() => {
        setTypes(fallbackTypes);
        setBackendMessage(
          "No se pudo cargar la configuración del backend. Se muestra la estructura base."
        );
      });
  }, []);

  function selectTypeForUpload(type: BulkImportType) {
    setSelectedType(type);
    setValidation(null);
    setImportMessage("");
    setUploadResult(null);
    setUploadProgress(0);
    setValidatedJobStatus(null);
    setValidatedJobId(null);
    setImportResult(null);
    uploadPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function handleValidate() {
    setImportMessage("");
    setValidation(validateFile(selectedFile));
  }

  async function handleRegisterAttempt() {
    const currentValidation = validation || validateFile(selectedFile);
    setValidation(currentValidation);
    setImportMessage("");
    setUploadResult(null);
    setUploadProgress(0);
    setValidatedJobStatus(null);
    setValidatedJobId(null);
    setImportResult(null);

    if (!selectedFile || !currentValidation.valid) return;

    setSubmitting(true);
    setUploadProgress(12);

    try {
      const response = await fetch(apiUrl("/bulk-import/jobs"), {
        method: "POST",
        headers: {
          ...authHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: selectedType,
          originalFileName: selectedFile.name,
          fileSize: selectedFile.size,
          mimeType: selectedFile.type || undefined,
          source: "ADMIN_UPLOAD",
          metadata: {
            clientValidation: currentValidation,
            originalLastModified: selectedFile.lastModified,
          },
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        setUploadProgress(0);
        setImportMessage(
          data?.message || "No fue posible registrar la carga masiva."
        );
        return;
      }

      setUploadProgress(38);

      const formData = new FormData();
      formData.append("file", selectedFile);
      setUploadProgress(62);

      const uploadResponse = await fetch(
        apiUrl(`/bulk-import/jobs/${data.id}/upload`),
        {
          method: "POST",
          headers: authHeaders(),
          body: formData,
        }
      );
      const uploadData = await uploadResponse.json().catch(() => null);

      if (!uploadResponse.ok) {
        setUploadProgress(0);
        setImportMessage(
          uploadData?.message || "No fue posible validar el archivo Excel."
        );
        return;
      }

      setUploadProgress(100);
      setUploadResult(uploadData?.validationResult || null);
      setValidatedJobStatus(uploadData?.status || null);
      setValidatedJobId(typeof uploadData?.id === "number" ? uploadData.id : null);
      setImportResult(null);
      setImportMessage(
        uploadData?.validationResult?.errors?.length
          ? "Archivo validado con errores. Revisa el resumen antes de continuar."
          : "Archivo validado correctamente. No se importaron registros."
      );
    } catch {
      setUploadProgress(0);
      setImportMessage(
        "No fue posible conectar con el backend para registrar la carga."
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDownloadTemplate(option: BulkImportTypeOption) {
    setDownloadingType(option.type);
    setBackendMessage("");

    try {
      const response = await fetch(apiUrl(`/bulk-import/templates/${option.type}`), {
        headers: authHeaders(),
      });

      if (!response.ok) {
        setBackendMessage("No fue posible descargar la plantilla Excel.");
        return;
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `plantilla-${option.templateSlug}.xlsx`;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      setBackendMessage("No fue posible conectar con el backend de plantillas.");
    } finally {
      setDownloadingType(null);
    }
  }

  async function handleConfirmImport() {
    if (!canPrepareImport || !validatedJobId) return;

    setConfirmingImport(true);
    setImportMessage("");
    setImportResult(null);

    try {
      const response = await fetch(
        apiUrl(`/bulk-import/jobs/${validatedJobId}/confirm`),
        {
          method: "POST",
          headers: authHeaders(),
        }
      );
      const data = await response.json().catch(() => null);

      if (!response.ok) {
        setImportMessage(
          data?.message || "No fue posible confirmar la importación."
        );
        return;
      }

      setValidatedJobStatus(data?.status || null);
      setImportResult(data?.importResult || null);
      setImportMessage("Importación masiva finalizada.");
    } catch {
      setImportMessage("No fue posible conectar con el backend de importación.");
    } finally {
      setConfirmingImport(false);
    }
  }

  const canRegister = Boolean(validation?.valid) && !submitting;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.28em] text-[#B48A5A]">
            Operación interna
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-[#0D2B52]">
            Carga masiva
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
            Importa alojamientos, experiencias, paquetes, destinos o artículos
            de blog mediante plantillas Excel.
          </p>
        </div>
        <Button asChild variant="outline" className="rounded-xl">
          <Link href="/admin/carga-masiva/historial">
            <History className="mr-2 h-4 w-4" />
            Ver historial
          </Link>
        </Button>
      </div>

      <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
        <strong>Importante:</strong> Puedes cargar información completa,
        incluyendo textos largos, SEO, FAQ, itinerarios, traducciones y
        multimedia por URL. Respeta los límites de caracteres indicados en la
        plantilla para evitar errores de importación.
      </div>

      {backendMessage && (
        <p className="rounded-2xl border border-slate-100 bg-white p-4 text-sm text-slate-600">
          {backendMessage}
        </p>
      )}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {types.map((option) => {
          const instructionsOpen = openInstructions === option.type;

          return (
            <Card
              key={option.type}
              className="rounded-2xl border border-[#D4AF37]/20 bg-white"
            >
              <CardContent className="flex h-full flex-col gap-4 p-5">
                <div className="rounded-2xl bg-[#F8F6F2] p-3 text-[#B48A5A]">
                  <FileSpreadsheet className="h-5 w-5" />
                </div>
                <div className="min-h-[96px]">
                  <h2 className="text-lg font-semibold text-[#0D2B52]">
                    {option.label}
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    {option.description}
                  </p>
                </div>
                <div className="mt-auto space-y-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full justify-start"
                    disabled={downloadingType === option.type}
                    onClick={() => handleDownloadTemplate(option)}
                  >
                    {downloadingType === option.type ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Download className="mr-2 h-4 w-4" />
                    )}
                    Descargar plantilla
                  </Button>
                  <Button
                    type="button"
                    className="w-full justify-start bg-[#0D2B52] hover:bg-[#12396d]"
                    onClick={() => selectTypeForUpload(option.type)}
                  >
                    <UploadCloud className="mr-2 h-4 w-4" />
                    Subir archivo
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full justify-start text-[#0D2B52]"
                    onClick={() =>
                      setOpenInstructions(instructionsOpen ? null : option.type)
                    }
                  >
                    <BookOpen className="mr-2 h-4 w-4" />
                    Ver instrucciones
                  </Button>
                </div>
                {instructionsOpen && (
                  <div className="rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-600">
                    Usa contenido base en español. Incluye URLs absolutas para
                    imágenes o multimedia. En este bloque solo se registra el
                    intento de carga; la validación completa llegará después.
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </section>

      <Card className="rounded-2xl border border-[#D4AF37]/20 bg-white">
        <CardContent className="space-y-4 p-5 sm:p-6">
          <h2 className="text-xl font-semibold text-[#0D2B52]">
            Flujo preparado
          </h2>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-7">
            {workflowSteps.map((step, index) => (
              <div
                key={step}
                className="rounded-2xl border border-slate-100 bg-slate-50 p-4"
              >
                <Badge className="bg-[#0D2B52] text-white hover:bg-[#0D2B52]">
                  Paso {index + 1}
                </Badge>
                <p className="mt-3 text-sm font-semibold text-[#0D2B52]">
                  {step}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl border border-[#D4AF37]/20 bg-white">
        <CardContent className="space-y-3 p-5 sm:p-6">
          <h2 className="text-xl font-semibold text-[#0D2B52]">
            Seguridad base
          </h2>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            {[
              "Solo archivos .xlsx",
              "No se ejecutan macros",
              "No se procesan fórmulas",
              "Sin importación real todavía",
              "Sin contenido de filas en auditoría",
            ].map((item) => (
              <div
                key={item}
                className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm font-semibold text-[#0D2B52]"
              >
                {item}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card
        ref={uploadPanelRef}
        className="rounded-2xl border border-[#D4AF37]/20 bg-white"
      >
        <CardContent className="space-y-5 p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <div className="rounded-2xl bg-[#F8F6F2] p-3 text-[#B48A5A]">
              <UploadCloud className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-[#0D2B52]">
                Registro base de carga
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Este bloque registra el archivo en el historial, pero no crea
                registros reales ni valida el contenido de Excel todavía.
              </p>
            </div>
          </div>

          <label className="block space-y-2 text-sm font-semibold text-[#0D2B52]">
            <span>Tipo de carga</span>
            <select
              value={selectedType}
              onChange={(event) => {
                setSelectedType(event.target.value as BulkImportType);
                setValidation(null);
                setImportMessage("");
                setUploadResult(null);
                setUploadProgress(0);
                setValidatedJobStatus(null);
                setValidatedJobId(null);
                setImportResult(null);
              }}
              className="h-11 w-full rounded-md border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-[#B48A5A] focus:ring-2 focus:ring-[#B48A5A]/20"
            >
              {types.map((item) => (
                <option key={item.type} value={item.type}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>

          <div className="rounded-2xl border border-dashed border-[#D4AF37]/40 bg-[#F8F6F2] p-5">
            <label className="block space-y-2 text-sm font-semibold text-[#0D2B52]">
              <span>Archivo de carga</span>
              <Input
                type="file"
                accept=".xlsx"
                onChange={(event) => {
                  setSelectedFile(event.target.files?.[0] || null);
                  setValidation(null);
                  setImportMessage("");
                  setUploadResult(null);
                  setUploadProgress(0);
                  setValidatedJobStatus(null);
                  setValidatedJobId(null);
                  setImportResult(null);
                }}
              />
            </label>
            <p className="mt-3 text-xs text-slate-500">{fileSummary}</p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button type="button" variant="outline" onClick={handleValidate}>
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              Validar archivo
            </Button>
            <Button
              type="button"
              disabled={!canRegister}
              onClick={handleRegisterAttempt}
              className="bg-[#0D2B52] hover:bg-[#12396d]"
            >
              {submitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Subir y validar
            </Button>
          </div>

          {(submitting || uploadProgress > 0) && (
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
                <span>Progreso de validación</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-white">
                <div
                  className="h-full rounded-full bg-[#B48A5A] transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {validation && (
            <div
              className={`rounded-2xl border p-4 text-sm ${
                validation.valid
                  ? "border-emerald-100 bg-emerald-50 text-emerald-700"
                  : "border-red-100 bg-red-50 text-red-700"
              }`}
            >
              <div className="flex items-center gap-2 font-semibold">
                {validation.valid ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <AlertTriangle className="h-4 w-4" />
                )}
                {validation.valid ? "Archivo válido" : "Errores detectados"}
              </div>
              {!validation.valid && (
                <ul className="mt-3 list-inside list-disc space-y-1">
                  {validation.errors.map((error) => (
                    <li key={error}>{error}</li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {importMessage && (
            <p className="rounded-2xl border border-amber-100 bg-amber-50 p-4 text-sm text-amber-800">
              {importMessage}
            </p>
          )}

          {uploadResult && (
            <div className="space-y-4 rounded-2xl border border-slate-100 bg-white p-4">
              <div className="grid gap-3 md:grid-cols-5">
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                    Hoja esperada
                  </p>
                  <p className="mt-1 text-sm font-semibold text-[#0D2B52]">
                    {uploadResult.expectedSheet}
                  </p>
                </div>
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                    Filas
                  </p>
                  <p className="mt-1 text-sm font-semibold text-[#0D2B52]">
                    {uploadResult.totalRows}
                  </p>
                </div>
                <div className="rounded-xl bg-emerald-50 p-3">
                  <p className="text-xs uppercase tracking-[0.2em] text-emerald-600">
                    Válidas
                  </p>
                  <p className="mt-1 text-sm font-semibold text-emerald-700">
                    {uploadResult.validRows}
                  </p>
                </div>
                <div className="rounded-xl bg-red-50 p-3">
                  <p className="text-xs uppercase tracking-[0.2em] text-red-600">
                    Inválidas
                  </p>
                  <p className="mt-1 text-sm font-semibold text-red-700">
                    {uploadResult.invalidRows}
                  </p>
                </div>
                <div className="rounded-xl bg-amber-50 p-3">
                  <p className="text-xs uppercase tracking-[0.2em] text-amber-600">
                    Advertencias
                  </p>
                  <p className="mt-1 text-sm font-semibold text-amber-700">
                    {uploadResult.warningsCount ?? uploadResult.warnings?.length ?? 0}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Badge
                  className={
                    uploadResult.hasInstructionsSheet
                      ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100"
                      : "bg-red-100 text-red-700 hover:bg-red-100"
                  }
                >
                  Hoja Instrucciones{" "}
                  {uploadResult.hasInstructionsSheet ? "OK" : "faltante"}
                </Badge>
                <Badge
                  className={
                    uploadResult.headersMatched
                      ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100"
                      : "bg-red-100 text-red-700 hover:bg-red-100"
                  }
                >
                  Encabezados{" "}
                  {uploadResult.headersMatched ? "correctos" : "con errores"}
                </Badge>
              </div>

              {Boolean(uploadResult.previewRows?.length) && (
                <div className="overflow-hidden rounded-xl border border-slate-100">
                  <div className="border-b border-slate-100 bg-slate-50 px-4 py-3">
                    <p className="text-sm font-semibold text-[#0D2B52]">
                      Vista previa
                    </p>
                    <p className="text-xs text-slate-500">
                      Resumen ligero de las primeras filas validadas. No se muestra contenido largo.
                    </p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[760px] text-left text-sm">
                      <thead className="bg-white text-xs uppercase tracking-[0.16em] text-slate-400">
                        <tr>
                          <th className="px-4 py-3">Fila</th>
                          <th className="px-4 py-3">Nombre / titulo</th>
                          <th className="px-4 py-3">Slug previsto</th>
                          <th className="px-4 py-3">Estado</th>
                          <th className="px-4 py-3">Errores</th>
                          <th className="px-4 py-3">Advertencias</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {uploadResult.previewRows?.slice(0, 20).map((row) => (
                          <tr key={row.row}>
                            <td className="px-4 py-3 font-medium text-slate-700">
                              {row.row}
                            </td>
                            <td className="px-4 py-3 text-slate-700">
                              {row.displayName}
                            </td>
                            <td className="px-4 py-3 font-mono text-xs text-slate-500">
                              {row.expectedSlug}
                            </td>
                            <td className="px-4 py-3">
                              <Badge
                                className={
                                  row.status === "VALID"
                                    ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100"
                                    : "bg-red-100 text-red-700 hover:bg-red-100"
                                }
                              >
                                {row.status === "VALID" ? "Valida" : "Invalida"}
                              </Badge>
                            </td>
                            <td className="px-4 py-3 text-slate-700">
                              {row.errors.length}
                            </td>
                            <td className="px-4 py-3 text-slate-700">
                              {row.warnings.length}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {uploadResult.errors.length > 0 && (
                <div className="rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">
                  <p className="font-semibold">Errores detectados</p>
                  <ul className="mt-3 list-inside list-disc space-y-1">
                    {uploadResult.errors.slice(0, 20).map((error, index) => (
                      <li key={`${error.code}-${index}`}>
                        {error.row ? `Fila ${error.row}: ` : ""}
                        {error.message}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {Boolean(uploadResult.warnings?.length) && (
                <div className="rounded-xl border border-amber-100 bg-amber-50 p-4 text-sm text-amber-800">
                  <p className="font-semibold">Advertencias</p>
                  <ul className="mt-3 list-inside list-disc space-y-1">
                    {uploadResult.warnings?.slice(0, 20).map((warning, index) => (
                      <li key={`${warning.code}-${index}`}>
                        {warning.row ? `Fila ${warning.row}: ` : ""}
                        {warning.message}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-[#0D2B52]">
                      Confirmación de importación
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Preparado para el BLOQUE 25. En este bloque no se crean registros.
                    </p>
                  </div>
                  <Button
                    type="button"
                    disabled={!canPrepareImport || confirmingImport}
                    onClick={handleConfirmImport}
                    className="bg-[#0D2B52] text-white hover:bg-[#12396d] disabled:bg-slate-300"
                  >
                    {confirmingImport ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : null}
                    Confirmar importación
                  </Button>
                </div>
                <p className="mt-3 text-xs text-slate-500">
                  {canPrepareImport
                    ? "El archivo está validado y tiene filas válidas. Solo se importarán filas sin errores."
                    : "Para habilitar esta acción, el job debe estar VALIDATED y tener al menos una fila válida."}
                </p>
                {importResult && (
                  <div className="mt-4 rounded-lg bg-white p-3 text-sm text-slate-700">
                    <p className="font-semibold text-[#0D2B52]">
                      Resultado de importación
                    </p>
                    <p className="mt-2">
                      Creadas: {importResult.createdRows} · Fallidas:{" "}
                      {importResult.failedRows}
                    </p>
                    {Boolean(importResult.errors?.length) && (
                      <ul className="mt-2 list-inside list-disc text-xs text-red-700">
                        {importResult.errors?.slice(0, 10).map((error) => (
                          <li key={`${error.row}-${error.message}`}>
                            Fila {error.row}: {error.message}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

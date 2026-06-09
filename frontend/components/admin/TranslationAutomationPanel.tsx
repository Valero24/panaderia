"use client";

import { useState } from "react";
import { RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { apiUrl } from "@/lib/api";

type TranslationAutomationPanelProps = {
  entityType?: "PROPERTY" | "EXPERIENCE" | "PACKAGE" | "DESTINATION" | "BLOG_POST";
  entityId?: number | null;
  status?: string | null;
  error?: string | null;
  disabled?: boolean;
};

const statusLabels: Record<string, { label: string; className: string }> = {
  NOT_REQUESTED: {
    label: "Sin traducción automática",
    className: "border-slate-200 bg-slate-50 text-slate-600",
  },
  PENDING_TRANSLATION: {
    label: "Traducción pendiente",
    className: "border-amber-200 bg-amber-50 text-amber-700",
  },
  TRANSLATING: {
    label: "Traduciendo",
    className: "border-blue-200 bg-blue-50 text-blue-700",
  },
  COMPLETED: {
    label: "Traducido",
    className: "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
  ERROR: {
    label: "Error",
    className: "border-red-200 bg-red-50 text-red-700",
  },
};

function authHeaders() {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : "";

  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export default function TranslationAutomationPanel({
  entityType,
  entityId,
  status,
  error,
  disabled,
}: TranslationAutomationPanelProps) {
  const [currentStatus, setCurrentStatus] = useState(status || "NOT_REQUESTED");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const statusInfo = statusLabels[currentStatus] || statusLabels.NOT_REQUESTED;
  const canRegenerate = Boolean(entityType && entityId && !disabled);

  async function regenerate() {
    if (!entityType || !entityId || loading) return;

    try {
      setLoading(true);
      setMessage("");
      const response = await fetch(
        apiUrl(`/translations/${entityType}/${entityId}/regenerate`),
        {
          method: "POST",
          headers: authHeaders(),
          body: JSON.stringify({ overwrite: true }),
        }
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.message || "No se pudo regenerar.");
      }

      setCurrentStatus(data ? "PENDING_TRANSLATION" : "NOT_REQUESTED");
      setMessage(
        data
          ? "Regeneración enviada a la cola. Las correcciones manuales no se sobrescriben."
          : "No hay campos pendientes para traducir."
      );
    } catch (error: any) {
      setCurrentStatus("ERROR");
      setMessage(error?.message || "Error al solicitar traducción.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-xl border border-[#D4AF37]/20 bg-[#F8F6F2] p-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div
            className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${statusInfo.className}`}
          >
            {statusInfo.label}
          </div>
          <p className="mt-2 text-sm leading-5 text-slate-500">
            La traducción automática usa cola. El admin puede corregir campos manualmente y no serán reemplazados.
          </p>
          {(message || error) && (
            <p className="mt-2 break-words text-xs text-slate-500">
              {message || error}
            </p>
          )}
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={regenerate}
          disabled={!canRegenerate || loading}
          className="shrink-0 gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Regenerar traducciones
        </Button>
      </div>
    </div>
  );
}

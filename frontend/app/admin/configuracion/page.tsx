"use client";

import { useEffect, useState } from "react";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { apiUrl } from "@/lib/api";

type CompanySettings = {
  logoUrl?: string | null;
  companyName: string;
  legalId?: string | null;
  address?: string | null;
  phones?: string | null;
  email?: string | null;
  policies?: string | null;
  invoiceFooter?: string | null;
  legalInfo?: string | null;
};

const initialSettings: CompanySettings = {
  logoUrl: "",
  companyName: "Cartagena Tailored Travel",
  legalId: "",
  address: "",
  phones: "",
  email: "",
  policies: "",
  invoiceFooter: "",
  legalInfo: "",
};

export default function ConfiguracionPage() {
  const [settings, setSettings] = useState<CompanySettings>(initialSettings);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [role, setRole] = useState("");

  async function fetchSettings() {
    try {
      const token = localStorage.getItem("token");
      const storedRole = JSON.parse(localStorage.getItem("user") || "{}")?.role;

      if (!["SUPERADMIN", "ADMIN"].includes(storedRole)) {
        setRole(storedRole || "");
        setMessage("Acceso reservado para Super Admin.");
        return;
      }

      setRole(storedRole || "");
      const res = await fetch(
        apiUrl("/admin-operations/company-settings"),
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const data = await res.json();

      if (!res.ok) {
        setMessage(data.message || "No se pudo cargar la configuración.");
        return;
      }

      setSettings({ ...initialSettings, ...data });
    } catch (error) {
      console.error(error);
      setMessage("Error de conexión cargando configuración.");
    }
  }

  async function saveSettings() {
    try {
      setSaving(true);
      setMessage("");
      const token = localStorage.getItem("token");
      const storedRole = JSON.parse(localStorage.getItem("user") || "{}")?.role;

      if (!["SUPERADMIN", "ADMIN"].includes(storedRole)) {
        setMessage("Tu rol no permite modificar configuracion empresarial.");
        return;
      }

      const res = await fetch(
        apiUrl("/admin-operations/company-settings"),
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(settings),
        }
      );
      const data = await res.json();

      if (!res.ok) {
        setMessage(data.message || "No se pudo guardar la configuración.");
        return;
      }

      setSettings({ ...initialSettings, ...data });
      setMessage("Configuracion empresarial guardada.");
    } catch (error) {
      console.error(error);
      setMessage("Error de conexión guardando configuración.");
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    fetchSettings();
  }, []);

  function update(key: keyof CompanySettings, value: string) {
    setSettings((current) => ({
      ...current,
      [key]: value,
    }));
  }

  if (role && !["SUPERADMIN", "ADMIN"].includes(role)) {
    return (
      <div className="min-h-screen bg-[#F8F6F2] p-8">
        <div className="mx-auto max-w-3xl rounded-3xl border border-[#D4AF37]/20 bg-white p-8 shadow-sm">
          <p className="text-sm font-medium uppercase tracking-[0.25em] text-[#B48A5A]">
            Permisos
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-[#0D2B52]">
            Configuracion restringida
          </h1>
          <p className="mt-3 text-slate-500">
            Tu rol permite operar reservas asignadas. Los datos legales y
            comerciales de la empresa solo los administra Super Admin.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F6F2] p-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.25em] text-[#B48A5A]">
            Empresa
          </p>
          <h1 className="mt-2 text-4xl font-semibold text-[#0D2B52]">
            Configuracion empresarial
          </h1>
          <p className="mt-2 text-slate-500">
            Datos legales y comerciales usados por facturas, correos y futuras plantillas.
          </p>
        </div>

        {message && (
          <div className="rounded-xl border border-[#D4AF37]/20 bg-white p-4 text-sm text-[#0D2B52]">
            {message}
          </div>
        )}

        <Card className="rounded-2xl border-0 shadow-sm">
          <CardContent className="grid gap-5 p-6 md:grid-cols-2">
            <Field label="Nombre empresa">
              <Input
                value={settings.companyName || ""}
                onChange={(event) => update("companyName", event.target.value)}
              />
            </Field>
            <Field label="Logo URL">
              <Input
                value={settings.logoUrl || ""}
                onChange={(event) => update("logoUrl", event.target.value)}
              />
            </Field>
            <Field label="NIT / Identificacion legal">
              <Input
                value={settings.legalId || ""}
                onChange={(event) => update("legalId", event.target.value)}
              />
            </Field>
            <Field label="Correo">
              <Input
                value={settings.email || ""}
                onChange={(event) => update("email", event.target.value)}
              />
            </Field>
            <Field label="Telefonos">
              <Input
                value={settings.phones || ""}
                onChange={(event) => update("phones", event.target.value)}
              />
            </Field>
            <Field label="Direccion">
              <Input
                value={settings.address || ""}
                onChange={(event) => update("address", event.target.value)}
              />
            </Field>
            <Field label="Politicas">
              <Textarea
                value={settings.policies || ""}
                onChange={(event) => update("policies", event.target.value)}
                rows={5}
              />
            </Field>
            <Field label="Datos legales">
              <Textarea
                value={settings.legalInfo || ""}
                onChange={(event) => update("legalInfo", event.target.value)}
                rows={5}
              />
            </Field>
            <div className="md:col-span-2">
              <Field label="Footer factura">
                <Textarea
                  value={settings.invoiceFooter || ""}
                  onChange={(event) => update("invoiceFooter", event.target.value)}
                  rows={4}
                />
              </Field>
            </div>
            <div className="md:col-span-2">
              <Button
                type="button"
                onClick={saveSettings}
                disabled={saving}
                className="rounded-xl bg-[#0D2B52] hover:bg-[#12396d]"
              >
                <Save className="mr-2 h-4 w-4" />
                Guardar configuración
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="space-y-2 text-sm">
      <span className="text-slate-500">{label}</span>
      {children}
    </label>
  );
}

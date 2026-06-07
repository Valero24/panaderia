"use client";

import { useEffect, useState } from "react";
import { Building2, Palette, Save, Settings2, Share2, ShieldAlert, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { apiUrl } from "@/lib/api";

type SystemSettings = {
  businessName: string;
  legalName?: string | null;
  nit?: string | null;
  email?: string | null;
  phone?: string | null;
  whatsappNumber?: string | null;
  address?: string | null;
  city: string;
  country: string;
  websiteUrl?: string | null;
  instagramUrl?: string | null;
  facebookUrl?: string | null;
  tiktokUrl?: string | null;
  logoUrl?: string | null;
  faviconUrl?: string | null;
  primaryColor: string;
  secondaryColor: string;
  defaultCurrency: string;
  baseCurrency: string;
  enabledDisplayCurrencies: string[];
  defaultDisplayCurrency: string;
  exchangeRateMode: string;
  exchangeRateSource: string;
  exchangeRateDate?: string | null;
  currencyConversionEnabled: boolean;
  exchangeRatesFromCOP: Record<string, number>;
  taxRate: number;
  serviceFeeRate: number;
  footerText?: string | null;
  invoiceNotes?: string | null;
  bookingTerms?: string | null;
  privacyPolicyText?: string | null;
  demoModeEnabled: boolean;
  realPaymentsEnabled: boolean;
  realAvailabilityEnabled: boolean;
  whatsappNotificationsEnabled: boolean;
  factusEnabled: boolean;
  factusMode: string;
  factusNumberingRangeId?: string | null;
  factusDefaultDocumentCode: string;
  factusDefaultPaymentForm?: string | null;
  factusDefaultPaymentMethodCode?: string | null;
  factusDefaultUnitMeasureId?: string | null;
  factusDefaultStandardCodeId?: string | null;
  factusDefaultTributeId?: string | null;
  factusDefaultMunicipalityId?: string | null;
};

const initialSettings: SystemSettings = {
  businessName: "Cartagena Tailored Travel",
  legalName: "",
  nit: "",
  email: "",
  phone: "",
  whatsappNumber: "",
  address: "",
  city: "Cartagena",
  country: "Colombia",
  websiteUrl: "",
  instagramUrl: "",
  facebookUrl: "",
  tiktokUrl: "",
  logoUrl: "",
  faviconUrl: "",
  primaryColor: "#0D2B52",
  secondaryColor: "#B48A5A",
  defaultCurrency: "COP",
  baseCurrency: "COP",
  enabledDisplayCurrencies: ["COP", "USD", "EUR", "BRL"],
  defaultDisplayCurrency: "COP",
  exchangeRateMode: "MANUAL",
  exchangeRateSource: "MANUAL",
  exchangeRateDate: new Date().toISOString(),
  currencyConversionEnabled: true,
  exchangeRatesFromCOP: {
    COP: 1,
    USD: 0.00025,
    EUR: 0.00023,
    BRL: 0.0014,
  },
  taxRate: 0,
  serviceFeeRate: 0,
  footerText: "",
  invoiceNotes: "",
  bookingTerms: "",
  privacyPolicyText: "",
  demoModeEnabled: true,
  realPaymentsEnabled: false,
  realAvailabilityEnabled: false,
  whatsappNotificationsEnabled: false,
  factusEnabled: false,
  factusMode: "mock",
  factusNumberingRangeId: "",
  factusDefaultDocumentCode: "01",
  factusDefaultPaymentForm: "",
  factusDefaultPaymentMethodCode: "",
  factusDefaultUnitMeasureId: "",
  factusDefaultStandardCodeId: "",
  factusDefaultTributeId: "",
  factusDefaultMunicipalityId: "",
};

function readRole() {
  try {
    return JSON.parse(localStorage.getItem("user") || "{}")?.role || "";
  } catch {
    return "";
  }
}

export default function ConfiguracionPage() {
  const [settings, setSettings] = useState<SystemSettings>(initialSettings);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [role, setRole] = useState("");

  async function fetchSettings() {
    try {
      setLoading(true);
      setMessage("");

      const token = localStorage.getItem("token");
      const storedRole = readRole();
      setRole(storedRole);

      if (storedRole !== "SUPERADMIN") {
        setMessage("Acceso reservado para Superadministrador.");
        return;
      }

      const res = await fetch(apiUrl("/system-settings"), {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();

      if (!res.ok) {
        setMessage(data.message || "No se pudo cargar la configuración.");
        return;
      }

      setSettings({ ...initialSettings, ...data });
    } catch (error) {
      console.error(error);
      setMessage("Error de conexión cargando configuración.");
    } finally {
      setLoading(false);
    }
  }

  async function saveSettings() {
    try {
      setSaving(true);
      setMessage("");

      const token = localStorage.getItem("token");

      if (role !== "SUPERADMIN") {
        setMessage("Tu rol no permite modificar configuración general.");
        return;
      }

      const res = await fetch(apiUrl("/system-settings"), {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(settings),
      });
      const data = await res.json();

      if (!res.ok) {
        setMessage(data.message || "No se pudo guardar la configuración.");
        return;
      }

      setSettings({ ...initialSettings, ...data });
      setMessage("Configuración general actualizada.");
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

  function update(
    key: keyof SystemSettings,
    value: string | number | boolean | string[] | Record<string, number>
  ) {
    setSettings((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function updateEnabledCurrencies(value: string) {
    const currencies = value
      .split(",")
      .map((currency) => currency.trim().toUpperCase())
      .filter(Boolean);

    update("enabledDisplayCurrencies", Array.from(new Set(["COP", ...currencies])));
  }

  function updateExchangeRate(currency: string, value: string) {
    update("exchangeRatesFromCOP", {
      ...settings.exchangeRatesFromCOP,
      COP: 1,
      [currency]: Number(value || 0),
    });
  }

  const enabledCurrenciesText = (settings.enabledDisplayCurrencies || ["COP"])
    .join(", ");

  if (!loading && role !== "SUPERADMIN") {
    return (
      <Card className="rounded-2xl border border-red-100 bg-red-50">
        <CardContent className="p-6">
          <ShieldAlert className="h-8 w-8 text-red-700" />
          <h1 className="mt-4 text-2xl font-semibold text-red-900">
            Configuración restringida
          </h1>
          <p className="mt-2 text-sm text-red-700">
            Los datos generales del negocio solo pueden ser administrados por SUPERADMIN.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.28em] text-[#B48A5A]">
            Sistema
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-[#0D2B52]">
            Configuración del sistema
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-500">
            Administra información del negocio, marca, redes, operación demo y textos legales.
          </p>
        </div>
        <Button
          type="button"
          onClick={saveSettings}
          disabled={saving || loading}
          className="rounded-xl bg-[#0D2B52] hover:bg-[#12396d]"
        >
          <Save className="mr-2 h-4 w-4" />
          {saving ? "Guardando..." : "Guardar cambios"}
        </Button>
      </div>

      {message && (
        <p className="rounded-xl border border-[#D4AF37]/20 bg-white px-4 py-3 text-sm text-[#0D2B52]">
          {message}
        </p>
      )}

      {loading ? (
        <div className="h-96 rounded-2xl premium-skeleton" />
      ) : (
        <>
          <Section
            icon={Building2}
            title="Información del negocio"
            description="Datos comerciales visibles en documentos y futuras plantillas."
          >
            <Field label="Nombre comercial">
              <Input value={settings.businessName || ""} onChange={(e) => update("businessName", e.target.value)} />
            </Field>
            <Field label="Razón social">
              <Input value={settings.legalName || ""} onChange={(e) => update("legalName", e.target.value)} />
            </Field>
            <Field label="NIT">
              <Input value={settings.nit || ""} onChange={(e) => update("nit", e.target.value)} />
            </Field>
            <Field label="Correo">
              <Input type="email" value={settings.email || ""} onChange={(e) => update("email", e.target.value)} />
            </Field>
            <Field label="Teléfono">
              <Input value={settings.phone || ""} onChange={(e) => update("phone", e.target.value)} />
            </Field>
            <Field label="WhatsApp">
              <Input value={settings.whatsappNumber || ""} onChange={(e) => update("whatsappNumber", e.target.value)} />
            </Field>
            <Field label="Dirección">
              <Input value={settings.address || ""} onChange={(e) => update("address", e.target.value)} />
            </Field>
            <Field label="Ciudad">
              <Input value={settings.city || ""} onChange={(e) => update("city", e.target.value)} />
            </Field>
            <Field label="País">
              <Input value={settings.country || ""} onChange={(e) => update("country", e.target.value)} />
            </Field>
            <Field label="Sitio web">
              <Input value={settings.websiteUrl || ""} onChange={(e) => update("websiteUrl", e.target.value)} />
            </Field>
          </Section>

          <Section
            icon={Palette}
            title="Marca"
            description="Recursos visuales preparados para uso público y documentos."
          >
            <Field label="Logo URL">
              <Input value={settings.logoUrl || ""} onChange={(e) => update("logoUrl", e.target.value)} />
            </Field>
            <Field label="Favicon URL">
              <Input value={settings.faviconUrl || ""} onChange={(e) => update("faviconUrl", e.target.value)} />
            </Field>
            <Field label="Color principal">
              <Input type="color" value={settings.primaryColor || "#0D2B52"} onChange={(e) => update("primaryColor", e.target.value)} />
            </Field>
            <Field label="Color secundario">
              <Input type="color" value={settings.secondaryColor || "#B48A5A"} onChange={(e) => update("secondaryColor", e.target.value)} />
            </Field>
          </Section>

          <Section
            icon={Share2}
            title="Redes sociales"
            description="Enlaces comerciales para footer, campañas y canales públicos."
          >
            <Field label="Instagram">
              <Input value={settings.instagramUrl || ""} onChange={(e) => update("instagramUrl", e.target.value)} />
            </Field>
            <Field label="Facebook">
              <Input value={settings.facebookUrl || ""} onChange={(e) => update("facebookUrl", e.target.value)} />
            </Field>
            <Field label="TikTok">
              <Input value={settings.tiktokUrl || ""} onChange={(e) => update("tiktokUrl", e.target.value)} />
            </Field>
          </Section>

          <Section
            icon={Settings2}
            title="Operación"
            description="Parámetros generales. En demo se mantienen pagos y disponibilidad real desactivados."
          >
            <Field label="Moneda base fiscal">
              <Input value="COP" disabled className="bg-slate-50 text-slate-500" />
            </Field>
            <Field label="Moneda contable">
              <Input value="COP" disabled className="bg-slate-50 text-slate-500" />
            </Field>
            <Field label="Moneda visual por defecto">
              <select
                value={settings.defaultDisplayCurrency || "COP"}
                onChange={(e) => update("defaultDisplayCurrency", e.target.value)}
                className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-[#0D2B52]"
              >
                {["COP", "USD", "EUR", "BRL"].map((currency) => (
                  <option key={currency} value={currency}>
                    {currency}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Monedas visibles permitidas">
              <Input
                value={enabledCurrenciesText}
                onChange={(e) => updateEnabledCurrencies(e.target.value)}
                placeholder="COP, USD, EUR, BRL"
              />
            </Field>
            <Field label="Modo tasa">
              <select
                value={settings.exchangeRateMode || "MANUAL"}
                onChange={(e) => update("exchangeRateMode", e.target.value)}
                className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-[#0D2B52]"
              >
                <option value="MANUAL">MANUAL</option>
                <option value="AUTO">AUTO</option>
                <option value="DISABLED">DISABLED</option>
              </select>
            </Field>
            <Field label="Fuente tasa">
              <select
                value={settings.exchangeRateSource || "MANUAL"}
                onChange={(e) => update("exchangeRateSource", e.target.value)}
                className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-[#0D2B52]"
              >
                <option value="MANUAL">MANUAL</option>
                <option value="TRM">TRM</option>
                <option value="API">API</option>
              </select>
            </Field>
            <Field label="Fecha tasa">
              <Input
                type="date"
                value={(settings.exchangeRateDate || "").slice(0, 10)}
                onChange={(e) => update("exchangeRateDate", e.target.value)}
              />
            </Field>
            <Toggle label="Conversión visual activa" checked={settings.currencyConversionEnabled} onChange={(value) => update("currencyConversionEnabled", value)} />
            <Field label="Tasa COP → USD">
              <Input
                type="number"
                step="0.00001"
                min="0"
                value={settings.exchangeRatesFromCOP?.USD ?? 0}
                onChange={(e) => updateExchangeRate("USD", e.target.value)}
              />
            </Field>
            <Field label="Tasa COP → EUR">
              <Input
                type="number"
                step="0.00001"
                min="0"
                value={settings.exchangeRatesFromCOP?.EUR ?? 0}
                onChange={(e) => updateExchangeRate("EUR", e.target.value)}
              />
            </Field>
            <Field label="Tasa COP → BRL">
              <Input
                type="number"
                step="0.00001"
                min="0"
                value={settings.exchangeRatesFromCOP?.BRL ?? 0}
                onChange={(e) => updateExchangeRate("BRL", e.target.value)}
              />
            </Field>
            <Field label="Regla fiscal">
              <Input
                value="Pagos, facturas internas y Factus futuro siempre en COP"
                disabled
                className="bg-slate-50 text-slate-500"
              />
            </Field>
            <Field label="Impuesto %">
              <Input type="number" min="0" value={settings.taxRate ?? 0} onChange={(e) => update("taxRate", Number(e.target.value || 0))} />
            </Field>
            <Field label="Tarifa servicio %">
              <Input type="number" min="0" value={settings.serviceFeeRate ?? 0} onChange={(e) => update("serviceFeeRate", Number(e.target.value || 0))} />
            </Field>
            <Toggle label="Modo demo" checked={settings.demoModeEnabled} onChange={(value) => update("demoModeEnabled", value)} />
            <Toggle label="Pagos reales" checked={settings.realPaymentsEnabled} onChange={(value) => update("realPaymentsEnabled", value)} />
            <Toggle label="Disponibilidad real" checked={settings.realAvailabilityEnabled} onChange={(value) => update("realAvailabilityEnabled", value)} />
            <Toggle label="Notificaciones WhatsApp" checked={settings.whatsappNotificationsEnabled} onChange={(value) => update("whatsappNotificationsEnabled", value)} />
          </Section>

          <Section
            icon={FileText}
            title="Factus / DIAN futuro"
            description="Preparación para facturación electrónica. No guardar secretos ni credenciales aquí."
          >
            <Toggle label="Factus habilitado" checked={settings.factusEnabled} onChange={(value) => update("factusEnabled", value)} />
            <Field label="Modo Factus">
              <Input value={settings.factusMode || "mock"} onChange={(e) => update("factusMode", e.target.value)} placeholder="mock | sandbox | producción" />
            </Field>
            <Field label="Numbering range ID">
              <Input value={settings.factusNumberingRangeId || ""} onChange={(e) => update("factusNumberingRangeId", e.target.value)} />
            </Field>
            <Field label="Documento por defecto">
              <Input value={settings.factusDefaultDocumentCode || "01"} onChange={(e) => update("factusDefaultDocumentCode", e.target.value)} />
            </Field>
            <Field label="Forma de pago">
              <Input value={settings.factusDefaultPaymentForm || ""} onChange={(e) => update("factusDefaultPaymentForm", e.target.value)} />
            </Field>
            <Field label="Método de pago">
              <Input value={settings.factusDefaultPaymentMethodCode || ""} onChange={(e) => update("factusDefaultPaymentMethodCode", e.target.value)} />
            </Field>
            <Field label="Unidad de medida">
              <Input value={settings.factusDefaultUnitMeasureId || ""} onChange={(e) => update("factusDefaultUnitMeasureId", e.target.value)} />
            </Field>
            <Field label="Código estándar">
              <Input value={settings.factusDefaultStandardCodeId || ""} onChange={(e) => update("factusDefaultStandardCodeId", e.target.value)} />
            </Field>
            <Field label="Tributo por defecto">
              <Input value={settings.factusDefaultTributeId || ""} onChange={(e) => update("factusDefaultTributeId", e.target.value)} />
            </Field>
            <Field label="Municipio por defecto">
              <Input value={settings.factusDefaultMunicipalityId || ""} onChange={(e) => update("factusDefaultMunicipalityId", e.target.value)} />
            </Field>
          </Section>

          <Section
            icon={FileText}
            title="Textos legales y comerciales"
            description="Textos reutilizables para footer, comprobantes y políticas."
            wide
          >
            <Field label="Footer">
              <Textarea value={settings.footerText || ""} rows={3} onChange={(e) => update("footerText", e.target.value)} />
            </Field>
            <Field label="Notas de factura/comprobante">
              <Textarea value={settings.invoiceNotes || ""} rows={3} onChange={(e) => update("invoiceNotes", e.target.value)} />
            </Field>
            <Field label="Términos de reserva">
              <Textarea value={settings.bookingTerms || ""} rows={5} onChange={(e) => update("bookingTerms", e.target.value)} />
            </Field>
            <Field label="Política de privacidad">
              <Textarea value={settings.privacyPolicyText || ""} rows={5} onChange={(e) => update("privacyPolicyText", e.target.value)} />
            </Field>
          </Section>
        </>
      )}
    </div>
  );
}

function Section({
  icon: Icon,
  title,
  description,
  children,
  wide,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <Card className="rounded-2xl border border-[#D4AF37]/20 bg-white">
      <CardContent className="p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F8F6F2]">
            <Icon className="h-5 w-5 text-[#B48A5A]" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-[#0D2B52]">{title}</h2>
            <p className="mt-1 text-sm text-slate-500">{description}</p>
          </div>
        </div>
        <div className={`mt-5 grid gap-4 ${wide ? "md:grid-cols-2" : "md:grid-cols-2 xl:grid-cols-3"}`}>
          {children}
        </div>
      </CardContent>
    </Card>
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
      <span className="font-medium text-slate-600">{label}</span>
      {children}
    </label>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex min-h-11 items-center justify-between gap-3 rounded-xl border border-[#D4AF37]/20 bg-[#F8F6F2] px-4 py-3 text-sm">
      <span className="font-medium text-[#0D2B52]">{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-5 w-5 accent-[#0D2B52]"
      />
    </label>
  );
}

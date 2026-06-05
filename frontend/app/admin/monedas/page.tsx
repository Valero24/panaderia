"use client";

import { useEffect, useMemo, useState } from "react";
import { Coins, Plus, RefreshCw, ShieldAlert } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { apiUrl } from "@/lib/api";

type ExchangeRate = {
  id: string;
  fromCurrency: string;
  toCurrency: string;
  rate: string | number;
  source: string;
  rateDate: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

const currencies = ["USD", "EUR", "BRL"];
const sources = ["MANUAL", "TRM", "API"];

function readRole() {
  try {
    return JSON.parse(localStorage.getItem("user") || "{}")?.role || "";
  } catch {
    return "";
  }
}

function formatDate(value?: string) {
  if (!value) return "Sin fecha";

  return new Intl.DateTimeFormat("es-CO", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatRate(rate: string | number) {
  return Number(rate || 0).toLocaleString("es-CO", {
    maximumFractionDigits: 6,
  });
}

export default function AdminCurrenciesPage() {
  const [role, setRole] = useState("");
  const [rates, setRates] = useState<ExchangeRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({
    fromCurrency: "USD",
    rate: "",
    source: "MANUAL",
    rateDate: new Date().toISOString().slice(0, 10),
  });

  const activeRates = useMemo(
    () => rates.filter((rate) => rate.isActive),
    [rates]
  );
  const inactiveRates = useMemo(
    () => rates.filter((rate) => !rate.isActive),
    [rates]
  );
  const lastUpdated = activeRates
    .map((rate) => new Date(rate.rateDate).getTime())
    .sort((a, b) => b - a)[0];

  async function fetchRates() {
    try {
      setLoading(true);
      setMessage("");
      const token = localStorage.getItem("token");
      const res = await fetch(apiUrl("/exchange-rates?take=300"), {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();

      if (!res.ok) {
        setMessage(data.message || "No se pudieron cargar las tasas.");
        setRates([]);
        return;
      }

      setRates(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
      setMessage("Error de conexion cargando tasas.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const storedRole = readRole();
    setRole(storedRole);

    if (storedRole === "SUPERADMIN") {
      fetchRates();
    } else {
      setLoading(false);
      setMessage("Acceso reservado para Super Admin.");
    }
  }, []);

  async function createRate() {
    const rate = Number(form.rate);

    if (!Number.isFinite(rate) || rate <= 0) {
      setMessage("Ingresa una tasa valida y positiva.");
      return;
    }

    try {
      setSaving(true);
      setMessage("");
      const token = localStorage.getItem("token");
      const res = await fetch(apiUrl("/exchange-rates"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          fromCurrency: form.fromCurrency,
          toCurrency: "COP",
          rate,
          source: form.source,
          rateDate: form.rateDate,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setMessage(data.message || "No se pudo crear la tasa.");
        return;
      }

      setMessage("Tasa registrada y activada correctamente.");
      setForm((current) => ({ ...current, rate: "" }));
      await fetchRates();
    } catch (error) {
      console.error(error);
      setMessage("Error de conexion creando tasa.");
    } finally {
      setSaving(false);
    }
  }

  async function setRateStatus(rate: ExchangeRate, isActive: boolean) {
    try {
      setSaving(true);
      setMessage("");
      const token = localStorage.getItem("token");
      const res = await fetch(apiUrl(`/exchange-rates/${rate.id}/status`), {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ isActive }),
      });
      const data = await res.json();

      if (!res.ok) {
        setMessage(data.message || "No se pudo actualizar la tasa.");
        return;
      }

      setMessage(isActive ? "Tasa activada." : "Tasa desactivada.");
      await fetchRates();
    } catch (error) {
      console.error(error);
      setMessage("Error de conexion actualizando tasa.");
    } finally {
      setSaving(false);
    }
  }

  if (role && role !== "SUPERADMIN") {
    return (
      <main className="min-h-screen bg-[#F8F6F2] p-6">
        <Card className="mx-auto max-w-3xl rounded-3xl border border-[#D4AF37]/20 bg-white">
          <CardContent className="p-8">
            <ShieldAlert className="h-8 w-8 text-[#B48A5A]" />
            <h1 className="mt-4 text-3xl font-semibold text-[#0D2B52]">
              Modulo restringido
            </h1>
            <p className="mt-2 text-slate-500">
              Solo SUPERADMIN puede administrar tasas de cambio.
            </p>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F8F6F2] p-4 text-[#0D2B52] lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#B48A5A]">
              Configuracion monetaria
            </p>
            <h1 className="mt-2 text-3xl font-semibold lg:text-4xl">
              Monedas y tasas
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-500">
              La moneda base fiscal es COP. Las demas monedas son referencias
              visuales para clientes internacionales.
            </p>
          </div>
          <Button type="button" variant="outline" onClick={fetchRates}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Actualizar
          </Button>
        </header>

        {message ? (
          <div className="rounded-2xl border border-[#D4AF37]/20 bg-white p-4 text-sm">
            {message}
          </div>
        ) : null}

        <section className="grid gap-4 lg:grid-cols-4">
          <Metric label="Moneda base" value="COP" />
          <Metric label="Monedas visibles" value="USD · EUR · BRL" />
          <Metric
            label="Tasas activas"
            value={String(activeRates.length)}
          />
          <Metric
            label="Ultima actualizacion"
            value={lastUpdated ? formatDate(new Date(lastUpdated).toISOString()) : "Sin tasa"}
          />
        </section>

        <section className="grid gap-6 lg:grid-cols-[360px_1fr]">
          <Card className="rounded-3xl border border-[#D4AF37]/20 bg-white shadow-sm">
            <CardContent className="space-y-4 p-5">
              <div className="flex items-center gap-2">
                <Plus className="h-5 w-5 text-[#B48A5A]" />
                <h2 className="text-xl font-semibold">Crear tasa manual</h2>
              </div>

              <label className="block text-sm font-medium">
                Moneda
                <select
                  value={form.fromCurrency}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      fromCurrency: event.target.value,
                    }))
                  }
                  className="mt-2 h-11 w-full rounded-xl border border-[#D4AF37]/25 bg-white px-3"
                >
                  {currencies.map((currency) => (
                    <option key={currency} value={currency}>
                      {currency} a COP
                    </option>
                  ))}
                </select>
              </label>

              <label className="block text-sm font-medium">
                Tasa
                <Input
                  type="number"
                  min={0}
                  step="0.000001"
                  value={form.rate}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      rate: event.target.value,
                    }))
                  }
                  placeholder="Ej: 4050"
                  className="mt-2 h-11 rounded-xl"
                />
              </label>

              <label className="block text-sm font-medium">
                Fuente
                <select
                  value={form.source}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      source: event.target.value,
                    }))
                  }
                  className="mt-2 h-11 w-full rounded-xl border border-[#D4AF37]/25 bg-white px-3"
                >
                  {sources.map((source) => (
                    <option key={source} value={source}>
                      {source}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block text-sm font-medium">
                Fecha tasa
                <Input
                  type="date"
                  value={form.rateDate}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      rateDate: event.target.value,
                    }))
                  }
                  className="mt-2 h-11 rounded-xl"
                />
              </label>

              <Button
                type="button"
                onClick={createRate}
                disabled={saving}
                className="h-11 w-full rounded-xl bg-[#0D2B52] hover:bg-[#12396d]"
              >
                Registrar tasa
              </Button>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <CurrencySection
              title="Tasas activas"
              empty="No hay tasas activas."
              rates={activeRates}
              loading={loading}
              saving={saving}
              onStatus={setRateStatus}
            />
            <CurrencySection
              title="Historial"
              empty="No hay historial de tasas."
              rates={inactiveRates}
              loading={loading}
              saving={saving}
              onStatus={setRateStatus}
            />
          </div>
        </section>
      </div>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <Card className="rounded-3xl border border-[#D4AF37]/20 bg-white shadow-sm">
      <CardContent className="p-5">
        <p className="text-xs uppercase tracking-[0.2em] text-[#B48A5A]">
          {label}
        </p>
        <p className="mt-2 text-2xl font-semibold">{value}</p>
      </CardContent>
    </Card>
  );
}

function CurrencySection({
  title,
  empty,
  rates,
  loading,
  saving,
  onStatus,
}: {
  title: string;
  empty: string;
  rates: ExchangeRate[];
  loading: boolean;
  saving: boolean;
  onStatus: (rate: ExchangeRate, isActive: boolean) => void;
}) {
  return (
    <Card className="rounded-3xl border border-[#D4AF37]/20 bg-white shadow-sm">
      <CardContent className="space-y-4 p-5">
        <div className="flex items-center gap-2">
          <Coins className="h-5 w-5 text-[#B48A5A]" />
          <h2 className="text-xl font-semibold">{title}</h2>
        </div>

        {loading ? (
          <div className="h-28 rounded-2xl premium-skeleton" />
        ) : rates.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-[#D4AF37]/30 p-5 text-center text-sm text-slate-500">
            {empty}
          </p>
        ) : (
          <div className="grid gap-3">
            {rates.map((rate) => (
              <div
                key={rate.id}
                className="grid gap-3 rounded-2xl border border-[#D4AF37]/15 bg-[#F8F6F2] p-4 lg:grid-cols-[1fr_auto]"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold">
                      {rate.fromCurrency} → {rate.toCurrency}
                    </p>
                    <Badge variant="outline">
                      {rate.isActive ? "Activa" : "Inactiva"}
                    </Badge>
                    <Badge variant="secondary">{rate.source}</Badge>
                  </div>
                  <p className="mt-2 text-2xl font-semibold text-[#0D2B52]">
                    {formatRate(rate.rate)}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Fecha tasa: {formatDate(rate.rateDate)} · Creada:{" "}
                    {formatDate(rate.createdAt)}
                  </p>
                </div>
                <div className="flex items-center">
                  <Button
                    type="button"
                    variant={rate.isActive ? "outline" : "default"}
                    disabled={saving}
                    onClick={() => onStatus(rate, !rate.isActive)}
                    className="w-full rounded-xl lg:w-auto"
                  >
                    {rate.isActive ? "Desactivar" : "Activar"}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

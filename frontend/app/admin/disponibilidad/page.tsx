"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  Filter,
  Lock,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { apiUrl } from "@/lib/api";

type Property = {
  id: number;
  title: string;
  area?: string;
};

type AvailabilityBlock = {
  id: number;
  startDate: string;
  endDate: string;
  source: string;
  notes?: string;
};

const weekdays = ["Lun", "Mar", "Mie", "Jue", "Vie", "Sab", "Dom"];

function dateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function endOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

function overlapsDay(block: AvailabilityBlock, day: Date) {
  const start = new Date(block.startDate);
  const end = new Date(block.endDate);
  const dayStart = new Date(day);
  const dayEnd = new Date(day);
  dayEnd.setDate(dayEnd.getDate() + 1);

  return start < dayEnd && end > dayStart;
}

function sourceClass(source: string) {
  if (source === "AIRBNB") return "border-rose-200 bg-rose-50 text-rose-700";
  if (source === "SYSTEM") return "border-[#0D2B52]/20 bg-[#EAF0F8] text-[#0D2B52]";
  if (source === "ADMIN") return "border-[#D4AF37]/40 bg-[#FFF8E1] text-[#8A651F]";

  return "border-slate-200 bg-slate-50 text-slate-600";
}

export default function AvailabilityPage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [selectedProperty, setSelectedProperty] = useState<number | null>(null);
  const [blocks, setBlocks] = useState<AvailabilityBlock[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [notes, setNotes] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  const selectedPropertyData = properties.find(
    (property) => property.id === selectedProperty
  );

  const calendarDays = useMemo(() => {
    const first = startOfMonth(currentMonth);
    const last = endOfMonth(currentMonth);
    const startOffset = (first.getDay() + 6) % 7;
    const days: Date[] = [];
    const cursor = new Date(first);
    cursor.setDate(cursor.getDate() - startOffset);

    while (days.length < 42) {
      days.push(new Date(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }

    return { first, last, days };
  }, [currentMonth]);

  const occupiedDays = calendarDays.days.filter((day) =>
    blocks.some((block) => overlapsDay(block, day))
  ).length;
  const monthDays = calendarDays.days.filter(
    (day) => day.getMonth() === currentMonth.getMonth()
  ).length;
  const occupancy =
    monthDays > 0 ? Math.round((occupiedDays / monthDays) * 100) : 0;

  async function fetchProperties() {
    const res = await fetch(apiUrl("/properties"));
    const data = await res.json();
    const items = Array.isArray(data) ? data : [];

    setProperties(items);

    if (items.length > 0) {
      setSelectedProperty(items[0].id);
      await fetchBlocks(items[0].id);
    }
  }

  async function fetchBlocks(propertyId = selectedProperty) {
    if (!propertyId) return;

    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const res = await fetch(apiUrl(`/availability/${propertyId}`), {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();

      setBlocks(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
      setMessage("Error cargando disponibilidad.");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateBlock() {
    if (!selectedProperty || !startDate || !endDate) return;

    const token = localStorage.getItem("token");

    await fetch(apiUrl("/availability"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        propertyId: selectedProperty,
        startDate,
        endDate,
        source: "ADMIN",
        notes,
      }),
    });

    setStartDate("");
    setEndDate("");
    setNotes("");
    await fetchBlocks(selectedProperty);
  }

  async function handleDelete(id: number) {
    const token = localStorage.getItem("token");

    await fetch(apiUrl(`/availability/${id}`), {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    await fetchBlocks();
  }

  useEffect(() => {
    fetchProperties();
  }, []);

  return (
    <div className="min-h-screen bg-[#F8F6F2] p-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.25em] text-[#B48A5A]">
              Calendario operativo
            </p>
            <h1 className="mt-2 text-4xl font-semibold text-[#0D2B52]">
              Disponibilidad y ocupacion
            </h1>
            <p className="mt-2 text-slate-500">
              Visualiza reservas confirmadas, bloqueos externos y ocupacion diaria.
            </p>
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={() => fetchBlocks()}
            className="rounded-xl"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Sincronizar vista
          </Button>
        </div>

        {message && (
          <div className="rounded-xl border border-[#D4AF37]/20 bg-white p-4 text-sm text-[#0D2B52]">
            {message}
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-3">
          <Card className="rounded-2xl border-0 shadow-sm">
            <CardContent className="p-6">
              <Filter className="h-5 w-5 text-[#B48A5A]" />
              <p className="mt-4 text-sm text-slate-500">Propiedad</p>
              <select
                className="mt-2 h-11 w-full rounded-md border border-input bg-white px-3 text-sm text-[#0D2B52]"
                value={selectedProperty || ""}
                onChange={(event) => {
                  const id = Number(event.target.value);
                  setSelectedProperty(id);
                  fetchBlocks(id);
                }}
              >
                {properties.map((property) => (
                  <option key={property.id} value={property.id}>
                    {property.title}
                  </option>
                ))}
              </select>
            </CardContent>
          </Card>

          <MetricCard label="Bloqueos del mes" value={blocks.length} />
          <MetricCard label="Ocupacion estimada" value={`${occupancy}%`} />
        </div>

        <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
          <Card className="rounded-2xl border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-2xl font-semibold text-[#0D2B52]">
                    {selectedPropertyData?.title || "Calendario"}
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    {currentMonth.toLocaleDateString("es-CO", {
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                      setCurrentMonth(
                        new Date(
                          currentMonth.getFullYear(),
                          currentMonth.getMonth() - 1,
                          1
                        )
                      )
                    }
                  >
                    Anterior
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                      setCurrentMonth(
                        new Date(
                          currentMonth.getFullYear(),
                          currentMonth.getMonth() + 1,
                          1
                        )
                      )
                    }
                  >
                    Siguiente
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-7 gap-2">
                {weekdays.map((day) => (
                  <div
                    key={day}
                    className="py-2 text-center text-xs font-medium uppercase tracking-[0.18em] text-slate-400"
                  >
                    {day}
                  </div>
                ))}

                {calendarDays.days.map((day) => {
                  const dayBlocks = blocks.filter((block) =>
                    overlapsDay(block, day)
                  );
                  const outside = day.getMonth() !== currentMonth.getMonth();

                  return (
                    <div
                      key={dateKey(day)}
                      className={`min-h-[106px] rounded-lg border p-2 ${
                        outside
                          ? "border-slate-100 bg-slate-50 text-slate-300"
                          : dayBlocks.length > 0
                            ? "border-[#D4AF37]/30 bg-[#FFF8E1]/50"
                            : "border-[#D4AF37]/10 bg-white"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">
                          {day.getDate()}
                        </span>
                        {dayBlocks.length > 1 && (
                          <Badge variant="outline" className="rounded-md px-1.5">
                            {dayBlocks.length}
                          </Badge>
                        )}
                      </div>

                      <div className="mt-2 space-y-1">
                        {dayBlocks.slice(0, 2).map((block) => (
                          <div
                            key={block.id}
                            className={`truncate rounded-md border px-2 py-1 text-[11px] ${sourceClass(block.source)}`}
                          >
                            {block.source} {block.notes ? `- ${block.notes}` : ""}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <aside className="space-y-5">
            <Card className="rounded-2xl border-0 shadow-sm">
              <CardContent className="space-y-4 p-6">
                <h3 className="flex items-center gap-2 font-semibold text-[#0D2B52]">
                  <Lock className="h-4 w-4 text-[#B48A5A]" />
                  Bloqueo manual
                </h3>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(event) => setStartDate(event.target.value)}
                />
                <Input
                  type="date"
                  value={endDate}
                  onChange={(event) => setEndDate(event.target.value)}
                />
                <Input
                  placeholder="Motivo o nota"
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                />
                <Button
                  type="button"
                  onClick={handleCreateBlock}
                  className="w-full rounded-xl bg-[#0D2B52] hover:bg-[#12396d]"
                >
                  Bloquear fechas
                </Button>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-0 shadow-sm">
              <CardContent className="p-6">
                <h3 className="flex items-center gap-2 font-semibold text-[#0D2B52]">
                  <CalendarDays className="h-4 w-4 text-[#B48A5A]" />
                  Bloqueos activos
                </h3>
                <div className="mt-4 space-y-3">
                  {loading && (
                    <p className="text-sm text-slate-500">Cargando...</p>
                  )}
                  {!loading && blocks.length === 0 && (
                    <p className="text-sm text-slate-500">
                      Sin bloqueos para esta propiedad.
                    </p>
                  )}
                  {blocks.map((block) => (
                    <div
                      key={block.id}
                      className="rounded-xl border border-[#D4AF37]/20 bg-white p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <Badge
                            variant="outline"
                            className={`rounded-md ${sourceClass(block.source)}`}
                          >
                            {block.source}
                          </Badge>
                          <p className="mt-2 text-sm font-medium text-[#0D2B52]">
                            {block.startDate.slice(0, 10)} -{" "}
                            {block.endDate.slice(0, 10)}
                          </p>
                          {block.notes && (
                            <p className="mt-1 text-sm text-slate-500">
                              {block.notes}
                            </p>
                          )}
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => handleDelete(block.id)}
                          className="h-9 w-9 p-0 text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </aside>
        </div>
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <Card className="rounded-2xl border-0 shadow-sm">
      <CardContent className="p-6">
        <p className="text-sm text-slate-500">{label}</p>
        <h3 className="mt-3 text-3xl font-semibold text-[#0D2B52]">
          {value}
        </h3>
      </CardContent>
    </Card>
  );
}

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Eye, Plus, Search } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Lead,
  LeadPriority,
  LeadSource,
  LeadStatus,
  buildQuery,
  crmFetch,
  authHeaders,
  formatDate,
  priorityLabels,
  productTypeLabels,
  sourceLabels,
  statusLabels,
} from "../crm-shared";

const emptyFilters = {
  status: "",
  source: "",
  priority: "",
  search: "",
  page: 1,
};

export default function CrmLeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [filters, setFilters] = useState(emptyFilters);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [message, setMessage] = useState("");
  const [selected, setSelected] = useState<number[]>([]);
  const [bulkAdvisorId, setBulkAdvisorId] = useState("");

  async function load(next = filters) {
    try {
      setMessage("");
      const query = buildQuery({ ...next, limit: 20 });
      const data = await crmFetch<{
        items: Lead[];
        total: number;
        totalPages: number;
      }>(`/crm/leads?${query}`);
      setLeads(data.items);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } catch (error: any) {
      setMessage(error.message || "No se pudieron cargar los leads.");
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function archiveLead(id: number) {
    try {
      await crmFetch(`/crm/leads/${id}`, { method: "DELETE" });
      await load();
    } catch (error: any) {
      setMessage(error.message || "No se pudo archivar el lead.");
    }
  }

  async function changeStatus(id: number, status: LeadStatus) {
    const lostReason =
      status === "LOST" ? window.prompt("Motivo de pérdida") || "" : undefined;
    if (status === "LOST" && !lostReason) return;
    await crmFetch(`/crm/leads/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status, lostReason }),
    });
    await load();
  }

  async function bulkReassign() {
    if (!selected.length || !bulkAdvisorId.trim()) return;
    await crmFetch("/crm/leads/bulk-reassign", {
      method: "POST",
      body: JSON.stringify({
        leadIds: selected,
        assignedAdvisorId: Number(bulkAdvisorId),
      }),
    });
    setSelected([]);
    setBulkAdvisorId("");
    await load();
  }

  async function exportLeads() {
    const query = buildQuery({ ...filters, limit: undefined, page: undefined });
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"}/crm/export/leads.xlsx${query ? `?${query}` : ""}`,
      { headers: authHeaders() }
    );
    if (!response.ok) {
      setMessage("No se pudo exportar leads.");
      return;
    }
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "crm-leads.xlsx";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.28em] text-[#B48A5A]">CRM</p>
          <h1 className="mt-2 text-3xl font-semibold text-[#0D2B52]">Leads</h1>
          <p className="mt-2 text-sm text-slate-500">
            Oportunidades comerciales, asignación y seguimiento.
          </p>
        </div>
        <Button asChild className="rounded-xl bg-[#0D2B52]">
          <Link href="/admin/crm/leads/nuevo">
            <Plus className="mr-2 h-4 w-4" />
            Nuevo lead
          </Link>
        </Button>
        <Button variant="outline" onClick={exportLeads}>
          Exportar
        </Button>
      </div>

      <Card className="rounded-2xl border border-[#D4AF37]/20 bg-white">
        <CardContent className="space-y-4 p-5">
          <div className="grid gap-3 md:grid-cols-5">
            <select
              className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm"
              value={filters.status}
              onChange={(event) => setFilters({ ...filters, status: event.target.value })}
            >
              <option value="">Todos los estados</option>
              {Object.entries(statusLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <select
              className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm"
              value={filters.source}
              onChange={(event) => setFilters({ ...filters, source: event.target.value })}
            >
              <option value="">Todos los orígenes</option>
              {Object.entries(sourceLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <select
              className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm"
              value={filters.priority}
              onChange={(event) => setFilters({ ...filters, priority: event.target.value })}
            >
              <option value="">Todas las prioridades</option>
              {Object.entries(priorityLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <Input
              placeholder="Buscar cliente, correo o teléfono"
              value={filters.search}
              onChange={(event) => setFilters({ ...filters, search: event.target.value })}
            />
            <Button onClick={() => load({ ...filters, page: 1 })} className="bg-[#0D2B52]">
              <Search className="mr-2 h-4 w-4" />
              Filtrar
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            <Input
              className="max-w-xs"
              placeholder="ID asesor destino"
              value={bulkAdvisorId}
              onChange={(event) => setBulkAdvisorId(event.target.value)}
            />
            <Button variant="outline" disabled={!selected.length} onClick={bulkReassign}>
              Reasignar seleccionados ({selected.length})
            </Button>
          </div>
        </CardContent>
      </Card>

      {message && (
        <p className="rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">
          {message}
        </p>
      )}

      <Card className="rounded-2xl border border-[#D4AF37]/20 bg-white">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead></TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Origen</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Prioridad</TableHead>
                  <TableHead>Asesor</TableHead>
                  <TableHead>Producto</TableHead>
                  <TableHead>Seguimiento</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leads.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="py-8 text-center text-sm text-slate-500">
                      No hay leads para los filtros seleccionados.
                    </TableCell>
                  </TableRow>
                ) : (
                  leads.map((lead) => (
                    <TableRow key={lead.id}>
                      <TableCell>
                        <input
                          type="checkbox"
                          checked={selected.includes(lead.id)}
                          onChange={(event) =>
                            setSelected((current) =>
                              event.target.checked
                                ? [...current, lead.id]
                                : current.filter((id) => id !== lead.id)
                            )
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <p className="font-semibold text-[#0D2B52]">
                          {lead.fullName || "Cliente sin nombre"}
                        </p>
                        <p className="text-xs text-slate-500">{lead.phone || lead.email || "Sin contacto"}</p>
                      </TableCell>
                      <TableCell>{sourceLabels[lead.source]}</TableCell>
                      <TableCell>
                        <select
                          className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs"
                          value={lead.status}
                          onChange={(event) => changeStatus(lead.id, event.target.value as LeadStatus)}
                        >
                          {Object.entries(statusLabels).map(([value, label]) => (
                            <option key={value} value={value}>
                              {label}
                            </option>
                          ))}
                        </select>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{priorityLabels[lead.priority]}</Badge>
                        <p className="mt-1 text-xs text-slate-500">
                          Score {lead.priorityScore ?? 0} · {lead.slaStatus || "AL_DIA"}
                        </p>
                      </TableCell>
                      <TableCell>{lead.assignedAdvisor?.name || "Sin asignar"}</TableCell>
                      <TableCell>
                        {lead.interestedProductType
                          ? `${productTypeLabels[lead.interestedProductType]} #${lead.interestedProductId || ""}`
                          : "Sin producto"}
                      </TableCell>
                      <TableCell>{formatDate(lead.nextFollowUpAt)}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-2">
                          <Button asChild size="sm" variant="outline">
                            <Link href={`/admin/crm/leads/${lead.id}`}>
                              <Eye className="mr-2 h-4 w-4" />
                              Ver
                            </Link>
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => archiveLead(lead.id)}>
                            Archivar
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          <div className="flex items-center justify-between p-4 text-sm text-slate-500">
            <span>{total} leads encontrados</span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                disabled={filters.page <= 1}
                onClick={() => {
                  const next = { ...filters, page: filters.page - 1 };
                  setFilters(next);
                  load(next);
                }}
              >
                Anterior
              </Button>
              <span className="px-2 py-2">
                Página {filters.page} de {totalPages}
              </span>
              <Button
                variant="outline"
                disabled={filters.page >= totalPages}
                onClick={() => {
                  const next = { ...filters, page: filters.page + 1 };
                  setFilters(next);
                  load(next);
                }}
              >
                Siguiente
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CalendarClock, CheckCircle2, MessageSquare, RotateCcw } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { LeadTask, crmFetch, formatDate } from "../crm-shared";

type TaskFilter = "all" | "pending" | "today" | "overdue";

function startOfToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

function endOfToday() {
  const date = new Date();
  date.setHours(23, 59, 59, 999);
  return date;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export default function CrmTasksPage() {
  const [tasks, setTasks] = useState<LeadTask[]>([]);
  const [filter, setFilter] = useState<TaskFilter>("all");
  const [message, setMessage] = useState("");

  async function load(next: TaskFilter = filter) {
    const query =
      next === "today"
        ? "?dueToday=true"
        : next === "overdue"
          ? "?overdue=true"
          : next === "pending"
            ? "?status=PENDING"
            : "";
    try {
      setMessage("");
      setTasks(await crmFetch<LeadTask[]>(`/crm/tasks${query}`));
    } catch (error: any) {
      setMessage(error.message || "No se pudieron cargar las tareas.");
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const grouped = useMemo(() => {
    const todayStart = startOfToday();
    const todayEnd = endOfToday();
    const weekEnd = addDays(todayEnd, 7);

    return {
      overdue: tasks.filter(
        (task) => task.status === "PENDING" && task.dueAt && new Date(task.dueAt) < todayStart
      ),
      today: tasks.filter((task) => {
        if (task.status !== "PENDING" || !task.dueAt) return false;
        const due = new Date(task.dueAt);
        return due >= todayStart && due <= todayEnd;
      }),
      upcoming: tasks.filter((task) => {
        if (task.status !== "PENDING" || !task.dueAt) return false;
        const due = new Date(task.dueAt);
        return due > todayEnd && due <= weekEnd;
      }),
      completed: tasks
        .filter((task) => task.status === "COMPLETED")
        .sort(
          (first, second) =>
            new Date(second.completedAt || second.createdAt).getTime() -
            new Date(first.completedAt || first.createdAt).getTime()
        )
        .slice(0, 10),
    };
  }, [tasks]);

  async function complete(id: number) {
    await crmFetch(`/crm/tasks/${id}/complete`, { method: "PATCH" });
    await load();
  }

  async function reschedule(id: number) {
    const value = window.prompt("Nueva fecha y hora (YYYY-MM-DDTHH:mm)");
    if (!value) return;
    const dueAt = new Date(value);
    if (Number.isNaN(dueAt.getTime())) {
      setMessage("Fecha no valida. Usa el formato YYYY-MM-DDTHH:mm.");
      return;
    }
    await crmFetch(`/crm/tasks/${id}/reschedule`, {
      method: "PATCH",
      body: JSON.stringify({ dueAt: dueAt.toISOString() }),
    });
    await load();
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.28em] text-[#B48A5A]">CRM</p>
        <h1 className="mt-2 text-3xl font-semibold text-[#0D2B52]">Tareas y seguimientos</h1>
        <p className="mt-2 text-sm text-slate-500">
          Seguimientos vencidos, tareas de hoy, proximos 7 dias y tareas completadas.
        </p>
      </div>

      <Card className="rounded-2xl border border-[#D4AF37]/20 bg-white">
        <CardContent className="flex flex-col gap-3 p-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2">
            {[
              ["all", "Todas"],
              ["pending", "Pendientes"],
              ["today", "Hoy"],
              ["overdue", "Vencidas"],
            ].map(([value, label]) => (
              <Button
                key={value}
                variant={filter === value ? "default" : "outline"}
                className={filter === value ? "bg-[#0D2B52]" : ""}
                onClick={() => {
                  setFilter(value as TaskFilter);
                  load(value as TaskFilter);
                }}
              >
                {label}
              </Button>
            ))}
          </div>
          <div className="grid gap-2 text-sm text-slate-500 sm:grid-cols-4">
            <span>Vencidas: {grouped.overdue.length}</span>
            <span>Hoy: {grouped.today.length}</span>
            <span>7 dias: {grouped.upcoming.length}</span>
            <span>Completadas: {grouped.completed.length}</span>
          </div>
        </CardContent>
      </Card>

      {message && <p className="rounded-2xl bg-red-50 p-4 text-sm text-red-700">{message}</p>}

      <div className="grid gap-5 xl:grid-cols-4">
        <TaskColumn title="Vencidas" tone="red" tasks={grouped.overdue} complete={complete} reschedule={reschedule} />
        <TaskColumn title="Para hoy" tone="amber" tasks={grouped.today} complete={complete} reschedule={reschedule} />
        <TaskColumn title="Proximos 7 dias" tone="blue" tasks={grouped.upcoming} complete={complete} reschedule={reschedule} />
        <TaskColumn title="Completadas recientes" tone="green" tasks={grouped.completed} complete={complete} reschedule={reschedule} />
      </div>
    </div>
  );
}

function TaskColumn({
  title,
  tone,
  tasks,
  complete,
  reschedule,
}: {
  title: string;
  tone: "red" | "amber" | "blue" | "green";
  tasks: LeadTask[];
  complete: (id: number) => void;
  reschedule: (id: number) => void;
}) {
  const toneClasses = {
    red: "border-red-100 bg-red-50 text-red-700",
    amber: "border-amber-100 bg-amber-50 text-amber-700",
    blue: "border-blue-100 bg-blue-50 text-blue-700",
    green: "border-emerald-100 bg-emerald-50 text-emerald-700",
  };

  return (
    <Card className="rounded-2xl border border-[#D4AF37]/20 bg-white">
      <CardContent className="space-y-3 p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-[#0D2B52]">{title}</h2>
          <Badge variant="outline" className={toneClasses[tone]}>
            {tasks.length}
          </Badge>
        </div>
        {tasks.length === 0 ? (
          <p className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm text-slate-500">
            Sin tareas.
          </p>
        ) : (
          tasks.map((task) => (
            <div key={task.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-[#0D2B52]">{task.title}</p>
                  <p className="text-sm text-slate-500">
                    Lead:{" "}
                    <Link href={`/admin/crm/leads/${task.leadId}`} className="underline">
                      #{task.leadId}
                    </Link>
                  </p>
                </div>
                <Badge variant="outline">{task.status === "COMPLETED" ? "Completada" : "Pendiente"}</Badge>
              </div>
              <p className="mt-2 text-sm text-slate-600">{task.description || "Sin detalle"}</p>
              <p className="mt-2 flex items-center gap-2 text-xs text-slate-400">
                <CalendarClock className="h-3.5 w-3.5" />
                {formatDate(task.dueAt)}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button asChild size="sm" variant="outline">
                  <Link href={`/admin/crm/leads/${task.leadId}`}>
                    <MessageSquare className="mr-2 h-4 w-4" />
                    Ver lead
                  </Link>
                </Button>
                {task.status !== "COMPLETED" && (
                  <>
                    <Button size="sm" variant="outline" onClick={() => reschedule(task.id)}>
                      <RotateCcw className="mr-2 h-4 w-4" />
                      Reprogramar
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => complete(task.id)}>
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Completar
                    </Button>
                  </>
                )}
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

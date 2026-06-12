"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Bell, ExternalLink } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CrmNotification, crmFetch, formatDate } from "../crm-shared";

const notificationLabels: Record<string, string> = {
  CRM_TASK_DUE: "Tarea proxima",
  CRM_TASK_OVERDUE: "Tarea vencida",
  CRM_LEAD_ASSIGNED: "Lead asignado",
  CRM_LEAD_NO_FOLLOWUP: "Lead sin seguimiento",
  CRM_LEAD_URGENT: "Lead urgente",
};

export default function CrmNotificationsPage() {
  const [notifications, setNotifications] = useState<CrmNotification[]>([]);
  const [message, setMessage] = useState("");

  useEffect(() => {
    crmFetch<CrmNotification[]>("/crm/notifications")
      .then(setNotifications)
      .catch((error) => setMessage(error.message || "No se pudieron cargar las notificaciones."));
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.28em] text-[#B48A5A]">CRM</p>
          <h1 className="mt-2 text-3xl font-semibold text-[#0D2B52]">Notificaciones</h1>
          <p className="mt-2 text-sm text-slate-500">
            Alertas internas sobre tareas, leads urgentes y seguimientos pendientes.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/admin/crm/productividad">
            <ExternalLink className="mr-2 h-4 w-4" />
            Ver productividad
          </Link>
        </Button>
      </div>

      {message && <p className="rounded-2xl bg-red-50 p-4 text-sm text-red-700">{message}</p>}

      <Card className="rounded-2xl border border-[#D4AF37]/20 bg-white">
        <CardContent className="space-y-3 p-5">
          {notifications.length === 0 ? (
            <p className="rounded-2xl border border-slate-100 bg-slate-50 p-5 text-sm text-slate-500">
              No hay notificaciones pendientes.
            </p>
          ) : (
            notifications.map((notification) => (
              <div
                key={notification.id}
                className="flex flex-col gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4 sm:flex-row sm:items-start sm:justify-between"
              >
                <div className="flex gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-[#B48A5A]">
                    <Bell className="h-5 w-5" />
                  </span>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-[#0D2B52]">{notification.title}</p>
                      <Badge variant="outline">
                        {notificationLabels[notification.type] || notification.type}
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm text-slate-600">{notification.message}</p>
                    <p className="mt-2 text-xs text-slate-400">{formatDate(notification.createdAt)}</p>
                  </div>
                </div>
                {notification.entityType === "Lead" && notification.entityId && (
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/admin/crm/leads/${notification.entityId}`}>Ver lead</Link>
                  </Button>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

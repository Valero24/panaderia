"use client";

import { Bell, RefreshCw } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { OperationalNotification } from "./types";
import { date } from "./utils";

export function OperationalNotificationsPanel({
  notifications,
  loading,
  onRefresh,
}: {
  notifications: OperationalNotification[];
  loading: boolean;
  onRefresh: () => void;
}) {
  const recent = notifications.slice(0, 6);

  return (
    <Card className="premium-enter premium-surface rounded-2xl">
      <CardContent className="space-y-5 p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.22em] text-[#B48A5A]">
              Alertas comerciales
            </p>
            <h2 className="mt-1 text-2xl font-semibold text-[#0D2B52]">
              Notificaciones operativas
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Solicitudes nuevas registradas para aviso interno. Con WhatsApp
              real desactivado quedan como pendientes/simuladas.
            </p>
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={onRefresh}
            disabled={loading}
            className="h-10 rounded-xl bg-white"
          >
            <RefreshCw
              className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`}
            />
            Actualizar alertas
          </Button>
        </div>

        {loading ? (
          <div className="grid gap-3 md:grid-cols-2">
            {[1, 2].map((item) => (
              <div key={item} className="h-24 rounded-2xl premium-skeleton" />
            ))}
          </div>
        ) : recent.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#D4AF37]/30 bg-white p-5 text-sm text-slate-500">
            No hay notificaciones operativas recientes.
          </div>
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {recent.map((notification) => {
              const product =
                notification.preReservation?.items?.[0]?.name ||
                notification.preReservation?.items?.[0]?.type ||
                "Solicitud asistida";

              return (
                <div
                  key={notification.id}
                  className="rounded-2xl border border-[#D4AF37]/20 bg-white p-4 shadow-sm"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Bell className="h-4 w-4 text-[#B48A5A]" />
                        <p className="font-semibold text-[#0D2B52]">
                          {notification.preReservation?.customerName ||
                            "Cliente pendiente"}
                        </p>
                        <Badge variant="outline" className="rounded-md">
                          {notification.status}
                        </Badge>
                      </div>
                      <p className="mt-2 text-sm text-slate-600">{product}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {notification.channel} a {notification.recipient}
                        {notification.provider
                          ? ` · ${notification.provider}`
                          : ""}
                      </p>
                      {notification.error && (
                        <p className="mt-2 text-xs text-red-600">
                          {notification.error}
                        </p>
                      )}
                    </div>
                    <p className="shrink-0 text-xs text-slate-400">
                      {date(notification.createdAt)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

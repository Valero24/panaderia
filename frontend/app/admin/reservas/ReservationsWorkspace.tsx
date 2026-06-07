"use client";

import dynamic from "next/dynamic";
import { CheckCircle2, Clock, Eye, RefreshCw, Trash2, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { OperationMetricCard } from "./components";
import { ConfirmedReservationsTable } from "./ConfirmedReservationsTable";
import { OperationalNotificationsPanel } from "./ReservationNotificationPanel";
import { RequestsTable } from "./ReservationList";
import StatusBadge from "@/components/admin/status-badge";
import type {
  AdvisorOption,
  OperationalLog,
  OperationalNotification,
  PreReservation,
  PropertyOption,
  User,
} from "./types";

const RequestDetail = dynamic(
  () => import("./ReservationDetailPanel").then((mod) => mod.RequestDetail),
  {
    ssr: false,
    loading: () => (
      <Card className="premium-enter premium-surface rounded-2xl">
        <CardContent className="space-y-4 p-6">
          <div className="h-6 w-56 animate-pulse rounded-full bg-[#D4AF37]/20" />
          <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
            <div className="h-72 animate-pulse rounded-2xl bg-[#F8F6F2]" />
            <div className="h-72 animate-pulse rounded-2xl bg-[#F8F6F2]" />
          </div>
        </CardContent>
      </Card>
    ),
  }
);

type ReservationsWorkspaceProps = {
  pendingRequests: PreReservation[];
  myRequests: PreReservation[];
  confirmedRequests: PreReservation[];
  loading: boolean;
  notificationsLoading: boolean;
  actionLoading: string;
  message: string;
  user: User | null;
  selected: PreReservation | null;
  properties: PropertyOption[];
  advisors: AdvisorOption[];
  operationalNotifications: OperationalNotification[];
  selectedLogs: OperationalLog[];
  manualBookingResult: any;
  fetchRequests: () => void;
  fetchOperationalNotifications: () => void;
  openRequestDetail: (request: PreReservation) => void;
  takeRequest: (id: string) => void;
  confirmCancelRequest: (request: PreReservation) => void;
  openInvoiceFromList: (request: PreReservation, mode: "view" | "download") => void;
  closeSelected: () => void;
  changeStatus: (id: string, endpoint: string, status: string) => void;
  saveQuote: (id: string, payload: Record<string, unknown>) => void;
  generatePaymentLink: (id: string) => void;
  generateManualBooking: (id: string) => void;
  sendManualNotification: (id: string, channel: "email" | "whatsapp") => void;
  reassignRequest: (id: string, advisorId: number) => void;
  cancelRequest: (id: string, reason: string) => void;
};

export default function ReservationsWorkspace({
  pendingRequests,
  myRequests,
  confirmedRequests,
  loading,
  notificationsLoading,
  actionLoading,
  message,
  user,
  selected,
  properties,
  advisors,
  operationalNotifications,
  selectedLogs,
  manualBookingResult,
  fetchRequests,
  fetchOperationalNotifications,
  openRequestDetail,
  takeRequest,
  confirmCancelRequest,
  openInvoiceFromList,
  closeSelected,
  changeStatus,
  saveQuote,
  generatePaymentLink,
  generateManualBooking,
  sendManualNotification,
  reassignRequest,
  cancelRequest,
}: ReservationsWorkspaceProps) {
  return (
    <div className="min-h-screen bg-[#F8F6F2] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6 lg:space-y-8">
        <div className="premium-enter premium-surface rounded-2xl p-5 sm:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm tracking-[0.25em] uppercase text-[#B48A5A] font-medium">
                Gestión de reservas
              </p>
              <h1 className="mt-2 text-3xl font-semibold text-[#0D2B52] sm:text-4xl">
                Solicitudes asistidas
              </h1>
              <p className="mt-2 max-w-2xl text-slate-500">
                Toma solicitudes pendientes y gestiona la validación comercial
                antes de cualquier pago.
              </p>
            </div>

            <Button
              type="button"
              onClick={() => {
                fetchRequests();
                fetchOperationalNotifications();
              }}
              variant="outline"
              disabled={loading}
              className="h-12 rounded-xl bg-white premium-focus"
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Actualizar
            </Button>
          </div>
        </div>

        {message && (
          <div className="premium-enter rounded-xl border border-[#D4AF37]/20 bg-white p-4 text-sm text-[#0D2B52] shadow-sm">
            {message}
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <OperationMetricCard icon={Clock} label="Pendientes" value={pendingRequests.length} loading={loading} tone="amber" />
          <OperationMetricCard icon={UserCheck} label={user?.role === "SUPERADMIN" ? "En gestión" : "Mis solicitudes"} value={myRequests.length} loading={loading} tone="blue" />
          <OperationMetricCard icon={CheckCircle2} label="Confirmadas" value={confirmedRequests.length} loading={loading} tone="green" />
        </div>

        {user?.role === "SUPERADMIN" && (
          <OperationalNotificationsPanel
            notifications={operationalNotifications}
            loading={notificationsLoading}
            onRefresh={fetchOperationalNotifications}
          />
        )}

        <Card className="premium-enter premium-surface rounded-2xl">
          <CardContent className="space-y-6 p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-semibold text-[#0D2B52]">
                  Bandeja pendiente
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Solicitudes sin asesor asignado.
                </p>
              </div>
              <StatusBadge status="PENDING_ADVISOR" />
            </div>

            <RequestsTable
              requests={pendingRequests}
              loading={loading}
              emptyText="No hay solicitudes pendientes."
              onView={openRequestDetail}
              action={(item) => (
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    onClick={() => takeRequest(item.id)}
                    disabled={Boolean(item.assignedToId) || actionLoading === `${item.id}:assign-me`}
                    className="h-9 rounded-xl bg-[#0D2B52] px-3 hover:bg-[#12396d]"
                  >
                    <UserCheck className="mr-2 h-4 w-4" />
                    <span>Tomar</span>
                  </Button>

                  {user?.role === "SUPERADMIN" && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => confirmCancelRequest(item)}
                      disabled={actionLoading === `${item.id}:cancel` || actionLoading === `${item.id}:archive`}
                      className="h-9 rounded-xl border-red-200 px-3 text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      <span>{actionLoading === `${item.id}:cancel` ? "Eliminando..." : "Eliminar"}</span>
                    </Button>
                  )}
                </div>
              )}
            />
          </CardContent>
        </Card>

        <Card className="premium-enter premium-surface rounded-2xl">
          <CardContent className="space-y-6 p-6">
            <div>
              <h2 className="text-2xl font-semibold text-[#0D2B52]">
                {user?.role === "SUPERADMIN" ? "Solicitudes en gestión" : "Mis solicitudes"}
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Gestión operativa antes de generar cualquier link de pago.
              </p>
            </div>

            <RequestsTable
              requests={myRequests}
              loading={loading}
              emptyText="No hay solicitudes asignadas."
              onView={openRequestDetail}
              action={(item) => (
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="ghost" onClick={() => openRequestDetail(item)} className="h-9 rounded-xl px-3">
                    <Eye className="mr-2 h-4 w-4" />
                    <span>Ver</span>
                  </Button>

                  {user?.role === "SUPERADMIN" && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => confirmCancelRequest(item)}
                      disabled={actionLoading === `${item.id}:cancel` || actionLoading === `${item.id}:archive`}
                      className="h-9 rounded-xl border-red-200 px-3 text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      <span>
                        {actionLoading === `${item.id}:archive`
                          ? "Archivando..."
                          : item.status === "CANCELLED"
                            ? "Archivar"
                            : actionLoading === `${item.id}:cancel`
                              ? "Eliminando..."
                              : "Eliminar"}
                      </span>
                    </Button>
                  )}
                </div>
              )}
            />
          </CardContent>
        </Card>

        <Card className="premium-enter premium-surface rounded-2xl">
          <CardContent className="space-y-6 p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-2xl font-semibold text-[#0D2B52]">
                  Reservas confirmadas / Historial
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Seguimiento de reservas generadas, códigos RES y comprobantes PDF.
                </p>
              </div>
              <StatusBadge status="CONFIRMED" />
            </div>

            <ConfirmedReservationsTable
              requests={confirmedRequests}
              loading={loading}
              actionLoading={actionLoading}
              emptyText="No hay reservas confirmadas para mostrar."
              onView={openRequestDetail}
              onInvoice={openInvoiceFromList}
            />
          </CardContent>
        </Card>

        {selected && (
          <RequestDetail
            request={selected}
            properties={properties}
            advisors={advisors}
            currentUser={user}
            actionLoading={actionLoading}
            onClose={closeSelected}
            onStatusChange={changeStatus}
            onQuoteSave={saveQuote}
            onGeneratePaymentLink={generatePaymentLink}
            onGenerateManualBooking={generateManualBooking}
            onSendManualNotification={sendManualNotification}
            manualBookingResult={manualBookingResult}
            onReassign={reassignRequest}
            onCancel={cancelRequest}
            operationalLogs={selectedLogs}
          />
        )}
      </div>
    </div>
  );
}

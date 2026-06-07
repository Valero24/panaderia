"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  Banknote,
  BriefcaseBusiness,
  CalendarCheck,
  Clock,
  Contact,
  Home,
  Package,
  Plus,
  ShieldCheck,
  Sparkles,
  UserCheck,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { apiUrl } from "@/lib/api";

type DashboardSummary = {
  role: "SUPERADMIN" | "ADVISOR";
  metrics: Record<string, any>;
  recentActivity: AuditLog[];
  latestRequests: DashboardRequest[];
  latestConfirmedBookings: DashboardBooking[];
  latestContacts: DashboardContact[];
};

type DashboardRequest = {
  id: string;
  customerName: string;
  email: string;
  customerPhone?: string | null;
  status: string;
  finalTotal?: number | null;
  totalEstimate?: number | null;
  createdAt: string;
  assignedTo?: {
    name?: string | null;
    email?: string | null;
  } | null;
  items?: {
    name?: string | null;
    type: string;
  }[];
};

type DashboardBooking = {
  id: number;
  reservationCode?: string | null;
  preReservationId?: string | null;
  customerName?: string | null;
  productName?: string | null;
  totalPrice: number;
  advisorName?: string | null;
  createdAt: string;
};

type DashboardContact = {
  id: number;
  name: string;
  email: string;
  whatsapp: string;
  interestType: string;
  subject: string;
  createdAt: string;
};

type AuditLog = {
  id: number;
  actorName?: string | null;
  actorRole?: string | null;
  action: string;
  entityType: string;
  entityId: string;
  message?: string | null;
  createdAt: string;
};

const emptySummary: DashboardSummary = {
  role: "ADVISOR",
  metrics: {},
  recentActivity: [],
  latestRequests: [],
  latestConfirmedBookings: [],
  latestContacts: [],
};

function money(value: number) {
  return `$${Number(value || 0).toLocaleString("es-CO")}`;
}

function date(value: string) {
  return new Intl.DateTimeFormat("es-CO", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function readUser() {
  try {
    return JSON.parse(localStorage.getItem("user") || "{}");
  } catch {
    return null;
  }
}

function productLabel(request: DashboardRequest) {
  return request.items?.[0]?.name || request.items?.[0]?.type || "Producto pendiente";
}

const auditActionLabels: Record<string, string> = {
  ADVISOR_ASSIGNED: "Asesor asignado",
  BOOKING_CONFIRMED: "Reserva confirmada",
  BOOKING_CREATED: "Reserva creada",
  CHECKOUT_CURRENCY_APPLIED: "Moneda aplicada en checkout",
  CONTACT_CREATED: "Contacto creado",
  EXCHANGE_RATE_CREATED: "Tasa de cambio creada",
  EXCHANGE_RATE_DISABLED: "Tasa de cambio desactivada",
  EXCHANGE_RATE_UPDATED: "Tasa de cambio actualizada",
  FACTUS_COP_PAYLOAD_PREPARED: "Payload COP preparado para Factus",
  INVOICE_COP_GENERATED: "Factura interna generada",
  INVOICE_CREATED: "Factura interna creada",
  INVOICE_DETAIL_VIEWED: "Detalle de factura consultado",
  INVOICE_DUPLICATE_ATTEMPT: "Intento de factura duplicada",
  INVOICE_PAYMENT_STATUS_UPDATED: "Estado de pago actualizado",
  INVOICE_STATUS_UPDATED: "Estado de factura actualizado",
  PAYMENT_CURRENCY_SAVED: "Moneda de pago guardada",
  PRE_RESERVATION_CREATED: "Solicitud creada",
  REQUEST_ASSIGNED: "Solicitud asignada",
  REQUEST_STATUS_UPDATED: "Estado de solicitud actualizado",
  SETTINGS_UPDATED: "Configuración actualizada",
};

const entityTypeLabels: Record<string, string> = {
  AUDIT_LOG: "Registro",
  BOOKING: "Reserva",
  CONTACT: "Contacto",
  EXCHANGE_RATE: "Tasa de cambio",
  INVOICE: "Factura",
  PAYMENT: "Pago",
  PRE_RESERVATION: "Solicitud",
  PROPERTY: "Alojamiento",
  SYSTEM_SETTINGS: "Configuración",
  USER: "Usuario",
};

function readableTechnicalLabel(value: string) {
  return value
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/^\w/, (letter) => letter.toUpperCase());
}

function auditActionLabel(action: string) {
  return auditActionLabels[action] || readableTechnicalLabel(action);
}

function entityTypeLabel(entityType: string) {
  return entityTypeLabels[entityType] || readableTechnicalLabel(entityType);
}

export default function AdminDashboard() {
  const [summary, setSummary] = useState<DashboardSummary>(emptySummary);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const user = useMemo(() => readUser(), []);
  const isSuperAdmin = summary.role === "SUPERADMIN";

  async function fetchSummary() {
    try {
      setLoading(true);
      setMessage("");

      const token = localStorage.getItem("token");

      if (!token) {
        setMessage("Debes iniciar sesión para ver el panel.");
        return;
      }

      const res = await fetch(apiUrl("/dashboard/summary"), {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();

      if (!res.ok) {
        setMessage(data?.message || "No se pudo cargar el panel.");
        return;
      }

      setSummary(data);
    } catch (error) {
      console.error(error);
      setMessage("Error de conexión cargando el panel.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchSummary();
  }, []);

  const metricCards = isSuperAdmin
    ? [
        {
          icon: Clock,
          label: "Solicitudes pendientes",
          value: summary.metrics.pendingRequests,
        },
        {
          icon: UserCheck,
          label: "Solicitudes en gestión",
          value: summary.metrics.requestsInManagement,
        },
        {
          icon: CalendarCheck,
          label: "Reservas confirmadas",
          value: summary.metrics.confirmedRequests,
        },
        {
          icon: ShieldCheck,
          label: "Reservas canceladas",
          value: summary.metrics.cancelledRequests,
        },
        {
          icon: Banknote,
          label: "Ingresos estimados",
          value: money(summary.metrics.estimatedRevenue),
        },
        {
          icon: Contact,
          label: "Contactos recibidos",
          value: summary.metrics.contactsReceived,
        },
        {
          icon: Users,
          label: "Asesores activos",
          value: summary.metrics.activeAdvisors,
        },
        {
          icon: BriefcaseBusiness,
          label: "Productos activos",
          value: `${summary.metrics.productsActive?.properties || 0} / ${
            summary.metrics.productsActive?.experiences || 0
          } / ${summary.metrics.productsActive?.packages || 0}`,
          hint: "Alojamientos / Experiencias / Paquetes",
        },
      ]
    : [
        {
          icon: UserCheck,
          label: "Mis solicitudes asignadas",
          value: summary.metrics.myAssignedRequests,
        },
        {
          icon: Clock,
          label: "En validación",
          value: summary.metrics.myValidatingRequests,
        },
        {
          icon: CalendarCheck,
          label: "Mis reservas confirmadas",
          value: summary.metrics.myConfirmedRequests,
        },
        {
          icon: Activity,
          label: "Pendientes de gestión",
          value: summary.metrics.myPendingManagement,
        },
        {
          icon: Users,
          label: "Clientes recientes",
          value: summary.metrics.myRecentClients,
        },
      ];

  const quickActions = isSuperAdmin
    ? [
        { label: "Ver solicitudes pendientes", href: "/admin/reservas", icon: Clock },
        { label: "Crear alojamiento", href: "/admin/alojamientos/crear", icon: Home },
        { label: "Crear experiencia", href: "/admin/experiencias", icon: Sparkles },
        { label: "Crear paquete", href: "/admin/paquetes", icon: Package },
        { label: "Ver asesores", href: "/admin/asesores", icon: Users },
        { label: "Ver registros", href: "/admin/logs", icon: Activity },
      ]
    : [
        { label: "Ver solicitudes pendientes", href: "/admin/reservas", icon: Clock },
        { label: "Ver mis reservas", href: "/admin/reservas", icon: CalendarCheck },
        { label: "Ver contactos", href: "/admin/contactos", icon: Contact },
        { label: "Ir a productos", href: "/admin/alojamientos", icon: BriefcaseBusiness },
      ];

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-[#D4AF37]/20 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-[#B48A5A]">
              {isSuperAdmin ? "Superadministrador" : "Asesor de viajes"}
            </p>
            <h1 className="mt-2 text-3xl font-semibold text-[#0D2B52] sm:text-4xl">
              Centro operativo
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Hola{user?.name ? `, ${user.name}` : ""}. Aquí tienes el estado de la operación y las acciones más importantes para continuar.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={fetchSummary}
            disabled={loading}
            className="rounded-xl bg-white"
          >
            <Activity className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Actualizar
          </Button>
        </div>
      </section>

      {message && (
        <p className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
          {message}
        </p>
      )}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {metricCards.map((metric) => (
          <MetricCard
            key={metric.label}
            loading={loading}
            icon={metric.icon}
            label={metric.label}
            value={metric.value ?? 0}
            hint={metric.hint}
          />
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="rounded-2xl border border-[#D4AF37]/20 bg-white">
          <CardContent className="p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold text-[#0D2B52]">
                  Acciones rápidas
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Atajos para mover la operación sin buscar en el menú.
                </p>
              </div>
              <Plus className="h-5 w-5 text-[#B48A5A]" />
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {quickActions.map((action) => {
                const Icon = action.icon;

                return (
                  <Link
                    key={action.label}
                    href={action.href}
                    className="group flex items-center gap-3 rounded-xl border border-[#D4AF37]/20 bg-[#F8F6F2] p-4 text-sm font-semibold text-[#0D2B52] transition hover:-translate-y-0.5 hover:bg-white hover:shadow-sm"
                  >
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-[#B48A5A] transition group-hover:bg-[#0D2B52] group-hover:text-white">
                      <Icon className="h-4 w-4" />
                    </span>
                    {action.label}
                  </Link>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border border-[#D4AF37]/20 bg-white">
          <CardContent className="p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold text-[#0D2B52]">
                  Actividad reciente
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Eventos operativos registrados en el sistema.
                </p>
              </div>
              <Badge variant="outline" className="rounded-md">
                {summary.recentActivity.length}
              </Badge>
            </div>

            <div className="mt-5 space-y-3">
              {loading ? (
                [1, 2, 3].map((item) => (
                  <div key={item} className="h-16 rounded-xl premium-skeleton" />
                ))
              ) : summary.recentActivity.length === 0 ? (
                <EmptyState text="Aún no hay actividad reciente para mostrar." />
              ) : (
                summary.recentActivity.slice(0, 6).map((log) => (
                  <div
                    key={log.id}
                    className="rounded-xl border border-[#D4AF37]/15 bg-[#F8F6F2] p-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <Badge variant="outline" className="rounded-md bg-white">
                        {auditActionLabel(log.action)}
                      </Badge>
                      <span className="text-xs text-slate-500">{date(log.createdAt)}</span>
                    </div>
                    <p className="mt-2 text-sm font-medium text-[#0D2B52]">
                      {log.message || "Evento registrado"}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {log.actorName || "Sistema"} · {entityTypeLabel(log.entityType)} #{log.entityId}
                    </p>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <RequestsPanel
          title={isSuperAdmin ? "Últimas 5 solicitudes" : "Mis últimas 5 solicitudes"}
          requests={summary.latestRequests}
          loading={loading}
        />
        <BookingsPanel
          title={
            isSuperAdmin
              ? "Últimas 5 reservas confirmadas"
              : "Mis últimas 5 reservas confirmadas"
          }
          bookings={summary.latestConfirmedBookings}
          loading={loading}
        />
      </section>

      {isSuperAdmin && (
        <ContactsPanel
          contacts={summary.latestContacts}
          loading={loading}
        />
      )}
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  hint,
  loading,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number | string;
  hint?: string;
  loading?: boolean;
}) {
  return (
    <Card className="rounded-2xl border border-[#D4AF37]/20 bg-white shadow-sm">
      <CardContent className="p-5">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#F8F6F2]">
          <Icon className="h-5 w-5 text-[#B48A5A]" />
        </div>
        <p className="mt-4 text-sm text-slate-500">{label}</p>
        {loading ? (
          <div className="mt-3 h-9 w-24 rounded-lg premium-skeleton" />
        ) : (
          <h2 className="mt-2 text-3xl font-semibold text-[#0D2B52]">{value}</h2>
        )}
        {hint && <p className="mt-2 text-xs text-slate-400">{hint}</p>}
      </CardContent>
    </Card>
  );
}

function RequestsPanel({
  title,
  requests,
  loading,
}: {
  title: string;
  requests: DashboardRequest[];
  loading: boolean;
}) {
  return (
    <TablePanel title={title}>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Cliente</TableHead>
            <TableHead>Producto</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead>Acción</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <LoadingRows colSpan={4} />
          ) : requests.length === 0 ? (
            <EmptyRow colSpan={4} text="No hay solicitudes para mostrar." />
          ) : (
            requests.map((request) => (
              <TableRow key={request.id}>
                <TableCell>
                  <p className="font-medium text-[#0D2B52]">{request.customerName}</p>
                  <p className="text-xs text-slate-500">{date(request.createdAt)}</p>
                </TableCell>
                <TableCell className="max-w-48 truncate">{productLabel(request)}</TableCell>
                <TableCell>
                  <Badge variant="outline" className="rounded-md">
                    {request.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Button asChild variant="outline" className="rounded-xl">
                    <Link href="/admin/reservas">Ver detalle</Link>
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </TablePanel>
  );
}

function BookingsPanel({
  title,
  bookings,
  loading,
}: {
  title: string;
  bookings: DashboardBooking[];
  loading: boolean;
}) {
  return (
    <TablePanel title={title}>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Código</TableHead>
            <TableHead>Cliente</TableHead>
            <TableHead>Total</TableHead>
            <TableHead>Acción</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <LoadingRows colSpan={4} />
          ) : bookings.length === 0 ? (
            <EmptyRow colSpan={4} text="No hay reservas confirmadas." />
          ) : (
            bookings.map((booking) => (
              <TableRow key={booking.id}>
                <TableCell>
                  <p className="font-semibold text-[#0D2B52]">
                    {booking.reservationCode || `#${booking.id}`}
                  </p>
                  <p className="text-xs text-slate-500">{date(booking.createdAt)}</p>
                </TableCell>
                <TableCell>
                  <p className="font-medium text-[#0D2B52]">
                    {booking.customerName || "Cliente"}
                  </p>
                  <p className="max-w-52 truncate text-xs text-slate-500">
                    {booking.productName || "Producto"}
                  </p>
                </TableCell>
                <TableCell>{money(booking.totalPrice)}</TableCell>
                <TableCell>
                  <Button asChild variant="outline" className="rounded-xl">
                    <Link href="/admin/reservas">Ver detalle</Link>
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </TablePanel>
  );
}

function ContactsPanel({
  contacts,
  loading,
}: {
  contacts: DashboardContact[];
  loading: boolean;
}) {
  return (
    <TablePanel title="Últimos 5 contactos">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Contacto</TableHead>
            <TableHead>Interés</TableHead>
            <TableHead>Asunto</TableHead>
            <TableHead>Acción</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <LoadingRows colSpan={4} />
          ) : contacts.length === 0 ? (
            <EmptyRow colSpan={4} text="No hay contactos recibidos." />
          ) : (
            contacts.map((contact) => (
              <TableRow key={contact.id}>
                <TableCell>
                  <p className="font-medium text-[#0D2B52]">{contact.name}</p>
                  <p className="text-xs text-slate-500">{contact.email}</p>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="rounded-md">
                    {contact.interestType}
                  </Badge>
                </TableCell>
                <TableCell className="max-w-72 truncate">{contact.subject}</TableCell>
                <TableCell>
                  <Button asChild variant="outline" className="rounded-xl">
                    <Link href="/admin/contactos">Ver</Link>
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </TablePanel>
  );
}

function TablePanel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="rounded-2xl border border-[#D4AF37]/20 bg-white">
      <CardContent className="p-0">
        <div className="border-b border-[#D4AF37]/15 p-5">
          <h2 className="text-xl font-semibold text-[#0D2B52]">{title}</h2>
        </div>
        <div className="overflow-x-auto">{children}</div>
      </CardContent>
    </Card>
  );
}

function LoadingRows({ colSpan }: { colSpan: number }) {
  return (
    <>
      {[1, 2, 3].map((item) => (
        <TableRow key={item}>
          <TableCell colSpan={colSpan} className="py-4">
            <div className="h-12 rounded-xl premium-skeleton" />
          </TableCell>
        </TableRow>
      ))}
    </>
  );
}

function EmptyRow({ colSpan, text }: { colSpan: number; text: string }) {
  return (
    <TableRow>
      <TableCell colSpan={colSpan} className="py-8 text-center">
        <EmptyState text={text} />
      </TableCell>
    </TableRow>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-dashed border-[#D4AF37]/30 bg-[#F8F6F2] px-4 py-5 text-center text-sm text-slate-500">
      {text}
    </div>
  );
}

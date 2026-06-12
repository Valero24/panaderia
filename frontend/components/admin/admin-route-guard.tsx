"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

const allowedRoles = new Set(["ADVISOR", "SUPERADMIN", "ADMIN"]);
const superAdminOnlyPrefixes = [
  "/admin/asesores",
  "/admin/configuracion",
  "/admin/opiniones",
  "/admin/pagos",
  "/admin/extras",
  "/admin/caracteristicas",
  "/admin/carga-masiva",
  "/admin/sistema",
  "/admin/logs",
  "/admin/registros",
  "/admin/imagenes",
  "/admin/disponibilidad",
  "/admin/alojamientos/crear",
  "/admin/alojamientos/editar",
  "/admin/alojamientos/imagenes",
  "/admin/experiencias/crear",
  "/admin/paquetes/crear",
];

function clearSession() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  sessionStorage.clear();
}

function tokenIsExpired(token: string) {
  try {
    const payload = JSON.parse(atob(token.split(".")[1] || ""));
    if (!payload?.exp) return false;
    return payload.exp * 1000 <= Date.now();
  } catch {
    return true;
  }
}

function isRestrictedPath(pathname: string, role: string) {
  if (role === "SUPERADMIN") return false;

  if (pathname.startsWith("/admin/carga-masiva")) return true;

  if (role === "ADMIN") return false;

  if (pathname === "/admin") return true;

  return superAdminOnlyPrefixes.some((prefix) => pathname.startsWith(prefix));
}

export default function AdminRouteGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [allowed, setAllowed] = useState(false);
  const [restricted, setRestricted] = useState(false);

  useEffect(() => {
    setAllowed(false);
    setRestricted(false);

    const token = localStorage.getItem("token");
    const rawUser = localStorage.getItem("user");

    try {
      const user = rawUser ? JSON.parse(rawUser) : null;

      if (!token || tokenIsExpired(token) || !allowedRoles.has(user?.role)) {
        clearSession();
        router.replace("/staff-login");
        return;
      }

      if (isRestrictedPath(pathname || "", user.role)) {
        setRestricted(true);
        setAllowed(true);
        return;
      }

      setAllowed(true);
    } catch {
      clearSession();
      router.replace("/staff-login");
    }
  }, [pathname, router]);

  if (!allowed) {
    return (
      <div className="p-8 text-sm text-slate-500">
        Validando acceso administrativo...
      </div>
    );
  }

  if (restricted) {
    return (
      <div className="min-h-screen bg-slate-50 p-6">
        <div className="mx-auto max-w-xl rounded-3xl border border-amber-100 bg-white p-8 text-center shadow-sm">
          <p className="text-sm uppercase tracking-[0.3em] text-[#B68D40]">
            Acceso restringido
          </p>
          <h1 className="mt-3 text-2xl font-bold text-[#0D2B52]">
            Esta sección es solo para Superadmin
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-500">
            Tu usuario puede gestionar solicitudes asignadas desde el panel de
            reservas, pero no tiene permisos para esta ruta.
          </p>
          <button
            type="button"
            onClick={() => router.replace("/admin/reservas")}
            className="mt-6 rounded-xl bg-[#0D2B52] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#12396d]"
          >
            Ir a reservas
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

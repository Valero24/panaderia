"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  Home,
  Building2,
  Calendar,
  DollarSign,
  Package,
  Settings,
  Gem,
  Sparkles,
  Mail,
  LogOut,
  UserCog,
} from "lucide-react";

const menuItems = [
  {
    title: "Dashboard",
    href: "/admin",
    icon: Home,
    roles: ["SUPERADMIN", "ADMIN"],
  },
  {
    title: "Alojamientos",
    href: "/admin/alojamientos",
    icon: Building2,
    roles: ["SUPERADMIN", "ADMIN", "ADVISOR"],
  },
  {
    title: "Reservas",
    href: "/admin/reservas",
    icon: Calendar,
    roles: ["SUPERADMIN", "ADMIN", "ADVISOR"],
  },
  {
    title: "Experiencias",
    href: "/admin/experiencias",
    icon: Sparkles,
    roles: ["SUPERADMIN", "ADMIN", "ADVISOR"],
  },
  {
    title: "Pagos",
    href: "/admin/pagos",
    icon: DollarSign,
    roles: ["SUPERADMIN", "ADMIN"],
  },
  {
    title: "Servicios Premium",
    href: "/admin/extras",
    icon: Gem,
    roles: ["SUPERADMIN", "ADMIN"],
  },
  {
    title: "Paquetes",
    href: "/admin/paquetes",
    icon: Package,
    roles: ["SUPERADMIN", "ADMIN", "ADVISOR"],
  },
  {
    title: "Contactos",
    href: "/admin/contactos",
    icon: Mail,
    roles: ["SUPERADMIN", "ADMIN", "ADVISOR"],
  },
  {
    title: "Asesores",
    href: "/admin/asesores",
    icon: UserCog,
    roles: ["SUPERADMIN"],
  },
  {
    title: "Configuracion",
    href: "/admin/configuracion",
    icon: Settings,
    roles: ["SUPERADMIN", "ADMIN"],
  },
];

function readRole() {
  try {
    return JSON.parse(localStorage.getItem("user") || "{}")?.role || "";
  } catch {
    return "";
  }
}

export default function SidebarAdmin() {
  const router = useRouter();
  const [role, setRole] = useState("");

  useEffect(() => {
    setRole(readRole());
  }, []);

  const visibleItems = useMemo(
    () => menuItems.filter((item) => role && item.roles.includes(role)),
    [role]
  );

  function handleLogout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    sessionStorage.clear();
    router.replace("/login");
    router.refresh();
  }

  return (
    <div className="flex h-full min-h-full flex-col p-4 lg:min-h-screen lg:p-6">
      <div>
        <div className="mb-4 lg:mb-10">
          <p className="text-xs uppercase tracking-[0.35em] text-[#B68D40]">
            Cartagena
          </p>

          <h1 className="mt-2 text-2xl font-bold text-[#0D2B52] lg:text-3xl">
            Admin Panel
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Plataforma operativa de reservas
          </p>
        </div>

        <nav className="flex flex-wrap gap-2 pb-1 lg:block lg:space-y-2 lg:pb-0">
          {visibleItems.map((item) => {
            const Icon = item.icon;

            return (
              <Link
                key={item.title}
                href={item.href}
                className="flex shrink-0 items-center gap-2 rounded-xl border border-[#D4AF37]/15 bg-[#F8F6F2] px-3 py-2 text-sm font-medium text-[#0D2B52] transition-all hover:bg-white hover:shadow-sm lg:w-full lg:gap-3 lg:rounded-2xl lg:border-transparent lg:bg-transparent lg:px-4 lg:py-3 lg:hover:border-[#D4AF37]/20"
              >
                <Icon size={18} />
                {item.title}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="mt-4 border-t border-[#D4AF37]/20 pt-4 lg:mt-auto">
        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 transition hover:border-red-200 hover:bg-red-100 lg:justify-start lg:rounded-2xl lg:px-4 lg:py-3"
        >
          <LogOut size={18} />
          Cerrar sesion
        </button>
      </div>
    </div>
  );
}

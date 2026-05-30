"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const allowedRoles = new Set(["ADVISOR", "SUPERADMIN", "ADMIN"]);

export default function AdminRouteGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const rawUser = localStorage.getItem("user");

    try {
      const user = rawUser ? JSON.parse(rawUser) : null;

      if (!token || !allowedRoles.has(user?.role)) {
        router.replace("/login");
        return;
      }

      setAllowed(true);
    } catch {
      router.replace("/login");
    }
  }, [router]);

  if (!allowed) {
    return (
      <div className="p-8 text-sm text-slate-500">
        Validando acceso administrativo...
      </div>
    );
  }

  return <>{children}</>;
}


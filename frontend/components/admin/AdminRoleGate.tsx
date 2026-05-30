"use client";

import { ReactNode, useEffect, useState } from "react";

type AdminRoleGateProps = {
  allow: string[];
  children: ReactNode;
  fallback?: ReactNode;
};

function readRole() {
  try {
    return JSON.parse(localStorage.getItem("user") || "{}")?.role || "";
  } catch {
    return "";
  }
}

export default function AdminRoleGate({
  allow,
  children,
  fallback = null,
}: AdminRoleGateProps) {
  const [role, setRole] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setRole(readRole());
    setReady(true);
  }, []);

  if (!ready) return null;

  return allow.includes(role) ? <>{children}</> : <>{fallback}</>;
}

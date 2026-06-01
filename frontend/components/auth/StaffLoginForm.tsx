"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { apiUrl } from "@/lib/api";

type LoginResponse = {
  access_token: string;
  user: {
    id: number;
    email: string;
    role: string;
  };
};

export default function StaffLoginForm() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const formData = new FormData(e.currentTarget);
    const submittedEmail = String(formData.get("email") || "").trim();
    const submittedPassword = String(formData.get("password") || "");

    if (!submittedEmail || !submittedPassword) {
      alert("Completa todos los campos");
      return;
    }

    setEmail(submittedEmail);
    setPassword(submittedPassword);
    setLoading(true);

    try {
      const response = await fetch(apiUrl("/auth/login"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: submittedEmail,
          password: submittedPassword,
        }),
      });

      let data: LoginResponse | { message?: string } | null = null;

      try {
        data = await response.json();
      } catch {
        data = null;
      }

      if (!response.ok || !data || !("access_token" in data)) {
        const message =
          data && "message" in data && data.message
            ? data.message
            : "Credenciales invalidas";
        throw new Error(message);
      }

      localStorage.setItem("token", data.access_token);
      localStorage.setItem("user", JSON.stringify(data.user));

      router.push(data.user.role === "ADVISOR" ? "/admin/reservas" : "/admin");
    } catch (error: unknown) {
      console.error("Login error:", error);
      alert(error instanceof Error ? error.message : "Error de conexion");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F8F6F1] px-6 py-12">
      <Card className="w-full max-w-md rounded-3xl border border-[#D4AF37]/20 bg-white shadow-sm">
        <CardContent className="p-8 sm:p-10">
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="text-center">
              <p className="text-sm uppercase tracking-[0.3em] text-[#B68D40]">
                Acceso interno
              </p>

              <h1 className="mt-3 text-4xl font-bold text-[#0D2B52]">
                Equipo Cartagena
              </h1>

              <p className="mt-3 text-slate-500">
                Ingreso exclusivo para asesores y administradores.
              </p>
            </div>

            <Input
              id="email"
              name="email"
              type="email"
              placeholder="Correo del equipo"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <Input
              id="password"
              name="password"
              type="password"
              placeholder="Contrasena"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            <Button
              type="submit"
              disabled={loading}
              className="h-12 w-full rounded-xl bg-[#0D2B52] hover:bg-[#12396d]"
            >
              {loading ? "Ingresando..." : "Entrar al panel"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

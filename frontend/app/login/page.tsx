"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiUrl } from "@/lib/api";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type LoginResponse = {
  access_token: string;
  user: {
    id: number;
    email: string;
    role: string;
  };
};

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();

    // 🔥 Validación básica
    if (!email || !password) {
      alert("Completa todos los campos");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        apiUrl("/auth/login"),
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email,
            password,
          }),
        }
      );

      let data: LoginResponse | any = null;

      try {
        data = await response.json();
      } catch {
        data = null;
      }

      if (!response.ok) {
        const message =
          data?.message || "Credenciales inválidas";
        throw new Error(message);
      }

      // 🔥 Guardar token
      localStorage.setItem(
        "token",
        data.access_token
      );

      localStorage.setItem(
        "user",
        JSON.stringify(data.user)
      );

      // 🔥 Redirección limpia
      router.push("/admin");

    } catch (error: any) {
      console.error("Login error:", error);
      alert(error.message || "Error de conexión");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#F8F6F1] flex items-center justify-center px-8">
      <Card className="w-full max-w-md rounded-3xl border border-[#D4AF37]/20 bg-white shadow-sm">
        <CardContent className="p-10">
          <form
            onSubmit={handleLogin}
            className="space-y-6"
          >
            <div className="text-center">
              <p className="text-sm tracking-[0.3em] uppercase text-[#B68D40]">
                Private Access
              </p>

              <h1 className="text-4xl font-bold text-[#0D2B52] mt-3">
                Admin Login
              </h1>

              <p className="text-slate-500 mt-3">
                Secure access for platform administrators
              </p>
            </div>

            <Input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) =>
                setEmail(e.target.value)
              }
            />

            <Input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) =>
                setPassword(e.target.value)
              }
            />

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 rounded-xl bg-[#0D2B52] hover:bg-[#12396d]"
            >
              {loading
                ? "Ingresando..."
                : "Access Dashboard"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { Mail, MessageCircle, UserRound } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { apiUrl } from "@/lib/api";

type ContactRequest = {
  id: number;
  name: string;
  email: string;
  whatsapp: string;
  subject: string;
  message: string;
  interestType: string;
  emailSentAt?: string | null;
  emailLastError?: string | null;
  createdAt: string;
};

export default function AdminContactosPage() {
  const [items, setItems] = useState<ContactRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  async function fetchContacts() {
    try {
      setLoading(true);
      setMessage("");

      const token = localStorage.getItem("token");
      const res = await fetch(apiUrl("/contact"), {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();

      if (!res.ok) {
        setMessage(data.message || "No se pudieron cargar contactos.");
        return;
      }

      setItems(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
      setMessage("Error de conexión cargando contactos.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchContacts();
  }, []);

  return (
    <div className="min-h-screen bg-[#F8F6F2] p-4 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.25em] text-[#B48A5A]">
            Equipo comercial
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-[#0D2B52] lg:text-4xl">
            Solicitudes de contacto
          </h1>
          <p className="mt-2 text-slate-500">
            Consulta mensajes recibidos desde la página pública de contacto.
          </p>
        </div>

        {message && (
          <div className="rounded-xl border border-[#D4AF37]/20 bg-white p-4 text-sm text-[#0D2B52] shadow-sm">
            {message}
          </div>
        )}

        {loading ? (
          <div className="rounded-2xl border border-[#D4AF37]/15 bg-white p-6 text-slate-500 shadow-sm">
            Cargando solicitudes...
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#D4AF37]/35 bg-white p-8 text-center text-slate-500">
            No hay solicitudes de contacto todavía.
          </div>
        ) : (
          <div className="grid gap-4">
            {items.map((item) => (
              <Card
                key={item.id}
                className="rounded-2xl border border-[#D4AF37]/15 bg-white shadow-sm"
              >
                <CardContent className="space-y-5 p-5">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge className="rounded-md bg-[#0D2B52] hover:bg-[#0D2B52]">
                          {item.interestType}
                        </Badge>
                        <Badge variant="outline" className="rounded-md">
                          {item.emailSentAt
                            ? "Correo interno enviado"
                            : item.emailLastError
                              ? "Correo pendiente"
                              : "Recibido"}
                        </Badge>
                      </div>
                      <h2 className="mt-3 text-2xl font-semibold text-[#0D2B52]">
                        {item.subject}
                      </h2>
                      <p className="mt-1 text-sm text-slate-500">
                        {new Date(item.createdAt).toLocaleString("es-CO")}
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-3 text-sm text-slate-600 md:grid-cols-3">
                    <span className="flex items-center gap-2">
                      <UserRound className="h-4 w-4 text-[#B48A5A]" />
                      {item.name}
                    </span>
                    <span className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-[#B48A5A]" />
                      {item.email}
                    </span>
                    <span className="flex items-center gap-2">
                      <MessageCircle className="h-4 w-4 text-[#B48A5A]" />
                      {item.whatsapp}
                    </span>
                  </div>

                  <p className="whitespace-pre-line rounded-xl bg-[#F8F6F2] p-4 text-sm leading-6 text-slate-700">
                    {item.message}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

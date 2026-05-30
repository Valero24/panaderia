import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function ConfirmacionPage() {
  return (
    <div className="min-h-screen bg-[#F8F6F1] flex items-center justify-center px-8">
      <Card className="w-full max-w-2xl rounded-3xl border border-[#D4AF37]/20 bg-white shadow-sm">
        <CardContent className="p-10 text-center space-y-6">
          <p className="text-sm tracking-[0.3em] uppercase text-[#B68D40]">
            Solicitud recibida
          </p>

          <h1 className="text-5xl font-bold text-[#0D2B52]">
            Nuestro equipo de atención revisará tu solicitud
          </h1>

          <p className="text-slate-600 leading-8">
            Gracias por avanzar con tu solicitud. Un asesor de viajes validará
            la disponibilidad, revisará los detalles y compartirá la confirmación
            oficial por WhatsApp y correo cuando el proceso esté completo.
          </p>

          <div className="border rounded-2xl p-6 text-left">
            <p><strong>Estado:</strong> En revisión del equipo de atención</p>
            <p><strong>Siguiente paso:</strong> validación manual del asesor</p>
            <p><strong>Canales:</strong> WhatsApp y correo</p>
          </div>

          <Link href="/">
            <Button className="rounded-xl h-12 px-8 bg-[#0D2B52] hover:bg-[#12396d]">
              Volver al inicio
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}

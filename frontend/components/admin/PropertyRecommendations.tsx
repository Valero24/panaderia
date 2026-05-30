import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";

export default function PropertyRecommendations() {
  const recommendations = [
    "Tour privado por Cartagena",
    "Chef privado en villa",
    "Desayuno premium",
    "Decoración romántica",
    "Yate privado",
    "Transporte aeropuerto",
  ];

  return (
    <Card className="rounded-2xl border shadow-sm">
      <CardContent className="p-8 space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">
            Recomendaciones cruzadas
          </h2>

          <p className="text-slate-500 mt-2">
            Configura qué servicios se sugerirán automáticamente
            cuando el cliente reserve este alojamiento.
          </p>
        </div>

        {recommendations.map((item) => (
          <div
            key={item}
            className="flex items-center justify-between border rounded-xl p-4"
          >
            <span className="font-medium">
              {item}
            </span>

            <Switch />
          </div>
        ))}

        <Button className="rounded-xl">
          Guardar recomendaciones
        </Button>
      </CardContent>
    </Card>
  );
}
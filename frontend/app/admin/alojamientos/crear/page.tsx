import PropertyForm from "@/components/admin/PropertyForm";
import PropertyRecommendations from "@/components/admin/PropertyRecommendations";

export default function CrearAlojamientoPage() {
  return (
    <div className="space-y-8">
      <PropertyForm />

      <PropertyRecommendations />
    </div>
  );
}

import PropertyForm from "@/components/admin/PropertyForm";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function EditarAlojamientoPage({
  params,
}: PageProps) {
  const { id } = await params;

  return (
    <div className="space-y-8">
      <PropertyForm propertyId={id} />
    </div>
  );
}

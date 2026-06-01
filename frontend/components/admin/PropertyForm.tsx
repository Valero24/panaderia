import PropertyWizard from "@/components/admin/PropertyWizard";

type PropertyFormProps = {
  propertyId?: string | number;
};

export default function PropertyForm({ propertyId }: PropertyFormProps) {
  return <PropertyWizard propertyId={propertyId} />;
}

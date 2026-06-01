"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type {
  PropertyFormState,
  PropertyFormUpdate,
} from "@/components/admin/property-form-model";

type PropertyBasicInfoStepProps = {
  form: PropertyFormState;
  generatedSlug: string;
  updateField: PropertyFormUpdate;
};

export default function PropertyBasicInfoStep({
  form,
  generatedSlug,
  updateField,
}: PropertyBasicInfoStepProps) {
  return (
    <>
      <Card className="rounded-[32px] border border-[#D4AF37]/20 shadow-sm bg-white">
        <CardContent className="p-10 space-y-10">
          <div>
            <p className="uppercase tracking-[0.3em] text-[#B68D40] text-sm">
              Overview
            </p>
            <h2 className="text-4xl font-bold text-[#0F2A44] mt-3">
              Commercial Information
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <label className="text-sm font-medium text-[#0F2A44]">
                Property Name
              </label>
              <Input
                value={form.title}
                onChange={(e) => updateField("title", e.target.value)}
                placeholder="Villa Ocean Pearl"
                className="h-14 rounded-2xl border-[#D4AF37]/20"
              />
            </div>

            <div className="space-y-3">
              <label className="text-sm font-medium text-[#0F2A44]">
                Slug
              </label>
              <Input
                value={generatedSlug}
                onChange={(e) => updateField("slug", e.target.value)}
                placeholder="villa-ocean-pearl"
                className="h-14 rounded-2xl border-[#D4AF37]/20"
              />
            </div>

            <div className="space-y-3">
              <label className="text-sm font-medium text-[#0F2A44]">
                City
              </label>
              <Input
                value={form.city}
                onChange={(e) => updateField("city", e.target.value)}
                placeholder="Cartagena"
                className="h-14 rounded-2xl border-[#D4AF37]/20"
              />
            </div>

            <div className="space-y-3">
              <label className="text-sm font-medium text-[#0F2A44]">
                Area
              </label>
              <Input
                value={form.area}
                onChange={(e) => updateField("area", e.target.value)}
                placeholder="Bocagrande"
                className="h-14 rounded-2xl border-[#D4AF37]/20"
              />
            </div>

            <div className="md:col-span-2 space-y-3">
              <label className="text-sm font-medium text-[#0F2A44]">
                Address
              </label>
              <Input
                value={form.address}
                onChange={(e) => updateField("address", e.target.value)}
                placeholder="Private property address"
                className="h-14 rounded-2xl border-[#D4AF37]/20"
              />
            </div>

            <div className="md:col-span-2 space-y-3">
              <label className="text-sm font-medium text-[#0F2A44]">
                Description
              </label>
              <Textarea
                value={form.description}
                onChange={(e) => updateField("description", e.target.value)}
                placeholder="Describe the luxury experience..."
                className="min-h-[180px] rounded-3xl border-[#D4AF37]/20"
              />
            </div>

            <div className="space-y-3">
              <label className="text-sm font-medium text-[#0F2A44]">
                Status
              </label>
              <select
                value={form.status}
                onChange={(e) => updateField("status", e.target.value)}
                className="w-full h-14 rounded-2xl border border-[#D4AF37]/20 px-4 bg-white"
              >
                <option value="DRAFT">Draft</option>
                <option value="ACTIVE">Active</option>
                <option value="FEATURED">Featured</option>
                <option value="MAINTENANCE">Maintenance</option>
                <option value="ARCHIVED">Archived</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-[32px] border border-[#D4AF37]/20 bg-white">
        <CardContent className="p-10">
          <div className="mb-10">
            <p className="uppercase tracking-[0.3em] text-[#B68D40] text-sm">
              Capacity
            </p>
            <h2 className="text-4xl font-bold text-[#0F2A44] mt-3">
              Guest Configuration
            </h2>
          </div>

          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
            <Input
              type="number"
              placeholder="Max guests"
              value={form.maxGuests}
              onChange={(e) => updateField("maxGuests", e.target.value)}
              className="h-14 rounded-2xl"
            />
            <Input
              type="number"
              placeholder="Max capacity"
              value={form.maxCapacity}
              onChange={(e) => updateField("maxCapacity", e.target.value)}
              className="h-14 rounded-2xl"
            />
            <Input
              type="number"
              placeholder="Minimum nights"
              value={form.minimumNights}
              onChange={(e) => updateField("minimumNights", e.target.value)}
              className="h-14 rounded-2xl"
            />
            <Input
              type="number"
              placeholder="Bedrooms"
              value={form.bedrooms}
              onChange={(e) => updateField("bedrooms", e.target.value)}
              className="h-14 rounded-2xl"
            />
            <Input
              type="number"
              placeholder="Bathrooms"
              value={form.bathrooms}
              onChange={(e) => updateField("bathrooms", e.target.value)}
              className="h-14 rounded-2xl"
            />
          </div>
        </CardContent>
      </Card>
    </>
  );
}

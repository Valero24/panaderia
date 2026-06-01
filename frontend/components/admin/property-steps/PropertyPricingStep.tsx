"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type {
  PropertyFormState,
  PropertyFormUpdate,
} from "@/components/admin/property-form-model";

type PropertyPricingStepProps = {
  form: PropertyFormState;
  updateField: PropertyFormUpdate;
};

const ruleToggles = [
  { key: "allowsPets", label: "Pets Allowed" },
  { key: "allowsSmoking", label: "Smoking Allowed" },
  { key: "allowsEvents", label: "Events Allowed" },
  { key: "allowsChildren", label: "Children Allowed" },
] as const;

export default function PropertyPricingStep({
  form,
  updateField,
}: PropertyPricingStepProps) {
  return (
    <div className="space-y-8">
      <Card className="rounded-[32px] border border-[#D4AF37]/20 bg-white">
        <CardContent className="p-10">
          <div className="mb-8">
            <p className="uppercase tracking-[0.3em] text-[#B68D40] text-sm">
              Pricing Engine
            </p>
            <h2 className="text-4xl font-bold text-[#0F2A44] mt-3">
              Public Pricing
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <Input type="number" placeholder="Price per night" value={form.pricePerNight} onChange={(e) => updateField("pricePerNight", e.target.value)} className="h-14 rounded-2xl" />
            <Input type="number" placeholder="High season price" value={form.highSeasonPrice} onChange={(e) => updateField("highSeasonPrice", e.target.value)} className="h-14 rounded-2xl" />
            <Input type="number" placeholder="Low season price" value={form.lowSeasonPrice} onChange={(e) => updateField("lowSeasonPrice", e.target.value)} className="h-14 rounded-2xl" />
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-[32px] border border-[#D4AF37]/20 bg-white">
        <CardContent className="p-10">
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-[#0F2A44]">
              Internal Pricing
            </h2>
          </div>

          <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-6">
            <Input type="number" placeholder="Base price" value={form.basePrice} onChange={(e) => updateField("basePrice", e.target.value)} className="h-14 rounded-2xl" />
            <Input type="number" placeholder="Cleaning fee" value={form.cleaningFee} onChange={(e) => updateField("cleaningFee", e.target.value)} className="h-14 rounded-2xl" />
            <Input type="number" placeholder="Service fee" value={form.serviceFee} onChange={(e) => updateField("serviceFee", e.target.value)} className="h-14 rounded-2xl" />
            <Input type="number" placeholder="Taxes" value={form.taxes} onChange={(e) => updateField("taxes", e.target.value)} className="h-14 rounded-2xl" />
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-[32px] border border-[#D4AF37]/20 bg-white">
        <CardContent className="p-10">
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-[#0F2A44]">
              Dynamic Pricing
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <Input type="number" placeholder="2 guests increment" value={form.twoGuestsIncrease} onChange={(e) => updateField("twoGuestsIncrease", e.target.value)} className="h-14 rounded-2xl" />
            <Input type="number" placeholder="Extra guest increment" value={form.extraGuestIncrease} onChange={(e) => updateField("extraGuestIncrease", e.target.value)} className="h-14 rounded-2xl" />
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-[32px] border border-[#D4AF37]/20 bg-white">
        <CardContent className="p-10 space-y-10">
          <div>
            <p className="uppercase tracking-[0.3em] text-[#B68D40] text-sm">
              Rules & Operations
            </p>
            <h2 className="text-4xl font-bold text-[#0F2A44] mt-3">
              Property Rules
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-5">
            {ruleToggles.map((item) => {
              const enabled = Boolean(form[item.key]);
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => updateField(item.key, !enabled)}
                  className={`h-20 rounded-3xl border transition-all flex items-center justify-between px-8 ${
                    enabled
                      ? "bg-[#0F2A44] text-white border-[#0F2A44]"
                      : "bg-white border-[#D4AF37]/20 text-[#0F2A44]"
                  }`}
                >
                  <span className="font-semibold text-lg">{item.label}</span>
                  <div className={`h-7 w-14 rounded-full flex items-center px-1 ${enabled ? "bg-[#D4AF37]" : "bg-slate-200"}`}>
                    <div className={`h-5 w-5 rounded-full bg-white transition-all ${enabled ? "translate-x-7" : ""}`} />
                  </div>
                </button>
              );
            })}
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <Input placeholder="Check-in time" value={form.checkInTime} onChange={(e) => updateField("checkInTime", e.target.value)} className="h-14 rounded-2xl" />
            <Input placeholder="Check-out time" value={form.checkOutTime} onChange={(e) => updateField("checkOutTime", e.target.value)} className="h-14 rounded-2xl" />
          </div>

          <Textarea placeholder="Cancellation policy" value={form.cancellationPolicy} onChange={(e) => updateField("cancellationPolicy", e.target.value)} className="min-h-[180px] rounded-3xl" />
        </CardContent>
      </Card>

      <Card className="rounded-[32px] border border-[#D4AF37]/20 bg-white">
        <CardContent className="p-10 space-y-8">
          <div>
            <p className="uppercase tracking-[0.3em] text-[#B68D40] text-sm">
              Search Optimization
            </p>
            <h2 className="text-4xl font-bold text-[#0F2A44] mt-3">
              SEO Configuration
            </h2>
          </div>

          <Input placeholder="SEO Title" value={form.seoTitle} onChange={(e) => updateField("seoTitle", e.target.value)} className="h-14 rounded-2xl" />
          <Textarea placeholder="SEO Description" value={form.seoDescription} onChange={(e) => updateField("seoDescription", e.target.value)} className="min-h-[160px] rounded-3xl" />
        </CardContent>
      </Card>

      <Card className="rounded-[32px] border border-[#D4AF37]/20 bg-white">
        <CardContent className="p-10 space-y-8">
          <div>
            <p className="uppercase tracking-[0.3em] text-[#B68D40] text-sm">
              Operacion interna
            </p>
            <h2 className="text-4xl font-bold text-[#0F2A44] mt-3">
              Notas administrativas
            </h2>
          </div>

          <Textarea placeholder="Notas internas, instrucciones para el asesor, detalles VIP..." value={form.internalNotes} onChange={(e) => updateField("internalNotes", e.target.value)} className="min-h-[300px] rounded-3xl" />

          <div className="grid md:grid-cols-2 gap-6">
            <Input placeholder="Latitude" value={form.latitude} onChange={(e) => updateField("latitude", e.target.value)} className="h-14 rounded-2xl" />
            <Input placeholder="Longitude" value={form.longitude} onChange={(e) => updateField("longitude", e.target.value)} className="h-14 rounded-2xl" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

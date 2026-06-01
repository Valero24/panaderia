"use client";

export type ProductWizardStep<Key extends string = string> = {
  key: Key;
  label: string;
  description?: string;
};

type ProductWizardProgressProps<Key extends string = string> = {
  steps: ProductWizardStep<Key>[];
  activeKey: Key;
  onChange: (key: Key) => void;
};

export default function ProductWizardProgress<Key extends string = string>({
  steps,
  activeKey,
  onChange,
}: ProductWizardProgressProps<Key>) {
  const activeIndex = Math.max(
    steps.findIndex((step) => step.key === activeKey),
    0
  );

  return (
    <div className="rounded-3xl border border-[#D4AF37]/20 bg-white p-4 shadow-sm sm:p-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {steps.map((step, index) => {
          const isActive = step.key === activeKey;
          const isDone = index < activeIndex;

          return (
            <button
              key={step.key}
              type="button"
              onClick={() => onChange(step.key)}
              className={`min-w-0 rounded-2xl border p-4 text-left transition-all ${
                isActive
                  ? "border-[#0F2A44] bg-[#0F2A44] text-white shadow-lg"
                  : isDone
                    ? "border-[#D4AF37]/30 bg-[#F8F6F1] text-[#0F2A44]"
                    : "border-[#D4AF37]/15 bg-white text-[#0F2A44] hover:border-[#D4AF37]/45"
              }`}
            >
              <div className="flex items-center gap-3">
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
                    isActive
                      ? "bg-[#D4AF37] text-[#0F2A44]"
                      : isDone
                        ? "bg-[#0F2A44] text-white"
                        : "bg-[#F3EFE4] text-[#B68D40]"
                  }`}
                >
                  {index + 1}
                </span>
                <span className="min-w-0 text-sm font-semibold leading-5">
                  {step.label}
                </span>
              </div>
              {step.description && (
                <p
                  className={`mt-2 line-clamp-2 text-xs leading-5 ${
                    isActive ? "text-white/75" : "text-slate-500"
                  }`}
                >
                  {step.description}
                </p>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

"use client";

import {
  ArrowDown,
  ArrowUp,
  ImageIcon,
  Plus,
  Trash2,
  Video,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export type AdminMediaItem = {
  id?: number | string;
  url: string;
  mediaType?: "IMAGE" | "VIDEO";
  title?: string;
  description?: string;
  isPrimary?: boolean;
  active?: boolean;
  sortOrder?: number;
};

type MediaGalleryEditorProps = {
  value: AdminMediaItem[];
  onChange: (value: AdminMediaItem[]) => void;
  disabled?: boolean;
};

const emptyItem: AdminMediaItem = {
  url: "",
  mediaType: "IMAGE",
  title: "",
  description: "",
  isPrimary: false,
  active: true,
  sortOrder: 0,
};

function normalize(items: AdminMediaItem[]) {
  return items.map((item, index) => ({
    ...item,
    sortOrder: item.sortOrder ?? index,
  }));
}

export default function MediaGalleryEditor({
  value,
  onChange,
  disabled,
}: MediaGalleryEditorProps) {
  const items = normalize(value || []);

  function update(index: number, patch: Partial<AdminMediaItem>) {
    const next = items.map((item, itemIndex) => {
      const updated = itemIndex === index ? { ...item, ...patch } : item;

      if (patch.isPrimary && itemIndex !== index) {
        return { ...updated, isPrimary: false };
      }

      return updated;
    });

    onChange(next);
  }

  function addItem() {
    onChange([
      ...items,
      {
        ...emptyItem,
        isPrimary: items.length === 0,
        sortOrder: items.length,
      },
    ]);
  }

  function removeItem(index: number) {
    const next = items.filter((_, itemIndex) => itemIndex !== index);

    if (items[index]?.isPrimary && next.length > 0) {
      next[0] = {
        ...next[0],
        isPrimary: true,
      };
    }

    onChange(normalize(next));
  }

  function move(index: number, step: number) {
    const next = [...items];
    const target = index + step;

    if (target < 0 || target >= next.length) return;

    const [item] = next.splice(index, 1);
    next.splice(target, 0, item);

    onChange(
      next.map((current, itemIndex) => ({
        ...current,
        sortOrder: itemIndex,
      }))
    );
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-[#D4AF37]/20 bg-[#F8F6F2]">
      <div className="flex flex-col gap-4 border-b border-[#D4AF37]/15 bg-white p-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h3 className="text-lg font-semibold text-[#0D2B52]">
            Galeria multimedia
          </h3>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
            Agrega fotos o videos por URL. La carga directa de archivos queda
            preparada para una siguiente etapa.
          </p>
        </div>
        <Button
          type="button"
          onClick={addItem}
          disabled={disabled}
          className="h-11 shrink-0 rounded-xl bg-[#0D2B52] px-4 hover:bg-[#12396d]"
        >
          <Plus className="mr-2 h-4 w-4" />
          Agregar media
        </Button>
      </div>

      {items.length === 0 ? (
        <div className="m-5 rounded-xl border border-dashed border-[#D4AF37]/35 bg-white p-6 text-center text-sm leading-6 text-slate-500">
          Sin elementos multimedia. Las cards publicas usaran la imagen
          principal o un placeholder elegante.
        </div>
      ) : (
        <div className="space-y-5 p-4 sm:p-5">
          {items.map((item, index) => (
            <div
              key={item.id || index}
              className="w-full min-w-0 overflow-hidden rounded-2xl border border-[#D4AF37]/15 bg-white p-4 shadow-sm sm:p-5"
            >
              <div className="flex w-full min-w-0 flex-col gap-4">
                <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-[#D4AF37]/15 bg-slate-100">
                  {item.url ? (
                    item.mediaType === "VIDEO" ? (
                      <div className="flex h-full w-full items-center justify-center bg-[#0D2B52] text-white">
                        <Video className="h-10 w-10" />
                      </div>
                    ) : (
                      <img
                        src={item.url}
                        alt={item.title || "Media"}
                        className="h-full w-full object-cover"
                      />
                    )
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-slate-400">
                      <ImageIcon className="h-10 w-10" />
                    </div>
                  )}

                  <div className="absolute left-3 top-3 rounded-full bg-white/95 px-3 py-1 text-xs font-semibold text-[#0D2B52] shadow-sm">
                    #{index + 1}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 text-xs">
                  {item.isPrimary && (
                    <span className="rounded-full bg-[#D4AF37]/15 px-3 py-1 font-medium text-[#7A5A1A]">
                      Principal
                    </span>
                  )}
                  <span className="rounded-full bg-[#F8F6F2] px-3 py-1 font-medium text-slate-600">
                    {item.active === false ? "Inactiva" : "Activa"}
                  </span>
                  <span className="rounded-full bg-[#F8F6F2] px-3 py-1 font-medium text-slate-600">
                    {item.mediaType === "VIDEO" ? "Video" : "Imagen"}
                  </span>
                </div>

                <label className="block w-full min-w-0 space-y-2 text-sm">
                  <span className="font-medium text-[#0D2B52]">Tipo</span>
                  <select
                    value={item.mediaType || "IMAGE"}
                    onChange={(event) =>
                      update(index, {
                        mediaType: event.target.value as "IMAGE" | "VIDEO",
                      })
                    }
                    disabled={disabled}
                    className="h-11 w-full min-w-0 rounded-xl border border-[#D4AF37]/20 bg-white px-3 text-sm text-[#0D2B52]"
                  >
                    <option value="IMAGE">Imagen</option>
                    <option value="VIDEO">Video</option>
                  </select>
                </label>

                <label className="block w-full min-w-0 space-y-2 text-sm">
                  <span className="font-medium text-[#0D2B52]">URL</span>
                  <Input
                    placeholder="https://..."
                    value={item.url || ""}
                    onChange={(event) =>
                      update(index, { url: event.target.value })
                    }
                    disabled={disabled}
                    className="w-full min-w-0"
                  />
                </label>

                <label className="block w-full min-w-0 space-y-2 text-sm">
                  <span className="font-medium text-[#0D2B52]">Titulo</span>
                  <Input
                    placeholder="Titulo opcional"
                    value={item.title || ""}
                    onChange={(event) =>
                      update(index, { title: event.target.value })
                    }
                    disabled={disabled}
                    className="w-full min-w-0"
                  />
                </label>

                <label className="block w-full max-w-40 space-y-2 text-sm">
                  <span className="font-medium text-[#0D2B52]">Orden</span>
                  <Input
                    type="number"
                    placeholder="Orden"
                    value={item.sortOrder ?? index}
                    onChange={(event) =>
                      update(index, { sortOrder: Number(event.target.value) })
                    }
                    disabled={disabled}
                    className="w-full"
                  />
                </label>

                <label className="block w-full min-w-0 space-y-2 text-sm">
                  <span className="font-medium text-[#0D2B52]">
                    Descripcion
                  </span>
                  <Textarea
                    placeholder="Descripcion opcional"
                    value={item.description || ""}
                    onChange={(event) =>
                      update(index, { description: event.target.value })
                    }
                    disabled={disabled}
                    className="min-h-[90px] w-full min-w-0 resize-y"
                  />
                </label>

                <div className="flex flex-wrap gap-3 border-t border-[#D4AF37]/15 pt-4 text-sm text-slate-600">
                  <label className="flex items-center gap-3 rounded-xl border border-[#D4AF37]/15 bg-[#F8F6F2] px-3 py-2">
                    <input
                      type="radio"
                      checked={Boolean(item.isPrimary)}
                      onChange={() => update(index, { isPrimary: true })}
                      disabled={disabled}
                    />
                    <span>Principal</span>
                  </label>
                  <label className="flex items-center gap-3 rounded-xl border border-[#D4AF37]/15 bg-[#F8F6F2] px-3 py-2">
                    <input
                      type="checkbox"
                      checked={item.active !== false}
                      onChange={(event) =>
                        update(index, { active: event.target.checked })
                      }
                      disabled={disabled}
                    />
                    <span>Activa</span>
                  </label>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="h-10 rounded-xl"
                    onClick={() => move(index, -1)}
                    disabled={disabled || index === 0}
                  >
                    <ArrowUp className="mr-2 h-4 w-4" />
                    Subir
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-10 rounded-xl"
                    onClick={() => move(index, 1)}
                    disabled={disabled || index === items.length - 1}
                  >
                    <ArrowDown className="mr-2 h-4 w-4" />
                    Bajar
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-10 rounded-xl border-red-200 text-red-600 hover:bg-red-50"
                    onClick={() => removeItem(index)}
                    disabled={disabled}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Quitar
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiUrl } from "@/lib/api";

type Property = {
  id: number;
  title: string;
};

type PropertyImage = {
  id: number;
  url: string;
  isPrimary: boolean;
  propertyId: number;
};

export default function PropertyImagesPage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [selectedProperty, setSelectedProperty] = useState<number | null>(null);
  const [images, setImages] = useState<PropertyImage[]>([]);
  const [imageUrl, setImageUrl] = useState("");
  const [role, setRole] = useState("");
  const canManage = ["SUPERADMIN", "ADMIN"].includes(role);

  useEffect(() => {
    try {
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      setRole(user?.role || "");
    } catch {
      setRole("");
    }
  }, []);

  useEffect(() => {
    if (canManage) fetchProperties();
  }, [canManage]);

  async function fetchProperties() {
    const res = await fetch(apiUrl("/properties"));
    const data = await res.json();
    setProperties(data);

    if (data.length > 0) {
      setSelectedProperty(data[0].id);
      fetchImages(data[0].id);
    }
  }

  async function fetchImages(propertyId: number) {
    const token = localStorage.getItem("token");
    const res = await fetch(
      apiUrl(`/property-images/${propertyId}`),
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    const data = await res.json();
    setImages(data);
  }

  async function handleCreateImage() {
    if (!canManage) return;
    if (!imageUrl || !selectedProperty) return;

    const token = localStorage.getItem("token");

    await fetch(apiUrl("/property-images"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        url: imageUrl,
        propertyId: selectedProperty,
      }),
    });

    setImageUrl("");
    fetchImages(selectedProperty);
  }

  async function handleDelete(id: number) {
    if (!canManage) return;
    const token = localStorage.getItem("token");

    await fetch(
      apiUrl(`/property-images/${id}`),
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (selectedProperty) {
      fetchImages(selectedProperty);
    }
  }

  async function handleSetPrimary(id: number) {
    if (!canManage) return;
    const token = localStorage.getItem("token");

    await fetch(
      apiUrl(`/property-images/${id}/primary`),
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (selectedProperty) {
      fetchImages(selectedProperty);
    }
  }

  if (role && !canManage) {
    return (
      <div className="rounded-3xl border border-[#D4AF37]/20 bg-white p-8 shadow-sm">
        <p className="text-sm uppercase tracking-[0.25em] text-[#B68D40]">
          Permisos
        </p>
        <h1 className="mt-2 text-3xl font-bold text-[#0D2B52]">
          Galería restringida
        </h1>
        <p className="mt-3 max-w-xl text-slate-500">
          La administración de imágenes de alojamientos está reservada para
          Superadmin.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-800">
          Gestión de Imágenes
        </h1>

        <p className="text-slate-500 mt-2">
          Administra galería premium y portada principal.
        </p>
      </div>

      <Card className="rounded-2xl border shadow-sm">
        <CardContent className="p-8 space-y-6">
          <select
            className="w-full border rounded-xl h-12 px-4"
            value={selectedProperty || ""}
            onChange={(e) => {
              const id = Number(e.target.value);
              setSelectedProperty(id);
              fetchImages(id);
            }}
          >
            {properties.map((property) => (
              <option
                key={property.id}
                value={property.id}
              >
                {property.title}
              </option>
            ))}
          </select>

          <div className="flex gap-4">
            <Input
              placeholder="Pega aquí la URL de la imagen"
              value={imageUrl}
              onChange={(e) =>
                setImageUrl(e.target.value)
              }
            />

            <Button onClick={handleCreateImage}>
              Agregar imagen
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
        {images.map((image) => (
          <Card
            key={image.id}
            className="rounded-2xl border shadow-sm overflow-hidden"
          >
            <img
              src={image.url}
              alt=""
              className="h-64 w-full object-cover"
            />

            <CardContent className="p-6 space-y-4">
              {image.isPrimary ? (
                <p className="text-sm font-semibold text-green-600">
                  Imagen principal
                </p>
              ) : (
                <Button
                  variant="outline"
                  onClick={() =>
                    handleSetPrimary(image.id)
                  }
                >
                  Hacer principal
                </Button>
              )}

              <Button
                variant="destructive"
                onClick={() =>
                  handleDelete(image.id)
                }
              >
                Eliminar
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

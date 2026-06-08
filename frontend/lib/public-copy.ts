export function cleanPublicCopy(value?: string | null) {
  if (!value) return "";

  return value
    .replace(/experiencia\s+concierge/gi, "experiencia VIP")
    .replace(/paquete\s+concierge/gi, "paquete con atención personalizada")
    .replace(
      /operaciones\s+de\s+conserjer[ií]a/gi,
      "operación de atención personalizada"
    )
    .replace(/conserje/gi, "asesor de viajes")
    .replace(/concierge/gi, "atención personalizada");
}

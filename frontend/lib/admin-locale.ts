import type { Language } from "@/i18n";

export const ADMIN_LOCALE: Language = "es";
export const ADMIN_LOCALE_SCOPE = "admin" as const;
export const PUBLIC_LOCALE_SCOPE = "public" as const;
export const PUBLIC_LOCALE_STORAGE_KEY = "cartagena-language";

export function isInternalPath(pathname?: string | null) {
  return (
    pathname === "/login" ||
    pathname === "/staff-login" ||
    pathname === "/admin" ||
    Boolean(pathname?.startsWith("/admin/"))
  );
}

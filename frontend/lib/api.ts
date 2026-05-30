export const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

export function apiUrl(path: string) {
  const cleanPath = path.startsWith("/") ? path : `/${path}`;

  return `${API_URL}${cleanPath}`;
}

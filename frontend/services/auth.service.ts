import { apiUrl } from "@/lib/api";

export async function login(email: string, password: string) {
  const res = await fetch(apiUrl("/auth/login"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email,
      password,
    }),
  });

  if (!res.ok) {
    throw new Error("Credenciales inválidas");
  }

  const data = await res.json();

  // 🔥 guardar token
  localStorage.setItem("token", data.access_token);

  return data;
}

import type { Metadata } from "next";

import StaffLoginForm from "@/components/auth/StaffLoginForm";

export const metadata: Metadata = {
  title: "Acceso interno | Cartagena Tailored Travel",
  robots: {
    index: false,
    follow: false,
  },
};

export default function StaffLoginPage() {
  return <StaffLoginForm />;
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "@/context/LanguageContext";

export default function PropertyPage({ params }: any) {
  const router = useRouter();
  const { t } = useTranslation();
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [guests, setGuests] = useState(1);

  const handleReserve = () => {
    router.push(`/checkout/${params.id}`);
  };

  return (
    <div>
      <h1>{t("property.reserve")}</h1>

      <input type="date" onChange={(e) => setCheckIn(e.target.value)} />
      <input type="date" onChange={(e) => setCheckOut(e.target.value)} />

      <button onClick={handleReserve}>{t("checkout.validateAvailability")}</button>
    </div>
  );
}

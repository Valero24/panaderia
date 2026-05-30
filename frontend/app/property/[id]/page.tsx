"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function PropertyPage({ params }: any) {
  const router = useRouter();
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [guests, setGuests] = useState(1);

  const handleReserve = () => {
    router.push(`/checkout/${params.id}`);
  };

  return (
    <div>
      <h1>Reservar propiedad</h1>

      <input type="date" onChange={(e) => setCheckIn(e.target.value)} />
      <input type="date" onChange={(e) => setCheckOut(e.target.value)} />

      <button onClick={handleReserve}>Validar disponibilidad</button>
    </div>
  );
}

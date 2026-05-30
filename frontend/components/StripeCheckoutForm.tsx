"use client";

import { useEffect, useState } from "react";
import {
  CardElement,
  Elements,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { apiUrl } from "@/lib/api";

type Props = {
  amount: number;
  preReservationId?: string | null;
};

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ||
    "pk_test_51TPqjB3qMYIbH3pAJYXWXzxEpjDUyl9UVh0qJWsBPMWOyATjelZFEtfgWXmIZDqCHyMm1AbNoDHPaYQmdmbKLDGg000Hc3azQI"
);

function CheckoutForm({ amount, preReservationId }: Props) {
  const stripe = useStripe();
  const elements = useElements();

  const [clientSecret, setClientSecret] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function createPaymentIntent() {
      if (!preReservationId) {
        setClientSecret("");
        return;
      }

      try {
        const response = await fetch(
          apiUrl("/payments/create-payment-intent"),
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              preReservationId,
            }),
          }
        );

        const data = await response.json();

        if (!response.ok) {
          alert(data.message || "Error creando Payment Intent");
          return;
        }

        setClientSecret(data.clientSecret);
      } catch (error) {
        console.error(error);
        alert("Error conectando con Stripe");
      }
    }

    if (amount > 0) {
      createPaymentIntent();
    }
  }, [amount, preReservationId]);

  async function handleSubmit() {
    if (!stripe || !elements) return;

    if (!clientSecret) {
      alert("Primero confirma disponibilidad y datos de reserva");
      return;
    }

    const cardElement = elements.getElement(CardElement);

    if (!cardElement) return;

    setLoading(true);

    const result = await stripe.confirmCardPayment(clientSecret, {
      payment_method: {
        card: cardElement,
      },
    });

    if (result.error) {
      alert(result.error.message || "Error procesando el pago");
      setLoading(false);
      return;
    }

    if (result.paymentIntent?.status === "succeeded") {
      window.location.href = "/confirmacion";
    }

    setLoading(false);
  }

  return (
    <div className="space-y-6">
      <div className="border rounded-xl p-4 bg-white">
        <CardElement />
      </div>

      <button
        onClick={handleSubmit}
        disabled={loading || !clientSecret}
        className="w-full h-12 rounded-xl bg-[#0D2B52] text-white font-semibold hover:bg-[#12396d] disabled:opacity-60"
      >
        {loading ? "Procesando pago..." : "Pay Now"}
      </button>
    </div>
  );
}

export default function StripeCheckoutForm({
  amount,
  preReservationId,
}: Props) {
  return (
    <Elements stripe={stripePromise}>
      <CheckoutForm
        amount={amount}
        preReservationId={preReservationId}
      />
    </Elements>
  );
}

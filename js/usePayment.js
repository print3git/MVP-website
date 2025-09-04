import { useEffect, useRef, useState } from "react";
import { loadStripe } from "@stripe/stripe-js";

const stripePromise = loadStripe(process.env.STRIPE_PUBLISHABLE_KEY);

export default function usePayment() {
  const cardRef = useRef(null);
  const stripeRef = useRef(null);
  const cardElementRef = useRef(null);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState(null);
  const [succeeded, setSucceeded] = useState(false);
  const [paymentIntentId, setPaymentIntentId] = useState(null);
  const [status, setStatus] = useState(null);

  useEffect(() => {
    let active = true;
    stripePromise.then((stripe) => {
      if (!stripe || !active) return;
      stripeRef.current = stripe;
      const elements = stripe.elements();
      cardElementRef.current = elements.create("card");
      if (cardRef.current) {
        cardElementRef.current.mount(cardRef.current);
      }
    });
    return () => {
      active = false;
      cardElementRef.current?.unmount();
    };
  }, []);

  const pay = async (billingDetails = {}) => {
    if (!stripeRef.current || !cardElementRef.current) return;
    setPaying(true);
    setError(null);
    setSucceeded(false);
    setStatus(null);
    setPaymentIntentId(null);
    try {
      const res = await fetch("/api/checkout/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: [{ price: "print_single", quantity: 1 }],
          currency: "gbp",
        }),
      });
      const data = (await res.json().catch(() => ({}))) || {};
      if (!res.ok) throw new Error(data.error || "Payment failed");
      const result = await stripeRef.current.confirmCardPayment(
        data.clientSecret,
        {
          payment_method: {
            card: cardElementRef.current,
            billing_details: billingDetails,
          },
        },
      );
      if (result?.error) {
        setError(result.error.message || "Payment failed");
      } else if (result?.paymentIntent?.status === "succeeded") {
        setSucceeded(true);
        setPaymentIntentId(result.paymentIntent.id);
        setStatus(result.paymentIntent.status);
      } else {
        setError("Payment failed");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setPaying(false);
    }
  };

  return { cardRef, pay, paying, error, succeeded, paymentIntentId, status };
}

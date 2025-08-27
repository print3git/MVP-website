import React, { useEffect } from "react";
import usePayment from "./usePayment.js";
import toast from "./toast.js";

export default function PaymentPanel() {
  const { cardRef, pay, paying, error, succeeded } = usePayment();

  useEffect(() => {
    if (succeeded) toast("Payment confirmed");
  }, [succeeded]);

  const handlePay = async (e) => {
    e.preventDefault();
    await pay();
  };

  return React.createElement(
    "div",
    { className: "space-y-2", "data-testid": "payment-panel" },
    React.createElement(
      "h2",
      { className: "text-lg font-bold" },
      "Purchase model",
    ),
    React.createElement("div", {
      ref: cardRef,
      className: "p-2 bg-white text-black",
    }),
    error &&
      React.createElement(
        "p",
        { className: "text-red-500", "data-testid": "payment-error" },
        error,
      ),
    React.createElement(
      "button",
      {
        onClick: handlePay,
        disabled: paying,
        className: "px-4 py-2 bg-green-600 text-white rounded",
        "data-testid": "pay-btn",
      },
      paying ? "Paying..." : "Pay £29.99",
    ),
  );
}

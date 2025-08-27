/** @jest-environment jsdom */
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import toast from "../../js/toast.js";

process.env.STRIPE_PUBLISHABLE_KEY = "pk_test";

jest.mock("../../js/toast.js", () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock("../../js/ModelViewer.js", () => {
  const React = require("react");
  return {
    __esModule: true,
    default: ({ url }) =>
      React.createElement(
        "a",
        { href: url, "data-testid": "model-link" },
        "Model",
      ),
  };
});

jest.mock(
  "@stripe/stripe-js",
  () => ({
    loadStripe: jest.fn().mockResolvedValue({
      elements: () => ({
        create: () => ({ mount: jest.fn(), unmount: jest.fn() }),
      }),
      confirmCardPayment: jest.fn().mockResolvedValue({
        paymentIntent: { id: "pi_1", status: "succeeded" },
      }),
    }),
  }),
  { virtual: true },
);

const { GeneratorApp } = require("../../js/modelGenerator.js");

describe("payment flow", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("pay button disables and model remains", async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ jobId: "j_1" }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ state: "succeeded", url: "/m.glb" }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ clientSecret: "pi_secret_123" }),
      })
      .mockResolvedValue({
        ok: true,
        json: async () => ({ clientSecret: "pi_secret_123" }),
      });
    global.fetch = fetchMock;

    const startHref = window.location.href;
    render(<GeneratorApp />);
    fireEvent.change(screen.getByPlaceholderText("Enter prompt"), {
      target: { value: "tree" },
    });
    fireEvent.click(screen.getByTestId("generate-btn"));
    await screen.findByTestId("viewer");
    const payBtn = await screen.findByTestId("pay-btn");
    fireEvent.click(payBtn);
    expect(payBtn).toBeDisabled();
    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith("Payment confirmed"),
    );
    await waitFor(() => expect(payBtn).not.toBeDisabled());
    expect(window.location.href).toBe(startHref);
    expect(screen.getByTestId("model-link")).toBeInTheDocument();
  });
});

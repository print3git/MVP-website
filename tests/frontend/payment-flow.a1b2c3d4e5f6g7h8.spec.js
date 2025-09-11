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

const confirmCardPaymentMock = jest.fn();
jest.mock(
  "@stripe/stripe-js",
  () => ({
    loadStripe: jest.fn().mockResolvedValue({
      elements: () => ({
        create: () => ({ mount: jest.fn(), unmount: jest.fn() }),
      }),
      confirmCardPayment: confirmCardPaymentMock,
    }),
  }),
  { virtual: true },
);

const { GeneratorApp } = require("../../js/modelGenerator.js");

describe("payment flow", () => {
  const originalLocation = window.location;

  beforeAll(() => {
    const href = originalLocation.href;
    delete window.location;
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { href, assign: jest.fn(), replace: jest.fn() },
    });
  });

  afterAll(() => {
    window.location = originalLocation;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    confirmCardPaymentMock.mockReset();
    confirmCardPaymentMock.mockResolvedValue({
      paymentIntent: { id: "pi_1", status: "succeeded" },
    });
  });

  const buildFetch = () =>
    jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ jobId: "j_1" }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ state: "succeeded", url: "/m.glb" }),
      })
      .mockResolvedValue({
        ok: true,
        json: async () => ({ clientSecret: "pi_secret_123" }),
      });

  test("successful payment shows confirmation", async () => {
    global.fetch = buildFetch();
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
    await waitFor(() =>
      expect(screen.queryByTestId("pay-btn")).not.toBeInTheDocument(),
    );
    expect(screen.getByTestId("purchase-status")).toHaveTextContent(
      /succeeded/i,
    );
    expect(screen.getByTestId("model-link")).toBeInTheDocument();
    expect(window.location.href).toBe(startHref);
  });

  test("failed payment surfaces error", async () => {
    global.fetch = buildFetch();
    confirmCardPaymentMock.mockResolvedValueOnce({
      error: { message: "Card declined" },
    });
    render(<GeneratorApp />);
    fireEvent.change(screen.getByPlaceholderText("Enter prompt"), {
      target: { value: "tree" },
    });
    fireEvent.click(screen.getByTestId("generate-btn"));
    await screen.findByTestId("viewer");
    const payBtn = await screen.findByTestId("pay-btn");
    fireEvent.click(payBtn);
    expect(payBtn).toBeDisabled();
    await waitFor(() => expect(toast).toHaveBeenCalledWith("Card declined"));
    await waitFor(() => expect(payBtn).not.toBeDisabled());
    expect(screen.getByTestId("payment-error")).toHaveTextContent(
      "Card declined",
    );
    expect(screen.queryByTestId("purchase-status")).not.toBeInTheDocument();
  });
});

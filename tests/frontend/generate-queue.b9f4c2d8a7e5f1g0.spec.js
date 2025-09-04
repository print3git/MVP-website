/** @jest-environment jsdom */
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { GeneratorApp } from "../../js/modelGenerator.js";
import toast from "../../js/toast.js";

jest.mock("../../js/toast.js", () => ({
  __esModule: true,
  default: jest.fn(),
}));
jest.mock("../../js/ModelViewer.js", () => {
  const React = require("react");
  return {
    __esModule: true,
    default: ({ url }) => React.createElement("div", { "data-url": url }),
  };
});

describe("generate queue", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  test("button disables during generation and re-enables after success", async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ jobId: "j_1" }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ state: "queued", position: 2 }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ state: "succeeded", url: "/m.glb" }),
      });
    global.fetch = fetchMock;

    render(<GeneratorApp />);
    fireEvent.change(screen.getByPlaceholderText("Enter prompt"), {
      target: { value: "a" },
    });
    const btn = screen.getByTestId("generate-btn");
    fireEvent.click(btn);
    expect(btn).toBeDisabled();
    await screen.findByText("Position: 2");
    await screen.findByTestId("viewer", { timeout: 3000 });
    expect(
      screen.getByTestId("viewer").querySelector('[data-url="/m.glb"]'),
    ).toBeInTheDocument();
    await waitFor(() => expect(btn).not.toBeDisabled());
  });

  test("failure shows toast and allows retry", async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ jobId: "j_1" }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ state: "failed", error: "boom" }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ jobId: "j_2" }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ state: "succeeded", url: "/ok.glb" }),
      });
    global.fetch = fetchMock;

    render(<GeneratorApp />);
    const input = screen.getByPlaceholderText("Enter prompt");
    fireEvent.change(input, { target: { value: "c" } });
    const btn = screen.getByTestId("generate-btn");
    fireEvent.click(btn);

    await waitFor(() => {
      expect(toast).toHaveBeenCalledWith(
        "Model generation failed. Please try again.",
      );
    });
    expect(btn).not.toBeDisabled();

    fireEvent.click(btn);
    await screen.findByTestId("viewer", { timeout: 3000 });
  });
});

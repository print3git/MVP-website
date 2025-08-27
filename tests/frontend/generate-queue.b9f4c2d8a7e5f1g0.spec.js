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
    default: () => React.createElement("div"),
  };
});

describe("generate queue", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  test("success path", async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ jobId: "j_1" }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ state: "running" }),
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
    fireEvent.click(screen.getByTestId("generate-btn"));

    expect(screen.getByTestId("generate-btn")).toBeDisabled();
    expect(screen.getByTestId("queue-state")).toBeInTheDocument();

    await screen.findByTestId("viewer");
  });

  test("failure path", async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ jobId: "j_1" }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ state: "failed" }),
      });
    global.fetch = fetchMock;

    render(<GeneratorApp />);
    fireEvent.change(screen.getByPlaceholderText("Enter prompt"), {
      target: { value: "a" },
    });
    fireEvent.click(screen.getByTestId("generate-btn"));

    await waitFor(() => {
      expect(toast).toHaveBeenCalledWith(
        "Model generation failed. Please try again.",
      );
    });
  });
});

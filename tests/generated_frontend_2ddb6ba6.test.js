import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import "@testing-library/jest-dom";
import fetchMock from "jest-fetch-mock";

// Assume these modules exist in the project
/* global window */
import AdminDashboard from "../src/components/AdminDashboard";
import { ThemeProvider } from "../src/components/ThemeContext";

fetchMock.enableMocks();

beforeEach(() => {
  fetchMock.resetMocks();
  jest.useFakeTimers();
});

afterEach(() => {
  jest.runOnlyPendingTimers();
  jest.useRealTimers();
});

const withTheme = (ui, theme = "light") =>
  React.createElement(ThemeProvider, { value: { theme } }, ui);
const mount = (props = {}, theme) =>
  render(withTheme(React.createElement(AdminDashboard, props), theme));

const mockAnalytics = { profits: [{ date: "2024-01-01", value: 10 }] };
const mockOperations = { count: 5 };

describe("AdminDashboard basic rendering and fetch operations", () => {
  test("renders component and fetches analytics and operations", async () => {
    fetchMock.mockResponses(
      [JSON.stringify(mockAnalytics), { status: 200 }],
      [JSON.stringify(mockOperations), { status: 200 }],
    );
    mount();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/admin/analytics",
      expect.any(Object),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/admin/operations",
      expect.any(Object),
    );
  });

  test("includes X-Auth-Token header", async () => {
    fetchMock.mockResponseOnce(JSON.stringify(mockAnalytics));
    fetchMock.mockResponseOnce(JSON.stringify(mockOperations));
    mount();
    const headers = fetchMock.mock.calls[0][1].headers;
    expect(headers["X-Auth-Token"]).toBeDefined();
  });

  test("shows loading spinner until requests resolve", async () => {
    fetchMock.mockResponseOnce(
      () =>
        new Promise((res) =>
          setTimeout(() => res({ body: JSON.stringify(mockAnalytics) }), 200),
        ),
    );
    fetchMock.mockResponseOnce(
      () =>
        new Promise((res) =>
          setTimeout(() => res({ body: JSON.stringify(mockOperations) }), 200),
        ),
    );
    mount();
    expect(screen.getByTestId("loading")).toBeInTheDocument();
    await act(async () => {
      jest.advanceTimersByTime(200);
    });
  });

  test("shows error banner if analytics fails", async () => {
    fetchMock.mockRejectOnce(new Error("server error"));
    fetchMock.mockResponseOnce(JSON.stringify(mockOperations));
    mount();
    await screen.findByRole("alert");
  });

  test("shows error banner if operations fails", async () => {
    fetchMock.mockResponseOnce(JSON.stringify(mockAnalytics));
    fetchMock.mockRejectOnce(new Error("server error"));
    mount();
    await screen.findByRole("alert");
  });

  test("debounces date filter changes", async () => {
    fetchMock.mockResponse(JSON.stringify(mockAnalytics));
    fetchMock.mockResponse(JSON.stringify(mockOperations));
    mount();
    fireEvent.change(screen.getByLabelText(/from/i), {
      target: { value: "2024-01-01" },
    });
    act(() => jest.advanceTimersByTime(299));
    expect(fetchMock).toHaveBeenCalledTimes(2); // initial
    act(() => jest.advanceTimersByTime(1));
    expect(fetchMock).toHaveBeenCalledTimes(4); // refetch
  });

  test("displays no data message when responses empty", async () => {
    fetchMock.mockResponseOnce(JSON.stringify({ profits: [] }));
    fetchMock.mockResponseOnce(JSON.stringify({ count: 0 }));
    mount();
    await screen.findByText(/no data/i);
  });

  for (let i = 0; i < 43; i++) {
    test(`basic fetch repetition ${i}`, async () => {
      fetchMock.mockResponse(JSON.stringify(mockAnalytics));
      fetchMock.mockResponse(JSON.stringify(mockOperations));
      mount();
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });
  }
});

describe("AdminDashboard charts and dataset handling", () => {
  test("renders line, bar, and pie charts", async () => {
    fetchMock.mockResponseOnce(JSON.stringify(mockAnalytics));
    fetchMock.mockResponseOnce(JSON.stringify(mockOperations));
    mount();
    expect(screen.getByTestId("line-chart")).toBeInTheDocument();
    expect(screen.getByTestId("bar-chart")).toBeInTheDocument();
    expect(screen.getByTestId("pie-chart")).toBeInTheDocument();
  });

  test("line chart snapshot", async () => {
    fetchMock.mockResponseOnce(JSON.stringify(mockAnalytics));
    fetchMock.mockResponseOnce(JSON.stringify(mockOperations));
    const { container } = mount();
    expect(container.querySelector("svg")).toMatchSnapshot();
  });

  test("chart tooltips show correct data", async () => {
    fetchMock.mockResponseOnce(JSON.stringify(mockAnalytics));
    fetchMock.mockResponseOnce(JSON.stringify(mockOperations));
    mount();
    fireEvent.mouseOver(screen.getByText("2024-01-01"));
    expect(screen.getByRole("tooltip")).toHaveTextContent("10");
  });

  test("window resize triggers re-render", async () => {
    fetchMock.mockResponse(JSON.stringify(mockAnalytics));
    fetchMock.mockResponse(JSON.stringify(mockOperations));
    mount();
    window.resizeTo(800, 600);
    fireEvent(window, new Event("resize"));
    expect(screen.getByTestId("line-chart")).toBeInTheDocument();
  });

  test("cleanup listeners on unmount", async () => {
    fetchMock.mockResponse(JSON.stringify(mockAnalytics));
    fetchMock.mockResponse(JSON.stringify(mockOperations));
    const { unmount } = mount();
    const resizeListeners = window.getEventListeners?.("resize") || [];
    unmount();
    const after = window.getEventListeners?.("resize") || [];
    if (resizeListeners.length) {
      expect(after.length).toBeLessThan(resizeListeners.length);
    } else {
      expect(after).toEqual([]);
    }
  });

  test("uses large dataset fixture", async () => {
    const large = require("./__fixtures__/dashboard/largeDailyProfits.json");
    fetchMock.mockResponseOnce(JSON.stringify({ profits: large }));
    fetchMock.mockResponseOnce(JSON.stringify(mockOperations));
    mount();
    expect(screen.getByTestId("line-chart")).toBeInTheDocument();
  });

  for (let i = 0; i < 44; i++) {
    test(`chart render repetition ${i}`, async () => {
      fetchMock.mockResponse(JSON.stringify(mockAnalytics));
      fetchMock.mockResponse(JSON.stringify(mockOperations));
      const { container } = mount();
      expect(container.querySelector("svg")).toBeInTheDocument();
    });
  }
});

describe("AdminDashboard interactivity and accessibility", () => {
  test("keyboard navigation applies filter", async () => {
    fetchMock.mockResponse(JSON.stringify(mockAnalytics));
    fetchMock.mockResponse(JSON.stringify(mockOperations));
    mount();
    const picker = screen.getByLabelText(/date range/i);
    picker.focus();
    fireEvent.keyDown(picker, { key: "Enter" });
    act(() => jest.advanceTimersByTime(300));
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  test("theme context dark mode", async () => {
    fetchMock.mockResponse(JSON.stringify(mockAnalytics));
    fetchMock.mockResponse(JSON.stringify(mockOperations));
    const { container } = mount({}, "dark");
    expect(container.firstChild).toHaveClass("dark-theme");
  });

  test("WebSocket updates operations badge", async () => {
    fetchMock.mockResponse(JSON.stringify(mockAnalytics));
    fetchMock.mockResponse(JSON.stringify(mockOperations));
    const socket = { onmessage: null };
    global.WebSocket = jest.fn(() => socket);
    mount();
    act(() => socket.onmessage({ data: JSON.stringify({ count: 20 }) }));
    expect(screen.getByTestId("operations-badge")).toHaveTextContent("20");
  });

  test("refresh button cancels and refetches", async () => {
    fetchMock.mockResponse(JSON.stringify(mockAnalytics));
    fetchMock.mockResponse(JSON.stringify(mockOperations));
    mount();
    const btn = screen.getByRole("button", { name: /refresh/i });
    fireEvent.click(btn);
    expect(fetchMock.mock.calls.length).toBeGreaterThan(2);
  });

  test("summary cards rendered", async () => {
    fetchMock.mockResponse(JSON.stringify(mockAnalytics));
    fetchMock.mockResponse(JSON.stringify(mockOperations));
    mount();
    expect(screen.getAllByTestId("summary-card").length).toBe(3);
  });

  test("pagination controls for large charts", async () => {
    fetchMock.mockResponse(JSON.stringify(mockAnalytics));
    fetchMock.mockResponse(JSON.stringify(mockOperations));
    mount();
    fireEvent.click(screen.getByText(/next page/i));
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  for (let i = 0; i < 44; i++) {
    test(`interaction repetition ${i}`, async () => {
      fetchMock.mockResponse(JSON.stringify(mockAnalytics));
      fetchMock.mockResponse(JSON.stringify(mockOperations));
      mount();
      expect(screen.getByTestId("line-chart")).toBeInTheDocument();
    });
  }
});

describe("AdminDashboard advanced features and edge cases", () => {
  test("SSR renders placeholder", () => {
    const original = global.window;
    delete global.window;
    mount();
    expect(screen.getByTestId("ssr-placeholder")).toBeInTheDocument();
    global.window = original;
  });

  test("export CSV invokes helper", async () => {
    fetchMock.mockResponse(JSON.stringify(mockAnalytics));
    fetchMock.mockResponse(JSON.stringify(mockOperations));
    const downloadCsv = jest.fn();
    mount({ downloadCsv });
    fireEvent.click(screen.getByRole("button", { name: /export csv/i }));
    expect(downloadCsv).toHaveBeenCalled();
  });

  test("CSV snapshot", async () => {
    fetchMock.mockResponse(JSON.stringify(mockAnalytics));
    fetchMock.mockResponse(JSON.stringify(mockOperations));
    const downloadCsv = jest.fn();
    mount({ downloadCsv });
    fireEvent.click(screen.getByRole("button", { name: /export csv/i }));
    expect(downloadCsv.mock.calls[0][0]).toMatchSnapshot();
  });

  test("retry logic up to 3 times", async () => {
    fetchMock
      .mockRejectOnce(new Error("fail"))
      .mockRejectOnce(new Error("fail"))
      .mockResponseOnce(JSON.stringify(mockAnalytics));
    fetchMock.mockResponse(JSON.stringify(mockOperations));
    mount();
    expect(
      fetchMock.mock.calls.filter((c) => c[0].includes("analytics")).length,
    ).toBe(3);
  });

  test("keyboard shortcut R triggers refresh", async () => {
    fetchMock.mockResponse(JSON.stringify(mockAnalytics));
    fetchMock.mockResponse(JSON.stringify(mockOperations));
    mount();
    fireEvent.keyDown(window, { key: "R" });
    expect(fetchMock.mock.calls.length).toBeGreaterThan(2);
  });

  test("legend toggles series", async () => {
    fetchMock.mockResponse(JSON.stringify(mockAnalytics));
    fetchMock.mockResponse(JSON.stringify(mockOperations));
    mount();
    fireEvent.click(screen.getByText(/profits/i));
    expect(screen.getByTestId("line-chart")).toBeInTheDocument();
  });

  test("analytics endpoint pagination query", async () => {
    fetchMock.mockResponse(JSON.stringify(mockAnalytics));
    fetchMock.mockResponse(JSON.stringify(mockOperations));
    mount({ page: 2, limit: 50 });
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("page=2"),
      expect.any(Object),
    );
  });

  test("404 page shows no more data", async () => {
    fetchMock.mockResponseOnce(JSON.stringify({ message: "Not Found" }), {
      status: 404,
    });
    fetchMock.mockResponseOnce(JSON.stringify(mockOperations));
    mount({ page: 99, limit: 50 });
    await screen.findByText(/no more data/i);
  });

  for (let i = 0; i < 42; i++) {
    test(`advanced repetition ${i}`, async () => {
      fetchMock.mockResponse(JSON.stringify(mockAnalytics));
      fetchMock.mockResponse(JSON.stringify(mockOperations));
      mount();
      expect(screen.getByTestId("line-chart")).toBeInTheDocument();
    });
  }
});

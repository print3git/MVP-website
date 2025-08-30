/** @jest-environment jsdom */
import {
  computeSlotsByTime,
  computePrintRunHours,
  adjustedSlots,
  updatePrintRunInfo,
} from "../../js/index.js";

describe("print run info", () => {
  let originalStorage;
  beforeEach(() => {
    jest.useFakeTimers();
    originalStorage = window.localStorage;
    document.body.innerHTML = `
      <div id="print-run-info" class="invisible">
        <span id="print-run-slots"></span> print slots left for next
        <span id="print-run-hours"></span>
        <span id="print-run-hours-label"></span>
      </div>`;
    global.fetch = undefined;
    localStorage.clear();
  });
  afterEach(() => {
    jest.useRealTimers();
    Object.defineProperty(window, "localStorage", {
      value: originalStorage,
      configurable: true,
    });
    delete window.positionQuote;
  });

  test("computeSlotsByTime returns expected value for 1AM ET", () => {
    jest.setSystemTime(new Date("2023-01-01T06:00:00Z"));
    expect(computeSlotsByTime()).toBe(9);
  });

  test("computePrintRunHours returns remaining hours in six-hour cycle", () => {
    jest.setSystemTime(new Date("2023-01-01T10:00:00Z"));
    expect(computePrintRunHours()).toBe(1);
  });

  test("adjustedSlots subtracts purchase count", () => {
    localStorage.setItem("slotPurchases", "2");
    expect(adjustedSlots(5)).toBe(3);
  });

  test("updatePrintRunInfo populates slots when fetch fails", async () => {
    jest.setSystemTime(new Date("2023-01-01T06:00:00Z"));
    global.fetch = jest.fn().mockRejectedValue(new Error("net"));
    await updatePrintRunInfo();
    expect(document.getElementById("print-run-slots").textContent).toBe("9");
  });

  test("updatePrintRunInfo uses API slot count", async () => {
    jest.setSystemTime(new Date("2023-01-01T06:00:00Z"));
    global.fetch = jest
      .fn()
      .mockResolvedValue({ ok: true, json: async () => ({ slots: 4 }) });
    await updatePrintRunInfo();
    expect(document.getElementById("print-run-slots").textContent).toBe("4");
  });

  test("updatePrintRunInfo handles singular hour label", async () => {
    jest.setSystemTime(new Date("2023-01-01T16:00:00Z"));
    global.fetch = jest.fn().mockRejectedValue(new Error("net"));
    await updatePrintRunInfo();
    expect(document.getElementById("print-run-hours-label").textContent).toBe(
      "hour",
    );
  });

  test("updatePrintRunInfo survives localStorage errors", async () => {
    jest.setSystemTime(new Date("2023-01-01T06:00:00Z"));
    global.fetch = jest.fn().mockRejectedValue(new Error("net"));
    Object.defineProperty(window, "localStorage", {
      value: {
        getItem: () => {
          throw new Error("denied");
        },
        setItem: () => {
          throw new Error("denied");
        },
      },
      configurable: true,
    });
    await updatePrintRunInfo();
    expect(document.getElementById("print-run-slots").textContent).toBe("9");
  });

  test("updatePrintRunInfo removes invisible and calls positionQuote", async () => {
    jest.setSystemTime(new Date("2023-01-01T06:00:00Z"));
    global.fetch = jest.fn().mockRejectedValue(new Error("net"));
    const info = document.getElementById("print-run-info");
    window.positionQuote = jest.fn();
    await updatePrintRunInfo();
    expect(info.classList.contains("invisible")).toBe(false);
    expect(window.positionQuote).toHaveBeenCalled();
  });
});

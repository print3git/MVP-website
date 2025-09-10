/** @jest-environment jsdom */
import "@testing-library/jest-dom";
import { initDiscountDeliveryBanner } from "../../js/index.js";

describe("Discount/delivery banner", () => {
  let banner;
  let now;
  beforeEach(() => {
    jest.useFakeTimers();
    now = new Date("2024-01-02T12:00:00Z"); // Tuesday
    jest.setSystemTime(now);
    document.body.innerHTML = '<div id="theme-banner"></div>';
    banner = document.getElementById("theme-banner");
    initDiscountDeliveryBanner(banner);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  function advance(ms) {
    now = new Date(now.getTime() + ms);
    jest.setSystemTime(now);
    jest.advanceTimersByTime(ms);
  }

  test("shows discount on init", () => {
    expect(banner.textContent).toBe("24% off when you order 3 prints");
  });

  test("countdown includes phrase", () => {
    advance(7000);
    advance(1000);
    expect(banner.textContent).toContain("left for weekend delivery");
  });

  test("opacity drops before message change", () => {
    advance(7000);
    expect(banner.style.opacity).toBe("0");
  });

  test("countdown message appears after rotation", () => {
    advance(7000);
    advance(1000);
    expect(banner.textContent).toMatch(/left for weekend delivery/);
  });

  test("returns to discount after second rotation", () => {
    advance(7000);
    advance(1000);
    advance(7000);
    expect(banner.style.opacity).toBe("0");
    advance(1000);
    expect(banner.textContent).toBe("24% off when you order 3 prints");
  });

  test("opacity resets after transition", () => {
    advance(7000);
    advance(1000);
    expect(banner.style.opacity).toBe("1");
  });

  test("handles missing banner gracefully", () => {
    expect(() => initDiscountDeliveryBanner(null)).not.toThrow();
  });

  test("shows discount only on weekend", () => {
    jest.useRealTimers();
    jest.useFakeTimers();
    now = new Date("2024-01-06T12:00:00Z"); // Saturday
    jest.setSystemTime(now);
    document.body.innerHTML = '<div id="theme-banner" class="hidden"></div>';
    const weekendBanner = document.getElementById("theme-banner");
    initDiscountDeliveryBanner(weekendBanner);
    expect(weekendBanner.classList.contains("hidden")).toBe(false);
    expect(weekendBanner.textContent).toBe("24% off when you order 3 prints");
    advance(7000);
    advance(1000);
    expect(weekendBanner.textContent).toBe("24% off when you order 3 prints");
  });

  test("countdown updates over time", () => {
    advance(7000);
    advance(1000);
    const first = banner.textContent;
    advance(1000);
    const second = banner.textContent;
    expect(first).not.toBe(second);
  });

  test("banner remains visible during discount", () => {
    expect(banner.classList.contains("hidden")).toBe(false);
  });
});

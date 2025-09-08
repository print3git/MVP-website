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

  test("shows countdown on init", () => {
    expect(banner.textContent).toMatch(/left for weekend delivery/);
  });

  test("countdown includes phrase", () => {
    expect(banner.textContent).toContain("left for weekend delivery");
  });

  test("opacity drops before message change", () => {
    advance(7000);
    expect(banner.style.opacity).toBe("0");
  });

  test("discount message appears after rotation", () => {
    advance(7000);
    advance(1000);
    expect(banner.textContent).toBe("24% off when you order 3 prints");
  });

  test("returns to countdown after second rotation", () => {
    advance(7000);
    advance(1000);
    advance(7000);
    expect(banner.style.opacity).toBe("0");
    advance(1000);
    expect(banner.textContent).toMatch(/left for weekend delivery/);
  });

  test("opacity resets after transition", () => {
    advance(7000);
    advance(1000);
    expect(banner.style.opacity).toBe("1");
  });

  test("handles missing banner gracefully", () => {
    expect(() => initDiscountDeliveryBanner(null)).not.toThrow();
  });

  test("hides banner on weekend", () => {
    jest.useRealTimers();
    jest.useFakeTimers();
    now = new Date("2024-01-06T12:00:00Z"); // Saturday
    jest.setSystemTime(now);
    document.body.innerHTML = '<div id="theme-banner"></div>';
    const weekendBanner = document.getElementById("theme-banner");
    initDiscountDeliveryBanner(weekendBanner);
    expect(weekendBanner.classList.contains("hidden")).toBe(true);
  });

  test("countdown updates over time", () => {
    const first = banner.textContent;
    advance(1000);
    const second = banner.textContent;
    expect(first).not.toBe(second);
  });

  test("banner remains visible during discount", () => {
    advance(7000);
    advance(1000);
    expect(banner.classList.contains("hidden")).toBe(false);
  });
});

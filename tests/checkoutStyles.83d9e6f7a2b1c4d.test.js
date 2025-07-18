/* eslint-disable jsdoc/check-tag-names */
/**
 * @jest-environment jsdom
 */
/* eslint-env browser */
/* global document, getComputedStyle */
const fs = require("fs");
const path = require("path");

test("payment page CSS baseline", () => {
  const html = fs.readFileSync(
    path.join(__dirname, "..", "payment.html"),
    "utf8",
  );
  document.documentElement.innerHTML = html;

  const style = document.createElement("style");
  style.textContent = `
    .font-sans {
      font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji";
    }
    .mb-4 { margin-bottom: 1rem; }
  `;
  document.head.appendChild(style);

  const bodyStyle = getComputedStyle(document.body);
  const heading = document.querySelector("h2");
  const headingStyle = getComputedStyle(heading);
  const summaryStyle = getComputedStyle(document.querySelector("#pay-summary"));

  expect(bodyStyle.fontFamily).toMatch(/ui-sans-serif/);
  // Tailwind's mb-4 class equals 1rem
  expect(headingStyle.marginBottom).toBe("1rem");
  expect(summaryStyle.zIndex).toBe("20");
});

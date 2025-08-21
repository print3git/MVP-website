/* eslint-env browser */
/* eslint-disable jsdoc/check-tag-names */
/* global document, localStorage */
/**
 * @jest-environment jsdom
 */

function loadScript() {
  jest.resetModules();
  require("../../js/signup.js");
}

describe("signup form", () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <form id="signupForm">
        <input id="su-name" />
        <input id="su-email" />
        <input id="su-pass" />
        <div id="error"></div>
      </form>`;
    localStorage.clear();
  });

  test("shows error when fields missing", () => {
    loadScript();
    const form = document.getElementById("signupForm");
    form.dispatchEvent(
      new Event("submit", { bubbles: true, cancelable: true }),
    );
    expect(document.getElementById("error").textContent).toBe(
      "Fields required",
    );
  });

  test("successful signup stores token", async () => {
    loadScript();
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({ json: () => Promise.resolve({ token: "t123" }) })
      .mockResolvedValue({ ok: true, json: () => Promise.resolve({}) });

    document.getElementById("su-name").value = "user";
    document.getElementById("su-email").value = "a@b.com";
    document.getElementById("su-pass").value = "pw";

    const form = document.getElementById("signupForm");
    try {
      form.dispatchEvent(
        new Event("submit", { bubbles: true, cancelable: true }),
      );
    } catch (_e) {
      // ignore navigation not implemented errors
    }
    await Promise.resolve();
    await Promise.resolve();

    expect(localStorage.getItem("token")).toBe("t123");
  });
});

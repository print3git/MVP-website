/** @jest-environment jsdom */
import nock from "nock";

describe("print slots pipeline", () => {
  const base = "https://api.example.test";
  let updatePrintRunInfo;
  let updateWizardSlotCount;
  let computeSlotsByTime;

  beforeEach(async () => {
    jest.useFakeTimers();
    jest.resetModules();
    document.body.innerHTML = `
      <div id="print-run-info" class="invisible">
        <span id="print-run-slots"></span>
        <span id="print-run-hours"></span>
        <span id="print-run-hours-label"></span>
      </div>
      <span id="slot-count"></span>
      <div id="wizard-step-prompt"></div>
      <div id="wizard-step-building"></div>
      <div id="wizard-step-purchase"><span id="wizard-slots" class="hidden"></span></div>
      <model-viewer></model-viewer>
    `;
    window.API_ORIGIN = base;
    ({ updatePrintRunInfo, updateWizardSlotCount, computeSlotsByTime } = await import("../../js/index.js"));
    await import("../../js/wizard.js");
  });

  afterEach(() => {
    jest.useRealTimers();
    expect(nock.isDone()).toBe(true);
    nock.cleanAll();
  });

  test("issues one GET to API_BASE/print-slots", async () => {
    const scope = nock(base).get("/api/print-slots").reply(200, { slots: 3 });
    await updatePrintRunInfo();
    scope.done();
  });

  test("request has no query string", async () => {
    const scope = nock(base).get("/api/print-slots").reply(200, { slots: 4 });
    await updatePrintRunInfo();
    scope.done();
  });

  test("404 leaves fallback value", async () => {
    const fallback = computeSlotsByTime();
    const scope = nock(base).get("/api/print-slots").reply(404);
    await updatePrintRunInfo();
    expect(document.getElementById("print-run-slots").textContent).toBe(`${fallback}`);
    scope.done();
  });

  test("500 leaves fallback value", async () => {
    const fallback = computeSlotsByTime();
    const scope = nock(base).get("/api/print-slots").reply(500);
    await updatePrintRunInfo();
    expect(document.getElementById("print-run-slots").textContent).toBe(`${fallback}`);
    scope.done();
  });

  test("timeout leaves fallback value", async () => {
    const fallback = computeSlotsByTime();
    const scope = nock(base).get("/api/print-slots").delayConnection(100).replyWithError({ code: "ETIMEDOUT" });
    await updatePrintRunInfo();
    expect(document.getElementById("print-run-slots").textContent).toBe(`${fallback}`);
    scope.done();
  });

  test("invalid protocol handled gracefully", async () => {
    jest.resetModules();
    window.API_ORIGIN = "ftp://bad";
    ({ updatePrintRunInfo, computeSlotsByTime } = await import("../../js/index.js"));
    const fallback = computeSlotsByTime();
    await updatePrintRunInfo();
    expect(document.getElementById("print-run-slots").textContent).toBe(`${fallback}`);
  });

  test("missing API_BASE uses fallback", async () => {
    jest.resetModules();
    window.API_ORIGIN = "";
    ({ updatePrintRunInfo, computeSlotsByTime } = await import("../../js/index.js"));
    const fallback = computeSlotsByTime();
    await updatePrintRunInfo();
    expect(document.getElementById("print-run-slots").textContent).toBe(`${fallback}`);
  });

  test("successful fetch populates slot span", async () => {
    const scope = nock(base).get("/api/print-slots").reply(200, { slots: 7 });
    await updatePrintRunInfo();
    expect(document.getElementById("print-run-slots").textContent).toBe("7");
    scope.done();
  });

  test("response parsed once", async () => {
    const spy = jest.spyOn(Response.prototype, "json");
    const scope = nock(base).get("/api/print-slots").reply(200, { slots: 8 });
    await updatePrintRunInfo();
    expect(spy).toHaveBeenCalledTimes(1);
    spy.mockRestore();
    scope.done();
  });

  test("second call updates slot when value changes", async () => {
    let scope = nock(base).get("/api/print-slots").reply(200, { slots: 0 });
    await updatePrintRunInfo();
    scope.done();
    scope = nock(base).get("/api/print-slots").reply(200, { slots: 9 });
    await updatePrintRunInfo();
    expect(document.getElementById("print-run-slots").textContent).toBe("9");
    scope.done();
  });

  test("second call with same value leaves text unchanged", async () => {
    let scope = nock(base).get("/api/print-slots").reply(200, { slots: 5 });
    await updatePrintRunInfo();
    scope.done();
    const before = document.getElementById("print-run-slots").textContent;
    scope = nock(base).get("/api/print-slots").reply(200, { slots: 5 });
    await updatePrintRunInfo();
    expect(document.getElementById("print-run-slots").textContent).toBe(before);
    scope.done();
  });

  test("network failure still yields number", async () => {
    const fallback = computeSlotsByTime();
    const scope = nock(base).get("/api/print-slots").replyWithError("net");
    await updatePrintRunInfo();
    expect(parseInt(document.getElementById("print-run-slots").textContent, 10)).toBe(fallback);
    scope.done();
  });

  test("info loses invisible class", async () => {
    const scope = nock(base).get("/api/print-slots").reply(200, { slots: 4 });
    await updatePrintRunInfo();
    expect(document.getElementById("print-run-info").classList.contains("invisible")).toBe(false);
    scope.done();
  });

  test("wizard and payment show same number", async () => {
    const scope1 = nock(base).get("/api/print-slots").reply(200, { slots: 6 });
    await updatePrintRunInfo();
    scope1.done();
    const scope2 = nock(base).get("/api/print-slots").reply(200, { slots: 6 });
    await updateWizardSlotCount();
    scope2.done();
    document.getElementById("slot-count").textContent = document.getElementById("print-run-slots").textContent;
    expect(document.getElementById("slot-count").textContent).toBe(document.getElementById("wizard-slots").textContent.match(/\d+/)[0]);
  });

  test("wizard slot count only visible in purchase stage", () => {
    localStorage.setItem("wizardStage", "purchase");
    window.updateWizard();
    expect(document.getElementById("wizard-slots").classList.contains("hidden")).toBe(false);
    localStorage.setItem("wizardStage", "prompt");
    window.updateWizard();
    expect(document.getElementById("wizard-slots").classList.contains("hidden")).toBe(true);
  });

  test("removing wizard bars clears slot count", () => {
    window.setWizardSlotCount(5);
    document.getElementById("wizard-step-purchase").remove();
    window.setWizardSlotCount(7);
    expect(document.getElementById("wizard-slots")).toBeNull();
  });

  test("removing model-viewer clears slot count", () => {
    window.setWizardSlotCount(5);
    document.querySelector("model-viewer").remove();
    window.setWizardSlotCount(6);
    expect(document.getElementById("wizard-slots").textContent).toBe("");
  });

  test("deleting print-run-info does not throw", async () => {
    document.getElementById("print-run-info").remove();
    const scope = nock(base).get("/api/print-slots").reply(200, { slots: 2 });
    await expect(updatePrintRunInfo()).resolves.toBeUndefined();
    scope.done();
  });

  test("cross-page displays match", async () => {
    const scope1 = nock(base).get("/api/print-slots").reply(200, { slots: 10 });
    await updatePrintRunInfo();
    scope1.done();
    const scope2 = nock(base).get("/api/print-slots").reply(200, { slots: 10 });
    await updateWizardSlotCount();
    scope2.done();
    document.getElementById("slot-count").textContent = document.getElementById("print-run-slots").textContent;
    const v = document.getElementById("print-run-slots").textContent;
    expect(document.getElementById("slot-count").textContent).toBe(v);
    expect(document.getElementById("wizard-slots").textContent).toMatch(v);
  });

  test("changing API response updates on refresh", async () => {
    let scope = nock(base).get("/api/print-slots").reply(200, { slots: 3 });
    await updatePrintRunInfo();
    scope.done();
    scope = nock(base).get("/api/print-slots").reply(200, { slots: 5 });
    await updatePrintRunInfo();
    expect(document.getElementById("print-run-slots").textContent).toBe("5");
    scope.done();
  });

  test("interval triggers another request after 60s", async () => {
    const scope = nock(base).get("/api/print-slots").twice().reply(200, { slots: 1 });
    updatePrintRunInfo();
    setInterval(updatePrintRunInfo, 60000);
    jest.advanceTimersByTime(60000);
    await Promise.resolve();
    scope.done();
  });
});


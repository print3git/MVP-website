import { adjustedSlots } from "../js/print-slots.js";

describe("index wizard helpers", () => {
  beforeEach(() => {
    jest.resetModules();
  });

  test("updateWizardSlotCount fetches and updates", async () => {
    const fetchFn = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ slots: 10 }),
    });
    global.fetch = fetchFn;
    const setWizardSlotCount = jest.fn();
    global.window = { setWizardSlotCount };
    const { updateWizardSlotCount } = await import("../js/index.js");
    await updateWizardSlotCount();
    expect(setWizardSlotCount).toHaveBeenCalledWith(adjustedSlots(10));
  });

  test("updateWizardFromInputs sets stage", async () => {
    const setWizardStage = jest.fn();
    global.window = { setWizardStage };
    const { updateWizardFromInputs } = await import("../js/index.js");
    updateWizardFromInputs();
    expect(setWizardStage).toHaveBeenCalledWith("prompt");
  });
});

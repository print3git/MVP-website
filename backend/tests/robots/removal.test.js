process.env.ROBOT_API_URL = "http://robot";
process.env.VISION_API_URL = "http://vision";

jest.mock("axios");
const axios = require("axios");

jest.mock("../../db", () => ({
  insertRemovalIncident: jest.fn(),
}));
const db = require("../../db");

const { handlePrintRemoval } = require("../../robots/removal");

beforeEach(() => {
  jest.clearAllMocks();
});

test("retries failed removals and logs incidents", async () => {
  axios.post
    .mockRejectedValueOnce(new Error("fail1"))
    .mockRejectedValueOnce(new Error("fail2"))
    .mockResolvedValueOnce({ data: { success: true } })
    .mockResolvedValueOnce({ data: { pass: true } })
    .mockResolvedValueOnce({});
  const result = await handlePrintRemoval(1, 2);
  expect(result).toBe(true);
  expect(db.insertRemovalIncident).toHaveBeenCalledTimes(2);
  expect(db.insertRemovalIncident).toHaveBeenCalledWith(1, 2, "fail1");
  expect(db.insertRemovalIncident).toHaveBeenCalledWith(1, 2, "fail2");
  expect(axios.post).toHaveBeenCalledWith("http://robot/remove", {
    printerId: 1,
  });
  expect(axios.post).toHaveBeenLastCalledWith("http://robot/conveyor", {
    printerId: 1,
  });
});

test("logs defect when inspection fails", async () => {
  axios.post
    .mockResolvedValueOnce({ data: { success: true } })
    .mockResolvedValueOnce({ data: { pass: false } });
  const ok = await handlePrintRemoval(3, 4);
  expect(ok).toBe(false);
  expect(db.insertRemovalIncident).toHaveBeenCalledWith(3, 4, "defect");
  expect(axios.post).not.toHaveBeenCalledWith(
    "http://robot/conveyor",
    expect.anything(),
  );
});

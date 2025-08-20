import nock from "nock";
import axios from "axios";

describe("network guard", () => {
  test("blocks external requests", async () => {
    await expect(axios.get("https://example.com/")).rejects.toThrow(
      /Nock: Disallowed net connect/,
    );
  });

  test("allows localhost requests", async () => {
    const scope = nock("http://localhost:3000")
      .get("/api/ping")
      .reply(200, { ok: true });

    const res = await axios.get("http://localhost:3000/api/ping");
    expect(res.status).toBe(200);
    expect(res.data).toEqual({ ok: true });
    expect(scope.isDone()).toBe(true);
  });
});

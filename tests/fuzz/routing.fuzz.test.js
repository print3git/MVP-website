const fc = require("fast-check");
const { selectHub } = require("../../backend/utils/routing");

describe("selectHub fuzz", () => {
  test("returns a hub or null", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            id: fc.integer(),
            location: fc.option(fc.string(), { nil: undefined }),
          }),
        ),
        fc.array(fc.record({ id: fc.integer(), hub_id: fc.integer() })),
        fc.array(
          fc.record({
            printer_id: fc.integer(),
            status: fc.string(),
            queue_length: fc.integer({ min: 0, max: 100 }),
            error: fc.option(fc.string(), { nil: undefined }),
          }),
        ),
        fc.option(fc.record({ state: fc.string() }), { nil: undefined }),
        async (hubs, printers, metrics, shipping) => {
          const client = { query: jest.fn() };
          client.query
            .mockResolvedValueOnce({ rows: hubs })
            .mockResolvedValueOnce({ rows: printers })
            .mockResolvedValueOnce({ rows: metrics });
          const hub = await selectHub(client, shipping);
          if (hubs.length === 0) {
            expect(hub).toBeNull();
          } else if (hub) {
            expect(hubs.map((h) => h.id)).toContain(hub.id);
          }
        },
      ),
      { numRuns: 50 },
    );
  });
});

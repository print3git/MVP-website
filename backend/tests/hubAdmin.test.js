process.env.STRIPE_SECRET_KEY = "test";
process.env.STRIPE_WEBHOOK_SECRET = "whsec";
process.env.DB_URL = "postgres://user:pass@localhost/db";
process.env.HUNYUAN_API_KEY = "test";
process.env.HUNYUAN_SERVER_URL = "http://localhost:4000";

jest.mock("../db", () => ({
  query: jest.fn(),
  createPrinterHub: jest.fn(),
  listPrinterHubs: jest.fn(),
  addPrinter: jest.fn(),
  getPrintersByHub: jest.fn(),
  insertHubShipment: jest.fn(),
  updatePrinterHub: jest.fn(),
  getHubShipments: jest.fn(),
}));
const db = require("../db");

const request = require("supertest");
const app = require("../server");

beforeEach(() => {
  jest.clearAllMocks();
});

test("GET /api/admin/hubs requires admin", async () => {
  const res = await request(app).get("/api/admin/hubs");
  expect(res.status).toBe(401);
});

test("GET /api/admin/hubs returns hubs", async () => {
  db.listPrinterHubs.mockResolvedValueOnce([{ id: 1, name: "A" }]);
  db.getPrintersByHub.mockResolvedValueOnce([{ serial: "s1" }]);
  const res = await request(app)
    .get("/api/admin/hubs")
    .set("x-admin-token", "admin");
  expect(res.status).toBe(200);
  expect(res.body[0].printers[0].serial).toBe("s1");
});

test("POST /api/admin/hubs creates hub", async () => {
  db.createPrinterHub.mockResolvedValueOnce({ id: 2 });
  const res = await request(app)
    .post("/api/admin/hubs")
    .set("x-admin-token", "admin")
    .send({ name: "B" });
  expect(res.status).toBe(200);
  expect(db.createPrinterHub).toHaveBeenCalledWith("B", null, null);
});

test("POST /api/admin/hubs/:id/printers adds printer", async () => {
  db.addPrinter.mockResolvedValueOnce({ id: 3 });
  const res = await request(app)
    .post("/api/admin/hubs/2/printers")
    .set("x-admin-token", "admin")
    .send({ serial: "s2" });
  expect(res.status).toBe(200);
  expect(db.addPrinter).toHaveBeenCalledWith("s2", "2");
});

test("POST /api/admin/hubs/:id/shipments records shipment", async () => {
  db.insertHubShipment.mockResolvedValueOnce({ id: 4 });
  const res = await request(app)
    .post("/api/admin/hubs/2/shipments")
    .set("x-admin-token", "admin")
    .send({ carrier: "UPS", trackingNumber: "t1" });
  expect(res.status).toBe(200);
  expect(db.insertHubShipment).toHaveBeenCalledWith("2", "UPS", "t1", null);
});

test("PUT /api/admin/hubs/:id updates hub", async () => {
  db.updatePrinterHub.mockResolvedValueOnce({ id: 2 });
  const res = await request(app)
    .put("/api/admin/hubs/2")
    .set("x-admin-token", "admin")
    .send({ location: "X", operator: "op" });
  expect(res.status).toBe(200);
  expect(db.updatePrinterHub).toHaveBeenCalledWith("2", "X", "op");
});

test("GET /api/admin/hubs/:id/shipments returns shipments", async () => {
  db.getHubShipments.mockResolvedValueOnce([{ id: 5 }]);
  const res = await request(app)
    .get("/api/admin/hubs/2/shipments")
    .set("x-admin-token", "admin");
  expect(res.status).toBe(200);
  expect(db.getHubShipments).toHaveBeenCalledWith("2");
  expect(res.body[0].id).toBe(5);
});

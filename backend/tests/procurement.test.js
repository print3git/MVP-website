const fs = require("fs");
const path = require("path");

jest.mock("../mail", () => ({
  sendMailWithAttachment: jest.fn(),
}));
const { sendMailWithAttachment } = require("../mail");

const {
  generatePurchaseOrderPDF,
  emailVendorApproval,
} = require("../procurement");

const order = {
  vendor: "ACME",
  items: [
    { model: "PrinterPro", quantity: 2 },
    { model: "Maker3000", quantity: 1 },
  ],
};

const outPath = path.join(__dirname, "test_po.pdf");

afterEach(() => {
  if (fs.existsSync(outPath)) fs.unlinkSync(outPath);
  jest.clearAllMocks();
});

test("generatePurchaseOrderPDF creates file", async () => {
  await generatePurchaseOrderPDF(order, outPath);
  const stats = fs.statSync(outPath);
  expect(stats.size).toBeGreaterThan(0);
});

test("emailVendorApproval sends mail with attachment", async () => {
  await emailVendorApproval(order, "vendor@example.com", "Ship to HQ", outPath);
  expect(sendMailWithAttachment).toHaveBeenCalledWith(
    "vendor@example.com",
    "Purchase Order Approval",
    expect.any(String),
    outPath,
  );
});

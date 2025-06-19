const fs = require("fs");
const PDFDocument = require("pdfkit");
const { sendMailWithAttachment } = require("./mail");

async function generatePurchaseOrderPDF(order, outputPath) {
  return new Promise((resolve) => {
    const doc = new PDFDocument();
    const stream = fs.createWriteStream(outputPath);
    doc.pipe(stream);
    doc.fontSize(20).text("Purchase Order", { align: "center" });
    doc.moveDown();
    doc.fontSize(12).text(`Vendor: ${order.vendor}`);
    doc.text(`Date: ${new Date().toLocaleDateString()}`);
    doc.moveDown();
    doc.text("Items:");
    for (const item of order.items) {
      doc.text(`- ${item.model} x${item.quantity}`);
    }
    doc.end();
    stream.on("finish", resolve);
  });
}

async function emailVendorApproval(
  order,
  vendorEmail,
  shippingDetails,
  outputPath,
) {
  await generatePurchaseOrderPDF(order, outputPath);
  const text = `Please approve the purchase order and confirm shipping details:\n${shippingDetails}`;
  await sendMailWithAttachment(
    vendorEmail,
    "Purchase Order Approval",
    text,
    outputPath,
  );
}

module.exports = { generatePurchaseOrderPDF, emailVendorApproval };

const axios = require("axios");
const db = require("../db");

const ROBOT_API_URL = process.env.ROBOT_API_URL || "http://localhost:5005";
const VISION_API_URL = process.env.VISION_API_URL || "http://localhost:5006";

async function removePrint(printerId) {
  const { data } = await axios.post(`${ROBOT_API_URL}/remove`, { printerId });
  return !!(data && data.success);
}

async function inspectPrint(printerId) {
  const { data } = await axios.post(`${VISION_API_URL}/inspect`, { printerId });
  return !!(data && data.pass);
}

async function placeOnConveyor(printerId) {
  await axios.post(`${ROBOT_API_URL}/conveyor`, { printerId });
}

async function handlePrintRemoval(printerId, printJobId, maxAttempts = 3) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const removed = await removePrint(printerId);
      if (!removed) throw new Error("remove failed");
      const pass = await inspectPrint(printerId);
      if (!pass) {
        await db.insertRemovalIncident(printerId, printJobId, "defect");
        return false;
      }
      await placeOnConveyor(printerId);
      return true;
    } catch (err) {
      await db.insertRemovalIncident(printerId, printJobId, err.message);
    }
  }
  return false;
}

module.exports = {
  removePrint,
  inspectPrint,
  placeOnConveyor,
  handlePrintRemoval,
};

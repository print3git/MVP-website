const SHIPPING_API_URL = process.env.SHIPPING_API_URL;
const SHIPPING_API_KEY = process.env.SHIPPING_API_KEY;
const TRACKING_BASE_URL = process.env.TRACKING_BASE_URL || "";
const logger = require("../src/logger");

async function getShippingEstimate(destination, model) {
  const weight = model.weight || 1;

  try {
    if (!SHIPPING_API_URL || !SHIPPING_API_KEY) {
      throw new Error("Shipping API not configured");
    }

    const res = await fetch(SHIPPING_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SHIPPING_API_KEY}`,
      },
      body: JSON.stringify({ destination, weight }),
    });

    if (!res.ok) {
      throw new Error(`API error ${res.status}`);
    }

    const data = await res.json();
    if (typeof data.cost === "number" && typeof data.etaDays === "number") {
      return { cost: data.cost, etaDays: data.etaDays };
    }

    throw new Error("Invalid response");
  } catch (err) {
    logger.error("Shipping API failed, using placeholder", err.message);
    const cost = 5 + weight * 2; // simple placeholder cost calculation
    const etaDays = 7; // placeholder ETA
    return { cost, etaDays };
  }
}

function getTrackingUrl(carrier, trackingNumber) {
  if (TRACKING_BASE_URL) {
    return `${TRACKING_BASE_URL}/${encodeURIComponent(trackingNumber)}`;
  }
  return `https://track.aftership.com/${encodeURIComponent(carrier)}/${encodeURIComponent(trackingNumber)}`;
}

async function getTrackingStatus(carrier, trackingNumber) {
  if (!SHIPPING_API_URL || !SHIPPING_API_KEY) {
    return null;
  }
  try {
    const res = await fetch(
      `${SHIPPING_API_URL}/track?carrier=${encodeURIComponent(carrier)}&tracking=${encodeURIComponent(trackingNumber)}`,
      { headers: { Authorization: `Bearer ${SHIPPING_API_KEY}` } },
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data.status || null;
  } catch (err) {
    logger.error("Tracking status failed", err.message);
    return null;
  }
}

module.exports = { getShippingEstimate, getTrackingUrl, getTrackingStatus };

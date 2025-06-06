const SHIPPING_API_URL = process.env.SHIPPING_API_URL;
const SHIPPING_API_KEY = process.env.SHIPPING_API_KEY;

async function getShippingEstimate(destination, model) {
  const weight = model.weight || 1;

  try {
    if (!SHIPPING_API_URL || !SHIPPING_API_KEY) {
      throw new Error('Shipping API not configured');
    }

    const res = await fetch(SHIPPING_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${SHIPPING_API_KEY}`,
      },
      body: JSON.stringify({ destination, weight }),
    });

    if (!res.ok) {
      throw new Error(`API error ${res.status}`);
    }

    const data = await res.json();
    if (typeof data.cost === 'number' && typeof data.etaDays === 'number') {
      return { cost: data.cost, etaDays: data.etaDays };
    }

    throw new Error('Invalid response');
  } catch (err) {
    console.error('Shipping API failed, using placeholder', err.message);
    const cost = 5 + weight * 2; // simple placeholder cost calculation
    const etaDays = 7; // placeholder ETA
    return { cost, etaDays };
  }
}

module.exports = { getShippingEstimate };

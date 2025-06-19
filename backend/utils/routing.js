const QUEUE_THRESHOLD = parseInt(
  process.env.QUEUE_OVERFLOW_THRESHOLD || "5",
  10,
);

async function selectHub(client, shipping) {
  const { rows: hubs } = await client.query(
    "SELECT id, location FROM printer_hubs ORDER BY id",
  );
  if (!hubs.length) return null;

  const { rows: printers } = await client.query(
    "SELECT id, hub_id FROM printers",
  );
  const { rows: metrics } = await client.query(
    `SELECT DISTINCT ON (printer_id) printer_id, status, queue_length, error
       FROM printer_metrics
       ORDER BY printer_id, created_at DESC`,
  );

  const shippingState =
    shipping && shipping.state ? String(shipping.state).toUpperCase() : null;

  const stats = hubs.map((h) => ({
    hub: h,
    queue: 0,
    printers: 0,
    offline: 0,
  }));
  const printerMap = {};
  printers.forEach((p) => {
    printerMap[p.id] = p.hub_id;
  });

  for (const m of metrics) {
    const hubId = printerMap[m.printer_id];
    const stat = stats.find((s) => s.hub.id === hubId);
    if (!stat) continue;
    stat.queue += m.queue_length || 0;
    stat.printers += 1;
    if (m.status !== "idle" || m.error) stat.offline += 1;
  }

  stats.sort((a, b) => {
    const matchA =
      shippingState &&
      a.hub.location &&
      String(a.hub.location).toUpperCase() === shippingState;
    const matchB =
      shippingState &&
      b.hub.location &&
      String(b.hub.location).toUpperCase() === shippingState;
    if (matchA && !matchB) return -1;
    if (!matchA && matchB) return 1;
    const avgA = a.printers ? a.queue / a.printers : 0;
    const avgB = b.printers ? b.queue / b.printers : 0;
    return avgA - avgB;
  });

  const primary = stats[0];
  const avgQueue = primary.printers ? primary.queue / primary.printers : 0;
  if (avgQueue > QUEUE_THRESHOLD && stats.length > 1) {
    return stats[1].hub;
  }
  return primary.hub;
}

module.exports = { selectHub };

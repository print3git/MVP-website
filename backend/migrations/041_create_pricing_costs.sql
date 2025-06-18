CREATE TABLE IF NOT EXISTS pricing_costs (
  product_type TEXT PRIMARY KEY,
  cost_cents INTEGER NOT NULL
);

INSERT INTO pricing_costs(product_type, cost_cents)
VALUES ('single', 1200), ('multi', 1800), ('premium', 3000)
ON CONFLICT (product_type) DO NOTHING;

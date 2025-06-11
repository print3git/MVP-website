CREATE TABLE IF NOT EXISTS model_commissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id TEXT REFERENCES orders(session_id) ON DELETE CASCADE,
  model_id UUID REFERENCES jobs(job_id) ON DELETE CASCADE,
  seller_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  buyer_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  commission_cents INTEGER NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS model_commissions_seller_idx ON model_commissions(seller_user_id);
CREATE INDEX IF NOT EXISTS model_commissions_buyer_idx ON model_commissions(buyer_user_id);
CREATE INDEX IF NOT EXISTS model_commissions_order_idx ON model_commissions(order_id);

CREATE TRIGGER model_commissions_set_updated
BEFORE UPDATE ON model_commissions
FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

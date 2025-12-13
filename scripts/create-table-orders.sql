-- ============================================
-- TABLE_ORDERS TABLE (Table-Based Ordering)
-- ============================================
-- Stores active orders per table, allowing multiple customers to contribute
CREATE TABLE IF NOT EXISTS table_orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  table_id UUID NOT NULL REFERENCES tables(id) ON DELETE CASCADE,
  area_id UUID REFERENCES areas(id),
  order_status TEXT DEFAULT 'pending', -- pending, processed, closed
  -- Order items: array of {product_id, quantity, price, name, customer_id, customer_token, processed}
  -- processed: boolean - true if this item has been processed by waiter
  order_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  subtotal DECIMAL(10, 2) DEFAULT 0,
  total DECIMAL(10, 2) DEFAULT 0,
  -- Track which customers have contributed
  customer_tokens TEXT[], -- Array of client tokens that have items in this order
  placed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed_at TIMESTAMP WITH TIME ZONE,
  closed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  -- Ensure only one active order per table (pending or processed)
  CONSTRAINT unique_active_table_order UNIQUE (table_id) 
    DEFERRABLE INITIALLY DEFERRED
);

CREATE INDEX idx_table_orders_restaurant_id ON table_orders(restaurant_id);
CREATE INDEX idx_table_orders_table_id ON table_orders(table_id);
CREATE INDEX idx_table_orders_status ON table_orders(restaurant_id, order_status);
CREATE INDEX idx_table_orders_placed_at ON table_orders(restaurant_id, placed_at DESC);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_table_orders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER table_orders_updated_at
  BEFORE UPDATE ON table_orders
  FOR EACH ROW
  EXECUTE FUNCTION update_table_orders_updated_at();


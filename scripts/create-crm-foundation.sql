-- SmartMenu CRM Foundation Tables
-- Phase 1: Customer tracking, table management, and visit history

-- ============================================
-- 1. AREAS TABLE (Restaurant Sections)
-- ============================================
CREATE TABLE IF NOT EXISTS areas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  capacity INTEGER, -- total seats in this area
  table_count INTEGER DEFAULT 0,
  service_type TEXT DEFAULT 'full_service', -- full_service, bar_service, counter
  operating_hours JSONB, -- if different from restaurant hours
  floor_plan_coordinates JSONB, -- for visual layout {x, y, width, height}
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_areas_restaurant_id ON areas(restaurant_id);
CREATE INDEX idx_areas_active ON areas(restaurant_id, is_active) WHERE is_active = true;

-- ============================================
-- 2. TABLES TABLE (Table Management)
-- ============================================
CREATE TABLE IF NOT EXISTS tables (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  area_id UUID NOT NULL REFERENCES areas(id) ON DELETE CASCADE,
  table_number TEXT NOT NULL, -- "5", "A12", "Booth 3"
  table_name TEXT, -- optional friendly name
  capacity INTEGER NOT NULL, -- number of seats
  table_type TEXT DEFAULT '4_top', -- 2_top, 4_top, 6_top, booth, bar_stool, large_party
  status TEXT DEFAULT 'available', -- available, occupied, reserved, cleaning, out_of_service
  qr_code_url TEXT, -- full URL to QR code
  qr_code_path TEXT, -- storage path in Supabase
  floor_plan_x DECIMAL, -- position for visual layout
  floor_plan_y DECIMAL,
  floor_plan_rotation DECIMAL DEFAULT 0, -- rotation angle in degrees
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(restaurant_id, table_number) -- ensure unique table numbers per restaurant
);

CREATE INDEX idx_tables_restaurant_id ON tables(restaurant_id);
CREATE INDEX idx_tables_area_id ON tables(area_id);
CREATE INDEX idx_tables_status ON tables(restaurant_id, status);
CREATE INDEX idx_tables_active ON tables(restaurant_id, is_active) WHERE is_active = true;

-- ============================================
-- 3. CUSTOMERS TABLE (Customer Profiles)
-- ============================================
CREATE TABLE IF NOT EXISTS customers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  anonymous_id UUID DEFAULT gen_random_uuid(), -- unique per restaurant
  client_fingerprint_id TEXT, -- hashed browser fingerprint
  client_token TEXT, -- from localStorage
  -- Optional personal information (can be added by restaurant)
  phone_number TEXT,
  name TEXT,
  email TEXT,
  address TEXT, -- for delivery customers
  notes TEXT, -- staff notes
  tags TEXT[], -- array of tags for segmentation
  -- Tracking fields
  first_seen_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  total_visits INTEGER DEFAULT 0,
  total_spent DECIMAL(10, 2) DEFAULT 0,
  average_order_value DECIMAL(10, 2) DEFAULT 0,
  lifetime_value DECIMAL(10, 2) DEFAULT 0,
  -- Preferences
  preferred_category TEXT,
  preferred_area_id UUID REFERENCES areas(id),
  preferred_table_id UUID REFERENCES tables(id),
  -- Segmentation & Loyalty
  customer_segment TEXT, -- auto-assigned: VIP, Regular, Occasional, Rare, Lost
  loyalty_tier TEXT DEFAULT 'Bronze', -- Bronze, Silver, Gold, Platinum
  loyalty_points INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active', -- active, at-risk, lost
  -- WhatsApp consent
  phone_shared_with_restaurant BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(restaurant_id, anonymous_id)
);

CREATE INDEX idx_customers_restaurant_id ON customers(restaurant_id);
CREATE INDEX idx_customers_anonymous_id ON customers(restaurant_id, anonymous_id);
CREATE INDEX idx_customers_client_token ON customers(client_token) WHERE client_token IS NOT NULL;
CREATE INDEX idx_customers_phone ON customers(phone_number) WHERE phone_number IS NOT NULL;
CREATE INDEX idx_customers_segment ON customers(restaurant_id, customer_segment);
CREATE INDEX idx_customers_status ON customers(restaurant_id, status);
CREATE INDEX idx_customers_last_seen ON customers(restaurant_id, last_seen_at DESC);

-- ============================================
-- 4. CUSTOMER_VISITS TABLE (Visit Tracking)
-- ============================================
CREATE TABLE IF NOT EXISTS customer_visits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  table_id UUID REFERENCES tables(id),
  area_id UUID REFERENCES areas(id),
  visit_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  device_info JSONB, -- {user_agent, screen_resolution, timezone, etc.}
  referrer TEXT, -- where they came from
  session_duration INTEGER, -- seconds
  menu_views INTEGER DEFAULT 0,
  products_viewed JSONB, -- array of product IDs
  order_placed BOOLEAN DEFAULT false,
  order_id UUID, -- link to order if placed
  order_value DECIMAL(10, 2),
  qr_code_type TEXT, -- 'table', 'area', 'general', 'campaign'
  qr_code_campaign TEXT, -- campaign identifier if applicable
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_visits_customer_id ON customer_visits(customer_id);
CREATE INDEX idx_visits_restaurant_id ON customer_visits(restaurant_id);
CREATE INDEX idx_visits_table_id ON customer_visits(table_id) WHERE table_id IS NOT NULL;
CREATE INDEX idx_visits_timestamp ON customer_visits(restaurant_id, visit_timestamp DESC);
CREATE INDEX idx_visits_order_placed ON customer_visits(restaurant_id, order_placed) WHERE order_placed = true;

-- ============================================
-- 5. CUSTOMER_ORDERS TABLE (Order History)
-- ============================================
CREATE TABLE IF NOT EXISTS customer_orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  table_id UUID REFERENCES tables(id),
  area_id UUID REFERENCES areas(id),
  visit_id UUID REFERENCES customer_visits(id),
  order_items JSONB NOT NULL, -- array of {product_id, quantity, price, name}
  subtotal DECIMAL(10, 2) NOT NULL,
  total DECIMAL(10, 2) NOT NULL,
  payment_method TEXT, -- cash, card, whatsapp, etc.
  order_status TEXT DEFAULT 'pending', -- pending, completed, cancelled
  order_type TEXT DEFAULT 'dine_in', -- dine_in, delivery, takeout
  placed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  whatsapp_token TEXT, -- token used for WhatsApp order
  whatsapp_phone TEXT, -- phone number from WhatsApp (if shared)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_orders_customer_id ON customer_orders(customer_id);
CREATE INDEX idx_orders_restaurant_id ON customer_orders(restaurant_id);
CREATE INDEX idx_orders_table_id ON customer_orders(table_id) WHERE table_id IS NOT NULL;
CREATE INDEX idx_orders_status ON customer_orders(restaurant_id, order_status);
CREATE INDEX idx_orders_placed_at ON customer_orders(restaurant_id, placed_at DESC);
CREATE INDEX idx_orders_whatsapp_token ON customer_orders(whatsapp_token) WHERE whatsapp_token IS NOT NULL;

-- ============================================
-- 6. CUSTOMER_EVENTS TABLE (Event Tracking)
-- ============================================
CREATE TABLE IF NOT EXISTS customer_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL, -- menu_view, product_view, add_to_cart, remove_from_cart, order_placed, etc.
  event_data JSONB, -- flexible data structure
  table_id UUID REFERENCES tables(id),
  area_id UUID REFERENCES areas(id),
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_events_customer_id ON customer_events(customer_id) WHERE customer_id IS NOT NULL;
CREATE INDEX idx_events_restaurant_id ON customer_events(restaurant_id);
CREATE INDEX idx_events_type ON customer_events(restaurant_id, event_type);
CREATE INDEX idx_events_timestamp ON customer_events(restaurant_id, timestamp DESC);

-- ============================================
-- 7. WHATSAPP_ORDER_TOKENS TABLE (Order Tokens)
-- ============================================
CREATE TABLE IF NOT EXISTS whatsapp_order_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE, -- short unique token for WhatsApp message
  customer_id UUID REFERENCES customers(id),
  table_id UUID REFERENCES tables(id),
  area_id UUID REFERENCES areas(id),
  order_type TEXT DEFAULT 'dine_in', -- dine_in, delivery
  campaign TEXT, -- campaign identifier for flyers
  order_data JSONB, -- cart items, totals, etc.
  phone_number TEXT, -- phone from WhatsApp (if provided)
  phone_shared BOOLEAN DEFAULT false, -- customer consent to share phone
  status TEXT DEFAULT 'pending', -- pending, received, processed, expired
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '1 hour'), -- tokens expire after 1 hour
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_whatsapp_tokens_token ON whatsapp_order_tokens(token);
CREATE INDEX idx_whatsapp_tokens_restaurant ON whatsapp_order_tokens(restaurant_id, status);
CREATE INDEX idx_whatsapp_tokens_expires ON whatsapp_order_tokens(expires_at) WHERE status = 'pending';

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_order_tokens ENABLE ROW LEVEL SECURITY;

-- Areas: Restaurant owners/admins can manage their areas
CREATE POLICY "Restaurant owners can manage areas" ON areas
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_restaurants ur
      WHERE ur.restaurant_id = areas.restaurant_id
      AND ur.user_id = auth.uid()
      AND ur.role IN ('owner', 'admin')
    )
  );

-- Tables: Restaurant owners/admins can manage their tables
CREATE POLICY "Restaurant owners can manage tables" ON tables
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_restaurants ur
      WHERE ur.restaurant_id = tables.restaurant_id
      AND ur.user_id = auth.uid()
      AND ur.role IN ('owner', 'admin', 'staff')
    )
  );

-- Customers: Restaurant owners/admins can view and update their customers
CREATE POLICY "Restaurant owners can manage customers" ON customers
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_restaurants ur
      WHERE ur.restaurant_id = customers.restaurant_id
      AND ur.user_id = auth.uid()
      AND ur.role IN ('owner', 'admin', 'staff')
    )
  );

-- Customer Visits: Restaurant owners/admins can view visits
CREATE POLICY "Restaurant owners can view visits" ON customer_visits
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_restaurants ur
      WHERE ur.restaurant_id = customer_visits.restaurant_id
      AND ur.user_id = auth.uid()
      AND ur.role IN ('owner', 'admin', 'staff')
    )
  );

-- Allow system to insert visits (for tracking)
CREATE POLICY "System can insert visits" ON customer_visits
  FOR INSERT
  WITH CHECK (true); -- Will be validated in API layer

-- Customer Orders: Restaurant owners/admins can view and update orders
CREATE POLICY "Restaurant owners can manage orders" ON customer_orders
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_restaurants ur
      WHERE ur.restaurant_id = customer_orders.restaurant_id
      AND ur.user_id = auth.uid()
      AND ur.role IN ('owner', 'admin', 'staff')
    )
  );

-- Customer Events: Restaurant owners/admins can view events
CREATE POLICY "Restaurant owners can view events" ON customer_events
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_restaurants ur
      WHERE ur.restaurant_id = customer_events.restaurant_id
      AND ur.user_id = auth.uid()
      AND ur.role IN ('owner', 'admin', 'staff')
    )
  );

-- Allow system to insert events (for tracking)
CREATE POLICY "System can insert events" ON customer_events
  FOR INSERT
  WITH CHECK (true); -- Will be validated in API layer

-- WhatsApp Tokens: Restaurant owners/admins can view their tokens
CREATE POLICY "Restaurant owners can view tokens" ON whatsapp_order_tokens
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_restaurants ur
      WHERE ur.restaurant_id = whatsapp_order_tokens.restaurant_id
      AND ur.user_id = auth.uid()
      AND ur.role IN ('owner', 'admin', 'staff')
    )
  );

-- Allow system to insert/update tokens (for WhatsApp flow)
CREATE POLICY "System can manage tokens" ON whatsapp_order_tokens
  FOR ALL
  WITH CHECK (true); -- Will be validated in API layer

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to update customer stats after order
CREATE OR REPLACE FUNCTION update_customer_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.order_status = 'completed' AND (OLD.order_status IS NULL OR OLD.order_status != 'completed') THEN
    UPDATE customers
    SET
      total_visits = (
        SELECT COUNT(*) FROM customer_visits
        WHERE customer_id = NEW.customer_id AND order_placed = true
      ),
      total_spent = (
        SELECT COALESCE(SUM(total), 0) FROM customer_orders
        WHERE customer_id = NEW.customer_id AND order_status = 'completed'
      ),
      average_order_value = (
        SELECT COALESCE(AVG(total), 0) FROM customer_orders
        WHERE customer_id = NEW.customer_id AND order_status = 'completed'
      ),
      lifetime_value = (
        SELECT COALESCE(SUM(total), 0) FROM customer_orders
        WHERE customer_id = NEW.customer_id AND order_status = 'completed'
      ),
      last_seen_at = NOW(),
      updated_at = NOW()
    WHERE id = NEW.customer_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update customer stats
CREATE TRIGGER trigger_update_customer_stats
  AFTER UPDATE OF order_status ON customer_orders
  FOR EACH ROW
  EXECUTE FUNCTION update_customer_stats();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_areas_updated_at BEFORE UPDATE ON areas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tables_updated_at BEFORE UPDATE ON tables
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to increment area table count
CREATE OR REPLACE FUNCTION increment_area_table_count(area_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE areas
  SET table_count = COALESCE(table_count, 0) + 1
  WHERE id = area_id;
END;
$$ LANGUAGE plpgsql;

-- Function to decrement area table count
CREATE OR REPLACE FUNCTION decrement_area_table_count(area_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE areas
  SET table_count = GREATEST(COALESCE(table_count, 0) - 1, 0)
  WHERE id = area_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- COMMENTS
-- ============================================
COMMENT ON TABLE areas IS 'Restaurant sections/areas (Indoor, Outdoor, Bar, etc.)';
COMMENT ON TABLE tables IS 'Individual tables within restaurant areas';
COMMENT ON TABLE customers IS 'Customer profiles - anonymous-first but enrichable with personal info';
COMMENT ON TABLE customer_visits IS 'Tracks each customer visit to the restaurant';
COMMENT ON TABLE customer_orders IS 'Order history linked to customers';
COMMENT ON TABLE customer_events IS 'Detailed event tracking for analytics';
COMMENT ON TABLE whatsapp_order_tokens IS 'Tokens for WhatsApp order flow';


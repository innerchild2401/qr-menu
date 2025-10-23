-- Create Product Proposals Table
-- This table stores product proposals submitted by staff members for admin approval

CREATE TABLE IF NOT EXISTS product_proposals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  staff_user_id UUID NOT NULL REFERENCES staff_users(id) ON DELETE CASCADE,
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  
  -- Product details
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  image_url TEXT,
  
  -- Recipe details (optional)
  has_recipe BOOLEAN DEFAULT FALSE,
  recipe JSONB,
  
  -- Product attributes
  is_frozen BOOLEAN DEFAULT FALSE,
  is_vegetarian BOOLEAN DEFAULT FALSE,
  is_spicy BOOLEAN DEFAULT FALSE,
  
  -- Approval workflow
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_notes TEXT,
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_product_proposals_staff_user ON product_proposals(staff_user_id);
CREATE INDEX IF NOT EXISTS idx_product_proposals_restaurant ON product_proposals(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_product_proposals_status ON product_proposals(status);
CREATE INDEX IF NOT EXISTS idx_product_proposals_created ON product_proposals(created_at);

-- Add RLS
ALTER TABLE product_proposals ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Staff users can only see their own proposals
CREATE POLICY "product_proposals_staff_own" ON product_proposals
  FOR ALL
  USING (staff_user_id = auth.jwt() ->> 'sub'::text);

-- RLS Policy: Restaurant owners can see all proposals for their restaurant
CREATE POLICY "product_proposals_restaurant_owners" ON product_proposals
  FOR ALL
  USING (
    restaurant_id IN (
      SELECT restaurant_id FROM user_restaurants 
      WHERE user_id = auth.uid()
    )
  );

-- Create trigger for updated_at
CREATE TRIGGER update_product_proposals_updated_at 
    BEFORE UPDATE ON product_proposals 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add comments
COMMENT ON TABLE product_proposals IS 'Stores product proposals submitted by staff for admin approval';
COMMENT ON COLUMN product_proposals.status IS 'Approval status: pending, approved, rejected';
COMMENT ON COLUMN product_proposals.recipe IS 'JSON array of recipe ingredients with quantities and units';

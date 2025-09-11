-- Create Ingredient Costs Table (Manual Cleanup Version)
-- This table stores GPT-calculated costs for ingredients used in recipes

-- Step 1: Manually drop policies if they exist
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'ingredient_costs' AND policyname = 'ingredient_costs_read_all') THEN
        DROP POLICY "ingredient_costs_read_all" ON ingredient_costs;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'ingredient_costs' AND policyname = 'ingredient_costs_service_only') THEN
        DROP POLICY "ingredient_costs_service_only" ON ingredient_costs;
    END IF;
END $$;

-- Step 2: Drop trigger if it exists
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_ingredient_costs_updated_at') THEN
        DROP TRIGGER update_ingredient_costs_updated_at ON ingredient_costs;
    END IF;
END $$;

-- Step 3: Drop table if it exists
DROP TABLE IF EXISTS ingredient_costs CASCADE;

-- Step 4: Create the table
CREATE TABLE ingredient_costs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ingredient_name TEXT NOT NULL,
  language VARCHAR(2) NOT NULL DEFAULT 'ro', -- 'ro' or 'en'
  cost_per_unit DECIMAL(10,4) NOT NULL, -- Cost per unit (e.g., per kg, per liter)
  unit TEXT NOT NULL, -- Unit of measurement (kg, liter, piece, etc.)
  currency VARCHAR(3) DEFAULT 'RON', -- Currency code
  confidence_score DECIMAL(3,2) DEFAULT 0.8, -- AI confidence in the cost estimate
  reasoning TEXT, -- AI reasoning for the cost estimate
  source VARCHAR(50) DEFAULT 'gpt-4o-mini', -- Source of the cost data
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure uniqueness per ingredient name and language
  UNIQUE(ingredient_name, language)
);

-- Step 5: Add indexes for fast lookup
CREATE INDEX idx_ingredient_costs_name_lang ON ingredient_costs(ingredient_name, language);
CREATE INDEX idx_ingredient_costs_created ON ingredient_costs(created_at);
CREATE INDEX idx_ingredient_costs_confidence ON ingredient_costs(confidence_score);

-- Step 6: Add RLS
ALTER TABLE ingredient_costs ENABLE ROW LEVEL SECURITY;

-- Step 7: Create policies
CREATE POLICY "ingredient_costs_read_all" ON ingredient_costs
  FOR SELECT
  USING (true);

CREATE POLICY "ingredient_costs_service_only" ON ingredient_costs
  FOR ALL
  USING (false);

-- Step 8: Create trigger for updated_at
CREATE TRIGGER update_ingredient_costs_updated_at 
    BEFORE UPDATE ON ingredient_costs 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Step 9: Add comments
COMMENT ON TABLE ingredient_costs IS 'Stores GPT-calculated costs for ingredients used in product recipes';
COMMENT ON COLUMN ingredient_costs.cost_per_unit IS 'Cost per unit of measurement (e.g., per kg, per liter)';
COMMENT ON COLUMN ingredient_costs.confidence_score IS 'AI confidence in the cost estimate (0.0 to 1.0)';
COMMENT ON COLUMN ingredient_costs.reasoning IS 'AI reasoning for the cost estimate';

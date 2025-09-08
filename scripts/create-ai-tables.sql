-- Add AI Integration Tables to SmartMenu
-- This script creates tables for caching AI-generated data

-- =============================================================================
-- 1. INGREDIENTS CACHE TABLE
-- =============================================================================
-- Cache nutritional values for individual ingredients
CREATE TABLE IF NOT EXISTS ingredients_cache (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  language VARCHAR(2) NOT NULL DEFAULT 'ro', -- 'ro' or 'en'
  calories_per_100g INTEGER,
  protein_per_100g DECIMAL(5,2),
  carbs_per_100g DECIMAL(5,2),
  fat_per_100g DECIMAL(5,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure uniqueness per ingredient name and language
  UNIQUE(name, language)
);

-- Add indexes for fast lookup
CREATE INDEX IF NOT EXISTS idx_ingredients_cache_name_lang ON ingredients_cache(name, language);
CREATE INDEX IF NOT EXISTS idx_ingredients_cache_created ON ingredients_cache(created_at);

-- =============================================================================
-- 2. ALLERGENS TABLE
-- =============================================================================
-- Romanian ANPC allergen codes and descriptions
CREATE TABLE IF NOT EXISTS allergens (
  code VARCHAR(10) PRIMARY KEY, -- A1, A2, A3, etc.
  name_ro TEXT NOT NULL,
  name_en TEXT NOT NULL,
  description_ro TEXT,
  description_en TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert Romanian ANPC allergen data
INSERT INTO allergens (code, name_ro, name_en, description_ro, description_en) VALUES
('A1', 'Cereale care conțin gluten', 'Cereals containing gluten', 'Grâu, secară, orz, ovăz, spelta', 'Wheat, rye, barley, oats, spelt'),
('A2', 'Crustacee', 'Crustaceans', 'Raci, creveți, crabi', 'Prawns, crabs, lobster, crayfish'),
('A3', 'Ouă', 'Eggs', 'Ouă și produse care conțin ouă', 'Eggs and products containing eggs'),
('A4', 'Pește', 'Fish', 'Pește și produse care conțin pește', 'Fish and products containing fish'),
('A5', 'Arahide', 'Peanuts', 'Arahide și produse care conțin arahide', 'Peanuts and products containing peanuts'),
('A6', 'Soia', 'Soya', 'Soia și produse care conțin soia', 'Soya and products containing soya'),
('A7', 'Lapte', 'Milk', 'Lapte și produse lactate', 'Milk and dairy products including lactose'),
('A8', 'Fructe cu coajă', 'Nuts', 'Migdale, alune, nuci, castane', 'Almonds, hazelnuts, walnuts, cashews, pecans, Brazil nuts, pistachios, macadamia nuts'),
('A9', 'Țelină', 'Celery', 'Țelină și produse care conțin țelină', 'Celery and products containing celery'),
('A10', 'Muștar', 'Mustard', 'Muștar și produse care conțin muștar', 'Mustard and products containing mustard'),
('A11', 'Susan', 'Sesame', 'Semințe de susan și produse care conțin susan', 'Sesame seeds and products containing sesame'),
('A12', 'Dioxid de sulf', 'Sulphur dioxide', 'Sulfiți în concentrații de peste 10 mg/kg', 'Sulphur dioxide and sulphites at concentrations of more than 10 mg/kg'),
('A13', 'Lupin', 'Lupin', 'Lupin și produse care conțin lupin', 'Lupin and products containing lupin'),
('A14', 'Moluște', 'Molluscs', 'Scoici, melci, sepie', 'Mussels, snails, squid, octopus')
ON CONFLICT (code) DO NOTHING;

-- =============================================================================
-- 3. GPT LOGS TABLE
-- =============================================================================
-- Log all GPT API calls for monitoring and debugging
CREATE TABLE IF NOT EXISTS gpt_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  request_type VARCHAR(50) NOT NULL, -- 'product_description', 'ingredient_nutrition'
  input_data JSONB NOT NULL, -- The input sent to GPT
  response_data JSONB, -- The response from GPT (null if error)
  error_message TEXT, -- Error message if request failed
  tokens_used INTEGER, -- Number of tokens used
  cost_estimate DECIMAL(8,4), -- Estimated cost in USD
  processing_time_ms INTEGER, -- Time taken to process
  model_used VARCHAR(50) DEFAULT 'gpt-4o-mini',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE
);

-- Add indexes for monitoring and analytics
CREATE INDEX IF NOT EXISTS idx_gpt_logs_restaurant ON gpt_logs(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_gpt_logs_type ON gpt_logs(request_type);
CREATE INDEX IF NOT EXISTS idx_gpt_logs_created ON gpt_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_gpt_logs_error ON gpt_logs(error_message) WHERE error_message IS NOT NULL;

-- =============================================================================
-- 4. UPDATE PRODUCTS TABLE
-- =============================================================================
-- Add new fields to products table for AI-generated data
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS generated_description TEXT,
ADD COLUMN IF NOT EXISTS manual_language_override VARCHAR(2),
ADD COLUMN IF NOT EXISTS recipe JSONB,
ADD COLUMN IF NOT EXISTS allergens TEXT[],
ADD COLUMN IF NOT EXISTS ai_generated_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS ai_last_updated TIMESTAMP WITH TIME ZONE;

-- Add indexes for AI fields
CREATE INDEX IF NOT EXISTS idx_products_generated_desc ON products(generated_description) WHERE generated_description IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_products_language_override ON products(manual_language_override) WHERE manual_language_override IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_products_ai_generated ON products(ai_generated_at) WHERE ai_generated_at IS NOT NULL;

-- =============================================================================
-- 5. ROW LEVEL SECURITY (RLS)
-- =============================================================================
-- Enable RLS on new tables
ALTER TABLE ingredients_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE gpt_logs ENABLE ROW LEVEL SECURITY;
-- allergens table is public (no RLS needed)

-- RLS Policies for ingredients_cache (global cache, readable by all)
CREATE POLICY "ingredients_cache_read_all" ON ingredients_cache
  FOR SELECT
  USING (true);

-- Only service role can insert/update ingredients cache
CREATE POLICY "ingredients_cache_service_only" ON ingredients_cache
  FOR ALL
  USING (false); -- This ensures only service role can modify

-- RLS Policies for gpt_logs (restaurant-specific)
CREATE POLICY "gpt_logs_own_restaurant" ON gpt_logs
  FOR ALL
  USING (restaurant_id IN (
    SELECT id FROM restaurants WHERE auth.uid() IN (
      SELECT user_id FROM user_restaurants WHERE restaurant_id = restaurants.id
    )
  ));

-- =============================================================================
-- 6. FUNCTIONS
-- =============================================================================
-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for ingredients_cache
CREATE TRIGGER update_ingredients_cache_updated_at 
    BEFORE UPDATE ON ingredients_cache 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to check if a product name suggests a bottled drink
CREATE OR REPLACE FUNCTION is_bottled_drink(product_name TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    -- Check for common bottled drink patterns (case insensitive)
    RETURN (
        LOWER(product_name) ~ '(pepsi|coca|cola|coke|fanta|sprite|7up|mirinda)' OR
        LOWER(product_name) ~ '(beer|bere|heineken|corona|stella|budweiser)' OR
        LOWER(product_name) ~ '(water|apa|evian|perrier|san pellegrino)' OR
        LOWER(product_name) ~ '(wine|vin|prosecco|champagne)' OR
        LOWER(product_name) ~ '(juice|suc|tropicana|innocent)' OR
        LOWER(product_name) ~ '(energy|red bull|monster|burn)'
    );
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE ingredients_cache IS 'Cache for nutritional values of individual ingredients';
COMMENT ON TABLE allergens IS 'Romanian ANPC allergen codes and descriptions';
COMMENT ON TABLE gpt_logs IS 'Log of all GPT API calls for monitoring and cost tracking';
COMMENT ON FUNCTION is_bottled_drink(TEXT) IS 'Checks if a product name suggests a bottled drink (skip AI generation)';

-- =============================================================================
-- END OF MIGRATION
-- =============================================================================

-- Add Currency and Language Support to SmartMenu
-- Run this in your Supabase SQL Editor

-- 1. Add currency and language columns to restaurants table
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'RON' CHECK (currency IN ('RON', 'EUR', 'USD', 'GBP'));
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS nutrition_language TEXT DEFAULT 'EN' CHECK (nutrition_language IN ('EN', 'RO', 'FR', 'DE', 'ES'));

-- 2. Create index for currency lookups
CREATE INDEX IF NOT EXISTS idx_restaurants_currency ON restaurants(currency);
CREATE INDEX IF NOT EXISTS idx_restaurants_nutrition_language ON restaurants(nutrition_language);

-- 3. Update existing restaurants to have default values
UPDATE restaurants SET currency = 'RON' WHERE currency IS NULL;
UPDATE restaurants SET nutrition_language = 'EN' WHERE nutrition_language IS NULL;

-- 4. Add comment to document the new columns
COMMENT ON COLUMN restaurants.currency IS 'Currency for menu prices: RON, EUR, USD, GBP';
COMMENT ON COLUMN restaurants.nutrition_language IS 'Language for nutritional values: EN, RO, FR, DE, ES';

-- 5. Verify the changes
SELECT 
  id, 
  name, 
  currency, 
  nutrition_language 
FROM restaurants;

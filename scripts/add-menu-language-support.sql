-- Add Menu Language Support to SmartMenu
-- Run this in your Supabase SQL Editor

-- 1. Add menu language column to restaurants table
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS menu_language TEXT DEFAULT 'ro' CHECK (menu_language IN ('ro', 'en'));

-- 2. Create index for menu language lookups
CREATE INDEX IF NOT EXISTS idx_restaurants_menu_language ON restaurants(menu_language);

-- 3. Update existing restaurants to have default values
UPDATE restaurants SET menu_language = 'ro' WHERE menu_language IS NULL;

-- 4. Add comment to document the new column
COMMENT ON COLUMN restaurants.menu_language IS 'Language for AI-generated menu descriptions: ro (Romanian), en (English)';

-- 5. Verify the changes
SELECT 
  id, 
  name, 
  currency, 
  nutrition_language,
  menu_language 
FROM restaurants;

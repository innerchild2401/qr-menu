-- Add Product Flags to SmartMenu
-- Run this in your Supabase SQL Editor

-- 1. Add three new boolean columns to products table
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_frozen BOOLEAN DEFAULT FALSE;
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_vegetarian BOOLEAN DEFAULT FALSE;
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_spicy BOOLEAN DEFAULT FALSE;

-- 2. Create indexes for efficient filtering
CREATE INDEX IF NOT EXISTS idx_products_is_frozen ON products(is_frozen);
CREATE INDEX IF NOT EXISTS idx_products_is_vegetarian ON products(is_vegetarian);
CREATE INDEX IF NOT EXISTS idx_products_is_spicy ON products(is_spicy);

-- 3. Update existing products to have default values (false)
UPDATE products SET is_frozen = FALSE WHERE is_frozen IS NULL;
UPDATE products SET is_vegetarian = FALSE WHERE is_vegetarian IS NULL;
UPDATE products SET is_spicy = FALSE WHERE is_spicy IS NULL;

-- 4. Add comments to document the new columns
COMMENT ON COLUMN products.is_frozen IS 'Indicates if the product comes from frozen ingredients';
COMMENT ON COLUMN products.is_vegetarian IS 'Indicates if the product is vegetarian';
COMMENT ON COLUMN products.is_spicy IS 'Indicates if the product is spicy';

-- 5. Verify the changes
SELECT 
  id, 
  name, 
  is_frozen, 
  is_vegetarian, 
  is_spicy 
FROM products 
LIMIT 5;

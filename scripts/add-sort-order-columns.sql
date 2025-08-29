-- Add missing columns for menu management functionality
-- Run this in your Supabase SQL Editor

-- Add sort_order column to products table
ALTER TABLE products ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

-- Add available column to products table
ALTER TABLE products ADD COLUMN IF NOT EXISTS available BOOLEAN DEFAULT true;

-- Add sort_order column to categories table
ALTER TABLE categories ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

-- Update existing products to have a default sort_order based on their ID
UPDATE products 
SET sort_order = id::integer 
WHERE sort_order IS NULL OR sort_order = 0;

-- Update existing products to be available by default
UPDATE products 
SET available = true 
WHERE available IS NULL;

-- Update existing categories to have a default sort_order based on their ID
UPDATE categories 
SET sort_order = id::integer 
WHERE sort_order IS NULL OR sort_order = 0;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_products_restaurant_sort ON products(restaurant_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_products_available ON products(restaurant_id, available);
CREATE INDEX IF NOT EXISTS idx_categories_restaurant_sort ON categories(restaurant_id, sort_order);

-- Add comments for documentation
COMMENT ON COLUMN products.sort_order IS 'Order in which products should be displayed within their category';
COMMENT ON COLUMN products.available IS 'Whether the product is available for ordering';
COMMENT ON COLUMN categories.sort_order IS 'Order in which categories should be displayed in the menu';

-- Verify the changes
SELECT 
  'products' as table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'products' 
  AND column_name IN ('sort_order', 'available')
UNION ALL
SELECT 
  'categories' as table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'categories' 
  AND column_name = 'sort_order';

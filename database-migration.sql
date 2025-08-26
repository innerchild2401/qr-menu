-- Database Migration Script
-- Add missing columns for proper menu functionality

-- Add sort_order column to categories table
ALTER TABLE categories 
ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

-- Add created_at column to categories table if it doesn't exist
ALTER TABLE categories 
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Add available column to products table
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS available BOOLEAN DEFAULT true;

-- Add sort_order column to products table
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

-- Add created_at column to products table if it doesn't exist
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Update existing categories to have a default sort_order based on their ID
UPDATE categories 
SET sort_order = id::integer 
WHERE sort_order IS NULL OR sort_order = 0;

-- Update existing products to be available by default
UPDATE products 
SET available = true 
WHERE available IS NULL;

-- Update existing products to have a default sort_order based on their ID
UPDATE products 
SET sort_order = id::integer 
WHERE sort_order IS NULL OR sort_order = 0;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_categories_restaurant_sort ON categories(restaurant_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_products_restaurant_available ON products(restaurant_id, available);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);

-- Add comments for documentation
COMMENT ON COLUMN categories.sort_order IS 'Order in which categories should be displayed in the menu';
COMMENT ON COLUMN categories.created_at IS 'Timestamp when the category was created';
COMMENT ON COLUMN products.available IS 'Whether the product is available for ordering';
COMMENT ON COLUMN products.sort_order IS 'Order in which products should be displayed within their category';
COMMENT ON COLUMN products.created_at IS 'Timestamp when the product was created';

-- Simple SQL script to add has_recipe column to products table
-- Copy and paste this into your Supabase SQL editor

-- Add the has_recipe column
ALTER TABLE products 
ADD COLUMN has_recipe BOOLEAN DEFAULT FALSE;

-- Update existing products based on recipe content
-- Products with existing recipes will be marked as having recipes
UPDATE products 
SET has_recipe = TRUE 
WHERE recipe IS NOT NULL 
AND jsonb_array_length(recipe) > 0;

-- Create an index for better performance
CREATE INDEX IF NOT EXISTS idx_products_has_recipe ON products(has_recipe);

-- Verify the changes
SELECT 
  COUNT(*) as total_products,
  COUNT(CASE WHEN has_recipe = TRUE THEN 1 END) as products_with_recipes,
  COUNT(CASE WHEN has_recipe = FALSE THEN 1 END) as products_without_recipes
FROM products;

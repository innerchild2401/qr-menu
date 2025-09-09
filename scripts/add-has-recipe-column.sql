-- Add has_recipe column to products table
-- This column indicates whether a product has a recipe for AI generation

ALTER TABLE products 
ADD COLUMN has_recipe BOOLEAN DEFAULT NULL;

-- Add a comment to explain the column
COMMENT ON COLUMN products.has_recipe IS 'Indicates if the product has a recipe for AI description generation. NULL means not set, TRUE means has recipe, FALSE means no recipe.';

-- Create an index for better query performance
CREATE INDEX idx_products_has_recipe ON products(has_recipe);

-- Optional: Update existing products based on some criteria
-- For example, if products with certain categories should have recipes by default
-- UPDATE products 
-- SET has_recipe = TRUE 
-- WHERE category_id IN (SELECT id FROM categories WHERE name IN ('Main Courses', 'Desserts', 'Beverages'));

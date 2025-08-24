-- Update demo data to fix column name issues and ensure prices are correct
-- This script should be run in your Supabase SQL editor

-- First, let's check what data currently exists
SELECT * FROM products WHERE restaurant_id = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';

-- Clear existing demo products and re-insert with correct schema
DELETE FROM products WHERE restaurant_id = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';

-- Insert demo products with correct column names
INSERT INTO products (restaurant_id, category_id, name, description, price, image_url, nutrition) VALUES
('f47ac10b-58cc-4372-a567-0e02b2c3d479', 'c2', 'Grilled Salmon', 'Fresh Atlantic salmon with herbs', 28.99, '/uploads/product-images/demo/1703123456791_grilled_salmon.webp', '{"calories": 350, "protein": "35g", "carbs": "5g", "fat": "18g"}'::jsonb),
('f47ac10b-58cc-4372-a567-0e02b2c3d479', 'c2', 'Truffle Pasta', 'Handmade pasta with truffle oil', 24.99, '/uploads/product-images/demo/1703123456792_truffle_pasta.webp', '{"calories": 480, "protein": "12g", "carbs": "65g", "fat": "18g"}'::jsonb),
('f47ac10b-58cc-4372-a567-0e02b2c3d479', 'c2', 'Wagyu Burger', 'Premium wagyu beef burger', 32.99, '/uploads/product-images/demo/1703123456793_wagyu_burger.webp', '{"calories": 620, "protein": "28g", "carbs": "45g", "fat": "35g"}'::jsonb);

-- Verify the data was inserted correctly
SELECT id, name, price, image_url FROM products WHERE restaurant_id = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';

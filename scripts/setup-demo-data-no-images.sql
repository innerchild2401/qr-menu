-- Demo data setup without images (so prices show up)
-- Run this in your Supabase SQL editor

-- Clear existing demo data
DELETE FROM products WHERE restaurant_id = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
DELETE FROM categories WHERE restaurant_id = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';

-- Insert demo categories
INSERT INTO categories (id, restaurant_id, name) VALUES
('c1', 'f47ac10b-58cc-4372-a567-0e02b2c3d479', 'Appetizers'),
('c2', 'f47ac10b-58cc-4372-a567-0e02b2c3d479', 'Main Courses'),
('c3', 'f47ac10b-58cc-4372-a567-0e02b2c3d479', 'Desserts'),
('c4', 'f47ac10b-58cc-4372-a567-0e02b2c3d479', 'Beverages');

-- Insert demo products WITHOUT images (so prices show up)
INSERT INTO products (restaurant_id, category_id, name, description, price, nutrition) VALUES
('f47ac10b-58cc-4372-a567-0e02b2c3d479', 'c1', 'Bruschetta', 'Toasted bread topped with tomatoes, garlic, and fresh basil', 12.99, '{"calories": 180, "protein": "4g", "carbs": "25g", "fat": "8g"}'::jsonb),
('f47ac10b-58cc-4372-a567-0e02b2c3d479', 'c2', 'Grilled Salmon', 'Fresh Atlantic salmon with herbs', 28.99, '{"calories": 350, "protein": "35g", "carbs": "5g", "fat": "18g"}'::jsonb),
('f47ac10b-58cc-4372-a567-0e02b2c3d479', 'c2', 'Truffle Pasta', 'Handmade pasta with truffle oil', 24.99, '{"calories": 480, "protein": "12g", "carbs": "65g", "fat": "18g"}'::jsonb),
('f47ac10b-58cc-4372-a567-0e02b2c3d479', 'c2', 'Wagyu Burger', 'Premium wagyu beef burger', 32.99, '{"calories": 620, "protein": "28g", "carbs": "45g", "fat": "35g"}'::jsonb),
('f47ac10b-58cc-4372-a567-0e02b2c3d479', 'c3', 'Chocolate Soufflé', 'Warm chocolate soufflé with vanilla ice cream', 14.99, '{"calories": 320, "protein": "6g", "carbs": "45g", "fat": "15g"}'::jsonb),
('f47ac10b-58cc-4372-a567-0e02b2c3d479', 'c4', 'Craft Cocktail', 'House-made cocktail with premium spirits', 16.99, '{"calories": 180, "protein": "0g", "carbs": "8g", "fat": "0g"}'::jsonb);

-- Verify the data
SELECT 'Categories:' as info;
SELECT name FROM categories WHERE restaurant_id = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';

SELECT 'Products:' as info;
SELECT name, price, image_url FROM products WHERE restaurant_id = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';

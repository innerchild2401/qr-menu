-- Test script to verify ingredient_costs table structure
-- Run this in Supabase SQL editor to check if everything is correct

-- 1. Check if table exists and show structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'ingredient_costs' 
ORDER BY ordinal_position;

-- 2. Check if indexes exist
SELECT 
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename = 'ingredient_costs';

-- 3. Check if policies exist
SELECT 
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE tablename = 'ingredient_costs';

-- 4. Check if trigger exists
SELECT 
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'ingredient_costs';

-- 5. Test insert (should work with service role)
INSERT INTO ingredient_costs (
    ingredient_name, 
    language, 
    cost_per_unit, 
    unit, 
    currency, 
    confidence_score, 
    reasoning
) VALUES (
    'test_ingredient', 
    'ro', 
    15.50, 
    'kg', 
    'RON', 
    0.85, 
    'Test ingredient for verification'
);

-- 6. Test select (should work)
SELECT * FROM ingredient_costs WHERE ingredient_name = 'test_ingredient';

-- 7. Clean up test data
DELETE FROM ingredient_costs WHERE ingredient_name = 'test_ingredient';

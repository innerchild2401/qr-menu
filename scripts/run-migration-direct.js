const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:');
  console.error('   - NEXT_PUBLIC_SUPABASE_URL');
  console.error('   - SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  try {
    console.log('🚀 Starting database migration...');
    
    // First, let's check the current schema
    console.log('🔍 Checking current database schema...');
    
    // Check if sort_order column exists in products table
    const { data: productsData, error: productsError } = await supabase
      .from('products')
      .select('*')
      .limit(1);
    
    if (productsError) {
      console.error('❌ Error checking products table:', productsError);
      return;
    }
    
    console.log('📊 Current products table columns:', Object.keys(productsData[0] || {}));
    
    // Check if sort_order column exists in categories table
    const { data: categoriesData, error: categoriesError } = await supabase
      .from('categories')
      .select('*')
      .limit(1);
    
    if (categoriesError) {
      console.error('❌ Error checking categories table:', categoriesError);
      return;
    }
    
    console.log('📊 Current categories table columns:', Object.keys(categoriesData[0] || {}));
    
    console.log('');
    console.log('⚠️  Since we cannot run ALTER TABLE statements through the Supabase client,');
    console.log('   you need to run the migration manually in the Supabase SQL Editor.');
    console.log('');
    console.log('📋 Steps to complete the migration:');
    console.log('');
    console.log('1. Go to your Supabase dashboard');
    console.log('2. Navigate to the SQL Editor');
    console.log('3. Copy and paste the following SQL:');
    console.log('');
    console.log('```sql');
    console.log('-- Add missing columns for menu management functionality');
    console.log('');
    console.log('-- Add sort_order column to products table');
    console.log('ALTER TABLE products ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;');
    console.log('');
    console.log('-- Add available column to products table');
    console.log('ALTER TABLE products ADD COLUMN IF NOT EXISTS available BOOLEAN DEFAULT true;');
    console.log('');
    console.log('-- Add sort_order column to categories table');
    console.log('ALTER TABLE categories ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;');
    console.log('');
    console.log('-- Update existing products to have a default sort_order based on their ID');
    console.log('UPDATE products SET sort_order = id::integer WHERE sort_order IS NULL OR sort_order = 0;');
    console.log('');
    console.log('-- Update existing products to be available by default');
    console.log('UPDATE products SET available = true WHERE available IS NULL;');
    console.log('');
    console.log('-- Update existing categories to have a default sort_order based on their ID');
    console.log('UPDATE categories SET sort_order = id::integer WHERE sort_order IS NULL OR sort_order = 0;');
    console.log('');
    console.log('-- Create indexes for better performance');
    console.log('CREATE INDEX IF NOT EXISTS idx_products_restaurant_sort ON products(restaurant_id, sort_order);');
    console.log('CREATE INDEX IF NOT EXISTS idx_products_available ON products(restaurant_id, available);');
    console.log('CREATE INDEX IF NOT EXISTS idx_categories_restaurant_sort ON categories(restaurant_id, sort_order);');
    console.log('');
    console.log('-- Add comments for documentation');
    console.log("COMMENT ON COLUMN products.sort_order IS 'Order in which products should be displayed within their category';");
    console.log("COMMENT ON COLUMN products.available IS 'Whether the product is available for ordering';");
    console.log("COMMENT ON COLUMN categories.sort_order IS 'Order in which categories should be displayed in the menu';");
    console.log('```');
    console.log('');
    console.log('4. Click "Run" to execute the migration');
    console.log('5. After the migration completes, test the product reordering functionality');
    console.log('');
    console.log('🎯 The migration will add the missing columns needed for product reordering to work!');
    
  } catch (error) {
    console.error('❌ Migration check failed:', error);
    process.exit(1);
  }
}

runMigration();

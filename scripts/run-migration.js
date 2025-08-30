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
    
    // Add sort_order column to products table
    console.log('📝 Adding sort_order column to products table...');
    const { error: productsSortOrderError } = await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE products ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;'
    });
    
    if (productsSortOrderError) {
      console.error('❌ Error adding sort_order to products:', productsSortOrderError);
    } else {
      console.log('✅ Added sort_order column to products table');
    }

    // Add available column to products table
    console.log('📝 Adding available column to products table...');
    const { error: productsAvailableError } = await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE products ADD COLUMN IF NOT EXISTS available BOOLEAN DEFAULT true;'
    });
    
    if (productsAvailableError) {
      console.error('❌ Error adding available to products:', productsAvailableError);
    } else {
      console.log('✅ Added available column to products table');
    }

    // Add sort_order column to categories table
    console.log('📝 Adding sort_order column to categories table...');
    const { error: categoriesSortOrderError } = await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE categories ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;'
    });
    
    if (categoriesSortOrderError) {
      console.error('❌ Error adding sort_order to categories:', categoriesSortOrderError);
    } else {
      console.log('✅ Added sort_order column to categories table');
    }

    // Update existing products to have a default sort_order
    console.log('📝 Updating existing products with default sort_order...');
    const { error: updateProductsError } = await supabase.rpc('exec_sql', {
      sql: "UPDATE products SET sort_order = id::integer WHERE sort_order IS NULL OR sort_order = 0;"
    });
    
    if (updateProductsError) {
      console.error('❌ Error updating products sort_order:', updateProductsError);
    } else {
      console.log('✅ Updated existing products with default sort_order');
    }

    // Update existing products to be available by default
    console.log('📝 Updating existing products to be available...');
    const { error: updateAvailableError } = await supabase.rpc('exec_sql', {
      sql: 'UPDATE products SET available = true WHERE available IS NULL;'
    });
    
    if (updateAvailableError) {
      console.error('❌ Error updating products available status:', updateAvailableError);
    } else {
      console.log('✅ Updated existing products to be available');
    }

    // Update existing categories to have a default sort_order
    console.log('📝 Updating existing categories with default sort_order...');
    const { error: updateCategoriesError } = await supabase.rpc('exec_sql', {
      sql: "UPDATE categories SET sort_order = id::integer WHERE sort_order IS NULL OR sort_order = 0;"
    });
    
    if (updateCategoriesError) {
      console.error('❌ Error updating categories sort_order:', updateCategoriesError);
    } else {
      console.log('✅ Updated existing categories with default sort_order');
    }

    // Create indexes for better performance
    console.log('📝 Creating performance indexes...');
    const { error: indexError1 } = await supabase.rpc('exec_sql', {
      sql: 'CREATE INDEX IF NOT EXISTS idx_products_restaurant_sort ON products(restaurant_id, sort_order);'
    });
    
    const { error: indexError2 } = await supabase.rpc('exec_sql', {
      sql: 'CREATE INDEX IF NOT EXISTS idx_products_available ON products(restaurant_id, available);'
    });
    
    const { error: indexError3 } = await supabase.rpc('exec_sql', {
      sql: 'CREATE INDEX IF NOT EXISTS idx_categories_restaurant_sort ON categories(restaurant_id, sort_order);'
    });

    if (indexError1 || indexError2 || indexError3) {
      console.error('❌ Error creating indexes:', { indexError1, indexError2, indexError3 });
    } else {
      console.log('✅ Created performance indexes');
    }

    console.log('🎉 Migration completed successfully!');
    console.log('');
    console.log('📋 Next steps:');
    console.log('   1. Test the product reordering functionality in the admin panel');
    console.log('   2. Verify that drag-and-drop works for both categories and products');
    console.log('   3. Check that the order persists after page refresh');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigration();

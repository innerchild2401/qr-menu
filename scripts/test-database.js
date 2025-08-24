const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const supabaseUrl = 'https://nnhyuqhypzytnkkdifuk.supabase.co';
const supabaseServiceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5uaHl1cWh5cHp5dG5ra2RpZnVrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTk3NjA5MiwiZXhwIjoyMDcxNTUyMDkyfQ.5gqpZ6FAMlLPFwKv-p14lssKiRt2AOMqmOY926xos8I';

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function testDatabase() {
  try {
    console.log('🔍 Testing database connection...');
    
    // Test restaurant query
    const { data: restaurant, error: restaurantError } = await supabase
      .from('restaurants')
      .select('*')
      .eq('slug', 'demo')
      .maybeSingle();
    
    if (restaurantError) {
      console.error('❌ Restaurant query error:', restaurantError);
      return;
    }
    
    if (!restaurant) {
      console.error('❌ Restaurant not found');
      return;
    }
    
    console.log('✅ Restaurant found:', restaurant.name);
    
    // Test products query
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('*')
      .eq('restaurant_id', restaurant.id);
    
    if (productsError) {
      console.error('❌ Products query error:', productsError);
      return;
    }
    
    console.log(`✅ Found ${products.length} products:`);
    products.forEach(product => {
      console.log(`  - ${product.name}: $${product.price} (image: ${product.image_url ? 'Yes' : 'No'})`);
    });
    
    // Test categories query
    const { data: categories, error: categoriesError } = await supabase
      .from('categories')
      .select('*')
      .eq('restaurant_id', restaurant.id);
    
    if (categoriesError) {
      console.error('❌ Categories query error:', categoriesError);
      return;
    }
    
    console.log(`✅ Found ${categories.length} categories:`);
    categories.forEach(category => {
      console.log(`  - ${category.name}`);
    });
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testDatabase();

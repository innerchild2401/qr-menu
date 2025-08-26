const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://nnhyuqhypzytnkkdifuk.supabase.co';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5uaHl1cWh5cHp5dG5ra2RpZnVrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTk3NjA5MiwiZXhwIjoyMDcxNTUyMDkyfQ.5gqpZ6FAMlLPFwKv-p14lssKiRt2AOMqmOY926xos8I';

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  }
});

async function checkDatabaseStructure() {
  try {
    console.log('🔍 Checking database structure...\n');
    
    // Check categories table structure
    console.log('📋 Categories table structure:');
    const { data: categoriesData, error: categoriesError } = await supabase
      .from('categories')
      .select('*')
      .limit(3);
    
    if (categoriesError) {
      console.error('❌ Error fetching categories:', categoriesError);
    } else {
      console.log('✅ Categories table exists');
      if (categoriesData && categoriesData.length > 0) {
        console.log('📊 Sample category data:');
        console.log(JSON.stringify(categoriesData[0], null, 2));
      }
    }
    
    // Check products table structure
    console.log('\n📋 Products table structure:');
    const { data: productsData, error: productsError } = await supabase
      .from('products')
      .select('*')
      .limit(3);
    
    if (productsError) {
      console.error('❌ Error fetching products:', productsError);
    } else {
      console.log('✅ Products table exists');
      if (productsData && productsData.length > 0) {
        console.log('📊 Sample product data:');
        console.log(JSON.stringify(productsData[0], null, 2));
      }
    }
    
    // Check restaurants table structure
    console.log('\n📋 Restaurants table structure:');
    const { data: restaurantsData, error: restaurantsError } = await supabase
      .from('restaurants')
      .select('*')
      .limit(3);
    
    if (restaurantsError) {
      console.error('❌ Error fetching restaurants:', restaurantsError);
    } else {
      console.log('✅ Restaurants table exists');
      if (restaurantsData && restaurantsData.length > 0) {
        console.log('📊 Sample restaurant data:');
        console.log(JSON.stringify(restaurantsData[0], null, 2));
      }
    }
    
    // Check specific restaurant "myprecious"
    console.log('\n🔍 Checking "myprecious" restaurant:');
    const { data: mypreciousRestaurant, error: mypreciousError } = await supabase
      .from('restaurants')
      .select('*')
      .eq('slug', 'myprecious')
      .single();
    
    if (mypreciousError) {
      console.error('❌ Error fetching myprecious restaurant:', mypreciousError);
    } else {
      console.log('✅ Found myprecious restaurant:');
      console.log(JSON.stringify(mypreciousRestaurant, null, 2));
      
      // Get categories for myprecious
      const { data: mypreciousCategories, error: catError } = await supabase
        .from('categories')
        .select('*')
        .eq('restaurant_id', mypreciousRestaurant.id);
      
      if (catError) {
        console.error('❌ Error fetching categories:', catError);
      } else {
        console.log(`\n📊 Found ${mypreciousCategories?.length || 0} categories for myprecious:`);
        if (mypreciousCategories && mypreciousCategories.length > 0) {
          console.log(JSON.stringify(mypreciousCategories, null, 2));
        }
      }
      
      // Get products for myprecious
      const { data: mypreciousProducts, error: prodError } = await supabase
        .from('products')
        .select('*')
        .eq('restaurant_id', mypreciousRestaurant.id);
      
      if (prodError) {
        console.error('❌ Error fetching products:', prodError);
      } else {
        console.log(`\n📊 Found ${mypreciousProducts?.length || 0} products for myprecious:`);
        if (mypreciousProducts && mypreciousProducts.length > 0) {
          console.log(JSON.stringify(mypreciousProducts.slice(0, 2), null, 2));
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Error checking database structure:', error);
  }
}

// Run the check
checkDatabaseStructure();

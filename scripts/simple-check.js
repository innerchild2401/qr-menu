const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://nnhyuqhypzytnkkdifuk.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5uaHl1cWh5cHp5dG5ra2RpZnVrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU5NzYwOTIsImV4cCI6MjA3MTU1MjA5Mn0.Lug4smvqk5sI-46MbFeh64Yu2nptehnUTlUCPSpYbqI';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function simpleCheck() {
  console.log('🔍 Simple database check...\n');

  try {
    // Check restaurants
    console.log('🏪 Checking restaurants...');
    const { data: restaurants, error: restaurantsError } = await supabase
      .from('restaurants')
      .select('*');

    if (restaurantsError) {
      console.error('❌ Restaurants error:', restaurantsError);
    } else {
      console.log(`✅ Found ${restaurants?.length || 0} restaurants`);
      if (restaurants && restaurants.length > 0) {
        restaurants.forEach(r => console.log(`   - ${r.name} (${r.id})`));
      }
    }

    // Check categories
    console.log('\n📂 Checking categories...');
    const { data: categories, error: categoriesError } = await supabase
      .from('categories')
      .select('*');

    if (categoriesError) {
      console.error('❌ Categories error:', categoriesError);
    } else {
      console.log(`✅ Found ${categories?.length || 0} categories`);
      if (categories && categories.length > 0) {
        categories.forEach(c => console.log(`   - ${c.name} (${c.id})`));
      }
    }

    // Check products
    console.log('\n🍽️  Checking products...');
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('*');

    if (productsError) {
      console.error('❌ Products error:', productsError);
    } else {
      console.log(`✅ Found ${products?.length || 0} products`);
      if (products && products.length > 0) {
        products.slice(0, 5).forEach(p => console.log(`   - ${p.name} (${p.category_id})`));
        if (products.length > 5) {
          console.log(`   ... and ${products.length - 5} more`);
        }
      }
    }

  } catch (error) {
    console.error('❌ Check failed:', error);
  }
}

// Run the check
simpleCheck();


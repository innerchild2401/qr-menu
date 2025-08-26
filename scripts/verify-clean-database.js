const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  }
});

async function verifyCleanDatabase() {
  try {
    console.log('🔍 Verifying clean database state...\n');

    // Check restaurants
    console.log('1️⃣ Checking restaurants table:');
    const { data: restaurants, error: restaurantsError } = await supabase
      .from('restaurants')
      .select('*');

    if (restaurantsError) {
      console.error('Error querying restaurants:', restaurantsError);
    } else {
      console.log(`Found ${restaurants?.length || 0} restaurants`);
      restaurants?.forEach(restaurant => {
        console.log(`  - ${restaurant.name} (${restaurant.slug}) - ID: ${restaurant.id}`);
      });
    }

    // Check categories
    console.log('\n2️⃣ Checking categories table:');
    const { data: categories, error: categoriesError } = await supabase
      .from('categories')
      .select('*');

    if (categoriesError) {
      console.error('Error querying categories:', categoriesError);
    } else {
      console.log(`Found ${categories?.length || 0} categories`);
      categories?.forEach(category => {
        console.log(`  - ${category.name} - Restaurant ID: ${category.restaurant_id}`);
      });
    }

    // Check products
    console.log('\n3️⃣ Checking products table:');
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('*');

    if (productsError) {
      console.error('Error querying products:', productsError);
    } else {
      console.log(`Found ${products?.length || 0} products`);
      products?.forEach(product => {
        console.log(`  - ${product.name} ($${product.price}) - Restaurant ID: ${product.restaurant_id}`);
      });
    }

    // Check users
    console.log('\n4️⃣ Checking public.users table:');
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('*');

    if (usersError) {
      console.error('Error querying users:', usersError);
    } else {
      console.log(`Found ${users?.length || 0} users in public.users`);
      users?.forEach(user => {
        console.log(`  - ${user.email} - ID: ${user.id}`);
      });
    }

    // Check user_restaurants
    console.log('\n5️⃣ Checking user_restaurants table:');
    const { data: userRestaurants, error: userRestaurantsError } = await supabase
      .from('user_restaurants')
      .select('*');

    if (userRestaurantsError) {
      console.error('Error querying user_restaurants:', userRestaurantsError);
    } else {
      console.log(`Found ${userRestaurants?.length || 0} user-restaurant relationships`);
      userRestaurants?.forEach(ur => {
        console.log(`  - User ID: ${ur.user_id} - Restaurant ID: ${ur.restaurant_id} - Role: ${ur.role}`);
      });
    }

    // Check auth users
    console.log('\n6️⃣ Checking auth.users table:');
    const { data: authUsers, error: authUsersError } = await supabase.auth.admin.listUsers();
    
    if (authUsersError) {
      console.error('Error querying auth users:', authUsersError);
    } else {
      console.log(`Found ${authUsers?.users?.length || 0} auth users`);
      authUsers?.users?.forEach(user => {
        console.log(`  - ${user.email} - ID: ${user.id}`);
      });
    }

    // Summary
    console.log('\n📊 Database Summary:');
    console.log(`   - Restaurants: ${restaurants?.length || 0}`);
    console.log(`   - Categories: ${categories?.length || 0}`);
    console.log(`   - Products: ${products?.length || 0}`);
    console.log(`   - Public Users: ${users?.length || 0}`);
    console.log(`   - User-Restaurant Relationships: ${userRestaurants?.length || 0}`);
    console.log(`   - Auth Users: ${authUsers?.users?.length || 0}`);

    // Check if everything is clean
    const isClean = (restaurants?.length === 1) && 
                   (categories?.length === 4) && 
                   (products?.length === 8) && 
                   (users?.length === 0) && 
                   (userRestaurants?.length === 0) && 
                   (authUsers?.users?.length === 0);

    if (isClean) {
      console.log('\n✅ Database is clean! Only demo restaurant data remains.');
    } else {
      console.log('\n❌ Database is not completely clean. Some unexpected data remains.');
    }

  } catch (error) {
    console.error('❌ Error during database verification:', error);
  }
}

// Run the verification
verifyCleanDatabase();

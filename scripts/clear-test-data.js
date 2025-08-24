const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  console.log('Make sure you have NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your .env.local file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function clearTestData() {
  console.log('🧹 Clearing test data from database...\n');
  
  try {
    // Clear user_restaurants first (due to foreign key constraints)
    console.log('🗑️  Clearing user_restaurants table...');
    const { error: urError } = await supabase
      .from('user_restaurants')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all except dummy record
    
    if (urError) {
      console.error('❌ Error clearing user_restaurants:', urError);
    } else {
      console.log('✅ user_restaurants table cleared');
    }

    // Clear restaurants table
    console.log('🗑️  Clearing restaurants table...');
    const { error: rError } = await supabase
      .from('restaurants')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all except dummy record
    
    if (rError) {
      console.error('❌ Error clearing restaurants:', rError);
    } else {
      console.log('✅ restaurants table cleared');
    }

    // Clear users table (public.users, not auth.users)
    console.log('🗑️  Clearing users table...');
    const { error: uError } = await supabase
      .from('users')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all except dummy record
    
    if (uError) {
      console.error('❌ Error clearing users:', uError);
    } else {
      console.log('✅ users table cleared');
    }

    // Verify tables are empty
    console.log('\n🔍 Verifying tables are empty...');
    
    const { data: usersCount, error: usersError } = await supabase
      .from('users')
      .select('id', { count: 'exact', head: true });
    
    const { data: restaurantsCount, error: restaurantsError } = await supabase
      .from('restaurants')
      .select('id', { count: 'exact', head: true });
    
    const { data: userRestaurantsCount, error: userRestaurantsError } = await supabase
      .from('user_restaurants')
      .select('id', { count: 'exact', head: true });

    console.log('\n📊 Database Status:');
    console.log(`   users: ${usersCount || 0} records`);
    console.log(`   restaurants: ${restaurantsCount || 0} records`);
    console.log(`   user_restaurants: ${userRestaurantsCount || 0} records`);

    if ((usersCount || 0) === 0 && (restaurantsCount || 0) === 0 && (userRestaurantsCount || 0) === 0) {
      console.log('\n✅ Database cleared successfully! Ready for fresh testing.');
    } else {
      console.log('\n⚠️  Some tables still contain data. You may need to manually clear them.');
    }

  } catch (error) {
    console.error('❌ Error during cleanup:', error);
  }
}

clearTestData();

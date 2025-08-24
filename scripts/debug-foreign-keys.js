const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://nnhyuqhypzytnkkdifuk.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5uaHl1cWh5cHp5dG5ra2RpZnVrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU5NzYwOTIsImV4cCI6MjA3MTU1MjA5Mn0.Lug4smvqk5sI-46MbFeh64Yu2nptehnUTlUCPSpYbqI';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function debugForeignKeys() {
  console.log('🔍 Debugging Foreign Key Constraints...\n');

  try {
    // 1. Check users table structure
    console.log('📋 Checking users table structure...');
    const { data: usersData, error: usersError } = await supabase
      .from('users')
      .select('*')
      .limit(1);

    if (usersError) {
      console.error('❌ Error accessing users table:', usersError);
    } else {
      console.log('✅ Users table is accessible');
      if (usersData && usersData.length > 0) {
        console.log('📋 Sample user record structure:');
        console.log(JSON.stringify(usersData[0], null, 2));
      }
    }

    // 2. Check restaurants table structure
    console.log('\n📋 Checking restaurants table structure...');
    const { data: restaurantsData, error: restaurantsError } = await supabase
      .from('restaurants')
      .select('*')
      .limit(1);

    if (restaurantsError) {
      console.error('❌ Error accessing restaurants table:', restaurantsError);
    } else {
      console.log('✅ Restaurants table is accessible');
      if (restaurantsData && restaurantsData.length > 0) {
        console.log('📋 Sample restaurant record structure:');
        console.log(JSON.stringify(restaurantsData[0], null, 2));
      }
    }

    // 3. Check user_restaurants table structure
    console.log('\n📋 Checking user_restaurants table structure...');
    const { data: userRestaurantsData, error: userRestaurantsError } = await supabase
      .from('user_restaurants')
      .select('*')
      .limit(1);

    if (userRestaurantsError) {
      console.error('❌ Error accessing user_restaurants table:', userRestaurantsError);
    } else {
      console.log('✅ user_restaurants table is accessible');
      if (userRestaurantsData && userRestaurantsData.length > 0) {
        console.log('📋 Sample user_restaurants record structure:');
        console.log(JSON.stringify(userRestaurantsData[0], null, 2));
      }
    }

    // 4. Check current users in public.users
    console.log('\n👤 Checking current users in public.users...');
    const { data: publicUsers, error: publicUsersError } = await supabase
      .from('users')
      .select('id, email, full_name, created_at')
      .limit(10);

    if (publicUsersError) {
      console.error('❌ Error checking public.users:', publicUsersError);
    } else {
      console.log(`✅ public.users table has ${publicUsers?.length || 0} records`);
      if (publicUsers && publicUsers.length > 0) {
        console.log('📋 Current users:');
        publicUsers.forEach(user => {
          console.log(`  - ID: ${user.id}, Email: ${user.email}, Name: ${user.full_name || 'N/A'}`);
        });
      }
    }

    // 5. Check current restaurants
    console.log('\n🏪 Checking current restaurants...');
    const { data: restaurants, error: restaurantsListError } = await supabase
      .from('restaurants')
      .select('id, name, slug, owner_id, created_at')
      .limit(10);

    if (restaurantsListError) {
      console.error('❌ Error checking restaurants:', restaurantsListError);
    } else {
      console.log(`✅ restaurants table has ${restaurants?.length || 0} records`);
      if (restaurants && restaurants.length > 0) {
        console.log('📋 Current restaurants:');
        restaurants.forEach(restaurant => {
          console.log(`  - ID: ${restaurant.id}, Name: ${restaurant.name}, Owner: ${restaurant.owner_id || 'None'}`);
        });
      }
    }

    // 6. Check user_restaurants relationships
    console.log('\n🔗 Checking user_restaurants relationships...');
    const { data: userRestaurants, error: userRestaurantsListError } = await supabase
      .from('user_restaurants')
      .select('user_id, restaurant_id, role, created_at')
      .limit(10);

    if (userRestaurantsListError) {
      console.error('❌ Error checking user_restaurants:', userRestaurantsListError);
    } else {
      console.log(`✅ user_restaurants table has ${userRestaurants?.length || 0} records`);
      if (userRestaurants && userRestaurants.length > 0) {
        console.log('📋 Current user-restaurant relationships:');
        userRestaurants.forEach(rel => {
          console.log(`  - User: ${rel.user_id} -> Restaurant: ${rel.restaurant_id} (${rel.role})`);
        });
      }
    }

    // 7. Test the signup flow by attempting to create a test user
    console.log('\n🧪 Testing signup flow...');
    console.log('⚠️  This will attempt to create a test user to identify the exact issue');
    
    const testEmail = `test-${Date.now()}@example.com`;
    const testPassword = 'testpassword123';
    
    console.log(`📧 Test email: ${testEmail}`);
    
    // Step 1: Create auth user
    console.log('\n1️⃣ Creating auth user...');
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
      options: {
        data: {
          full_name: 'Test User',
        }
      }
    });

    if (authError) {
      console.error('❌ Auth signup error:', authError);
    } else {
      console.log('✅ Auth user created successfully');
      console.log(`   Auth user ID: ${authData.user?.id}`);
      
      // Step 2: Check if user record exists in public.users
      console.log('\n2️⃣ Checking if user record exists in public.users...');
      const { data: userRecord, error: userRecordError } = await supabase
        .from('users')
        .select('id, email, full_name')
        .eq('id', authData.user?.id)
        .single();

      if (userRecordError) {
        console.error('❌ Error checking user record:', userRecordError);
        console.log('⚠️  This suggests the trigger may not be working properly');
      } else {
        console.log('✅ User record exists in public.users');
        console.log(`   User record: ${JSON.stringify(userRecord, null, 2)}`);
      }

      // Step 3: Try to create a restaurant
      if (authData.user?.id) {
        console.log('\n3️⃣ Attempting to create a test restaurant...');
        const { data: restaurant, error: restaurantCreateError } = await supabase
          .from('restaurants')
          .insert({
            name: 'Test Restaurant',
            slug: `test-restaurant-${Date.now()}`,
            owner_id: authData.user.id
          })
          .select()
          .single();

        if (restaurantCreateError) {
          console.error('❌ Restaurant creation error:', restaurantCreateError);
        } else {
          console.log('✅ Test restaurant created successfully');
          console.log(`   Restaurant: ${JSON.stringify(restaurant, null, 2)}`);
          
          // Clean up test data
          console.log('\n🧹 Cleaning up test data...');
          await supabase.from('restaurants').delete().eq('id', restaurant.id);
          console.log('✅ Test restaurant deleted');
        }
      }

      // Clean up auth user
      console.log('\n🧹 Cleaning up test auth user...');
      // Note: We can't delete auth users via API, but we can clean up the public.users record
      if (authData.user?.id) {
        await supabase.from('users').delete().eq('id', authData.user.id);
        console.log('✅ Test user record deleted from public.users');
      }
    }

  } catch (error) {
    console.error('❌ Error during foreign key debugging:', error);
  }
}

debugForeignKeys();

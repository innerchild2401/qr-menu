const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://nnhyuqhypzytnkkdifuk.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5uaHl1cWh5cHp5dG5ra2RpZnVrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU5NzYwOTIsImV4cCI6MjA3MTU1MjA5Mn0.Lug4smvqk5sI-46MbFeh64Yu2nptehnUTlUCPSpYbqI';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testAuthFlow() {
  console.log('🧪 Testing Authentication Flow...\n');

  try {
    // Test 1: Sign up a new user
    console.log('1️⃣ Testing Sign Up...');
    const testEmail = `test-auth-${Date.now()}@example.com`;
    const testPassword = 'testpassword123';
    const testFullName = 'Test User';
    const testRestaurantName = 'Test Restaurant';

    console.log(`📧 Test email: ${testEmail}`);
    console.log(`🏪 Test restaurant: ${testRestaurantName}`);

    // Sign up
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
      options: {
        data: {
          full_name: testFullName,
        }
      }
    });

    if (signUpError) {
      console.error('❌ Sign up failed:', signUpError);
      return;
    }

    if (!signUpData.user) {
      console.error('❌ No user data received from sign up');
      return;
    }

    console.log('✅ Sign up successful:', signUpData.user.id);

    // Check if user record exists in public.users
    console.log('\n2️⃣ Checking user record in public.users...');
    const { data: userRecord, error: userError } = await supabase
      .from('users')
      .select('id, email, full_name')
      .eq('id', signUpData.user.id)
      .single();

    if (userError) {
      console.error('❌ User record not found:', userError);
    } else {
      console.log('✅ User record found:', userRecord);
    }

    // Create restaurant
    console.log('\n3️⃣ Creating restaurant...');
    const { data: restaurant, error: restaurantError } = await supabase
      .from('restaurants')
      .insert({
        name: testRestaurantName,
        slug: `test-restaurant-${Date.now()}`,
        owner_id: signUpData.user.id
      })
      .select()
      .single();

    if (restaurantError) {
      console.error('❌ Restaurant creation failed:', restaurantError);
    } else {
      console.log('✅ Restaurant created:', restaurant.id);
    }

    // Test 2: Sign out
    console.log('\n4️⃣ Testing Sign Out...');
    const { error: signOutError } = await supabase.auth.signOut();
    
    if (signOutError) {
      console.error('❌ Sign out failed:', signOutError);
    } else {
      console.log('✅ Sign out successful');
    }

    // Test 3: Sign in with the same credentials
    console.log('\n5️⃣ Testing Sign In...');
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: testEmail,
      password: testPassword,
    });

    if (signInError) {
      console.error('❌ Sign in failed:', signInError);
    } else {
      console.log('✅ Sign in successful:', signInData.user?.id);
    }

    // Test 4: Check session
    console.log('\n6️⃣ Checking session...');
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error('❌ Session check failed:', sessionError);
    } else if (session) {
      console.log('✅ Session active:', session.user.id);
    } else {
      console.log('⚠️  No active session');
    }

    // Test 5: Get user restaurants
    console.log('\n7️⃣ Testing get_user_restaurants function...');
    const { data: userRestaurants, error: restaurantsError } = await supabase
      .rpc('get_user_restaurants', { user_uuid: signUpData.user.id });

    if (restaurantsError) {
      console.error('❌ get_user_restaurants failed:', restaurantsError);
    } else {
      console.log('✅ User restaurants:', userRestaurants);
    }

    // Clean up
    console.log('\n🧹 Cleaning up test data...');
    
    if (restaurant) {
      await supabase.from('restaurants').delete().eq('id', restaurant.id);
      console.log('✅ Test restaurant deleted');
    }
    
    await supabase.from('users').delete().eq('id', signUpData.user.id);
    console.log('✅ Test user record deleted');
    
    await supabase.auth.signOut();
    console.log('✅ Signed out');

    console.log('\n🎉 Authentication flow test completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testAuthFlow();

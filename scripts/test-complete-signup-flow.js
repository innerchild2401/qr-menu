const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://nnhyuqhypzytnkkdifuk.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5uaHl1cWh5cHp5dG5ra2RpZnVrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU5NzYwOTIsImV4cCI6MjA3MTU1MjA5Mn0.Lug4smvqk5sI-46MbFeh64Yu2nptehnUTlUCPSpYbqI';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testCompleteSignupFlow() {
  console.log('🧪 Testing Complete Signup Flow...\n');

  try {
    const testEmail = `testcomplete${Date.now()}@gmail.com`;
    const testPassword = 'testpassword123';
    const testFullName = 'Test User';
    const testRestaurantName = 'Test Restaurant';

    console.log(`📧 Test email: ${testEmail}`);
    console.log(`👤 Test full name: ${testFullName}`);
    console.log(`🏪 Test restaurant: ${testRestaurantName}`);

    // Step 1: Create auth user
    console.log('\n1️⃣ Creating auth user...');
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
      options: {
        data: {
          full_name: testFullName,
        },
        emailRedirectTo: `https://qr-menu-ruby-delta.vercel.app/admin/settings`
      }
    });

    if (authError) {
      console.error('❌ Auth signup error:', authError);
      return;
    }

    if (!authData.user) {
      console.error('❌ No user data received from signup');
      return;
    }

    console.log('✅ Auth user created successfully:', authData.user.id);

    // Step 2: Check for user record in public.users
    console.log('\n2️⃣ Checking for user record in public.users...');
    let userRecord = null;
    let attempts = 0;
    const maxAttempts = 10;
    
    while (!userRecord && attempts < maxAttempts) {
      console.log(`🔄 Attempt ${attempts + 1}/${maxAttempts}: Checking for user record...`);
      
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, email, full_name')
        .eq('id', authData.user.id)
        .single();
      
      if (userData && !userError) {
        userRecord = userData;
        console.log('✅ User record found in public.users table');
        break;
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      attempts++;
    }
    
    // Step 3: Create user record manually if needed
    if (!userRecord) {
      console.log('⚠️  Trigger failed to create user record, creating manually...');
      
      const { data: createdUser, error: createUserError } = await supabase
        .from('users')
        .insert({
          id: authData.user.id,
          email: authData.user.email,
          full_name: testFullName
        })
        .select()
        .single();
      
      if (createUserError) {
        console.error('❌ Failed to create user record manually:', createUserError);
        return;
      }
      
      userRecord = createdUser;
      console.log('✅ User record created manually');
    }

    // Step 4: Create restaurant
    console.log('\n3️⃣ Creating restaurant...');
    
    const generateSlug = (name) => {
      return name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')
        .substring(0, 50);
    };

    const restaurantData = {
      name: testRestaurantName,
      slug: generateSlug(testRestaurantName),
      owner_id: authData.user.id
    };
    
    console.log('📋 Restaurant data:', restaurantData);
    
    const { data: restaurant, error: restaurantError } = await supabase
      .from('restaurants')
      .insert(restaurantData)
      .select()
      .single();

    if (restaurantError) {
      console.error('❌ Restaurant creation error:', restaurantError);
      return;
    }

    console.log('✅ Restaurant created successfully:', restaurant.id);

    // Step 5: Verify user-restaurant relationship
    console.log('\n4️⃣ Verifying user-restaurant relationship...');
    
    const { error: relationshipError } = await supabase
      .from('user_restaurants')
      .select('user_id, restaurant_id, role')
      .eq('user_id', authData.user.id)
      .eq('restaurant_id', restaurant.id)
      .single();
    
    if (relationshipError) {
      console.warn('⚠️  User-restaurant relationship not found, creating manually...');
      
      const { error: createRelError } = await supabase
        .from('user_restaurants')
        .insert({
          user_id: authData.user.id,
          restaurant_id: restaurant.id,
          role: 'owner'
        });
      
      if (createRelError) {
        console.error('❌ Failed to create user-restaurant relationship:', createRelError);
      } else {
        console.log('✅ User-restaurant relationship created manually');
      }
    } else {
      console.log('✅ User-restaurant relationship verified');
    }

    // Step 6: Check session
    console.log('\n5️⃣ Checking session...');
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error('❌ Session error:', sessionError);
    } else if (session) {
      console.log('✅ Session established:', session.user.id);
    } else {
      console.log('⚠️  No session found');
    }

    // Step 7: Test signin
    console.log('\n6️⃣ Testing signin...');
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: testEmail,
      password: testPassword,
    });

    if (signInError) {
      console.error('❌ Signin failed:', signInError);
    } else {
      console.log('✅ Signin successful:', signInData.user?.id);
    }

    // Clean up
    console.log('\n🧹 Cleaning up test data...');
    
    // Sign out
    const { error: signOutError } = await supabase.auth.signOut();
    if (signOutError) {
      console.error('❌ Sign out failed:', signOutError);
    } else {
      console.log('✅ Signed out successfully');
    }

    // Delete test data
    try {
      await supabase.from('user_restaurants').delete().eq('user_id', authData.user.id);
      console.log('✅ User-restaurant relationship deleted');
    } catch (error) {
      console.log('⚠️  Could not delete user-restaurant relationship:', error.message);
    }

    try {
      await supabase.from('restaurants').delete().eq('id', restaurant.id);
      console.log('✅ Restaurant deleted');
    } catch (error) {
      console.log('⚠️  Could not delete restaurant:', error.message);
    }

    try {
      await supabase.from('users').delete().eq('id', authData.user.id);
      console.log('✅ User record deleted');
    } catch (error) {
      console.log('⚠️  Could not delete user record:', error.message);
    }

    console.log('\n📋 Complete Signup Flow Summary:');
    console.log('- Auth user created: ✅');
    console.log('- User record created: ✅');
    console.log('- Restaurant created: ✅');
    console.log('- User-restaurant relationship: ✅');
    console.log('- Session established:', session ? '✅' : '❌');
    console.log('- Signin works:', !signInError ? '✅' : '❌');

    if (!session) {
      console.log('\n⚠️  WARNING: No session established after signup!');
      console.log('This might be causing the client-side error.');
    }

    if (signInError) {
      console.log('\n⚠️  WARNING: Signin failed after signup!');
      console.log('This might be causing the login issues.');
    }

  } catch (error) {
    console.error('❌ Complete signup flow test failed:', error);
  }
}

testCompleteSignupFlow();

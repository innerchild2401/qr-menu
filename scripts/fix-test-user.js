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

async function fixTestUser() {
  try {
    console.log('🔧 Fixing test user...');
    
    // Get the test user from auth.users
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      console.error('Error listing auth users:', authError);
      return;
    }

    const testUser = authUsers.users.find(u => u.email === 'test@example.com');
    if (!testUser) {
      console.log('Test user not found in auth.users');
      return;
    }

    console.log('Found test user in auth.users:', testUser.id);

    // Check if user exists in public.users
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('*')
      .eq('id', testUser.id)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Error checking existing user:', checkError);
      return;
    }

    if (!existingUser) {
      console.log('Creating user in public.users table...');
      const { error: createError } = await supabase
        .from('users')
        .insert({
          id: testUser.id,
          email: testUser.email,
          full_name: testUser.user_metadata?.full_name || 'Test User',
          created_at: testUser.created_at,
          updated_at: new Date().toISOString()
        });

      if (createError) {
        console.error('Error creating user in public.users:', createError);
        return;
      }
      console.log('✅ User created in public.users table');
    } else {
      console.log('✅ User already exists in public.users table');
    }

    // Check if user-restaurant relationship exists
    const { data: existingUR, error: urCheckError } = await supabase
      .from('user_restaurants')
      .select('*')
      .eq('user_id', testUser.id)
      .single();

    if (urCheckError && urCheckError.code !== 'PGRST116') {
      console.error('Error checking user-restaurant relationship:', urCheckError);
      return;
    }

    if (!existingUR) {
      console.log('Creating user-restaurant relationship...');
      
      // Get the test restaurant
      const { data: restaurant, error: restaurantError } = await supabase
        .from('restaurants')
        .select('*')
        .eq('slug', 'test-restaurant')
        .single();

      if (restaurantError) {
        console.error('Error finding test restaurant:', restaurantError);
        return;
      }

      const { error: urError } = await supabase
        .from('user_restaurants')
        .insert({
          user_id: testUser.id,
          restaurant_id: restaurant.id,
          role: 'owner'
        });

      if (urError) {
        console.error('Error creating user-restaurant relationship:', urError);
        return;
      }
      console.log('✅ User-restaurant relationship created');
    } else {
      console.log('✅ User-restaurant relationship already exists');
    }

    console.log('\n🎉 Test user fixed successfully!');
    console.log('📧 Email: test@example.com');
    console.log('🔑 Password: password123');
    console.log('🏪 Restaurant: Test Restaurant');
    console.log('🌐 Menu URL: /menu/test-restaurant');

  } catch (error) {
    console.error('❌ Error fixing test user:', error);
  }
}

// Run the script
fixTestUser();




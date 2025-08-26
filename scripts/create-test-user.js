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

async function createTestUser() {
  try {
    console.log('👤 Creating test user...');
    
    // Create auth user
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: 'test@example.com',
      password: 'password123',
      email_confirm: true,
      user_metadata: {
        full_name: 'Test User'
      }
    });

    if (authError) {
      console.error('Error creating auth user:', authError);
      return;
    }

    console.log('✅ Auth user created:', authUser.user.email);

    // Create user in public.users table
    console.log('👤 Creating user in public.users table...');
    const { error: publicUserError } = await supabase
      .from('users')
      .insert({
        id: authUser.user.id,
        email: authUser.user.email,
        full_name: authUser.user.user_metadata?.full_name || 'Test User',
        created_at: authUser.user.created_at,
        updated_at: new Date().toISOString()
      });

    if (publicUserError) {
      console.error('Error creating user in public.users:', publicUserError);
      return;
    }

    console.log('✅ User created in public.users table');

    // Create restaurant
    console.log('🏪 Creating test restaurant...');
    const { data: restaurant, error: restaurantError } = await supabase
      .from('restaurants')
      .insert({
        name: 'Test Restaurant',
        slug: 'test-restaurant',
        address: '123 Test Street, Test City, TC 12345',
        schedule: {
          monday: '9:00 AM - 10:00 PM',
          tuesday: '9:00 AM - 10:00 PM',
          wednesday: '9:00 AM - 10:00 PM',
          thursday: '9:00 AM - 10:00 PM',
          friday: '9:00 AM - 11:00 PM',
          saturday: '10:00 AM - 11:00 PM',
          sunday: '10:00 AM - 9:00 PM'
        }
      })
      .select()
      .single();

    if (restaurantError) {
      console.error('Error creating restaurant:', restaurantError);
      return;
    }

    console.log('✅ Restaurant created:', restaurant.name);

    // Create user-restaurant relationship
    console.log('🔗 Creating user-restaurant relationship...');
    const { error: urError } = await supabase
      .from('user_restaurants')
      .insert({
        user_id: authUser.user.id,
        restaurant_id: restaurant.id,
        role: 'owner'
      });

    if (urError) {
      console.error('Error creating user-restaurant relationship:', urError);
      return;
    }

    console.log('✅ User-restaurant relationship created');

    console.log('\n🎉 Test user setup completed!');
    console.log('📧 Email: test@example.com');
    console.log('🔑 Password: password123');
    console.log('🏪 Restaurant: Test Restaurant');
    console.log('🌐 Menu URL: /menu/test-restaurant');

  } catch (error) {
    console.error('❌ Error creating test user:', error);
  }
}

// Run the script
createTestUser();

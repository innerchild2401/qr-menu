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

async function checkUserCreation() {
  try {
    console.log('🔍 Checking user creation details...');

    // Check users table
    console.log('\n📋 Checking public.users table:');
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('*')
      .eq('email', 'eu@eu.com');

    if (usersError) {
      console.error('Error querying users:', usersError);
    } else {
      console.log('Users found:', users?.length || 0);
      users?.forEach(user => {
        console.log(`  - ID: ${user.id}`);
        console.log(`  - Email: ${user.email}`);
        console.log(`  - Created: ${user.created_at}`);
        console.log(`  - Updated: ${user.updated_at}`);
      });
    }

    // Check auth.users table (if accessible)
    console.log('\n🔐 Checking auth.users table:');
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      console.error('Error querying auth users:', authError);
    } else {
      const euUser = authUsers.users.find(u => u.email === 'eu@eu.com');
      if (euUser) {
        console.log('Auth user found:');
        console.log(`  - ID: ${euUser.id}`);
        console.log(`  - Email: ${euUser.email}`);
        console.log(`  - Created: ${euUser.created_at}`);
        console.log(`  - Last Sign In: ${euUser.last_sign_in_at}`);
        console.log(`  - Confirmed: ${euUser.email_confirmed_at}`);
      } else {
        console.log('No auth user found with email eu@eu.com');
      }
    }

    // Check if there are any triggers or functions that might auto-create users
    console.log('\n⚙️ Checking for auto-creation mechanisms...');
    
    // Check if there are any RLS policies that might affect user creation
    const { data: policies, error: policiesError } = await supabase
      .from('users')
      .select('*')
      .limit(1);
    
    if (policiesError) {
      console.log('RLS policies might be affecting user access:', policiesError.message);
    }

    console.log('\n✅ User creation check completed');

  } catch (error) {
    console.error('❌ Error during user creation check:', error);
  }
}

// Run the check
checkUserCreation();

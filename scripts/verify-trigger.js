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

async function verifyTrigger() {
  try {
    console.log('🔍 Verifying database trigger setup...\n');

    // Check if the trigger function exists
    console.log('1️⃣ Checking trigger function...');
    const { data: functions, error: funcError } = await supabase
      .from('information_schema.routines')
      .select('routine_name')
      .eq('routine_name', 'handle_new_user');

    if (funcError) {
      console.log('❌ Error checking functions:', funcError.message);
    } else {
      console.log('✅ Trigger function exists:', functions?.length > 0 ? 'Yes' : 'No');
    }

    // Check if the trigger exists
    console.log('\n2️⃣ Checking trigger...');
    const { data: triggers, error: triggerError } = await supabase
      .from('information_schema.triggers')
      .select('trigger_name, event_manipulation, action_statement')
      .eq('trigger_name', 'on_auth_user_created');

    if (triggerError) {
      console.log('❌ Error checking triggers:', triggerError.message);
    } else {
      console.log('✅ Trigger exists:', triggers?.length > 0 ? 'Yes' : 'No');
      if (triggers?.length > 0) {
        console.log('   Event:', triggers[0].event_manipulation);
        console.log('   Action:', triggers[0].action_statement);
      }
    }

    // Test the trigger by checking if it works for a new user
    console.log('\n3️⃣ Testing trigger with existing user...');
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('*')
      .eq('email', 'eu@eu.com');

    if (usersError) {
      console.log('❌ Error checking users:', usersError.message);
    } else {
      console.log('✅ User record exists in public.users:', users?.length > 0 ? 'Yes' : 'No');
      if (users?.length > 0) {
        console.log('   User ID:', users[0].id);
        console.log('   Created:', users[0].created_at);
      }
    }

    console.log('\n🎉 Trigger verification completed!');

  } catch (error) {
    console.error('❌ Error during trigger verification:', error);
  }
}

// Run the verification
verifyTrigger();

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

async function fixMissingUser() {
  try {
    console.log('🔧 Fixing missing user record...');

    // Get the auth user details
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      console.error('Error querying auth users:', authError);
      return;
    }

    const euUser = authUsers.users.find(u => u.email === 'eu@eu.com');
    if (!euUser) {
      console.log('No auth user found with email eu@eu.com');
      return;
    }

    console.log('Found auth user:', euUser.id);

    // Check if user already exists in public.users
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('*')
      .eq('id', euUser.id)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Error checking existing user:', checkError);
      return;
    }

    if (existingUser) {
      console.log('User already exists in public.users table');
      return;
    }

    // Create the missing user record
    const { data: newUser, error: createError } = await supabase
      .from('users')
      .insert({
        id: euUser.id,
        email: euUser.email,
        full_name: euUser.user_metadata?.full_name || 'Demo User',
        created_at: euUser.created_at,
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (createError) {
      console.error('Error creating user record:', createError);
      return;
    }

    console.log('✅ User record created successfully:', newUser.id);

    // Test the trigger by checking if it works for future users
    console.log('\n🧪 Testing trigger functionality...');
    
    // Check if the trigger exists
    const { data: triggers, error: triggerError } = await supabase
      .rpc('check_trigger_exists', { trigger_name: 'on_auth_user_created' })
      .catch(() => ({ data: null, error: { message: 'Function not found' } }));

    if (triggerError) {
      console.log('⚠️ Could not verify trigger existence:', triggerError.message);
      console.log('💡 You may need to run the database setup scripts to ensure triggers are properly configured');
    } else {
      console.log('✅ Trigger verification completed');
    }

    console.log('\n🎉 User fix completed successfully!');
    console.log('📧 User can now sign in with: eu@eu.com');

  } catch (error) {
    console.error('❌ Error during user fix:', error);
  }
}

// Run the fix
fixMissingUser();

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  }
});

async function testSignInFlow() {
  try {
    console.log('🧪 Testing sign-in flow...\n');

    // Test 1: Try to sign in with non-existent user
    console.log('1️⃣ Testing sign-in with non-existent user (nonexistent@test.com)...');
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: 'nonexistent@test.com',
        password: 'wrongpassword'
      });

      if (error) {
        console.log('✅ Expected error for non-existent user:', error.message);
      } else {
        console.log('❌ Unexpected success for non-existent user!');
      }
    } catch (error) {
      console.log('✅ Expected error for non-existent user:', error.message);
    }

    console.log('\n2️⃣ Testing sign-in with existing user (eu@eu.com)...');
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: 'eu@eu.com',
        password: 'wrongpassword'
      });

      if (error) {
        console.log('✅ Expected error for wrong password:', error.message);
      } else {
        console.log('❌ Unexpected success with wrong password!');
      }
    } catch (error) {
      console.log('✅ Expected error for wrong password:', error.message);
    }

    console.log('\n3️⃣ Testing sign-in with correct credentials...');
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: 'eu@eu.com',
        password: 'password123' // You'll need to set the correct password
      });

      if (error) {
        console.log('❌ Error with correct credentials:', error.message);
      } else {
        console.log('✅ Success with correct credentials!');
        console.log('User ID:', data.user?.id);
      }
    } catch (error) {
      console.log('❌ Unexpected error:', error.message);
    }

    console.log('\n🎉 Sign-in flow test completed!');

  } catch (error) {
    console.error('❌ Error during sign-in flow test:', error);
  }
}

// Run the test
testSignInFlow();

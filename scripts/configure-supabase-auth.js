const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://nnhyuqhypzytnkkdifuk.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5uaHl1cWh5cHp5dG5ra2RpZnVrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU5NzYwOTIsImV4cCI6MjA3MTU1MjA5Mn0.Lug4smvqk5sI-46MbFeh64Yu2nptehnUTlUCPSpYbqI';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testSignupWithoutEmailConfirmation() {
  console.log('🧪 Testing Signup Without Email Confirmation...\n');

  try {
    // Test signup with a new user
    console.log('1️⃣ Testing signup flow...');
    const testEmail = `testnoconfirm${Date.now()}@gmail.com`;
    const testPassword = 'testpassword123';
    
    console.log(`📧 Test email: ${testEmail}`);
    
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
      options: {
        data: {
          full_name: 'Test User',
        }
      }
    });

    if (signUpError) {
      console.error('❌ Signup failed:', signUpError);
      return;
    }

    if (!signUpData.user) {
      console.error('❌ No user data received from signup');
      return;
    }

    console.log('✅ Signup successful:', signUpData.user.id);
    console.log('📧 Email confirmed:', signUpData.user.email_confirmed_at ? 'Yes' : 'No');
    console.log('📧 Email:', signUpData.user.email);
    
    // Check if we have a session after signup
    console.log('\n2️⃣ Checking session after signup...');
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error('❌ Session check failed:', sessionError);
    } else if (session) {
      console.log('✅ Session established after signup:', session.user.id);
    } else {
      console.log('⚠️  No session established after signup');
    }

    // Test immediate signin
    console.log('\n3️⃣ Testing immediate signin...');
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: testEmail,
      password: testPassword,
    });

    if (signInError) {
      console.error('❌ Immediate signin failed:', signInError);
      console.log('📋 Error details:', {
        message: signInError.message,
        status: signInError.status,
        name: signInError.name
      });
    } else {
      console.log('✅ Immediate signin successful:', signInData.user?.id);
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

    // Try to delete the test user from public.users (if it exists)
    try {
      await supabase.from('users').delete().eq('id', signUpData.user.id);
      console.log('✅ Test user record deleted from public.users');
    } catch (error) {
      console.log('⚠️  Could not delete test user record:', error.message);
    }

    console.log('\n📋 Summary:');
    console.log('- Email confirmation required:', !signUpData.user.email_confirmed_at);
    console.log('- Session established after signup:', !!session);
    console.log('- Immediate signin possible:', !signInError);

    if (signUpData.user.email_confirmed_at) {
      console.log('\n🎉 SUCCESS: Email confirmation is disabled!');
      console.log('Users can now sign up and immediately sign in.');
    } else {
      console.log('\n⚠️  WARNING: Email confirmation is still required.');
      console.log('You need to disable email confirmation in Supabase Dashboard:');
      console.log('1. Go to Supabase Dashboard → Authentication → Settings');
      console.log('2. Find "Enable email confirmations"');
      console.log('3. Turn it OFF');
      console.log('4. Save the changes');
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testSignupWithoutEmailConfirmation();

const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://nnhyuqhypzytnkkdifuk.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5uaHl1cWh5cHp5dG5ra2RpZnVrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU5NzYwOTIsImV4cCI6MjA3MTU1MjA5Mn0.Lug4smvqk5sI-46MbFeh64Yu2nptehnUTlUCPSpYbqI';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkSupabaseConfig() {
  console.log('🔍 Checking Supabase Configuration...\n');

  try {
    // Test 1: Check current session
    console.log('1️⃣ Checking current session...');
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error('❌ Session check failed:', sessionError);
    } else if (session) {
      console.log('✅ Active session found:', session.user.id);
    } else {
      console.log('⚠️  No active session');
    }

    // Test 2: Test signup with a new user
    console.log('\n2️⃣ Testing signup flow...');
    const testEmail = `testconfig${Date.now()}@gmail.com`;
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
    console.log('📧 Created at:', signUpData.user.created_at);
    console.log('📧 Last sign in:', signUpData.user.last_sign_in_at);
    
    // Check if we have a session after signup
    console.log('\n3️⃣ Checking session after signup...');
    const { data: { session: newSession }, error: newSessionError } = await supabase.auth.getSession();
    
    if (newSessionError) {
      console.error('❌ New session check failed:', newSessionError);
    } else if (newSession) {
      console.log('✅ Session established after signup:', newSession.user.id);
    } else {
      console.log('⚠️  No session established after signup');
    }

    // Test 3: Try to sign in immediately
    console.log('\n4️⃣ Testing immediate signin...');
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

    // Test 4: Check session after signin attempt
    console.log('\n5️⃣ Checking session after signin attempt...');
    const { data: { session: finalSession }, error: finalSessionError } = await supabase.auth.getSession();
    
    if (finalSessionError) {
      console.error('❌ Final session check failed:', finalSessionError);
    } else if (finalSession) {
      console.log('✅ Final session active:', finalSession.user.id);
    } else {
      console.log('⚠️  No final session');
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
    console.log('- Session established after signup:', !!newSession);
    console.log('- Immediate signin possible:', !signInError);
    console.log('- Final session active:', !!finalSession);

    if (!signUpData.user.email_confirmed_at) {
      console.log('\n💡 Recommendation:');
      console.log('Email confirmation is required. Users need to confirm their email before they can sign in.');
      console.log('You may want to disable email confirmation in Supabase Auth settings for a smoother user experience.');
    }

  } catch (error) {
    console.error('❌ Configuration check failed:', error);
  }
}

checkSupabaseConfig();

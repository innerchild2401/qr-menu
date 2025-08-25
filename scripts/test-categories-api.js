const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testCategoriesAPI() {
  try {
    console.log('🔍 Testing Categories API...');
    
    // 1. Get current user session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) {
      console.error('❌ Session error:', sessionError);
      return;
    }
    
    if (!session?.user) {
      console.log('❌ No user session found');
      return;
    }
    
    console.log('✅ User authenticated:', session.user.email);
    
    // 2. Test the categories API endpoint
    const response = await fetch('http://localhost:3000/api/admin/categories', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': session.user.id
      }
    });
    
    console.log('📡 API Response Status:', response.status);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Categories API working!');
      console.log('📊 Categories found:', data.categories?.length || 0);
      if (data.categories?.length > 0) {
        console.log('📋 Sample category:', data.categories[0]);
      }
    } else {
      const errorData = await response.json();
      console.error('❌ Categories API error:', errorData);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testCategoriesAPI();

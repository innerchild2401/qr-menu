const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testProductionAPI() {
  try {
    console.log('🧪 Testing production API...\n');

    // 1. Login to get auth token
    console.log('1. Logging in...');
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: 'afilip.mme@gmail.com',
      password: 'parolamea'
    });

    if (authError) {
      console.error('❌ Login failed:', authError);
      return;
    }

    console.log('✅ Login successful');
    const token = authData.session?.access_token;

    // 2. Test the production API with a small batch
    console.log('\n2. Testing production API with small batch...');
    
    const testProducts = [
      { id: '471', name: 'sarica excellence sauv blanc demi' },
      { id: '472', name: 'Vin Alb Pahar' }
    ];

    const response = await fetch('https://qr-menu-ruby-delta.vercel.app/api/generate-product-data', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        products: testProducts,
        scenario: 'regenerate_all',
        respect_cost_limits: true
      })
    });

    console.log('Production API Response Status:', response.status);
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ Production API Response:', result);
    } else {
      const errorText = await response.text();
      console.log('❌ Production API Error:', errorText);
      
      // Try to parse as JSON to get more details
      try {
        const errorJson = JSON.parse(errorText);
        console.log('Error details:', errorJson);
      } catch (e) {
        console.log('Raw error text:', errorText);
      }
    }

    console.log('\n🎯 Production test completed!');

  } catch (error) {
    console.error('❌ Error in production test:', error);
  }
}

testProductionAPI();

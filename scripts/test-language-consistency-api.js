const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testLanguageConsistencyAPI() {
  try {
    console.log('🧪 Testing language consistency API...\n');

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

    // 2. Test the API with a small batch
    console.log('\n2. Testing API with small batch...');
    
    const testProducts = [
      { id: '471', name: 'sarica excellence sauv blanc demi' },
      { id: '472', name: 'Vin Alb Pahar' },
      { id: '473', name: 'Vin Promo' }
    ];

    const response = await fetch('http://localhost:3000/api/generate-product-data', {
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

    console.log('API Response Status:', response.status);
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ API Response:', result);
    } else {
      const errorText = await response.text();
      console.log('❌ API Error:', errorText);
    }

    console.log('\n🎯 Test completed!');

  } catch (error) {
    console.error('❌ Error in test:', error);
  }
}

testLanguageConsistencyAPI();

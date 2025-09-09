const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function debugProduction400() {
  try {
    console.log('🔍 Debugging production 400 errors...\n');

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

    // 2. Test with the exact same products that are failing
    console.log('\n2. Testing with products that are failing in browser...');
    
    const failingProducts = [
      { id: '471', name: 'sarica excellence sauv blanc demi' },
      { id: '472', name: 'Vin Alb Pahar' },
      { id: '473', name: 'Vin Promo' }
    ];

    console.log('Testing products:', failingProducts);

    const response = await fetch('https://qr-menu-ruby-delta.vercel.app/api/generate-product-data', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        products: failingProducts,
        scenario: 'regenerate_all',
        respect_cost_limits: true
      })
    });

    console.log('Production API Response Status:', response.status);
    console.log('Response Headers:', Object.fromEntries(response.headers.entries()));
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ Production API Response:', JSON.stringify(result, null, 2));
    } else {
      const errorText = await response.text();
      console.log('❌ Production API Error Status:', response.status);
      console.log('❌ Production API Error Text:', errorText);
      
      // Try to parse as JSON to get more details
      try {
        const errorJson = JSON.parse(errorText);
        console.log('❌ Error details:', JSON.stringify(errorJson, null, 2));
      } catch (e) {
        console.log('❌ Raw error text:', errorText);
      }
    }

    // 3. Test with a single product to isolate the issue
    console.log('\n3. Testing with single product...');
    
    const singleProduct = [{ id: '471', name: 'sarica excellence sauv blanc demi' }];

    const singleResponse = await fetch('https://qr-menu-ruby-delta.vercel.app/api/generate-product-data', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        products: singleProduct,
        scenario: 'regenerate_all',
        respect_cost_limits: true
      })
    });

    console.log('Single Product Response Status:', singleResponse.status);
    
    if (singleResponse.ok) {
      const result = await singleResponse.json();
      console.log('✅ Single Product Response:', JSON.stringify(result, null, 2));
    } else {
      const errorText = await singleResponse.text();
      console.log('❌ Single Product Error:', errorText);
    }

    // 4. Test with different scenario
    console.log('\n4. Testing with different scenario...');
    
    const forceResponse = await fetch('https://qr-menu-ruby-delta.vercel.app/api/generate-product-data', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        products: singleProduct,
        scenario: 'force',
        respect_cost_limits: true
      })
    });

    console.log('Force Scenario Response Status:', forceResponse.status);
    
    if (forceResponse.ok) {
      const result = await forceResponse.json();
      console.log('✅ Force Scenario Response:', JSON.stringify(result, null, 2));
    } else {
      const errorText = await forceResponse.text();
      console.log('❌ Force Scenario Error:', errorText);
    }

    console.log('\n🎯 Production debugging completed!');

  } catch (error) {
    console.error('❌ Error in production debugging:', error);
  }
}

debugProduction400();

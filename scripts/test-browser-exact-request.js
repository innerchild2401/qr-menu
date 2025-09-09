const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testBrowserExactRequest() {
  try {
    console.log('🔍 Testing exact browser request...\n');

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

    // 2. Get all products to simulate the language consistency check
    console.log('\n2. Getting all products...');
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('id, name, generated_description, has_recipe')
      .eq('restaurant_id', '2f370868-9665-4d38-84ad-912af03940c3')
      .order('id');

    if (productsError) {
      console.error('❌ Products fetch failed:', productsError);
      return;
    }

    console.log(`✅ Found ${products.length} products`);

    // 3. Filter products with descriptions (like the language consistency checker does)
    const productsWithDescriptions = products.filter(p => p.generated_description && p.generated_description.trim() !== '');
    console.log(`✅ Found ${productsWithDescriptions.length} products with descriptions`);

    // 4. Take the first 10 products with descriptions (like the browser does)
    const productsToRegenerate = productsWithDescriptions.slice(0, 10).map(p => ({
      id: p.id.toString(),
      name: p.name
    }));

    console.log('Products to regenerate:', productsToRegenerate);

    // 5. Test the exact request the browser makes
    console.log('\n3. Testing exact browser request...');
    
    const response = await fetch('https://qr-menu-ruby-delta.vercel.app/api/generate-product-data', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        products: productsToRegenerate,
        scenario: 'regenerate_all',
        respect_cost_limits: true
      })
    });

    console.log('Response Status:', response.status);
    console.log('Response Headers:', Object.fromEntries(response.headers.entries()));
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ Success Response:', JSON.stringify(result, null, 2));
    } else {
      const errorText = await response.text();
      console.log('❌ Error Response:', errorText);
      
      try {
        const errorJson = JSON.parse(errorText);
        console.log('❌ Error JSON:', JSON.stringify(errorJson, null, 2));
      } catch (e) {
        console.log('❌ Raw error text:', errorText);
      }
    }

    // 6. Test with a smaller batch to see if it's a size issue
    console.log('\n4. Testing with smaller batch...');
    
    const smallBatch = productsToRegenerate.slice(0, 3);
    console.log('Small batch:', smallBatch);

    const smallResponse = await fetch('https://qr-menu-ruby-delta.vercel.app/api/generate-product-data', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        products: smallBatch,
        scenario: 'regenerate_all',
        respect_cost_limits: true
      })
    });

    console.log('Small batch Response Status:', smallResponse.status);
    
    if (smallResponse.ok) {
      const result = await smallResponse.json();
      console.log('✅ Small batch Success:', JSON.stringify(result, null, 2));
    } else {
      const errorText = await smallResponse.text();
      console.log('❌ Small batch Error:', errorText);
    }

    console.log('\n🎯 Browser exact request test completed!');

  } catch (error) {
    console.error('❌ Error in browser exact request test:', error);
  }
}

testBrowserExactRequest();

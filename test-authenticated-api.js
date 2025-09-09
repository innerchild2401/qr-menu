const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  'https://nnhyuqhypzytnkkdifuk.supabase.co',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function testAuthenticatedAPI() {
  console.log('🔐 Testing authenticated API...\n');
  
  try {
    // Step 1: Sign in
    console.log('🔐 Signing in...');
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: 'afilip.mme@gmail.com',
      password: 'parolamea'
    });
    
    if (authError) {
      console.error('❌ Auth Error:', authError);
      return;
    }
    
    console.log('✅ Signed in successfully:', authData.user?.id);
    
    // Step 2: Get user session
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      console.error('❌ No session found');
      return;
    }
    
    console.log('✅ Session found, access token:', session.access_token.substring(0, 20) + '...');
    
    // Step 3: Test products API with authentication
    console.log('\n📦 Testing products API...');
    const productsResponse = await fetch('https://qr-menu-ruby-delta.vercel.app/api/admin/products', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
        'X-User-ID': authData.user.id
      }
    });
    
    if (productsResponse.ok) {
      const productsData = await productsResponse.json();
      console.log('✅ Products API Success!');
      console.log(`📊 Found ${productsData.products?.length || 0} products`);
      
      // Show sample products
      const sampleProducts = productsData.products?.slice(0, 3) || [];
      sampleProducts.forEach((p, i) => {
        console.log(`\n${i + 1}. ${p.name} (ID: ${p.id}):`);
        console.log(`   Manual Override: ${p.manual_language_override}`);
        console.log(`   Has Description: ${!!p.generated_description}`);
        if (p.generated_description) {
          console.log(`   Description: ${p.generated_description.substring(0, 100)}...`);
        }
      });
      
      // Check for hardcoded patterns
      console.log('\n🔍 Checking for hardcoded patterns:');
      const hardcodedPatterns = [
        'Delicios preparat tradițional românesc',
        'Gustos preparat cu ingrediente proaspete',
        'Preparat autentic, gătit cu pasiune',
        'Delicious traditional preparation',
        'Tasty dish with fresh ingredients',
        'Authentic preparation, cooked with passion'
      ];
      
      productsData.products?.forEach(p => {
        const desc = p.generated_description || '';
        const hasHardcoded = hardcodedPatterns.some(pattern => desc.includes(pattern));
        if (hasHardcoded) {
          console.log(`❌ ${p.name}: Contains hardcoded pattern`);
        } else if (desc) {
          console.log(`✅ ${p.name}: Appears to be AI-generated`);
        }
      });
      
    } else {
      const errorData = await productsResponse.text();
      console.error('❌ Products API Error:', productsResponse.status, errorData);
    }
    
    // Step 4: Test generation API
    console.log('\n🤖 Testing generation API...');
    const testPayload = {
      products: [
        {
          id: "test-123",
          name: "Classic CheeseBurger",
          manual_language_override: "ro"
        }
      ],
      scenario: "force"
    };
    
    const generateResponse = await fetch('https://qr-menu-ruby-delta.vercel.app/api/generate-product-data', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
        'X-User-ID': authData.user.id
      },
      body: JSON.stringify(testPayload)
    });
    
    if (generateResponse.ok) {
      const generateData = await generateResponse.json();
      console.log('✅ Generate API Success!');
      console.log('Response:', JSON.stringify(generateData, null, 2));
    } else {
      const errorData = await generateResponse.text();
      console.error('❌ Generate API Error:', generateResponse.status, errorData);
    }
    
  } catch (error) {
    console.error('❌ Test Error:', error);
  }
}

testAuthenticatedAPI().catch(console.error);

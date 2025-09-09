const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  'https://nnhyuqhypzytnkkdifuk.supabase.co',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function testGPTLanguage() {
  console.log('🧪 Testing GPT language generation...\n');
  
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
    
    // Step 3: Test generation with a specific product that has manual_language_override: 'ro'
    console.log('\n🤖 Testing generation with manual_language_override: ro...');
    
    // First, let's find a product with manual_language_override: 'ro'
    const { data: products } = await supabase
      .from('products')
      .select('id, name, manual_language_override')
      .eq('manual_language_override', 'ro')
      .limit(1);
    
    if (!products || products.length === 0) {
      console.log('❌ No products with manual_language_override: ro found');
      return;
    }
    
    const testProduct = products[0];
    console.log(`📦 Testing with product: ${testProduct.name} (ID: ${testProduct.id})`);
    console.log(`   Manual Override: ${testProduct.manual_language_override}`);
    
    // Test the generation API
    const testPayload = {
      products: [
        {
          id: String(testProduct.id),
          name: testProduct.name,
          manual_language_override: "ro"
        }
      ],
      scenario: "force"
    };
    
    console.log('\n🚀 Sending generation request...');
    console.log('Payload:', JSON.stringify(testPayload, null, 2));
    
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
      
      // Check the generated description
      if (generateData.results && generateData.results.length > 0) {
        const result = generateData.results[0];
        console.log('\n📝 Generated Description:');
        console.log(`   Language: ${result.language}`);
        console.log(`   Description: ${result.generated_description}`);
        
        // Check if it's in Romanian
        const romanianWords = ['cu', 'și', 'de', 'la', 'în', 'pentru', 'sau', 'dar', 'când', 'cum', 'ce', 'care', 'unde', 'cât', 'prea', 'foarte', 'mai', 'tot', 'toate', 'toți', 'este', 'sunt', 'are', 'au', 'va', 'vor', 'am', 'ai', 'a', 'o', 'un'];
        const englishWords = ['with', 'and', 'of', 'the', 'in', 'for', 'or', 'but', 'when', 'how', 'what', 'which', 'where', 'how', 'too', 'very', 'more', 'very', 'all', 'every', 'everyone', 'everything', 'is', 'are', 'has', 'have', 'will', 'would', 'am', 'you', 'a', 'an'];
        
        const desc = result.generated_description.toLowerCase();
        const romanianCount = romanianWords.reduce((count, word) => 
          count + (desc.includes(word) ? 1 : 0), 0
        );
        const englishCount = englishWords.reduce((count, word) => 
          count + (desc.includes(word) ? 1 : 0), 0
        );
        
        console.log(`\n🔍 Language Analysis:`);
        console.log(`   Romanian words: ${romanianCount}`);
        console.log(`   English words: ${englishCount}`);
        console.log(`   Detected as: ${romanianCount > englishCount ? 'Romanian' : 'English'}`);
      }
    } else {
      const errorData = await generateResponse.text();
      console.error('❌ Generate API Error:', generateResponse.status, errorData);
    }
    
  } catch (error) {
    console.error('❌ Test Error:', error);
  }
}

testGPTLanguage().catch(console.error);

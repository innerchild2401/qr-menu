const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  'https://nnhyuqhypzytnkkdifuk.supabase.co',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function checkClassicCheeseburger() {
  console.log('🔍 Checking Classic CheeseBurger status...\n');
  
  try {
    // Sign in
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: 'afilip.mme@gmail.com',
      password: 'parolamea'
    });
    
    if (authError) {
      console.error('❌ Auth Error:', authError);
      return;
    }
    
    console.log('✅ Signed in successfully');
    
    // Get user session
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      console.error('❌ No session found');
      return;
    }
    
    // Check Classic CheeseBurger specifically
    const { data: product, error } = await supabase
      .from('products')
      .select('id, name, generated_description, manual_language_override, ai_last_updated')
      .eq('name', 'Classic CheeseBurger')
      .single();
    
    if (error) {
      console.error('❌ Database Error:', error);
      return;
    }
    
    console.log('🍔 Classic CheeseBurger Status:');
    console.log(`   ID: ${product.id}`);
    console.log(`   Manual Override: ${product.manual_language_override}`);
    console.log(`   AI Last Updated: ${product.ai_last_updated}`);
    console.log(`   Description: ${product.generated_description}`);
    
    // Check if it's in English or Romanian
    const desc = product.generated_description || '';
    const romanianWords = ['cu', 'și', 'de', 'la', 'în', 'pentru', 'sau', 'dar', 'când', 'cum', 'ce', 'care', 'unde', 'cât', 'prea', 'foarte', 'mai', 'tot', 'toate', 'toți', 'este', 'sunt', 'are', 'au', 'va', 'vor', 'am', 'ai', 'a', 'o', 'un'];
    const englishWords = ['with', 'and', 'of', 'the', 'in', 'for', 'or', 'but', 'when', 'how', 'what', 'which', 'where', 'how', 'too', 'very', 'more', 'very', 'all', 'every', 'everyone', 'everything', 'is', 'are', 'has', 'have', 'will', 'would', 'am', 'you', 'a', 'an'];
    
    const lowerDesc = desc.toLowerCase();
    const romanianCount = romanianWords.reduce((count, word) => 
      count + (lowerDesc.includes(word) ? 1 : 0), 0
    );
    const englishCount = englishWords.reduce((count, word) => 
      count + (lowerDesc.includes(word) ? 1 : 0), 0
    );
    
    console.log(`\n🔍 Language Analysis:`);
    console.log(`   Romanian words: ${romanianCount}`);
    console.log(`   English words: ${englishCount}`);
    console.log(`   Detected as: ${romanianCount > englishCount ? 'Romanian' : 'English'}`);
    
    if (romanianCount <= englishCount) {
      console.log('❌ Classic CheeseBurger is still in English!');
      
      // Try to regenerate it
      console.log('\n🔄 Attempting to regenerate Classic CheeseBurger...');
      
      const testPayload = {
        products: [
          {
            id: String(product.id),
            name: product.name,
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
        console.log('✅ Regeneration successful!');
        console.log('New description:', generateData.results[0]?.generated_description);
      } else {
        const errorData = await generateResponse.text();
        console.error('❌ Regeneration failed:', generateResponse.status, errorData);
      }
    } else {
      console.log('✅ Classic CheeseBurger is in Romanian!');
    }
    
  } catch (error) {
    console.error('❌ Test Error:', error);
  }
}

checkClassicCheeseburger().catch(console.error);

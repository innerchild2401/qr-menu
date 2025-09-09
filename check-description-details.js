const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  'https://nnhyuqhypzytnkkdifuk.supabase.co',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function checkDescriptionDetails() {
  console.log('🔍 Checking Classic CheeseBurger description details...\n');
  
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
    
    console.log('🍔 Classic CheeseBurger Full Description:');
    console.log(`"${product.generated_description}"`);
    console.log(`\nManual Override: ${product.manual_language_override}`);
    console.log(`AI Last Updated: ${product.ai_last_updated}`);
    
    // Check if it's actually in English
    const desc = product.generated_description || '';
    const isEnglish = desc.includes('Delicious') || desc.includes('classic cheeseburger') || desc.includes('juicy beef patty') || desc.includes('melted cheddar cheese');
    
    console.log(`\n🔍 Manual Check:`);
    console.log(`   Contains "Delicious": ${desc.includes('Delicious')}`);
    console.log(`   Contains "classic cheeseburger": ${desc.includes('classic cheeseburger')}`);
    console.log(`   Contains "juicy beef patty": ${desc.includes('juicy beef patty')}`);
    console.log(`   Contains "melted cheddar cheese": ${desc.includes('melted cheddar cheese')}`);
    console.log(`   Is English: ${isEnglish}`);
    
    if (isEnglish) {
      console.log('\n❌ CONFIRMED: Classic CheeseBurger is in English!');
      console.log('The language detection algorithm is flawed.');
      
      // Let's regenerate it properly
      console.log('\n🔄 Regenerating Classic CheeseBurger...');
      
      const { data: { session } } = await supabase.auth.getSession();
      
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
        
        // Check the new description
        const newDesc = generateData.results[0]?.generated_description || '';
        const newIsEnglish = newDesc.includes('Delicious') || newDesc.includes('classic cheeseburger') || newDesc.includes('juicy beef patty');
        console.log(`\n🔍 New Description Check:`);
        console.log(`   Is English: ${newIsEnglish}`);
        console.log(`   Description: "${newDesc}"`);
      } else {
        const errorData = await generateResponse.text();
        console.error('❌ Regeneration failed:', generateResponse.status, errorData);
      }
    } else {
      console.log('✅ Classic CheeseBurger appears to be in Romanian');
    }
    
  } catch (error) {
    console.error('❌ Test Error:', error);
  }
}

checkDescriptionDetails().catch(console.error);

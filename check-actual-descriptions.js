const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function checkDescriptions() {
  console.log('🔍 Checking actual product descriptions...\n');
  
  const { data, error } = await supabase
    .from('products')
    .select('id, name, generated_description, manual_language_override')
    .in('name', ['Classic CheeseBurger', 'Spicy Crispy Chicken', 'Chicken Curry'])
    .limit(3);
  
  if (error) {
    console.error('❌ Error:', error);
    return;
  }
  
  console.log('📋 Sample product descriptions:');
  data.forEach(p => {
    console.log(`\n🍔 ${p.name} (ID: ${p.id}):`);
    console.log(`   Manual Override: ${p.manual_language_override}`);
    console.log(`   Description: ${p.generated_description?.substring(0, 200)}...`);
    
    // Test the language detection logic
    const description = p.generated_description || '';
    const romanianWords = ['cu', 'și', 'de', 'la', 'în', 'pentru', 'sau', 'dar', 'când', 'cum', 'ce', 'care', 'unde', 'cât', 'cum', 'prea', 'foarte', 'mai', 'foarte', 'tot', 'toate', 'toți', 'toate', 'este', 'sunt', 'are', 'au', 'va', 'vor', 'am', 'ai', 'a', 'o', 'un', 'o', 'și', 'sau', 'dar', 'când', 'cum', 'ce', 'care', 'unde', 'cât', 'cum', 'prea', 'foarte', 'mai', 'foarte', 'tot', 'toate', 'toți', 'toate'];
    const englishWords = ['with', 'and', 'of', 'the', 'in', 'for', 'or', 'but', 'when', 'how', 'what', 'which', 'where', 'how', 'too', 'very', 'more', 'very', 'all', 'every', 'everyone', 'everything', 'is', 'are', 'has', 'have', 'will', 'would', 'am', 'you', 'a', 'an', 'and', 'or', 'but', 'when', 'how', 'what', 'which', 'where', 'how', 'too', 'very', 'more', 'very', 'all', 'every', 'everyone', 'everything'];
    
    const lowerText = description.toLowerCase();
    const romanianCount = romanianWords.reduce((count, word) => 
      count + (lowerText.includes(word) ? 1 : 0), 0
    );
    const englishCount = englishWords.reduce((count, word) => 
      count + (lowerText.includes(word) ? 1 : 0), 0
    );
    
    const detectedLanguage = romanianCount > englishCount ? 'ro' : 'en';
    console.log(`   Detected Language: ${detectedLanguage} (RO: ${romanianCount}, EN: ${englishCount})`);
  });
}

checkDescriptions().catch(console.error);

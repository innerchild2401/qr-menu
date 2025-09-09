// Script to check if product descriptions were updated in the database
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDatabaseUpdates() {
  try {
    console.log('Checking database for updated product descriptions...\n');
    
    // Check some of the products that were regenerated
    const testProductIds = ['584', '396', '351', '353', '350', '372', '400', '390', '395', '379'];
    
    const { data: products, error } = await supabase
      .from('products')
      .select('id, name, generated_description, manual_language_override, ai_generated_at, ai_last_updated')
      .in('id', testProductIds)
      .order('ai_last_updated', { ascending: false });

    if (error) {
      console.error('❌ Database query failed:', error);
      return;
    }

    console.log(`✅ Found ${products.length} products\n`);
    
    products.forEach((product, index) => {
      console.log(`${index + 1}. ${product.name} (ID: ${product.id})`);
      console.log(`   Language Override: ${product.manual_language_override || 'none'}`);
      console.log(`   AI Generated At: ${product.ai_generated_at || 'never'}`);
      console.log(`   AI Last Updated: ${product.ai_last_updated || 'never'}`);
      console.log(`   Has Description: ${!!product.generated_description}`);
      if (product.generated_description) {
        console.log(`   Description Preview: ${product.generated_description.substring(0, 100)}...`);
      }
      console.log('');
    });

    // Check recent GPT logs
    console.log('Checking recent GPT logs...\n');
    
    const { data: logs, error: logsError } = await supabase
      .from('gpt_logs')
      .select('*')
      .eq('request_type', 'product_description')
      .order('created_at', { ascending: false })
      .limit(10);

    if (logsError) {
      console.error('❌ GPT logs query failed:', logsError);
    } else {
      console.log(`✅ Found ${logs.length} recent GPT logs\n`);
      
      logs.forEach((log, index) => {
        console.log(`${index + 1}. ${new Date(log.created_at).toLocaleString()}`);
        console.log(`   Tokens Used: ${log.tokens_used || 0}`);
        console.log(`   Cost: $${log.cost_estimate || 0}`);
        console.log(`   Processing Time: ${log.processing_time_ms || 0}ms`);
        console.log(`   Success: ${!log.error_message}`);
        if (log.error_message) {
          console.log(`   Error: ${log.error_message}`);
        }
        console.log('');
      });
    }

  } catch (error) {
    console.error('❌ Script error:', error);
  }
}

checkDatabaseUpdates();

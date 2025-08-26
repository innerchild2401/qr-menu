const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://nnhyuqhypzytnkkdifuk.supabase.co';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5uaHl1cWh5cHp5dG5ra2RpZnVrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTk3NjA5MiwiZXhwIjoyMDcxNTUyMDkyfQ.5gqpZ6FAMlLPFwKv-p14lssKiRt2AOMqmOY926xos8I';

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  }
});

async function addDatabaseColumns() {
  try {
    console.log('🚀 Starting to add database columns...');
    
    // Test connection first
    console.log('🔍 Testing database connection...');
    const { data: testData, error: testError } = await supabase
      .from('restaurants')
      .select('count')
      .limit(1);
    
    if (testError) {
      console.error('❌ Database connection failed:', testError);
      return;
    }
    
    console.log('✅ Database connection successful');
    
    // Since we can't execute raw SQL directly, we'll need to add columns through Supabase dashboard
    // or use the Supabase CLI. For now, let's provide instructions.
    
    console.log('\n📋 Database columns that need to be added:');
    console.log('\n1. In the categories table:');
    console.log('   • sort_order (INTEGER, DEFAULT 0)');
    console.log('   • created_at (TIMESTAMP WITH TIME ZONE, DEFAULT NOW())');
    
    console.log('\n2. In the products table:');
    console.log('   • available (BOOLEAN, DEFAULT true)');
    console.log('   • sort_order (INTEGER, DEFAULT 0)');
    console.log('   • created_at (TIMESTAMP WITH TIME ZONE, DEFAULT NOW())');
    
    console.log('\n🔧 To add these columns:');
    console.log('1. Go to your Supabase dashboard');
    console.log('2. Navigate to Table Editor');
    console.log('3. Select the categories table and add the columns');
    console.log('4. Select the products table and add the columns');
    console.log('5. Or use the SQL editor to run the migration script');
    
    console.log('\n📄 SQL commands to run in Supabase SQL Editor:');
    console.log(`
-- Add columns to categories table
ALTER TABLE categories ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Add columns to products table  
ALTER TABLE products ADD COLUMN IF NOT EXISTS available BOOLEAN DEFAULT true;
ALTER TABLE products ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Update existing records
UPDATE categories SET sort_order = id::integer WHERE sort_order IS NULL OR sort_order = 0;
UPDATE products SET available = true WHERE available IS NULL;
UPDATE products SET sort_order = id::integer WHERE sort_order IS NULL OR sort_order = 0;
    `);
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Run the script
addDatabaseColumns();

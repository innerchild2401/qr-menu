const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Supabase configuration
const supabaseUrl = 'https://nnhyuqhypzytnkkdifuk.supabase.co';
const supabaseServiceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5uaHl1cWh5cHp5dG5ra2RpZnVrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTk3NjA5MiwiZXhwIjoyMDcxNTUyMDkyfQ.5gqpZ6FAMlLPFwKv-p14lssKiRt2AOMqmOY926xos8I';

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function runAuthMigration() {
  try {
    console.log('🔧 Running authentication schema migration...');
    
    // Read the SQL file
    const sqlFilePath = path.join(__dirname, 'setup-complete-auth-schema.sql');
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
    
    console.log('📝 SQL file loaded successfully');
    console.log('⚠️  IMPORTANT: This script will create new tables and modify existing ones.');
    console.log('⚠️  Please make sure you have backed up your data if needed.');
    
    // Split SQL into individual statements
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    console.log(`📋 Found ${statements.length} SQL statements to execute`);
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      console.log(`\n🔄 Executing statement ${i + 1}/${statements.length}...`);
      
      try {
        const { data, error } = await supabase.rpc('exec_sql', { sql: statement });
        
        if (error) {
          console.log(`❌ Error executing statement ${i + 1}:`, error.message);
          // Continue with next statement
        } else {
          console.log(`✅ Statement ${i + 1} executed successfully`);
        }
      } catch (err) {
        console.log(`❌ Error executing statement ${i + 1}:`, err.message);
        // Continue with next statement
      }
    }
    
    console.log('\n🎉 Migration completed!');
    console.log('\n📋 Next steps:');
    console.log('1. Enable Supabase Auth in your project dashboard');
    console.log('2. Configure email templates if needed');
    console.log('3. Test the sign-up flow');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
  }
}

// Check if exec_sql function exists
async function checkExecSqlFunction() {
  try {
    const { data, error } = await supabase.rpc('exec_sql', { sql: 'SELECT 1' });
    if (error) {
      console.log('❌ exec_sql function not available');
      console.log('📝 Please run the SQL script manually in the Supabase SQL Editor:');
      console.log('1. Go to your Supabase project dashboard');
      console.log('2. Navigate to SQL Editor');
      console.log('3. Copy and paste the contents of scripts/setup-complete-auth-schema.sql');
      console.log('4. Click "Run" to execute the script');
      return false;
    }
    return true;
  } catch (err) {
    console.log('❌ exec_sql function not available');
    console.log('📝 Please run the SQL script manually in the Supabase SQL Editor');
    return false;
  }
}

async function main() {
  const hasExecSql = await checkExecSqlFunction();
  if (hasExecSql) {
    await runAuthMigration();
  }
}

main();

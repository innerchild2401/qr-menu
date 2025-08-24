const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const supabaseUrl = 'https://nnhyuqhypzytnkkdifuk.supabase.co';
const supabaseServiceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5uaHl1cWh5cHp5dG5ra2RpZnVrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTk3NjA5MiwiZXhwIjoyMDcxNTUyMDkyfQ.5gqpZ6FAMlLPFwKv-p14lssKiRt2AOMqmOY926xos8I';

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function analyzeDatabaseSchema() {
  console.log('🔍 Analyzing Database Schema...\n');

  try {
    // List of tables we know should exist based on the codebase
    const expectedTables = [
      'restaurants',
      'categories', 
      'products',
      'popups',
      'users',
      'user_restaurants'
    ];

    const databaseSchema = {};

    console.log('📋 Analyzing expected tables:');
    expectedTables.forEach(table => console.log(`  - ${table}`));
    console.log('');

    // Analyze each expected table
    for (const tableName of expectedTables) {
      console.log(`🔍 Analyzing table: ${tableName}`);

      try {
        // Try to get sample data to see if table exists and what columns it has
        const { data: sampleData, error: sampleError } = await supabase
          .from(tableName)
          .select('*')
          .limit(1);

        if (sampleError) {
          console.log(`  ❌ Table ${tableName} does not exist or is not accessible:`, sampleError.message);
          continue;
        }

        // Table exists, analyze its structure
        const columns = sampleData && sampleData.length > 0 ? Object.keys(sampleData[0]) : [];
        
        console.log(`  ✅ Table ${tableName} exists`);
        console.log(`  📊 Columns (${columns.length}):`);
        columns.forEach(col => console.log(`    - ${col}`));

        // Get row count
        const { count, error: countError } = await supabase
          .from(tableName)
          .select('*', { count: 'exact', head: true });

        const rowCount = countError ? 'unknown' : count;
        console.log(`  📈 Row count: ${rowCount}`);

        // Store table information
        databaseSchema[tableName] = {
          exists: true,
          columns: columns,
          sampleData: sampleData?.[0] || null,
          rowCount: rowCount
        };

        // Analyze relationships by checking foreign key patterns
        const relationships = [];
        columns.forEach(col => {
          if (col.endsWith('_id') && col !== 'id') {
            const referencedTable = col.replace('_id', '');
            relationships.push({
              column: col,
              references: referencedTable
            });
          }
        });

        if (relationships.length > 0) {
          console.log(`  🔗 Potential foreign keys (${relationships.length}):`);
          relationships.forEach(rel => {
            console.log(`    - ${rel.column} -> ${rel.references}`);
          });
        }

      } catch (error) {
        console.log(`  ❌ Error analyzing ${tableName}:`, error.message);
        databaseSchema[tableName] = {
          exists: false,
          error: error.message
        };
      }

      console.log('');
    }

    // Generate comprehensive report
    console.log('📋 COMPREHENSIVE DATABASE SCHEMA REPORT');
    console.log('=====================================\n');

    console.log('🎯 TABLES AND THEIR STRUCTURE:');
    console.log('==============================');
    
    Object.entries(databaseSchema).forEach(([tableName, tableInfo]) => {
      if (tableInfo.exists) {
        console.log(`\n📋 Table: ${tableName}`);
        console.log(`   Row Count: ${tableInfo.rowCount || 'Unknown'}`);
        console.log('   Columns:');
        tableInfo.columns.forEach(col => {
          console.log(`     - ${col}`);
        });

        if (tableInfo.sampleData) {
          console.log('   Sample data structure:');
          Object.entries(tableInfo.sampleData).forEach(([key, value]) => {
            const type = typeof value;
            const preview = value !== null && value !== undefined ? 
              (typeof value === 'string' ? `"${value.substring(0, 50)}${value.length > 50 ? '...' : ''}"` : 
               typeof value === 'object' ? JSON.stringify(value).substring(0, 50) + '...' : 
               String(value)) : 'null';
            console.log(`     - ${key}: ${type} = ${preview}`);
          });
        }
      } else {
        console.log(`\n❌ Table: ${tableName} - DOES NOT EXIST`);
        console.log(`   Error: ${tableInfo.error}`);
      }
    });

    // Save detailed report to file
    const fs = require('fs');
    const reportPath = 'database-schema-analysis.json';
    fs.writeFileSync(reportPath, JSON.stringify(databaseSchema, null, 2));
    console.log(`\n💾 Detailed schema saved to: ${reportPath}`);

    // Analyze code references vs actual database
    console.log('\n🔧 CODE vs DATABASE ANALYSIS:');
    console.log('=============================');
    
    const missingItems = [];
    
    // Check restaurants table
    const restaurantsTable = databaseSchema['restaurants'];
    if (restaurantsTable && restaurantsTable.exists) {
      const expectedColumns = ['id', 'name', 'slug', 'address', 'schedule', 'logo_url', 'cover_url', 'created_at', 'owner_id'];
      const missingColumns = expectedColumns.filter(col => !restaurantsTable.columns.includes(col));
      
      if (missingColumns.length > 0) {
        missingItems.push({
          table: 'restaurants',
          type: 'MISSING_COLUMNS',
          items: missingColumns
        });
      }
    } else {
      missingItems.push({
        table: 'restaurants',
        type: 'MISSING_TABLE'
      });
    }

    // Check users table
    if (!databaseSchema['users'] || !databaseSchema['users'].exists) {
      missingItems.push({
        table: 'users',
        type: 'MISSING_TABLE'
      });
    }

    // Check user_restaurants table
    if (!databaseSchema['user_restaurants'] || !databaseSchema['user_restaurants'].exists) {
      missingItems.push({
        table: 'user_restaurants',
        type: 'MISSING_TABLE'
      });
    }

    if (missingItems.length > 0) {
      console.log('❌ Missing items detected:');
      missingItems.forEach(item => {
        if (item.type === 'MISSING_TABLE') {
          console.log(`   - Missing table: ${item.table}`);
        } else if (item.type === 'MISSING_COLUMNS') {
          console.log(`   - Missing columns in ${item.table}: ${item.items.join(', ')}`);
        }
      });
    } else {
      console.log('✅ All expected tables and columns are present');
    }

    // Generate SQL fixes
    console.log('\n🔧 SQL FIXES NEEDED:');
    console.log('====================');
    
    if (missingItems.length > 0) {
      console.log('-- SQL commands to fix missing items:');
      console.log('');
      
      missingItems.forEach(item => {
        if (item.type === 'MISSING_TABLE') {
          if (item.table === 'users') {
            console.log('-- Create users table');
            console.log('CREATE TABLE users (');
            console.log('  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,');
            console.log('  email TEXT UNIQUE NOT NULL,');
            console.log('  full_name TEXT,');
            console.log('  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),');
            console.log('  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()');
            console.log(');');
            console.log('');
          } else if (item.table === 'user_restaurants') {
            console.log('-- Create user_restaurants table');
            console.log('CREATE TABLE user_restaurants (');
            console.log('  user_id UUID REFERENCES users(id) ON DELETE CASCADE,');
            console.log('  restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,');
            console.log('  role TEXT DEFAULT \'owner\' CHECK (role IN (\'owner\', \'admin\', \'staff\')),');
            console.log('  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),');
            console.log('  PRIMARY KEY (user_id, restaurant_id)');
            console.log(');');
            console.log('');
          }
        } else if (item.type === 'MISSING_COLUMNS') {
          if (item.table === 'restaurants') {
            item.items.forEach(col => {
              if (col === 'owner_id') {
                console.log('-- Add owner_id column to restaurants table');
                console.log('ALTER TABLE restaurants ADD COLUMN owner_id UUID REFERENCES users(id);');
                console.log('');
              }
            });
          }
        }
      });
    } else {
      console.log('✅ No SQL fixes needed - all items are present');
    }

    return databaseSchema;

  } catch (error) {
    console.error('❌ Analysis failed:', error);
    return null;
  }
}

// Run the analysis
analyzeDatabaseSchema().then(schema => {
  if (schema) {
    console.log('\n✅ Database analysis completed successfully!');
  } else {
    console.log('\n❌ Database analysis failed!');
  }
  process.exit(0);
}).catch(error => {
  console.error('❌ Unexpected error:', error);
  process.exit(1);
});

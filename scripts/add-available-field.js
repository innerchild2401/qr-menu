const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('🔧 Adding available field to categories table');

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function addAvailableField() {
  try {
    console.log('\n🔍 Step 1: Check current categories table schema...');
    
    // First, let's see what columns exist in the categories table
    const { data: categories, error: categoriesError } = await supabaseAdmin
      .from('categories')
      .select('*')
      .limit(1);
    
    if (categoriesError) {
      console.error('❌ Error querying categories:', categoriesError);
      return;
    }
    
    console.log('📊 Current categories table structure:');
    if (categories && categories.length > 0) {
      console.log('Sample category:', categories[0]);
      console.log('Available columns:', Object.keys(categories[0]));
    } else {
      console.log('No categories found, checking table structure...');
    }
    
    console.log('\n🔍 Step 2: Check if available field exists...');
    
    // Try to query the available field specifically
    const { data: availableTest, error: availableError } = await supabaseAdmin
      .from('categories')
      .select('id, available')
      .limit(1);
    
    if (availableError) {
      console.log('❌ Available field does not exist, adding it...');
      
      // Add the available column to the categories table
      const { error: alterError } = await supabaseAdmin.rpc('exec_sql', {
        sql: `
          ALTER TABLE categories 
          ADD COLUMN IF NOT EXISTS available BOOLEAN DEFAULT true;
        `
      });
      
      if (alterError) {
        console.error('❌ Error adding available column:', alterError);
        console.log('\n💡 Manual SQL to run:');
        console.log('ALTER TABLE categories ADD COLUMN IF NOT EXISTS available BOOLEAN DEFAULT true;');
        return;
      }
      
      console.log('✅ Available column added successfully!');
    } else {
      console.log('✅ Available field already exists');
    }
    
    console.log('\n🔍 Step 3: Update existing categories to have available=true...');
    
    // Update all existing categories to have available=true
    const { data: updateResult, error: updateError } = await supabaseAdmin
      .from('categories')
      .update({ available: true })
      .is('available', null);
    
    if (updateError) {
      console.error('❌ Error updating categories:', updateError);
    } else {
      console.log('✅ Updated categories with available=true');
    }
    
    console.log('\n🔍 Step 4: Verify the changes...');
    
    // Verify the changes
    const { data: finalCategories, error: finalError } = await supabaseAdmin
      .from('categories')
      .select('id, name, available')
      .limit(5);
    
    if (finalError) {
      console.error('❌ Error verifying changes:', finalError);
    } else {
      console.log('✅ Final categories with available field:');
      console.log(finalCategories);
    }
    
  } catch (error) {
    console.error('❌ Script failed:', error);
  }
}

addAvailableField();

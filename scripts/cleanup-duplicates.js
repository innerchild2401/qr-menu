const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://nnhyuqhypzytnkkdifuk.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5uaHl1cWh5cHp5dG5ra2RpZnVrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU5NzYwOTIsImV4cCI6MjA3MTU1MjA5Mn0.Lug4smvqk5sI-46MbFeh64Yu2nptehnUTlUCPSpYbqI';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function cleanupDuplicates() {
  console.log('🧹 Cleaning up duplicate categories and products...\n');

  try {
    // Sign in
    console.log('🔐 Signing in...');
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: 'eu@eu.com',
      password: 'parolamea'
    });

    if (signInError) {
      console.error('❌ Sign in error:', signInError);
      return;
    }

    console.log('✅ Signed in successfully');

    // Get restaurant
    const { data: restaurant, error: restaurantError } = await supabase
      .from('restaurants')
      .select('*')
      .eq('name', 'myprecious')
      .single();

    if (restaurantError) {
      console.error('❌ Failed to get restaurant:', restaurantError);
      return;
    }

    console.log(`🏪 Restaurant: ${restaurant.name} (${restaurant.id})`);

    // Get all categories for this restaurant
    const { data: categories, error: categoriesError } = await supabase
      .from('categories')
      .select('*')
      .eq('restaurant_id', restaurant.id)
      .order('id');

    if (categoriesError) {
      console.error('❌ Failed to get categories:', categoriesError);
      return;
    }

    console.log(`\n📂 Found ${categories.length} categories`);

    // Group categories by name
    const categoryGroups = {};
    categories.forEach(cat => {
      if (!categoryGroups[cat.name]) {
        categoryGroups[cat.name] = [];
      }
      categoryGroups[cat.name].push(cat);
    });

    // Find duplicates
    const duplicates = {};
    Object.keys(categoryGroups).forEach(name => {
      if (categoryGroups[name].length > 1) {
        duplicates[name] = categoryGroups[name];
      }
    });

    if (Object.keys(duplicates).length === 0) {
      console.log('✅ No duplicate categories found');
      return;
    }

    console.log('\n🔄 Found duplicate categories:');
    Object.keys(duplicates).forEach(name => {
      console.log(`   ${name}: ${duplicates[name].map(c => c.id).join(', ')}`);
    });

    // Keep the first category of each name, delete the rest
    console.log('\n🗑️  Deleting duplicate categories...');
    for (const [name, cats] of Object.entries(duplicates)) {
      const keepCategory = cats[0]; // Keep the first one
      const deleteCategories = cats.slice(1); // Delete the rest

      console.log(`\n📁 ${name}:`);
      console.log(`   Keeping: ${keepCategory.id}`);
      console.log(`   Deleting: ${deleteCategories.map(c => c.id).join(', ')}`);

      // First, move products from duplicate categories to the kept category
      for (const deleteCat of deleteCategories) {
        const { error: updateError } = await supabase
          .from('products')
          .update({ category_id: keepCategory.id })
          .eq('category_id', deleteCat.id);

        if (updateError) {
          console.error(`❌ Failed to move products from category ${deleteCat.id}:`, updateError);
        } else {
          console.log(`   ✅ Moved products from category ${deleteCat.id} to ${keepCategory.id}`);
        }

        // Delete the duplicate category
        const { error: deleteError } = await supabase
          .from('categories')
          .delete()
          .eq('id', deleteCat.id);

        if (deleteError) {
          console.error(`❌ Failed to delete category ${deleteCat.id}:`, deleteError);
        } else {
          console.log(`   ✅ Deleted category ${deleteCat.id}`);
        }
      }
    }

    console.log('\n✅ Cleanup completed!');

    // Sign out
    await supabase.auth.signOut();
    console.log('🔓 Signed out');

  } catch (error) {
    console.error('❌ Cleanup failed:', error);
  }
}

// Run the cleanup
cleanupDuplicates();


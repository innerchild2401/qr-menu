const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://nnhyuqhypzytnkkdifuk.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5uaHl1cWh5cHp5dG5ra2RpZnVrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU5NzYwOTIsImV4cCI6MjA3MTU1MjA5Mn0.Lug4smvqk5sI-46MbFeh64Yu2nptehnUTlUCPSpYbqI';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function listRestaurants() {
  console.log('🏪 Listing all restaurants...\n');

  try {
    const { data: restaurants, error } = await supabase
      .from('restaurants')
      .select('*')
      .order('name');

    if (error) {
      console.error('❌ Failed to get restaurants:', error);
      return;
    }

    console.log(`Found ${restaurants.length} restaurants:\n`);
    restaurants.forEach(restaurant => {
      console.log(`🏪 ${restaurant.name}`);
      console.log(`   ID: ${restaurant.id}`);
      console.log(`   Slug: ${restaurant.slug}`);
      console.log(`   Owner ID: ${restaurant.owner_id}`);
      console.log(`   Address: ${restaurant.address || 'N/A'}`);
      console.log('');
    });

  } catch (error) {
    console.error('❌ Failed to list restaurants:', error);
  }
}

// Run the script
listRestaurants();


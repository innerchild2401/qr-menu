const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const supabaseUrl = 'https://nnhyuqhypzytnkkdifuk.supabase.co';
const supabaseServiceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5uaHl1cWh5cHp5dG5ra2RpZnVrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTk3NjA5MiwiZXhwIjoyMDcxNTUyMDkyfQ.5gqpZ6FAMlLPFwKv-p14lssKiRt2AOMqmOY926xos8I';

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function checkRestaurantSchema() {
  try {
    console.log('🔍 Checking restaurants table schema...');
    
    // Get a sample restaurant to see the structure
    const { data: restaurants, error } = await supabase
      .from('restaurants')
      .select('*')
      .limit(1);
    
    if (error) {
      console.error('❌ Error fetching restaurants:', error);
      return;
    }
    
    if (restaurants && restaurants.length > 0) {
      const restaurant = restaurants[0];
      console.log('✅ Restaurants table columns:');
      console.log(Object.keys(restaurant));
      
      console.log('\n📋 Sample restaurant data:');
      console.log(JSON.stringify(restaurant, null, 2));
    } else {
      console.log('⚠️ No restaurants found in database');
    }
    
    // Check if users table exists
    console.log('\n🔍 Checking if users table exists...');
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('*')
      .limit(1);
    
    if (usersError) {
      console.log('❌ Users table does not exist or is not accessible');
      console.log('Error:', usersError.message);
    } else {
      console.log('✅ Users table exists');
      if (users && users.length > 0) {
        console.log('Users table columns:', Object.keys(users[0]));
      }
    }
    
    // Check if user_restaurants table exists
    console.log('\n🔍 Checking if user_restaurants table exists...');
    const { data: userRestaurants, error: userRestaurantsError } = await supabase
      .from('user_restaurants')
      .select('*')
      .limit(1);
    
    if (userRestaurantsError) {
      console.log('❌ user_restaurants table does not exist or is not accessible');
      console.log('Error:', userRestaurantsError.message);
    } else {
      console.log('✅ user_restaurants table exists');
      if (userRestaurants && userRestaurants.length > 0) {
        console.log('user_restaurants table columns:', Object.keys(userRestaurants[0]));
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkRestaurantSchema();

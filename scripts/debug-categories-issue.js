const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('🔧 Debug Categories API Issue');
console.log('Supabase URL:', supabaseUrl ? 'Set' : 'Not set');
console.log('Supabase Anon Key:', supabaseAnonKey ? 'Set' : 'Not set');
console.log('Supabase Service Key:', supabaseServiceKey ? 'Set' : 'Not set');

const supabase = createClient(supabaseUrl, supabaseAnonKey);
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function debugCategoriesIssue() {
  try {
    console.log('\n🔍 Step 1: Check user authentication...');
    
    // Get current user session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) {
      console.error('❌ Session error:', sessionError);
      return;
    }
    
    if (!session?.user) {
      console.log('❌ No user session found');
      return;
    }
    
    console.log('✅ User authenticated:', session.user.email);
    console.log('✅ User ID:', session.user.id);
    
    console.log('\n🔍 Step 2: Check user_restaurants table...');
    
    // Check if user has entries in user_restaurants table
    const { data: userRestaurants, error: urError } = await supabaseAdmin
      .from('user_restaurants')
      .select('*')
      .eq('user_id', session.user.id);
    
    if (urError) {
      console.error('❌ Error querying user_restaurants:', urError);
      return;
    }
    
    console.log('📊 User restaurants found:', userRestaurants?.length || 0);
    if (userRestaurants?.length > 0) {
      console.log('📋 User restaurant entries:', userRestaurants);
    }
    
    console.log('\n🔍 Step 3: Check restaurants table...');
    
    // Check if there are any restaurants
    const { data: restaurants, error: rError } = await supabaseAdmin
      .from('restaurants')
      .select('*');
    
    if (rError) {
      console.error('❌ Error querying restaurants:', rError);
      return;
    }
    
    console.log('📊 Total restaurants found:', restaurants?.length || 0);
    if (restaurants?.length > 0) {
      console.log('📋 Sample restaurant:', restaurants[0]);
    }
    
    console.log('\n🔍 Step 4: Test the getUserRestaurant function...');
    
    // Test the exact function from api-route-helpers
    async function getUserRestaurant(userId) {
      try {
        console.log('🔍 Looking up restaurant for user:', userId);
        
        // First, try to find restaurant via user_restaurants table
        const { data: userRestaurant, error: urError } = await supabaseAdmin
          .from('user_restaurants')
          .select(`
            role,
            restaurant_id
          `)
          .eq('user_id', userId)
          .eq('role', 'owner')
          .single();

        console.log('User restaurant query result:', { userRestaurant, urError });

        if (!urError && userRestaurant && userRestaurant.restaurant_id) {
          // Get the restaurant details using the restaurant_id
          const { data: restaurant, error: rError } = await supabaseAdmin
            .from('restaurants')
            .select('*')
            .eq('id', userRestaurant.restaurant_id)
            .single();

          console.log('Restaurant query result:', { restaurant, rError });

          if (!rError && restaurant) {
            console.log('✅ Found restaurant via user_restaurants:', restaurant.name);
            return restaurant;
          }
        }

        // Fallback: try to find restaurant via owner_id
        const { data: restaurant, error: rError } = await supabaseAdmin
          .from('restaurants')
          .select('*')
          .eq('owner_id', userId)
          .single();

        console.log('Fallback restaurant query result:', { restaurant, rError });

        if (!rError && restaurant) {
          console.log('✅ Found restaurant via owner_id:', restaurant.name);
          return restaurant;
        }

        console.log('❌ No restaurant found for user:', userId);
        return null;
      } catch (error) {
        console.error('Error getting user restaurant:', error);
        return null;
      }
    }
    
    const restaurant = await getUserRestaurant(session.user.id);
    console.log('Final restaurant result:', restaurant);
    
    console.log('\n🔍 Step 5: Test the API endpoint...');
    
    // Test the API endpoint
    const response = await fetch('http://localhost:3001/api/admin/categories', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': session.user.id
      }
    });
    
    console.log('📡 API Response Status:', response.status);
    console.log('📡 API Response Headers:', Object.fromEntries(response.headers.entries()));
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Categories API working!');
      console.log('📊 Categories found:', data.categories?.length || 0);
    } else {
      const errorData = await response.text();
      console.error('❌ Categories API error:', errorData);
    }
    
  } catch (error) {
    console.error('❌ Debug failed:', error);
  }
}

debugCategoriesIssue();

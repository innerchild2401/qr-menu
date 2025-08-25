const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function testUserSession() {
  try {
    console.log('🔍 Testing User Session...');
    
    // Check if we can connect to Supabase
    const { data, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('❌ Supabase connection error:', error);
      return;
    }
    
    console.log('✅ Supabase connection successful');
    console.log('Session data:', data);
    
    if (!data.session) {
      console.log('❌ No session found - user needs to login');
      return;
    }
    
    console.log('✅ User session found');
    console.log('User ID:', data.session.user.id);
    console.log('User email:', data.session.user.email);
    
    // Check if user has a restaurant
    const { data: userRestaurants, error: urError } = await supabaseAdmin
      .from('user_restaurants')
      .select('*')
      .eq('user_id', data.session.user.id);
    
    if (urError) {
      console.error('❌ Error checking user restaurants:', urError);
      return;
    }
    
    console.log('📊 User restaurants:', userRestaurants);
    
    if (userRestaurants.length === 0) {
      console.log('❌ User has no restaurants - they need to create one first');
      return;
    }
    
    console.log('✅ User has restaurants');
    
    // Check the first restaurant
    const firstRestaurant = userRestaurants[0];
    console.log('First restaurant:', firstRestaurant);
    
    // Get restaurant details
    const { data: restaurant, error: rError } = await supabaseAdmin
      .from('restaurants')
      .select('*')
      .eq('id', firstRestaurant.restaurant_id)
      .single();
    
    if (rError) {
      console.error('❌ Error getting restaurant details:', rError);
      return;
    }
    
    console.log('✅ Restaurant details:', restaurant);
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testUserSession();

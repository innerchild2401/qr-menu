const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function testWithLogin() {
  try {
    console.log('🔧 Testing with Login...');
    console.log('Email: eu@eu.com');
    
    // Step 1: Login
    console.log('\n🔍 Step 1: Logging in...');
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: 'eu@eu.com',
      password: 'parolamea'
    });
    
    if (authError) {
      console.error('❌ Login failed:', authError);
      return;
    }
    
    console.log('✅ Login successful!');
    console.log('User ID:', authData.user.id);
    console.log('User email:', authData.user.email);
    
    // Step 2: Check user restaurants
    console.log('\n🔍 Step 2: Checking user restaurants...');
    const { data: userRestaurants, error: urError } = await supabaseAdmin
      .from('user_restaurants')
      .select('*')
      .eq('user_id', authData.user.id);
    
    if (urError) {
      console.error('❌ Error checking user restaurants:', urError);
      return;
    }
    
    console.log('📊 User restaurants found:', userRestaurants?.length || 0);
    if (userRestaurants?.length > 0) {
      console.log('📋 User restaurant entries:', userRestaurants);
    }
    
    // Step 3: Test the getUserRestaurant function
    console.log('\n🔍 Step 3: Testing getUserRestaurant function...');
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
    
    const restaurant = await getUserRestaurant(authData.user.id);
    console.log('Final restaurant result:', restaurant);
    
    // Step 4: Test the API endpoint
    console.log('\n🔍 Step 4: Testing the API endpoint...');
    
    // Check if dev server is running on port 3000 or 3001
    const ports = [3000, 3001];
    let apiResponse = null;
    
    for (const port of ports) {
      try {
        console.log(`🔍 Trying port ${port}...`);
        const response = await fetch(`http://localhost:${port}/api/admin/categories`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'x-user-id': authData.user.id
          }
        });
        
        console.log(`📡 API Response Status (port ${port}):`, response.status);
        
        if (response.ok) {
          const data = await response.json();
          console.log('✅ Categories API working!');
          console.log('📊 Categories found:', data.categories?.length || 0);
          if (data.categories?.length > 0) {
            console.log('📋 Sample category:', data.categories[0]);
          }
          apiResponse = { port, status: response.status, data };
          break;
        } else {
          const errorData = await response.text();
          console.error(`❌ Categories API error (port ${port}):`, errorData);
        }
      } catch (error) {
        console.log(`❌ Port ${port} not available:`, error.message);
      }
    }
    
    if (!apiResponse) {
      console.log('❌ Could not connect to API on any port');
    }
    
    // Step 5: Test creating a category
    if (restaurant) {
      console.log('\n🔍 Step 5: Testing category creation...');
      
      const testPort = apiResponse?.port || 3000;
      try {
        const createResponse = await fetch(`http://localhost:${testPort}/api/admin/categories`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-user-id': authData.user.id
          },
          body: JSON.stringify({
            name: 'Test Category ' + Date.now()
          })
        });
        
        console.log('📡 Create Category Response Status:', createResponse.status);
        
        if (createResponse.ok) {
          const createData = await createResponse.json();
          console.log('✅ Category creation successful!');
          console.log('📋 Created category:', createData.category);
        } else {
          const errorData = await createResponse.text();
          console.error('❌ Category creation failed:', errorData);
        }
      } catch (error) {
        console.error('❌ Category creation error:', error);
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testWithLogin();

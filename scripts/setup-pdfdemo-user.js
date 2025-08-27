const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Supabase configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://nnhyuqhypzytnkkdifuk.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5uaHl1cWh5cHp5dG5ra2RpZnVrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU5NzYwOTIsImV4cCI6MjA3MTU1MjA5Mn0.Lug4smvqk5sI-46MbFeh64Yu2nptehnUTlUCPSpYbqI';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Demo user credentials
const DEMO_EMAIL = 'eu@eu.com';
const DEMO_PASSWORD = 'parolamea';
const DEMO_FULL_NAME = 'PDF Demo User';
const DEMO_RESTAURANT_NAME = 'myprecious';

async function setupPdfDemoUser() {
  console.log('🚀 Setting up PDF Demo User...\n');

  try {
    // Step 1: Create auth user (or sign in if exists)
    console.log('1️⃣ Creating auth user...');
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: DEMO_EMAIL,
      password: DEMO_PASSWORD,
      options: {
        data: {
          full_name: DEMO_FULL_NAME,
        }
      }
    });

    if (authError) {
      // If user already exists, try to sign in
      if (authError.message.includes('already registered')) {
        console.log('⚠️  User already exists, signing in...');
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email: DEMO_EMAIL,
          password: DEMO_PASSWORD
        });
        
        if (signInError) {
          console.error('❌ Sign in error:', signInError);
          return;
        }
        
        console.log('✅ Signed in successfully');
      } else {
        console.error('❌ Auth signup error:', authError);
        return;
      }
    } else if (authData.user) {
      console.log('✅ Auth user created successfully:', authData.user.id);
    }

    // Step 2: Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error('❌ Failed to get user:', userError);
      return;
    }
    
    const userId = user.id;

    // Step 3: Create user record in public.users if needed
    console.log('3️⃣ Ensuring user record exists...');
    const { data: userRecord, error: userRecordError } = await supabase
      .from('users')
      .select('id, email, full_name')
      .eq('id', userId)
      .single();

    if (!userRecord) {
      console.log('Creating user record...');
      const { error: createUserError } = await supabase
        .from('users')
        .insert({
          id: userId,
          email: DEMO_EMAIL,
          full_name: DEMO_FULL_NAME
        });

      if (createUserError) {
        console.error('❌ Failed to create user record:', createUserError);
        return;
      }
      console.log('✅ User record created');
    } else {
      console.log('✅ User record already exists');
    }

    // Step 4: Create restaurant
    console.log('4️⃣ Creating restaurant...');
    const generateSlug = (name) => {
      return name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
    };

    const restaurantSlug = generateSlug(DEMO_RESTAURANT_NAME);
    
    let { data: restaurant, error: restaurantError } = await supabase
      .from('restaurants')
      .insert({
        name: DEMO_RESTAURANT_NAME,
        slug: restaurantSlug,
        owner_id: userId,
        address: 'Demo Address, Demo City',
        logo_url: null,
        cover_url: null
      })
      .select()
      .single();

    if (restaurantError) {
      if (restaurantError.code === '23505') {
        console.log('⚠️  Restaurant already exists, getting existing restaurant...');
        const { data: existingRestaurant, error: getError } = await supabase
          .from('restaurants')
          .select('*')
          .eq('slug', restaurantSlug)
          .single();
        
        if (getError) {
          console.error('❌ Failed to get existing restaurant:', getError);
          return;
        }
        
        restaurant = existingRestaurant;
        console.log('✅ Using existing restaurant:', restaurant.id);
      } else {
        console.error('❌ Failed to create restaurant:', restaurantError);
        return;
      }
    } else {
      console.log('✅ Restaurant created successfully:', restaurant.id);
    }

    // Step 5: Create categories
    console.log('5️⃣ Creating categories...');
    const categories = [
      'Starters / Appetizers',
      'Main Dishes', 
      'Desserts',
      'Soft Drinks',
      'Wines',
      'Spirits & Cocktails',
      'Beers'
    ];

    const categoryIds = {};
    
    for (const categoryName of categories) {
      const { data: category, error: categoryError } = await supabase
        .from('categories')
        .insert({
          name: categoryName,
          restaurant_id: restaurant.id
        })
        .select()
        .single();

      if (categoryError) {
        console.error(`❌ Failed to create category ${categoryName}:`, categoryError);
        continue;
      }

      categoryIds[categoryName] = category.id;
      console.log(`✅ Category created: ${categoryName} (ID: ${category.id})`);
    }

    // Step 6: Read and parse CSV file
    console.log('6️⃣ Reading CSV file...');
    const csvPath = path.join(__dirname, '..', 'menu_items.csv');
    
    if (!fs.existsSync(csvPath)) {
      console.error('❌ CSV file not found:', csvPath);
      return;
    }

    const csvContent = fs.readFileSync(csvPath, 'utf8');
    const lines = csvContent.split('\n').filter(line => line.trim());
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    const dataLines = lines.slice(1);

    console.log(`✅ CSV file loaded with ${dataLines.length} items`);

    // Step 7: Upload products
    console.log('7️⃣ Uploading products...');
    let uploadedCount = 0;

    for (const line of dataLines) {
      if (!line.trim()) continue;

      // Parse CSV line (handle quoted fields)
      const values = [];
      let current = '';
      let inQuotes = false;
      
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          values.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      values.push(current.trim());

      const product = {};
      headers.forEach((header, index) => {
        product[header] = values[index] || null;
      });

      // Skip if no category mapping
      if (!categoryIds[product.category]) {
        console.log(`⚠️  Skipping product "${product.name}" - category "${product.category}" not found`);
        continue;
      }

      // Convert price to number
      const price = parseFloat(product.price) || 0;

      // Prepare product data
      const nutrition = {
        calories: product.calories ? parseInt(product.calories) : null,
        protein_g: product.protein_g ? parseFloat(product.protein_g) : null,
        fat_g: product.fat_g ? parseFloat(product.fat_g) : null,
        carbs_g: product.carbs_g ? parseFloat(product.carbs_g) : null
      };

      const productData = {
        name: product.name,
        description: product.description,
        price: price,
        category_id: categoryIds[product.category],
        restaurant_id: restaurant.id,
        nutrition: nutrition,
        image_url: null
      };

      const { error: productError } = await supabase
        .from('products')
        .insert(productData);

      if (productError) {
        console.error(`❌ Failed to upload product "${product.name}":`, productError);
        continue;
      }

      uploadedCount++;
      console.log(`✅ Uploaded: ${product.name} (${product.category})`);
    }

    console.log(`\n🎉 Setup completed successfully!`);
    console.log(`📊 Summary:`);
    console.log(`   - User: ${DEMO_EMAIL}`);
    console.log(`   - Restaurant: ${DEMO_RESTAURANT_NAME}`);
    console.log(`   - Categories: ${Object.keys(categoryIds).length}`);
    console.log(`   - Products: ${uploadedCount}`);
    console.log(`\n🔗 Login credentials:`);
    console.log(`   Email: ${DEMO_EMAIL}`);
    console.log(`   Password: ${DEMO_PASSWORD}`);
    console.log(`\n🌐 Access your restaurant at: http://localhost:3000/admin/menu`);

  } catch (error) {
    console.error('❌ Setup failed:', error);
  }
}

// Run the setup
setupPdfDemoUser();

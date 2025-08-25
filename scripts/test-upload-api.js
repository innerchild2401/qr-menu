const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testUploadAPI() {
  try {
    console.log('🔧 Testing Upload API Endpoints...');
    
    // Step 1: Login to get authenticated session
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
    
    // Step 2: Get restaurant slug
    console.log('\n🔍 Step 2: Getting restaurant slug...');
    const restaurantResponse = await fetch('http://localhost:3000/api/admin/me/restaurant', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': authData.user.id
      }
    });
    
    if (!restaurantResponse.ok) {
      console.error('❌ Failed to get restaurant:', await restaurantResponse.text());
      return;
    }
    
    const restaurantData = await restaurantResponse.json();
    const restaurantSlug = restaurantData.restaurant?.slug || 'myprecious';
    console.log('✅ Restaurant slug:', restaurantSlug);
    
    // Step 3: Test product image upload
    console.log('\n🔍 Step 3: Testing product image upload...');
    
    // Create a simple test image (1x1 pixel PNG)
    const testImageData = Buffer.from([
      0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
      0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52, // IHDR chunk
      0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, // 1x1 dimensions
      0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, // bit depth, color type, etc.
      0xDE, 0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41, // IDAT chunk
      0x54, 0x08, 0x99, 0x01, 0x01, 0x00, 0x00, 0xFF, // compressed data
      0xFF, 0x00, 0x00, 0x00, 0x02, 0x00, 0x01, 0xE2, // more data
      0x21, 0xBC, 0x33, 0x00, 0x00, 0x00, 0x00, 0x49, // IEND chunk
      0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82
    ]);
    
    // Create a File-like object for testing
    const testFile = new Blob([testImageData], { type: 'image/png' });
    testFile.name = 'test-image.png';
    
    const formData = new FormData();
    formData.append('file', testFile, 'test-image.png');
    
    const uploadResponse = await fetch(`http://localhost:3000/api/upload/productImage/${restaurantSlug}`, {
      method: 'POST',
      body: formData
    });
    
    console.log('📡 Upload Response Status:', uploadResponse.status);
    
    if (uploadResponse.ok) {
      const result = await uploadResponse.json();
      console.log('✅ Product image upload successful!');
      console.log('📋 Upload result:', result);
    } else {
      const error = await uploadResponse.text();
      console.error('❌ Product image upload failed:', error);
    }
    
    // Step 4: Test logo upload
    console.log('\n🔍 Step 4: Testing logo upload...');
    
    const logoFormData = new FormData();
    logoFormData.append('file', testFile, 'test-logo.png');
    
    const logoResponse = await fetch(`http://localhost:3000/api/upload/logo/${restaurantSlug}`, {
      method: 'POST',
      body: logoFormData
    });
    
    console.log('📡 Logo Upload Response Status:', logoResponse.status);
    
    if (logoResponse.ok) {
      const result = await logoResponse.json();
      console.log('✅ Logo upload successful!');
      console.log('📋 Logo upload result:', result);
    } else {
      const error = await logoResponse.text();
      console.error('❌ Logo upload failed:', error);
    }
    
    // Step 5: Test cover upload
    console.log('\n🔍 Step 5: Testing cover upload...');
    
    const coverFormData = new FormData();
    coverFormData.append('file', testFile, 'test-cover.png');
    
    const coverResponse = await fetch(`http://localhost:3000/api/upload/cover/${restaurantSlug}`, {
      method: 'POST',
      body: coverFormData
    });
    
    console.log('📡 Cover Upload Response Status:', coverResponse.status);
    
    if (coverResponse.ok) {
      const result = await coverResponse.json();
      console.log('✅ Cover upload successful!');
      console.log('📋 Cover upload result:', result);
    } else {
      const error = await coverResponse.text();
      console.error('❌ Cover upload failed:', error);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testUploadAPI();

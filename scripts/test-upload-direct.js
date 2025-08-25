const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testUploadDirect() {
  try {
    console.log('🔧 Testing Upload Directly...');
    
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
    
    // Step 2: Test upload directly to Supabase Storage
    console.log('\n🔍 Step 2: Testing direct upload to Supabase...');
    
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
    
    const testPath = 'myprecious/test-upload.png';
    
    // Test upload to products bucket
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('products')
      .upload(testPath, testImageData, {
        contentType: 'image/png',
        upsert: true
      });
    
    if (uploadError) {
      console.error('❌ Upload error:', uploadError);
    } else {
      console.log('✅ Direct upload successful!');
      console.log('📋 Upload data:', uploadData);
      
      // Test 3: Get public URL
      console.log('\n🔍 Step 3: Testing public URL...');
      const { data: urlData } = supabase.storage
        .from('products')
        .getPublicUrl(testPath);
      
      console.log('✅ Public URL:', urlData.publicUrl);
      
      // Test 4: Test the API endpoint with the uploaded file
      console.log('\n🔍 Step 4: Testing API endpoint...');
      
      // Create a Blob from the test image data
      const testBlob = new Blob([testImageData], { type: 'image/png' });
      testBlob.name = 'test-image.png';
      
      const formData = new FormData();
      formData.append('file', testBlob, 'test-image.png');
      
      const response = await fetch('http://localhost:3000/api/upload/productImage/myprecious', {
        method: 'POST',
        body: formData
      });
      
      console.log('📡 API Response Status:', response.status);
      
      if (response.ok) {
        const result = await response.json();
        console.log('✅ API upload successful!');
        console.log('📋 API result:', result);
      } else {
        const error = await response.text();
        console.error('❌ API upload failed:', error);
      }
      
      // Clean up test file
      console.log('\n🔍 Step 5: Cleaning up...');
      const { error: deleteError } = await supabase.storage
        .from('products')
        .remove([testPath]);
      
      if (deleteError) {
        console.error('❌ Delete error:', deleteError);
      } else {
        console.log('✅ Test file cleaned up');
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testUploadDirect();

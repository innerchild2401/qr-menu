const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function testUpload() {
  try {
    console.log('🔧 Testing Upload Functionality...');
    
    // Test 1: Check storage buckets
    console.log('\n🔍 Step 1: Checking storage buckets...');
    const { data: buckets, error: bucketsError } = await supabaseAdmin.storage.listBuckets();
    
    if (bucketsError) {
      console.error('❌ Error listing buckets:', bucketsError);
      return;
    }
    
    console.log('✅ Available buckets:', buckets.map(b => b.name));
    
    // Test 2: Check bucket contents
    console.log('\n🔍 Step 2: Checking bucket contents...');
    const testBuckets = ['logos', 'covers', 'products', 'popups'];
    
    for (const bucketName of testBuckets) {
      const { data: files, error } = await supabaseAdmin.storage
        .from(bucketName)
        .list();
      
      if (error) {
        console.error(`❌ Error listing ${bucketName}:`, error);
      } else {
        console.log(`📁 ${bucketName}: ${files?.length || 0} files`);
      }
    }
    
    // Test 3: Test file upload to products bucket
    console.log('\n🔍 Step 3: Testing file upload...');
    
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
    
    const testPath = 'test/upload-test.png';
    
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from('products')
      .upload(testPath, testImageData, {
        contentType: 'image/png',
        upsert: true
      });
    
    if (uploadError) {
      console.error('❌ Upload error:', uploadError);
    } else {
      console.log('✅ Test upload successful:', uploadData);
      
      // Test 4: Get public URL
      console.log('\n🔍 Step 4: Testing public URL...');
      const { data: urlData } = supabaseAdmin.storage
        .from('products')
        .getPublicUrl(testPath);
      
      console.log('✅ Public URL:', urlData.publicUrl);
      
      // Test 5: Clean up test file
      console.log('\n🔍 Step 5: Cleaning up test file...');
      const { error: deleteError } = await supabaseAdmin.storage
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

testUpload();

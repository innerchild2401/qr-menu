const fs = require('fs');
const path = require('path');

async function testUploadSimple() {
  try {
    console.log('🔧 Testing Upload API (Simple)...');
    
    // Create a simple test image file
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
    
    // Write test file to disk
    const testFilePath = path.join(__dirname, 'test-image.png');
    fs.writeFileSync(testFilePath, testImageData);
    
    console.log('✅ Test image created:', testFilePath);
    
    // Test 1: Product image upload
    console.log('\n🔍 Test 1: Product image upload...');
    
    const FormData = require('form-data');
    const formData = new FormData();
    formData.append('file', fs.createReadStream(testFilePath), 'test-image.png');
    
    const response = await fetch('http://localhost:3000/api/upload/productImage/myprecious', {
      method: 'POST',
      body: formData
    });
    
    console.log('📡 Response Status:', response.status);
    console.log('📡 Response Headers:', Object.fromEntries(response.headers.entries()));
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ Upload successful!');
      console.log('📋 Result:', result);
    } else {
      const error = await response.text();
      console.error('❌ Upload failed:', error);
    }
    
    // Clean up test file
    fs.unlinkSync(testFilePath);
    console.log('✅ Test file cleaned up');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testUploadSimple();

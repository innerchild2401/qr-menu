const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

// Simulate the validateFile function
function validateFile(file) {
  const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif', 'image/bmp', 'image/tiff'];
  const ALLOWED_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.bmp', '.tiff'];
  const MAX_FILE_SIZE = 5 * 1024 * 1024;
  
  // Check file size first
  if (file.size > MAX_FILE_SIZE) {
    return {
      error: `File too large. Maximum size: ${MAX_FILE_SIZE / (1024 * 1024)}MB`,
      code: 'FILE_TOO_LARGE'
    };
  }
  
  // Check file type - be more permissive
  const ext = path.extname(file.name).toLowerCase();
  const mimeType = file.type.toLowerCase();
  
  // Allow if either MIME type or extension is valid
  const isValidMimeType = ALLOWED_TYPES.includes(mimeType);
  const isValidExtension = ALLOWED_EXTENSIONS.includes(ext);
  
  if (!isValidMimeType && !isValidExtension) {
    return {
      error: `Invalid file type. Allowed types: ${ALLOWED_EXTENSIONS.join(', ')}`,
      code: 'INVALID_TYPE'
    };
  }
  
  return null;
}

// Simulate the sanitizeFilename function
function sanitizeFilename(filename) {
  const ext = path.extname(filename).toLowerCase();
  const name = path.basename(filename, ext);
  
  const sanitized = name
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .replace(/_{2,}/g, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase();
  
  const finalName = sanitized || 'upload';
  return `${finalName}${ext}`;
}

async function testApiRouteSimulation() {
  try {
    console.log('🔧 Testing API Route Simulation...');
    
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
    
    // Simulate the File object that would come from form data
    const file = {
      name: 'test-image.png',
      size: testImageData.length,
      type: 'image/png',
      arrayBuffer: async () => testImageData.buffer.slice(testImageData.byteOffset, testImageData.byteOffset + testImageData.byteLength)
    };
    
    console.log('📋 File object created:', { name: file.name, size: file.size, type: file.type });
    
    // Step 1: Validate file
    console.log('\n🔍 Step 1: Validating file...');
    const validation = validateFile(file);
    if (validation) {
      console.log('❌ File validation failed:', validation.error);
      return;
    }
    console.log('✅ File validation passed');
    
    // Step 2: Create file path
    console.log('\n🔍 Step 2: Creating file path...');
    const slug = 'myprecious';
    const timestamp = Date.now();
    const sanitizedFileName = sanitizeFilename(file.name);
    const filePath = `${slug}/${timestamp}_${sanitizedFileName}`;
    console.log('📋 File path:', filePath);
    
    // Step 3: Convert File to Buffer
    console.log('\n🔍 Step 3: Converting File to Buffer...');
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    console.log('📋 File converted to buffer, size:', buffer.length);
    
    // Step 4: Upload to Supabase
    console.log('\n🔍 Step 4: Uploading to Supabase...');
    const { error } = await supabaseAdmin.storage
      .from('products')
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: true
      });
    
    if (error) {
      console.error('❌ Supabase upload error:', error);
      return;
    }
    console.log('✅ Supabase upload successful');
    
    // Step 5: Get public URL
    console.log('\n🔍 Step 5: Getting public URL...');
    const { data: urlData } = supabaseAdmin.storage
      .from('products')
      .getPublicUrl(filePath);
    
    console.log('✅ Public URL:', urlData.publicUrl);
    
    // Step 6: Clean up
    console.log('\n🔍 Step 6: Cleaning up...');
    const { error: deleteError } = await supabaseAdmin.storage
      .from('products')
      .remove([filePath]);
    
    if (deleteError) {
      console.error('❌ Delete error:', deleteError);
    } else {
      console.log('✅ Test file cleaned up');
    }
    
    // Clean up local file
    fs.unlinkSync(testFilePath);
    console.log('✅ Local test file cleaned up');
    
    console.log('\n🎉 API Route Simulation Successful!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testApiRouteSimulation();

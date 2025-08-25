import { NextRequest, NextResponse } from 'next/server';
import { uploadFile, getPublicUrl, STORAGE_BUCKETS } from '../../../../../../lib/supabase-server';
import { validateFile, sanitizeFilename } from '../../../../../../lib/uploadUtils';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
): Promise<NextResponse> {
  try {
    console.log('🔍 Product image upload API called');
    const { slug } = await params;
    console.log('📋 Slug:', slug);
    
    // Parse form data
    console.log('🔍 Parsing form data...');
    const formData = await request.formData();
    const file = formData.get('file') as File;
    console.log('📋 File received:', file ? { name: file.name, size: file.size, type: file.type } : 'null');
    console.log('📋 File object:', file);
    console.log('📋 File methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(file)));
    console.log('📋 Has arrayBuffer:', typeof file?.arrayBuffer === 'function');
    
    if (!file) {
      console.log('❌ No file provided');
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }
    
    // Validate file
    console.log('🔍 Validating file...');
    const validation = validateFile(file);
    if (validation) {
      console.log('❌ File validation failed:', validation.error);
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }
    console.log('✅ File validation passed');
    
    // Skip validation for testing
    console.log('🔍 Skipping validation for testing...');
    
    // Create file path: slug/timestamp_filename
    const timestamp = Date.now();
    const sanitizedFileName = sanitizeFilename(file.name);
    const filePath = `${slug}/${timestamp}_${sanitizedFileName}`;
    
    // Upload to Supabase Storage
    console.log('🔍 Uploading to Supabase Storage...');
    console.log('📋 Bucket:', STORAGE_BUCKETS.PRODUCTS);
    console.log('📋 File path:', filePath);
    
    // Convert File to Buffer for Supabase
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    console.log('📋 File converted to buffer, size:', buffer.length);
    
    const { error } = await uploadFile(
      STORAGE_BUCKETS.PRODUCTS,
      filePath,
      buffer,
      {
        contentType: file.type,
        upsert: true
      }
    );
    
    if (error) {
      console.error('❌ Supabase upload error:', error);
      return NextResponse.json(
        { error: 'Failed to upload file' },
        { status: 500 }
      );
    }
    console.log('✅ Supabase upload successful');
    
    // Get public URL
    const publicUrl = getPublicUrl(STORAGE_BUCKETS.PRODUCTS, filePath);
    
    return NextResponse.json({
      url: publicUrl,
      filename: sanitizedFileName,
      size: file.size,
      path: filePath
    });
    
  } catch (error) {
    console.error('Error uploading product image:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
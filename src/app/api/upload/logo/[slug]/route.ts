import { NextRequest, NextResponse } from 'next/server';
import { uploadFile, getPublicUrl, STORAGE_BUCKETS } from '../../../../../../lib/supabase';
import { validateUploadFile, sanitizeFileName } from '../../../../../../lib/uploadUtils';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
): Promise<NextResponse> {
  try {
    const { slug } = await params;
    
    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }
    
    // Validate file
    const validation = validateUploadFile(file);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }
    
    // Create file path: slug/timestamp_filename
    const timestamp = Date.now();
    const sanitizedFileName = sanitizeFileName(file.name);
    const filePath = `${slug}/${timestamp}_${sanitizedFileName}`;
    
    // Upload to Supabase Storage
    const { data, error } = await uploadFile(
      STORAGE_BUCKETS.LOGOS,
      filePath,
      file,
      {
        contentType: file.type,
        upsert: true
      }
    );
    
    if (error) {
      console.error('Supabase upload error:', error);
      return NextResponse.json(
        { error: 'Failed to upload file' },
        { status: 500 }
      );
    }
    
    // Get public URL
    const publicUrl = getPublicUrl(STORAGE_BUCKETS.LOGOS, filePath);
    
    // Return the URL (relative path for consistency with existing frontend)
    const relativeUrl = `/uploads/${STORAGE_BUCKETS.LOGOS}/${filePath}`;
    
    return NextResponse.json({
      url: relativeUrl,
      publicUrl: publicUrl,
      filename: sanitizedFileName,
      size: file.size,
      path: filePath
    });
    
  } catch (error) {
    console.error('Error uploading logo:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
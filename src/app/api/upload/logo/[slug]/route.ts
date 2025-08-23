import { NextRequest, NextResponse } from 'next/server';
import { saveUploadedFile } from '../../../../../../lib/uploadUtils';

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
    
    // Save the uploaded file
    const result = await saveUploadedFile(file, slug);
    
    if ('error' in result) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }
    
    // Return the URL
    return NextResponse.json({
      url: result.url,
      filename: result.filename,
      size: result.size
    });
    
  } catch (error) {
    console.error('Error uploading logo:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

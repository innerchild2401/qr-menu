import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserAndRestaurant } from '../../../../../../lib/currentRestaurant';
import { generateAndUploadQRCode, regenerateQRCode } from '../../../../../../lib/qrCodeUtils';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ action: string }> }
): Promise<NextResponse> {
  try {
    // Get current user and restaurant using unified resolver
    const { user, restaurant, error } = await getCurrentUserAndRestaurant();
    
    if (error || !user || !restaurant) {
      return NextResponse.json(
        { error: error || 'Unauthorized' },
        { status: error === 'No restaurant found' ? 404 : 401 }
      );
    }

    const { action } = await params;

    // Get base URL from request headers or environment
    const host = request.headers.get('host') || 'localhost:3000';
    const protocol = request.headers.get('x-forwarded-proto') || 'http';
    const baseUrl = `${protocol}://${host}`;

    let qrCodeUrl: string;

    try {
      switch (action) {
        case 'generate':
          // Generate new QR code
          qrCodeUrl = await generateAndUploadQRCode(
            restaurant.slug,
            baseUrl
          );
          console.log('QR code generated successfully');
          break;

        case 'regenerate':
          // Force regenerate QR code
          qrCodeUrl = await regenerateQRCode(
            restaurant.slug,
            undefined, // No existing QR URL since column doesn't exist
            baseUrl
          );
          console.log('QR code regenerated successfully');
          break;

        default:
          return NextResponse.json(
            { error: 'Invalid action. Use "generate" or "regenerate"' },
            { status: 400 }
          );
      }

      return NextResponse.json({
        qrCodeUrl,
        menuUrl: `${baseUrl}/menu/${restaurant.slug}`,
        message: `QR code ${action}d successfully`
      });

    } catch (qrError) {
      console.error(`QR code ${action} failed:`, qrError);
      return NextResponse.json(
        { error: `Failed to ${action} QR code. Please try again.` },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Error in QR code operation:', error);
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET endpoint to retrieve current QR code info
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ action: string }> }
): Promise<NextResponse> {
  try {
    // Get current user and restaurant using unified resolver
    const { user, restaurant, error } = await getCurrentUserAndRestaurant();
    
    if (error || !user || !restaurant) {
      return NextResponse.json(
        { error: error || 'Unauthorized' },
        { status: error === 'No restaurant found' ? 404 : 401 }
      );
    }

    const { action } = await params;

    if (action !== 'info') {
      return NextResponse.json(
        { error: 'Invalid action. Use "info"' },
        { status: 400 }
      );
    }

    // Get base URL from request headers or environment
    const host = request.headers.get('host') || 'localhost:3000';
    const protocol = request.headers.get('x-forwarded-proto') || 'http';
    const baseUrl = `${protocol}://${host}`;

    // For now, we don't store QR codes in the database, so we'll return basic info
    const menuUrl = `${baseUrl}/menu/${restaurant.slug}`;
    
    return NextResponse.json({
      qrCodeUrl: undefined, // No stored QR code URL
      menuUrl,
      hasQRCode: false, // We don't have a stored QR code
      restaurant: {
        id: restaurant.id,
        name: restaurant.name,
        slug: restaurant.slug
      }
    });

  } catch (error) {
    console.error('Error getting QR code info:', error);
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

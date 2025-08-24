import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../../../lib/auth';
import { getRestaurantBySlug } from '../../../../../../lib/supabase-server';
import { generateAndUploadQRCode, regenerateQRCode } from '../../../../../../lib/qrCodeUtils';

interface ExtendedSession {
  user?: {
    email?: string | null;
  };
  restaurantSlug?: string;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ action: string }> }
): Promise<NextResponse> {
  try {
    // Get session to verify authentication and get restaurant slug
    const session = await getServerSession(authOptions) as ExtendedSession;
    
    if (!session || !session.restaurantSlug) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { action } = await params;
    const restaurantSlug = session.restaurantSlug;

    // Get restaurant data
    const restaurant = await getRestaurantBySlug(restaurantSlug);
    if (!restaurant) {
      return NextResponse.json(
        { error: 'Restaurant not found' },
        { status: 404 }
      );
    }

    // Get base URL from request headers or environment
    const host = request.headers.get('host') || 'localhost:3000';
    const protocol = request.headers.get('x-forwarded-proto') || 'http';
    const baseUrl = `${protocol}://${host}`;

    let qrCodeUrl: string;

    try {
      switch (action) {
        case 'generate':
          // Generate new QR code (qr_code_url column doesn't exist in actual schema)
          qrCodeUrl = await generateAndUploadQRCode(
            restaurantSlug,
            baseUrl
          );
          console.log('QR code generated but cannot be stored in database (column does not exist)');
          break;

        case 'regenerate':
          // Force regenerate QR code (qr_code_url column doesn't exist in actual schema)
          qrCodeUrl = await regenerateQRCode(
            restaurantSlug,
            undefined, // No existing QR URL since column doesn't exist
            baseUrl
          );
          console.log('QR code regenerated but cannot be stored in database (column does not exist)');
          break;

        default:
          return NextResponse.json(
            { error: 'Invalid action. Use "generate" or "regenerate"' },
            { status: 400 }
          );
      }

      return NextResponse.json({
        qrCodeUrl,
        menuUrl: `${baseUrl}/menu/${restaurantSlug}`,
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
    // Get session to verify authentication and get restaurant slug
    const session = await getServerSession(authOptions) as ExtendedSession;
    
    if (!session || !session.restaurantSlug) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { action } = await params;
    const restaurantSlug = session.restaurantSlug;

    if (action !== 'info') {
      return NextResponse.json(
        { error: 'Invalid action for GET request. Use "info"' },
        { status: 400 }
      );
    }

    // Get restaurant data
    const restaurant = await getRestaurantBySlug(restaurantSlug);
    if (!restaurant) {
      return NextResponse.json(
        { error: 'Restaurant not found' },
        { status: 404 }
      );
    }

    // Get base URL from request headers or environment
    const host = request.headers.get('host') || 'localhost:3000';
    const protocol = request.headers.get('x-forwarded-proto') || 'http';
    const baseUrl = `${protocol}://${host}`;

    return NextResponse.json({
      qrCodeUrl: null, // qr_code_url column doesn't exist in actual schema
      menuUrl: `${baseUrl}/menu/${restaurantSlug}`,
      hasQRCode: false, // Column doesn't exist, so no stored QR code
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

import { NextRequest, NextResponse } from 'next/server';
import { 
  exchangeCodeForTokens, 
  getBusinessLocations, 
  getBusinessProfile,
  updateRestaurantGoogleData 
} from '@/lib/google-business-service';

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state'); // This contains the restaurant ID
    const error = searchParams.get('error');

    if (error) {
      console.error('Google OAuth error:', error);
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/admin/settings?error=google_oauth_failed&message=${encodeURIComponent(error)}`
      );
    }

    if (!code || !state) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/admin/settings?error=missing_parameters`
      );
    }

    const restaurantId = state;

    try {
      // Exchange authorization code for tokens
      const tokens = await exchangeCodeForTokens(code);

      // Get business locations
      const locations = await getBusinessLocations(tokens.access_token);

      if (locations.length === 0) {
        return NextResponse.redirect(
          `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/admin/settings?error=no_locations_found`
        );
      }

      // For now, use the first location (in the future, we could show a selection)
      const selectedLocation = locations[0];

      // Get business profile data including ratings
      const profile = await getBusinessProfile(selectedLocation.locationId, tokens.access_token);

      // Save everything to database
      await updateRestaurantGoogleData(restaurantId, selectedLocation.locationId, tokens, profile);

      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/admin/settings?success=google_connected&location=${encodeURIComponent(selectedLocation.name)}`
      );

    } catch (apiError) {
      console.error('Error during Google Business Profile setup:', apiError);
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/admin/settings?error=setup_failed&message=${encodeURIComponent(apiError instanceof Error ? apiError.message : 'Unknown error')}`
      );
    }

  } catch (error) {
    console.error('Error in Google OAuth callback:', error);
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/admin/settings?error=callback_failed`
    );
  }
}

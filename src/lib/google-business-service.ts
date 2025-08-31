import { google } from 'googleapis';
import { supabaseAdmin } from './supabase-server';

// Google Business Profile API configuration
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/auth/google/callback';

// OAuth2 client for Google Business Profile
const oauth2Client = new google.auth.OAuth2(
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  GOOGLE_REDIRECT_URI
);

// Google Business Profile API client
const businessInformationClient = google.mybusinessbusinessinformation({
  version: 'v1',
  auth: oauth2Client
});

// Google My Business API client (for locations and basic info)
const myBusinessClient = google.mybusiness({
  version: 'v4',
  auth: oauth2Client
});

export interface GoogleBusinessProfile {
  locationId: string;
  placeId: string;
  averageRating: number;
  totalReviewCount: number;
}

export interface GoogleAuthTokens {
  access_token: string;
  refresh_token: string;
  expires_at: Date;
}

/**
 * Generate OAuth 2.0 authorization URL for Google Business Profile
 */
export function generateAuthUrl(restaurantId: string): string {
  const scopes = [
    'https://www.googleapis.com/auth/business.manage',
    'https://www.googleapis.com/auth/plus.business.manage'
  ];

  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    prompt: 'consent',
    state: restaurantId // Pass restaurant ID in state for security
  });
}

/**
 * Exchange authorization code for access tokens
 */
export async function exchangeCodeForTokens(code: string): Promise<GoogleAuthTokens> {
  try {
    const { tokens } = await oauth2Client.getToken(code);
    
    if (!tokens.access_token || !tokens.refresh_token) {
      throw new Error('Failed to get access and refresh tokens');
    }

    return {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: new Date(tokens.expiry_date || Date.now() + 3600000) // Default 1 hour
    };
  } catch (error) {
    console.error('Error exchanging code for tokens:', error);
    throw new Error('Failed to authenticate with Google Business Profile');
  }
}

/**
 * Get restaurant's Google Business Profile locations
 */
export async function getBusinessLocations(accessToken: string): Promise<Array<{ name: string; locationId: string }>> {
  try {
    oauth2Client.setCredentials({ access_token: accessToken });
    
    // First get accounts
    const accountsResponse = await myBusinessClient.accounts.list();
    const accounts = accountsResponse.data.accounts || [];
    
    if (accounts.length === 0) {
      throw new Error('No Google Business accounts found');
    }
    
    // Get locations for the first account
    const accountName = accounts[0].name;
    const locationsResponse = await myBusinessClient.accounts.locations.list({
      parent: accountName
    });

    return (locationsResponse.data.locations || []).map(location => ({
      name: location.locationName || 'Unknown Location',
      locationId: location.name?.split('/').pop() || ''
    }));
  } catch (error) {
    console.error('Error fetching business locations:', error);
    throw new Error('Failed to fetch Google Business Profile locations');
  }
}

/**
 * Get restaurant's Google Business Profile data including ratings
 */
export async function getBusinessProfile(locationId: string, accessToken: string): Promise<GoogleBusinessProfile> {
  try {
    oauth2Client.setCredentials({ access_token: accessToken });
    
    // Get accounts first
    const accountsResponse = await myBusinessClient.accounts.list();
    const accounts = accountsResponse.data.accounts || [];
    
    if (accounts.length === 0) {
      throw new Error('No Google Business accounts found');
    }
    
    const accountName = accounts[0].name;
    const locationName = `${accountName}/locations/${locationId}`;
    
    // Get location details
    const locationResponse = await myBusinessClient.accounts.locations.get({
      name: locationName
    });

    const location = locationResponse.data;
    
    if (!location) {
      throw new Error('Location not found');
    }

    // Get reviews to calculate rating and count
    const reviewsResponse = await myBusinessClient.accounts.locations.reviews.list({
      parent: locationName
    });

    const reviews = reviewsResponse.data.reviews || [];
    const totalReviewCount = reviews.length;
    
    // Calculate average rating from reviews
    let averageRating = 0;
    if (totalReviewCount > 0) {
      const totalRating = reviews.reduce((sum, review) => sum + (review.starRating || 0), 0);
      averageRating = totalRating / totalReviewCount;
    }

    return {
      locationId,
      placeId: location.placeId || '',
      averageRating: Math.round(averageRating * 10) / 10, // Round to 1 decimal place
      totalReviewCount
    };
  } catch (error) {
    console.error('Error fetching business profile:', error);
    throw new Error('Failed to fetch Google Business Profile data');
  }
}

/**
 * Refresh access token using refresh token
 */
export async function refreshAccessToken(refreshToken: string): Promise<string> {
  try {
    oauth2Client.setCredentials({ refresh_token: refreshToken });
    
    const { credentials } = await oauth2Client.refreshAccessToken();
    
    if (!credentials.access_token) {
      throw new Error('Failed to refresh access token');
    }

    return credentials.access_token;
  } catch (error) {
    console.error('Error refreshing access token:', error);
    throw new Error('Failed to refresh Google Business Profile access token');
  }
}

/**
 * Update restaurant's Google Business Profile data in database
 */
export async function updateRestaurantGoogleData(
  restaurantId: string, 
  locationId: string, 
  tokens: GoogleAuthTokens,
  profile?: GoogleBusinessProfile
): Promise<void> {
  try {
    const updateData: Record<string, unknown> = {
      google_business_location_id: locationId,
      google_business_access_token: tokens.access_token,
      google_business_refresh_token: tokens.refresh_token,
      google_business_token_expires_at: tokens.expires_at.toISOString(),
      google_business_last_sync: new Date().toISOString()
    };

    if (profile) {
      updateData.google_business_place_id = profile.placeId;
      updateData.google_business_rating = profile.averageRating;
      updateData.google_business_review_count = profile.totalReviewCount;
    }

    const { error } = await supabaseAdmin
      .from('restaurants')
      .update(updateData)
      .eq('id', restaurantId);

    if (error) {
      console.error('Error updating restaurant Google data:', error);
      throw new Error('Failed to save Google Business Profile data');
    }
  } catch (error) {
    console.error('Error updating restaurant Google data:', error);
    throw error;
  }
}

/**
 * Check if access token is expired and refresh if needed
 */
export async function ensureValidAccessToken(restaurantId: string): Promise<string> {
  try {
    // Get current tokens from database
    const { data: restaurant, error } = await supabaseAdmin
      .from('restaurants')
      .select('google_business_access_token, google_business_refresh_token, google_business_token_expires_at')
      .eq('id', restaurantId)
      .single();

    if (error || !restaurant) {
      throw new Error('Restaurant not found or not connected to Google Business Profile');
    }

    if (!restaurant.google_business_access_token || !restaurant.google_business_refresh_token) {
      throw new Error('Restaurant not connected to Google Business Profile');
    }

    // Check if token is expired (with 5 minute buffer)
    const expiresAt = new Date(restaurant.google_business_token_expires_at);
    const now = new Date();
    const bufferTime = 5 * 60 * 1000; // 5 minutes in milliseconds

    if (expiresAt.getTime() - now.getTime() < bufferTime) {
      // Token is expired or will expire soon, refresh it
      const newAccessToken = await refreshAccessToken(restaurant.google_business_refresh_token);
      
      // Update the database with new token
      await updateRestaurantGoogleData(restaurantId, '', {
        access_token: newAccessToken,
        refresh_token: restaurant.google_business_refresh_token,
        expires_at: new Date(Date.now() + 3600000) // 1 hour from now
      });

      return newAccessToken;
    }

    return restaurant.google_business_access_token;
  } catch (error) {
    console.error('Error ensuring valid access token:', error);
    throw error;
  }
}

/**
 * Sync restaurant's Google Business Profile ratings (with caching)
 */
export async function syncGoogleBusinessRatings(restaurantId: string): Promise<GoogleBusinessProfile | null> {
  try {
    // Check if we need to sync (cache for 6 hours)
    const { data: restaurant } = await supabaseAdmin
      .from('restaurants')
      .select('google_business_last_sync, google_business_location_id')
      .eq('id', restaurantId)
      .single();

    if (!restaurant?.google_business_location_id) {
      return null; // Not connected to Google Business Profile
    }

    // Check if we need to sync (6 hours = 21600000 milliseconds)
    const lastSync = restaurant.google_business_last_sync ? new Date(restaurant.google_business_last_sync) : null;
    const now = new Date();
    const cacheTime = 6 * 60 * 60 * 1000; // 6 hours

    if (lastSync && (now.getTime() - lastSync.getTime() < cacheTime)) {
      // Return cached data
      const { data: cachedRestaurant } = await supabaseAdmin
        .from('restaurants')
        .select('google_business_rating, google_business_review_count, google_business_place_id')
        .eq('id', restaurantId)
        .single();

      if (cachedRestaurant?.google_business_rating && cachedRestaurant?.google_business_review_count) {
        return {
          locationId: restaurant.google_business_location_id,
          placeId: cachedRestaurant.google_business_place_id || '',
          averageRating: cachedRestaurant.google_business_rating,
          totalReviewCount: cachedRestaurant.google_business_review_count
        };
      }
    }

    // Need to sync from Google API
    const accessToken = await ensureValidAccessToken(restaurantId);
    const profile = await getBusinessProfile(restaurant.google_business_location_id, accessToken);
    
    // Update database with fresh data
    await updateRestaurantGoogleData(restaurantId, restaurant.google_business_location_id, {
      access_token: accessToken,
      refresh_token: '', // We don't need to update refresh token here
      expires_at: new Date(Date.now() + 3600000)
    }, profile);

    return profile;
  } catch (error) {
    console.error('Error syncing Google Business ratings:', error);
    throw error;
  }
}

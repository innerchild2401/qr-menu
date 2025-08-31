// Google Business Profile integration - TEMPORARILY DISABLED
// To enable: Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables
// and uncomment the code below

/*
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

// Google My Business Account Management API
const myBusinessAccountClient = google.mybusinessaccountmanagement({
  version: 'v1',
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

// All functions are commented out for now
// Uncomment when ready to implement Google Business integration

export function generateAuthUrl(restaurantId: string): string {
  throw new Error('Google Business integration is disabled');
}

export async function exchangeCodeForTokens(code: string): Promise<GoogleAuthTokens> {
  throw new Error('Google Business integration is disabled');
}

export async function getBusinessLocations(accessToken: string): Promise<Array<{ name: string; locationId: string }>> {
  throw new Error('Google Business integration is disabled');
}

export async function getBusinessProfile(locationId: string, accessToken: string): Promise<GoogleBusinessProfile> {
  throw new Error('Google Business integration is disabled');
}

export async function refreshAccessToken(refreshToken: string): Promise<string> {
  throw new Error('Google Business integration is disabled');
}

export async function updateRestaurantGoogleData(
  restaurantId: string, 
  locationId: string, 
  tokens: GoogleAuthTokens,
  profile?: GoogleBusinessProfile
): Promise<void> {
  throw new Error('Google Business integration is disabled');
}

export async function ensureValidAccessToken(restaurantId: string): Promise<string> {
  throw new Error('Google Business integration is disabled');
}

export async function syncGoogleBusinessRatings(restaurantId: string): Promise<GoogleBusinessProfile | null> {
  return null; // Return null when disabled
}
*/

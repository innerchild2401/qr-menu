# Google Business Profile Integration

This document explains how to set up and use the Google Business Profile integration in SmartMenu.

## Overview

The Google Business Profile integration allows restaurant owners to:
- Connect their Google Business account to SmartMenu
- Display real-time ratings and review counts on their menu
- Automatically sync ratings every 6 hours
- Provide clickable ratings that link to Google reviews

## Features

### ✅ Implemented Features
1. **OAuth 2.0 Authentication** - Secure connection to Google Business Profile
2. **Real-time Rating Display** - Shows actual Google ratings on menu pages
3. **Automatic Caching** - Ratings are cached for 6 hours to avoid API rate limits
4. **Clickable Ratings** - Clicking the rating opens Google reviews in a new tab
5. **Fallback Display** - Shows "Ratings not available" when not connected
6. **Admin Panel Integration** - Easy connection management in admin settings

### 🔧 Technical Implementation
- **Database Schema**: Added Google Business fields to restaurants table
- **API Integration**: Google Business Profile API v1
- **OAuth Flow**: Complete OAuth 2.0 implementation with refresh tokens
- **Background Sync**: Automatic rating updates without blocking menu loads
- **Error Handling**: Comprehensive error handling and fallbacks

## Setup Instructions

### 1. Google Cloud Console Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google Business Profile API:
   - Go to "APIs & Services" > "Library"
   - Search for "Google Business Profile API"
   - Click "Enable"
4. Create OAuth 2.0 credentials:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth 2.0 Client IDs"
   - Choose "Web application"
   - Add authorized redirect URIs:
     - `http://localhost:3000/api/auth/google/callback` (development)
     - `https://yourdomain.com/api/auth/google/callback` (production)
5. Copy the Client ID and Client Secret

### 2. Environment Variables

Add these to your `.env.local` file:

```bash
# Google Business Profile API Configuration
GOOGLE_CLIENT_ID=your-google-client-id-here
GOOGLE_CLIENT_SECRET=your-google-client-secret-here
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback
```

### 3. Database Migration

Run the database migration to add Google Business fields:

```sql
-- Run this in your Supabase SQL Editor
-- See: scripts/add-google-business-integration.sql
```

### 4. Install Dependencies

The required dependencies are already included:
- `googleapis` - Google APIs client library

## Usage

### For Restaurant Owners

1. **Connect Google Business Account**:
   - Go to Admin Settings (`/admin/settings`)
   - Find the "Google Business Integration" section
   - Click "Connect Google Business"
   - Complete the OAuth flow
   - Select your business location

2. **View Connected Status**:
   - The admin panel shows connection status
   - Displays current rating and review count
   - Shows last sync time

3. **Automatic Updates**:
   - Ratings sync automatically every 6 hours
   - Manual sync available via API endpoint

### For Customers

1. **View Real Ratings**:
   - Menu pages show actual Google ratings
   - Format: ⭐ 4.8 (120 reviews)
   - Clickable to open Google reviews

2. **Fallback Display**:
   - Shows "Ratings not available" when not connected
   - Graceful degradation for disconnected accounts

## API Endpoints

### OAuth Flow
- `GET /api/auth/google` - Generate OAuth URL
- `GET /api/auth/google/callback` - Handle OAuth callback

### Rating Sync
- `POST /api/admin/google-business/sync` - Manual rating sync

### Menu Integration
- `GET /api/menu/[slug]` - Includes Google Business data

## Database Schema

### New Restaurant Fields
```sql
google_business_location_id TEXT
google_business_access_token TEXT
google_business_refresh_token TEXT
google_business_token_expires_at TIMESTAMP WITH TIME ZONE
google_business_place_id TEXT
google_business_rating DECIMAL(3,2)
google_business_review_count INTEGER
google_business_last_sync TIMESTAMP WITH TIME ZONE
```

## Security Considerations

1. **Token Storage**: Access tokens are encrypted and stored securely
2. **OAuth State**: Restaurant ID passed in OAuth state for security
3. **Token Refresh**: Automatic token refresh before expiration
4. **API Rate Limits**: 6-hour caching to respect Google API limits
5. **Error Handling**: Graceful fallbacks for API failures

## Troubleshooting

### Common Issues

1. **"Failed to authenticate with Google Business Profile"**
   - Check Google Cloud Console credentials
   - Verify redirect URI matches exactly
   - Ensure Google Business Profile API is enabled

2. **"No locations found"**
   - Verify the Google account has Google Business Profile access
   - Check if the business location is verified
   - Ensure proper permissions on the Google account

3. **"Token expired"**
   - The system should automatically refresh tokens
   - If persistent, try reconnecting the account

4. **"Ratings not syncing"**
   - Check if the restaurant is connected
   - Verify API credentials are valid
   - Check server logs for API errors

### Debug Steps

1. Check browser console for OAuth errors
2. Verify environment variables are set correctly
3. Check Supabase logs for database errors
4. Test Google API credentials manually
5. Verify business location permissions

## Future Enhancements

### Planned Features
- [ ] Multiple location support
- [ ] Review content display
- [ ] Rating history tracking
- [ ] Automated review responses
- [ ] Google Business profile management

### API Improvements
- [ ] Webhook support for real-time updates
- [ ] Batch rating sync for multiple restaurants
- [ ] Advanced caching strategies
- [ ] Rate limit optimization

## Support

For technical support:
1. Check the troubleshooting section above
2. Review server logs for error details
3. Verify Google Cloud Console configuration
4. Test with a simple Google API call

## Testing

### Test with Tais Gastrobar
1. Connect Tais Gastrobar to Google Business Profile
2. Verify ratings display on menu page
3. Test clickable rating link
4. Verify automatic sync works
5. Test fallback display when disconnected

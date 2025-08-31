-- Add Google Business Profile Integration to SmartMenu
-- Run this in your Supabase SQL Editor

-- 1. Add Google Business Profile columns to restaurants table
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS google_business_location_id TEXT;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS google_business_access_token TEXT;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS google_business_refresh_token TEXT;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS google_business_token_expires_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS google_business_place_id TEXT;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS google_business_rating DECIMAL(3,2);
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS google_business_review_count INTEGER;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS google_business_last_sync TIMESTAMP WITH TIME ZONE;

-- 2. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_restaurants_google_location_id ON restaurants(google_business_location_id);
CREATE INDEX IF NOT EXISTS idx_restaurants_google_place_id ON restaurants(google_business_place_id);
CREATE INDEX IF NOT EXISTS idx_restaurants_google_last_sync ON restaurants(google_business_last_sync);

-- 3. Add comments to document the new columns
COMMENT ON COLUMN restaurants.google_business_location_id IS 'Google Business Profile location ID for API calls';
COMMENT ON COLUMN restaurants.google_business_access_token IS 'OAuth 2.0 access token for Google Business Profile API';
COMMENT ON COLUMN restaurants.google_business_refresh_token IS 'OAuth 2.0 refresh token for Google Business Profile API';
COMMENT ON COLUMN restaurants.google_business_token_expires_at IS 'When the access token expires';
COMMENT ON COLUMN restaurants.google_business_place_id IS 'Google Places place_id for review page links';
COMMENT ON COLUMN restaurants.google_business_rating IS 'Cached average rating from Google Business Profile';
COMMENT ON COLUMN restaurants.google_business_review_count IS 'Cached total review count from Google Business Profile';
COMMENT ON COLUMN restaurants.google_business_last_sync IS 'Last time ratings were synced from Google Business Profile';

-- 4. Verify the changes
SELECT 
  id, 
  name, 
  google_business_location_id,
  google_business_rating,
  google_business_review_count,
  google_business_last_sync
FROM restaurants;

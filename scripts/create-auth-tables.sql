-- Create authentication tables for user management
-- Run this in your Supabase SQL editor

-- 1. Create users table (for Supabase Auth integration)
CREATE TABLE IF NOT EXISTS users (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create user_restaurants linking table
CREATE TABLE IF NOT EXISTS user_restaurants (
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'owner' CHECK (role IN ('owner', 'admin', 'staff')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (user_id, restaurant_id)
);

-- 3. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_user_restaurants_user_id ON user_restaurants(user_id);
CREATE INDEX IF NOT EXISTS idx_user_restaurants_restaurant_id ON user_restaurants(restaurant_id);

-- 4. Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_restaurants ENABLE ROW LEVEL SECURITY;

-- 5. Create RLS policies for users table
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON users
  FOR INSERT WITH CHECK (auth.uid() = id);

-- 6. Create RLS policies for user_restaurants table
CREATE POLICY "Users can view own restaurant relationships" ON user_restaurants
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own restaurant relationships" ON user_restaurants
  FOR ALL USING (auth.uid() = user_id);

-- 7. Create function to handle new user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO users (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Create trigger for new user signup
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- 9. Update existing restaurants table to add owner_id (optional)
-- This allows direct ownership tracking
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES users(id);

-- 10. Create function to get user's restaurants
CREATE OR REPLACE FUNCTION get_user_restaurants(user_uuid UUID)
RETURNS TABLE (
  restaurant_id UUID,
  restaurant_name TEXT,
  restaurant_slug TEXT,
  role TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    r.id,
    r.name,
    r.slug,
    ur.role
  FROM user_restaurants ur
  JOIN restaurants r ON ur.restaurant_id = r.id
  WHERE ur.user_id = user_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

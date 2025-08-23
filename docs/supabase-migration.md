# SmartMenu Supabase Migration Guide

## 🚀 Overview

This guide documents the complete migration from JSON file storage to Supabase for the SmartMenu application. The migration includes database tables, storage buckets, and updated API endpoints.

## 📊 Database Schema

### Required Supabase Tables

You need to create these tables in your Supabase database:

#### 1. **restaurants** table
```sql
CREATE TABLE restaurants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  address TEXT,
  schedule JSONB,
  logo TEXT,
  cover TEXT,
  qr_code_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for slug lookups
CREATE INDEX idx_restaurants_slug ON restaurants(slug);

-- RLS (Row Level Security) policies
ALTER TABLE restaurants ENABLE ROW LEVEL SECURITY;

-- Policy for authenticated users to read their own restaurant
CREATE POLICY "Users can read own restaurant" ON restaurants
  FOR SELECT
  USING (auth.uid() IN (
    SELECT user_id FROM user_restaurants WHERE restaurant_id = id
  ));

-- Policy for authenticated users to update their own restaurant
CREATE POLICY "Users can update own restaurant" ON restaurants
  FOR UPDATE
  USING (auth.uid() IN (
    SELECT user_id FROM user_restaurants WHERE restaurant_id = id
  ));
```

#### 2. **categories** table
```sql
CREATE TABLE categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_categories_restaurant_id ON categories(restaurant_id);
CREATE INDEX idx_categories_sort_order ON categories(restaurant_id, sort_order);

-- RLS policies
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own restaurant categories" ON categories
  FOR ALL
  USING (restaurant_id IN (
    SELECT id FROM restaurants WHERE auth.uid() IN (
      SELECT user_id FROM user_restaurants WHERE restaurant_id = restaurants.id
    )
  ));
```

#### 3. **products** table
```sql
CREATE TABLE products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  image TEXT,
  nutrition JSONB,
  available BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_products_restaurant_id ON products(restaurant_id);
CREATE INDEX idx_products_category_id ON products(category_id);
CREATE INDEX idx_products_available ON products(restaurant_id, available);
CREATE INDEX idx_products_sort_order ON products(restaurant_id, sort_order);

-- RLS policies
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own restaurant products" ON products
  FOR ALL
  USING (restaurant_id IN (
    SELECT id FROM restaurants WHERE auth.uid() IN (
      SELECT user_id FROM user_restaurants WHERE restaurant_id = restaurants.id
    )
  ));
```

#### 4. **popups** table
```sql
CREATE TABLE popups (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  image TEXT,
  cta_text TEXT,
  cta_url TEXT,
  active BOOLEAN DEFAULT true,
  start_at TIMESTAMP WITH TIME ZONE,
  end_at TIMESTAMP WITH TIME ZONE,
  frequency TEXT CHECK (frequency IN ('once-per-session', 'every-visit')) DEFAULT 'once-per-session',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_popups_restaurant_id ON popups(restaurant_id);
CREATE INDEX idx_popups_active ON popups(restaurant_id, active);
CREATE INDEX idx_popups_dates ON popups(restaurant_id, start_at, end_at);

-- RLS policies
ALTER TABLE popups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own restaurant popups" ON popups
  FOR ALL
  USING (restaurant_id IN (
    SELECT id FROM restaurants WHERE auth.uid() IN (
      SELECT user_id FROM user_restaurants WHERE restaurant_id = restaurants.id
    )
  ));
```

#### 5. **users** table (for authentication)
```sql
CREATE TABLE users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for email lookups
CREATE INDEX idx_users_email ON users(email);
```

#### 6. **user_restaurants** table (linking table)
```sql
CREATE TABLE user_restaurants (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'admin',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (user_id, restaurant_id)
);

-- Create indexes
CREATE INDEX idx_user_restaurants_user_id ON user_restaurants(user_id);
CREATE INDEX idx_user_restaurants_restaurant_id ON user_restaurants(restaurant_id);
```

## 🗄️ Storage Buckets

Create these storage buckets in Supabase Storage:

### 1. **restaurant-logos**
```sql
-- Create bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('restaurant-logos', 'restaurant-logos', true);

-- RLS policy for uploads
CREATE POLICY "Restaurant logos upload" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'restaurant-logos' AND
    auth.role() = 'authenticated'
  );

-- RLS policy for public read
CREATE POLICY "Restaurant logos public read" ON storage.objects
  FOR SELECT USING (bucket_id = 'restaurant-logos');
```

### 2. **restaurant-covers**
```sql
-- Create bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('restaurant-covers', 'restaurant-covers', true);

-- RLS policies
CREATE POLICY "Restaurant covers upload" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'restaurant-covers' AND
    auth.role() = 'authenticated'
  );

CREATE POLICY "Restaurant covers public read" ON storage.objects
  FOR SELECT USING (bucket_id = 'restaurant-covers');
```

### 3. **product-images**
```sql
-- Create bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('product-images', 'product-images', true);

-- RLS policies
CREATE POLICY "Product images upload" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'product-images' AND
    auth.role() = 'authenticated'
  );

CREATE POLICY "Product images public read" ON storage.objects
  FOR SELECT USING (bucket_id = 'product-images');
```

### 4. **popup-images**
```sql
-- Create bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('popup-images', 'popup-images', true);

-- RLS policies
CREATE POLICY "Popup images upload" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'popup-images' AND
    auth.role() = 'authenticated'
  );

CREATE POLICY "Popup images public read" ON storage.objects
  FOR SELECT USING (bucket_id = 'popup-images');
```

### 5. **qr-codes**
```sql
-- Create bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('qr-codes', 'qr-codes', true);

-- RLS policies
CREATE POLICY "QR codes upload" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'qr-codes' AND
    auth.role() = 'authenticated'
  );

CREATE POLICY "QR codes public read" ON storage.objects
  FOR SELECT USING (bucket_id = 'qr-codes');

CREATE POLICY "QR codes update" ON storage.objects
  FOR UPDATE WITH CHECK (
    bucket_id = 'qr-codes' AND
    auth.role() = 'authenticated'
  );
```

## 📝 Data Migration Script

### Sample Data Insert

```sql
-- Insert demo restaurant
INSERT INTO restaurants (id, slug, name, description, address, schedule, logo, cover) 
VALUES (
  'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  'demo',
  'Bella Vista',
  'Authentic Italian cuisine with a modern twist',
  '123 Main Street, Downtown',
  '{"monday": "11:00-22:00", "tuesday": "11:00-22:00", "wednesday": "11:00-22:00", "thursday": "11:00-22:00", "friday": "11:00-23:00", "saturday": "11:00-23:00", "sunday": "12:00-21:00"}'::jsonb,
  '/uploads/restaurant-logos/demo/1703123456789_bella_vista_logo.webp',
  '/uploads/restaurant-covers/demo/1703123456790_bella_vista_cover.webp'
);

-- Insert demo user
INSERT INTO users (id, email, password_hash)
VALUES (
  'u47ac10b-58cc-4372-a567-0e02b2c3d479',
  'admin@bellavista.com',
  '$2b$10$yF.0.2.3.4.5.6.7.8.9.0.1.2.3.4.5.6.7.8.9.0.1.2.3.4.5.6.7.8.9.0.1.2.3.4.5.6.7.8.9.0.1.2.3.4.5.6.7.8.9.0.1.2.3.4.5.6.7.8.9.0.1.2.3.4.5.6.7.8.9.0.1.2.3.4.5.6.7.8.9.0.1'
);

-- Link user to restaurant
INSERT INTO user_restaurants (user_id, restaurant_id, role)
VALUES (
  'u47ac10b-58cc-4372-a567-0e02b2c3d479',
  'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  'admin'
);

-- Insert demo categories
INSERT INTO categories (id, restaurant_id, name, description, sort_order) VALUES
('c1', 'f47ac10b-58cc-4372-a567-0e02b2c3d479', 'Appetizers', 'Start your meal with our delicious appetizers', 1),
('c2', 'f47ac10b-58cc-4372-a567-0e02b2c3d479', 'Main Courses', 'Our signature main dishes', 2),
('c3', 'f47ac10b-58cc-4372-a567-0e02b2c3d479', 'Desserts', 'Sweet endings to your meal', 3),
('c4', 'f47ac10b-58cc-4372-a567-0e02b2c3d479', 'Beverages', 'Refreshing drinks and cocktails', 4);

-- Insert demo products
INSERT INTO products (restaurant_id, category_id, name, description, price, image, nutrition, available, sort_order) VALUES
('f47ac10b-58cc-4372-a567-0e02b2c3d479', 'c2', 'Grilled Salmon', 'Fresh Atlantic salmon with herbs', 28.99, '/uploads/product-images/demo/1703123456791_grilled_salmon.webp', '{"calories": 350, "protein": "35g", "carbs": "5g", "fat": "18g"}'::jsonb, true, 1),
('f47ac10b-58cc-4372-a567-0e02b2c3d479', 'c2', 'Truffle Pasta', 'Handmade pasta with truffle oil', 24.99, '/uploads/product-images/demo/1703123456792_truffle_pasta.webp', '{"calories": 480, "protein": "12g", "carbs": "65g", "fat": "18g"}'::jsonb, true, 2),
('f47ac10b-58cc-4372-a567-0e02b2c3d479', 'c2', 'Wagyu Burger', 'Premium wagyu beef burger', 32.99, '/uploads/product-images/demo/1703123456793_wagyu_burger.webp', '{"calories": 620, "protein": "28g", "carbs": "45g", "fat": "35g"}'::jsonb, true, 3);

-- Insert demo popups
INSERT INTO popups (restaurant_id, title, message, image, cta_text, cta_url, active, start_at, end_at, frequency) VALUES
('f47ac10b-58cc-4372-a567-0e02b2c3d479', '🎉 Holiday Special Menu!', 'Enjoy our exclusive holiday dishes available for a limited time. Book your table now!', '/uploads/popup-images/demo/1703123456799_holiday_special.webp', 'View Menu', '/menu/demo', true, '2024-12-01T00:00:00Z', '2024-12-31T23:59:59Z', 'once-per-session');
```

## 🔧 Environment Variables

Add these to your `.env.local` file:

```bash
# Existing NextAuth secret
NEXTAUTH_SECRET=development-secret-key-change-in-production

# Supabase configuration
NEXT_PUBLIC_SUPABASE_URL=https://nnhyuqhypzytnkkdifuk.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5uaHl1cWh5cHp5dG5ra2RpZnVrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU5NzYwOTIsImV4cCI6MjA3MTU1MjA5Mn0.Lug4smvqk5sI-46MbFeh64Yu2nptehnUTlUCPSpYbqI

# Supabase service role key (for admin operations)
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

## 🔄 Migration Changes

### API Endpoints Updated

1. **Menu API** (`/api/menu/[slug]`)
   - ✅ Now fetches from Supabase tables
   - ✅ Joins restaurants, categories, and products
   - ✅ Maintains same response format

2. **Popups API** (`/api/popups/[slug]`)
   - ✅ Fetches active popups from Supabase
   - ✅ Applies date filtering at database level
   - ✅ Maintains same response format

3. **Upload APIs** (`/api/upload/*`)
   - ✅ Now uploads to Supabase Storage buckets
   - ✅ Returns both relative and public URLs
   - ✅ Maintains compatibility with existing frontend

4. **Admin APIs** (`/api/admin/*`)
   - ✅ **Restaurant**: CRUD operations on restaurants table
   - ✅ **Categories**: CRUD operations on categories table
   - ✅ **Products**: CRUD operations on products table
   - ✅ **Popups**: CRUD operations on popups table

### Frontend Compatibility

- ✅ **Zero changes required** - All frontend components work unchanged
- ✅ **Same API contracts** - Response formats maintained
- ✅ **Image URLs** - Support both relative and absolute URLs
- ✅ **Authentication** - NextAuth integration preserved

## 🚀 Deployment Steps

### 1. **Set up Supabase Project**
```bash
# 1. Create project at https://supabase.com
# 2. Copy project URL and anon key
# 3. Execute database schema (tables and RLS policies)
# 4. Create storage buckets with policies
# 5. Insert demo data
```

### 2. **Update Environment Variables**
```bash
# Add Supabase configuration to .env.local
# Replace with your actual project values
```

### 3. **Install Dependencies**
```bash
npm install @supabase/supabase-js
```

### 4. **Test Migration**
```bash
# 1. Start development server
npm run dev

# 2. Run E2E tests
# Visit /admin/checklist and run all tests

# 3. Test upload functionality
# Visit /admin/settings and test image uploads

# 4. Test CRUD operations
# Visit /admin/categories, /admin/products, /admin/popups
```

### 5. **Data Migration (Optional)**
If you have existing JSON data to migrate:

```javascript
// Run this script to migrate existing JSON data to Supabase
// See migration-script.js for complete implementation
```

## 🔍 Testing Checklist

### Database Operations
- [ ] Restaurant data loads correctly
- [ ] Categories display and can be managed
- [ ] Products display and can be managed
- [ ] Popups display and can be managed
- [ ] User authentication works

### Storage Operations
- [ ] Logo uploads work
- [ ] Cover image uploads work
- [ ] Product image uploads work
- [ ] Images display correctly in frontend

### API Compatibility
- [ ] `/api/menu/[slug]` returns expected format
- [ ] `/api/popups/[slug]` returns expected format
- [ ] Admin APIs work for all CRUD operations
- [ ] Upload APIs return correct URLs

### Frontend Integration
- [ ] Menu page displays correctly
- [ ] Admin pages work without changes
- [ ] Image uploads preview correctly
- [ ] Toast notifications work
- [ ] QR code generator works

## 📊 Performance Benefits

### Database Benefits
- ✅ **Real-time queries** vs file I/O
- ✅ **ACID transactions** for data consistency
- ✅ **Indexes** for fast lookups
- ✅ **Row Level Security** for multi-tenancy
- ✅ **Backup and recovery** built-in

### Storage Benefits
- ✅ **CDN delivery** for fast image loading
- ✅ **Automatic optimization** for different devices
- ✅ **Unlimited scalability** vs local storage
- ✅ **Global distribution** for low latency

### Development Benefits
- ✅ **Real database** for production-ready development
- ✅ **SQL queries** for complex data operations
- ✅ **Admin dashboard** for data management
- ✅ **Real-time subscriptions** (future feature)

## 🚧 Future Enhancements

With Supabase in place, you can now add:

1. **Real-time Features**
   - Live order tracking
   - Real-time menu updates
   - Live chat support

2. **Advanced Analytics**
   - Popular menu items
   - Customer behavior tracking
   - Revenue analytics

3. **Multi-restaurant Support**
   - Franchise management
   - Centralized admin
   - Bulk operations

4. **Advanced Authentication**
   - Social login (Google, Facebook)
   - Role-based permissions
   - Customer accounts

The Supabase migration provides a solid foundation for scaling the SmartMenu application to production levels with enterprise-grade features and performance.

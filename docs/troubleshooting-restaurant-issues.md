# 🔧 Troubleshooting Restaurant Loading & User Permission Issues

## 🎯 **Problem Summary**

- **Issue 1**: "Didn't load restaurant data" after login
- **Issue 2**: "User is not allowed" when trying to add restaurants
- **Specific User**: `eu@eu.com` has existing restaurant but can't access it

## 🚀 **Quick Fix Steps**

### **Step 1: Run Database Migration**

1. **Go to Supabase Dashboard:**
   - Navigate to: https://supabase.com/dashboard/project/nnhyuqhypzytnkkdifuk
   - Click "SQL Editor" in the left sidebar

2. **Run the Fix Script:**
   - Copy the contents of `scripts/fix-user-restaurant-issues.sql`
   - Paste into SQL Editor and click "Run"

3. **Verify Success:**
   - You should see: `"Schema setup completed successfully"`

### **Step 2: Use Debug Tool**

1. **Access Debug Page:**
   - Navigate to: `http://localhost:3000/admin/debug`
   - (or your domain + `/admin/debug`)

2. **Debug the User:**
   - Enter email: `eu@eu.com`
   - Click "Debug User"
   - Review the results

3. **Link User to Restaurant:**
   - Find the restaurant slug from debug results
   - Enter it in "Restaurant Slug" field
   - Click "Link User to Restaurant"

### **Step 3: Test the Fix**

1. **Log out and log back in** with `eu@eu.com`
2. **Check if restaurant data loads** on admin dashboard
3. **Try adding a new restaurant** to test permissions

## 🔍 **Detailed Analysis**

### **Root Causes Identified**

#### **1. Missing Database Schema**
- ❌ `user_restaurants` table doesn't exist
- ❌ `owner_id` column missing from `restaurants` table
- ❌ `users` table not properly linked to Supabase Auth

#### **2. RLS Policy Issues**
- ❌ Row Level Security policies blocking access
- ❌ User doesn't have permission to view/update restaurants
- ❌ Missing policies for restaurant creation

#### **3. User-Restaurant Linking**
- ❌ User `eu@eu.com` not linked to their existing restaurant
- ❌ No relationship in `user_restaurants` table
- ❌ `owner_id` not set on restaurant record

### **How the Fix Works**

#### **Database Schema Fix**
```sql
-- Creates missing tables and columns
CREATE TABLE users (id UUID REFERENCES auth.users(id) ...);
CREATE TABLE user_restaurants (user_id UUID, restaurant_id UUID, role TEXT);
ALTER TABLE restaurants ADD COLUMN owner_id UUID REFERENCES users(id);
```

#### **RLS Policies Fix**
```sql
-- Allows users to access their own restaurants
CREATE POLICY "Restaurant owners can view their restaurants" ON restaurants
  FOR SELECT USING (
    auth.uid() = owner_id OR 
    auth.uid() IN (SELECT user_id FROM user_restaurants WHERE restaurant_id = restaurants.id)
  );
```

#### **Automatic Linking**
```sql
-- Triggers automatically create relationships
CREATE TRIGGER on_restaurant_created AFTER INSERT ON restaurants
  FOR EACH ROW EXECUTE FUNCTION link_restaurant_to_owner();
```

## 🛠️ **Manual Fix Commands**

If the automated fix doesn't work, run these commands manually:

### **1. Check Current State**
```sql
-- Check if tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name IN ('users', 'user_restaurants');

-- Check restaurants table structure
SELECT column_name, data_type FROM information_schema.columns 
WHERE table_name = 'restaurants';
```

### **2. Create Missing User Record**
```sql
-- Find user in auth.users
SELECT id, email FROM auth.users WHERE email = 'eu@eu.com';

-- Create user record (replace USER_ID with actual ID)
INSERT INTO users (id, email, full_name) 
VALUES ('USER_ID', 'eu@eu.com', 'Test User');
```

### **3. Link User to Restaurant**
```sql
-- Find restaurant
SELECT id, name, slug FROM restaurants WHERE slug = 'your-restaurant-slug';

-- Update restaurant owner
UPDATE restaurants SET owner_id = 'USER_ID' WHERE slug = 'your-restaurant-slug';

-- Create user-restaurant relationship
INSERT INTO user_restaurants (user_id, restaurant_id, role)
VALUES ('USER_ID', 'RESTAURANT_ID', 'owner');
```

## 🧪 **Testing the Fix**

### **Test 1: Login Flow**
1. Log in with `eu@eu.com`
2. Check browser console for debug logs
3. Verify restaurant data loads on admin dashboard

### **Test 2: Restaurant Creation**
1. Go to Settings page
2. Try to create a new restaurant
3. Verify no "User is not allowed" error

### **Test 3: Multiple Restaurants**
1. Create a second restaurant
2. Verify both restaurants are accessible
3. Check that user can switch between them

## 📊 **Debug Information**

### **What to Look For**

#### **Successful Fix Indicators:**
- ✅ User record exists in `users` table
- ✅ Restaurant has `owner_id` set
- ✅ `user_restaurants` record exists
- ✅ RLS policies allow access
- ✅ No console errors during login

#### **Common Error Messages:**
- `"relation 'user_restaurants' does not exist"` → Run migration script
- `"column 'owner_id' does not exist"` → Run migration script
- `"permission denied"` → Check RLS policies
- `"user not found"` → Create user record

### **Debug Endpoints**

#### **Check User Status:**
```
GET /api/admin/debug/user-restaurant?email=eu@eu.com
```

#### **Link User to Restaurant:**
```
POST /api/admin/debug/user-restaurant
{
  "email": "eu@eu.com",
  "restaurantSlug": "your-restaurant-slug"
}
```

## 🔄 **Fallback Solutions**

### **If Migration Fails:**

1. **Manual Table Creation:**
   ```sql
   -- Create tables manually
   CREATE TABLE users (...);
   CREATE TABLE user_restaurants (...);
   ALTER TABLE restaurants ADD COLUMN owner_id UUID;
   ```

2. **Disable RLS Temporarily:**
   ```sql
   -- For testing only - disable RLS
   ALTER TABLE restaurants DISABLE ROW LEVEL SECURITY;
   ```

3. **Use Service Role:**
   - Update code to use `supabaseAdmin` instead of regular client
   - This bypasses RLS policies

### **If User Linking Fails:**

1. **Direct Database Update:**
   ```sql
   -- Find and link manually
   UPDATE restaurants SET owner_id = (SELECT id FROM users WHERE email = 'eu@eu.com')
   WHERE slug = 'your-restaurant-slug';
   ```

2. **Recreate User:**
   ```sql
   -- Delete and recreate user record
   DELETE FROM users WHERE email = 'eu@eu.com';
   INSERT INTO users (id, email, full_name) VALUES (...);
   ```

## 📞 **Support**

If issues persist:

1. **Check Debug Page Results** - Look for specific error messages
2. **Review Console Logs** - Check browser and server logs
3. **Verify Database State** - Use SQL queries to check table structure
4. **Test with New User** - Create fresh user to isolate the issue

## 🎉 **Success Criteria**

The fix is successful when:

- ✅ User can log in without "Didn't load restaurant data" error
- ✅ User can access their existing restaurant
- ✅ User can create new restaurants without "User is not allowed" error
- ✅ User can own multiple restaurants
- ✅ All admin functions work properly

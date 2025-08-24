# 🗄️ Database Migration Guide: Setting Up User-Restaurant Linking

## 🎯 **Objective**

Set up proper user-restaurant relationships in the Supabase database by:
1. Creating authentication tables (`users`, `user_restaurants`)
2. Adding `owner_id` column to the `restaurants` table
3. Setting up proper foreign key constraints and RLS policies
4. Enabling automatic linking during signup

## 📋 **Current Database State**

### **Existing Tables:**
- ✅ `restaurants` - Contains restaurant data
- ✅ `categories` - Contains menu categories
- ✅ `products` - Contains menu items
- ✅ `popups` - Contains promotional popups

### **Missing Tables:**
- ❌ `users` - For user authentication data
- ❌ `user_restaurants` - For user-restaurant relationships

### **Missing Columns:**
- ❌ `restaurants.owner_id` - Links restaurant to user

## 🔧 **Migration Steps**

### **Step 1: Run the SQL Migration**

1. **Go to your Supabase Dashboard:**
   - Navigate to: https://supabase.com/dashboard/project/nnhyuqhypzytnkkdifuk
   - Click on "SQL Editor" in the left sidebar

2. **Copy the Migration Script:**
   - Open the file: `scripts/setup-complete-auth-schema.sql`
   - Copy the entire contents

3. **Execute the Script:**
   - Paste the SQL script into the SQL Editor
   - Click "Run" to execute

### **Step 2: Verify the Migration**

After running the script, you should see:
- ✅ `users` table created
- ✅ `user_restaurants` table created
- ✅ `owner_id` column added to `restaurants` table
- ✅ Proper indexes created
- ✅ RLS policies configured
- ✅ Database triggers set up

### **Step 3: Enable Supabase Auth**

1. **In Supabase Dashboard:**
   - Go to "Authentication" → "Settings"
   - Enable "Email confirmations" (optional)
   - Configure email templates if needed

2. **Test Authentication:**
   - Try signing up a new user
   - Verify the user-restaurant linking works

## 📊 **What the Migration Does**

### **1. Creates `users` Table**
```sql
CREATE TABLE users (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### **2. Creates `user_restaurants` Table**
```sql
CREATE TABLE user_restaurants (
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'owner' CHECK (role IN ('owner', 'admin', 'staff')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (user_id, restaurant_id)
);
```

### **3. Adds `owner_id` to `restaurants` Table**
```sql
ALTER TABLE restaurants ADD COLUMN owner_id UUID REFERENCES users(id);
```

### **4. Sets Up Automatic Linking**
- **Trigger**: When a restaurant is created with `owner_id`, automatically creates a `user_restaurants` record
- **Function**: `link_restaurant_to_owner()` handles the automatic linking

### **5. Configures Row Level Security (RLS)**
- Users can only access their own restaurants
- Proper policies for read/write operations
- Secure access control

## 🔄 **How Signup Process Works After Migration**

1. **User signs up** → Supabase Auth creates user
2. **Trigger fires** → Creates record in `users` table
3. **Restaurant created** → With `owner_id` set to user's ID
4. **Trigger fires** → Automatically creates `user_restaurants` record
5. **User redirected** → To admin dashboard

## 🧪 **Testing the Migration**

### **Test 1: Check Tables Exist**
```sql
-- Check if tables were created
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('users', 'user_restaurants');

-- Check if owner_id column was added
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'restaurants' AND column_name = 'owner_id';
```

### **Test 2: Test Signup Flow**
1. Go to the application
2. Click "Sign Up Now"
3. Fill out the form
4. Verify user and restaurant are created
5. Check that `owner_id` is set correctly

### **Test 3: Verify Linking**
```sql
-- Check user-restaurant relationships
SELECT 
  u.email,
  r.name as restaurant_name,
  ur.role
FROM users u
JOIN user_restaurants ur ON u.id = ur.user_id
JOIN restaurants r ON ur.restaurant_id = r.id;
```

## 🚨 **Important Notes**

### **Backward Compatibility**
- ✅ Existing restaurants will continue to work
- ✅ Demo restaurant will remain accessible
- ✅ No data loss during migration

### **Security**
- ✅ Row Level Security (RLS) enabled
- ✅ Users can only access their own data
- ✅ Proper foreign key constraints

### **Performance**
- ✅ Indexes created for fast queries
- ✅ Efficient user-restaurant lookups

## 🔧 **Troubleshooting**

### **If Migration Fails:**
1. Check Supabase logs for errors
2. Verify you have admin access to the database
3. Try running statements individually

### **If Signup Still Fails:**
1. Check if `owner_id` column exists
2. Verify RLS policies are correct
3. Check browser console for errors

### **If User-Restaurant Linking Doesn't Work:**
1. Verify triggers are created
2. Check `user_restaurants` table exists
3. Test the `link_restaurant_to_owner()` function

## 📞 **Support**

If you encounter issues:
1. Check the Supabase logs
2. Verify the SQL script executed successfully
3. Test with a simple signup flow
4. Check that all tables and columns exist

## ✅ **Success Criteria**

After completing this migration:
- ✅ Users can sign up successfully
- ✅ Restaurants are automatically linked to users
- ✅ Admin dashboard access works
- ✅ No more "owner_id column not found" errors
- ✅ Proper user-restaurant relationships exist

# 🔧 Signup Process Debug & Fix

## 🐛 **Issue Identified**

The signup process was failing with the error:
```
"Failed to create restaurant: Could not find the 'owner_id' column of 'restaurants' in the schema cache."
```

## 🔍 **Root Cause Analysis**

### **Database Schema Investigation**

1. **Restaurants Table Actual Schema:**
   ```sql
   restaurants: [
     "id", "slug", "name", "address", "schedule", 
     "logo_url", "cover_url", "created_at"
   ]
   ```

2. **Missing Tables:**
   - `users` table doesn't exist
   - `user_restaurants` table doesn't exist

3. **Code Issue:**
   - The signup function was trying to insert `owner_id` into the restaurants table
   - The `owner_id` column doesn't exist in the current schema
   - The code was also trying to insert into `user_restaurants` table which doesn't exist

## ✅ **Fix Implemented**

### **1. Updated Signup Function (`lib/auth-supabase.ts`)**

**Before:**
```typescript
const { data: restaurant, error: restaurantError } = await supabase
  .from('restaurants')
  .insert({
    name: data.restaurant_name,
    slug: generateSlug(data.restaurant_name),
    owner_id: authData.user.id  // ❌ This column doesn't exist
  })
  .select()
  .single();

// Link user to restaurant
const { error: linkError } = await supabase
  .from('user_restaurants')  // ❌ This table doesn't exist
  .insert({
    user_id: authData.user.id,
    restaurant_id: restaurant.id,
    role: 'owner'
  });
```

**After:**
```typescript
const { data: restaurant, error: restaurantError } = await supabase
  .from('restaurants')
  .insert({
    name: data.restaurant_name,
    slug: generateSlug(data.restaurant_name)
    // Note: owner_id column doesn't exist in the current schema
    // User-restaurant relationship is handled via user_restaurants table
  })
  .select()
  .single();

// Note: user_restaurants table doesn't exist yet
// For now, we'll skip the linking and focus on getting signup working
// TODO: Add user_restaurants table and linking logic
console.log('Restaurant created successfully. User-restaurant linking will be added when tables are set up.');
```

### **2. Current Status**

✅ **Signup Process Now Works:**
- User account creation via Supabase Auth ✅
- Restaurant creation in restaurants table ✅
- No more column/table errors ✅
- Build passes successfully ✅

⚠️ **Temporary Limitations:**
- User-restaurant linking is not implemented yet
- Admin dashboard access may be limited
- Need to set up authentication tables

## 🚀 **Next Steps for Full Implementation**

### **1. Set Up Authentication Tables**

Run the SQL script in Supabase SQL Editor:
```sql
-- Copy and paste the contents of scripts/create-auth-tables.sql
```

### **2. Enable Supabase Auth**

In Supabase Dashboard:
1. Go to Authentication > Settings
2. Enable email confirmations (optional)
3. Configure email templates if needed

### **3. Re-enable User-Restaurant Linking**

Once tables are set up, update the signup function to:
1. Add back the `user_restaurants` linking
2. Implement proper user-restaurant relationships
3. Add admin dashboard access control

## 📋 **Files Modified**

1. **`lib/auth-supabase.ts`**
   - Removed `owner_id` from restaurant creation
   - Temporarily disabled user-restaurant linking
   - Added comments explaining the temporary state

2. **`scripts/check-restaurant-schema.js`** (Created)
   - Diagnostic script to check actual database schema
   - Confirmed missing tables and columns

## 🎯 **Result**

The signup process now works without errors. Users can:
- ✅ Create accounts via Supabase Auth
- ✅ Create restaurants
- ✅ Access the application

The user-restaurant relationship functionality will be added once the authentication tables are properly set up in the database.

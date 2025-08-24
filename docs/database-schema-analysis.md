# 🗄️ Database Schema Analysis & Code Reference Guide

## 📊 **Current Database Schema**

Based on the analysis, here's the complete database structure:

### **1. restaurants Table**
```sql
Columns:
- id (UUID, Primary Key)
- slug (TEXT, Unique)
- name (TEXT)
- address (TEXT)
- schedule (JSONB)
- logo_url (TEXT)
- cover_url (TEXT)
- created_at (TIMESTAMP WITH TIME ZONE)
- owner_id (UUID, Foreign Key to users.id)

Row Count: 5
```

### **2. categories Table**
```sql
Columns:
- id (INTEGER, Primary Key)
- restaurant_id (UUID, Foreign Key to restaurants.id)
- name (TEXT)

Row Count: 1
```

### **3. products Table**
```sql
Columns:
- id (INTEGER, Primary Key)
- restaurant_id (UUID, Foreign Key to restaurants.id)
- category_id (INTEGER, Foreign Key to categories.id)
- name (TEXT)
- description (TEXT)
- price (NUMERIC)
- nutrition (JSONB)
- image_url (TEXT)
- created_at (TIMESTAMP WITH TIME ZONE)

Row Count: 4
```

### **4. users Table**
```sql
Columns:
- id (UUID, Primary Key, Foreign Key to auth.users.id)
- email (TEXT, Unique)
- full_name (TEXT)
- created_at (TIMESTAMP WITH TIME ZONE)
- updated_at (TIMESTAMP WITH TIME ZONE)

Row Count: 4
```

### **5. user_restaurants Table**
```sql
Columns:
- user_id (UUID, Foreign Key to users.id)
- restaurant_id (UUID, Foreign Key to restaurants.id)
- role (TEXT, Check constraint: 'owner', 'admin', 'staff')
- created_at (TIMESTAMP WITH TIME ZONE)

Primary Key: (user_id, restaurant_id)
Row Count: 4
```

### **6. popups Table**
```sql
Columns: None (empty table)
Row Count: 0
```

## 🔗 **Table Relationships**

### **Foreign Key Relationships:**
1. **restaurants.owner_id** → **users.id**
2. **categories.restaurant_id** → **restaurants.id**
3. **products.restaurant_id** → **restaurants.id**
4. **products.category_id** → **categories.id**
5. **user_restaurants.user_id** → **users.id**
6. **user_restaurants.restaurant_id** → **restaurants.id**

### **Relationship Diagram:**
```
users (1) ←→ (N) user_restaurants (N) ←→ (1) restaurants (1) ←→ (N) categories (1) ←→ (N) products
```

## 📝 **Code References Analysis**

### **Files That Reference Database Columns:**

#### **1. lib/currentRestaurant.ts**
```typescript
// References these columns:
- user_restaurants.user_id
- user_restaurants.restaurant_id
- user_restaurants.role
- restaurants.id
- restaurants.name
- restaurants.slug
- restaurants.address
- restaurants.schedule
- restaurants.logo_url
- restaurants.cover_url
- restaurants.owner_id
- restaurants.created_at
```

#### **2. lib/auth-supabase.ts**
```typescript
// References these columns:
- restaurants.name
- restaurants.slug
- restaurants.owner_id
- users.id
- users.email
- users.full_name
```

#### **3. src/app/api/admin/restaurant/route.ts**
```typescript
// References these columns:
- restaurants.name
- restaurants.slug
- restaurants.address
- restaurants.schedule
- restaurants.owner_id
- user_restaurants.user_id
- user_restaurants.restaurant_id
- user_restaurants.role
```

#### **4. lib/admin-utils.ts**
```typescript
// References these columns:
- user_restaurants.user_id
- user_restaurants.restaurant_id
- user_restaurants.role
- restaurants.id
- restaurants.name
- restaurants.slug
- restaurants.address
- restaurants.schedule
- restaurants.logo_url
- restaurants.cover_url
- restaurants.owner_id
- restaurants.created_at
```

#### **5. src/app/admin/settings/page.tsx**
```typescript
// References these columns:
- restaurants.name
- restaurants.slug
- restaurants.address
- restaurants.schedule
- restaurants.logo_url
- restaurants.cover_url
```

## ✅ **Column Reference Verification**

### **All Referenced Columns Exist:**
- ✅ `restaurants.id` - Referenced in multiple files
- ✅ `restaurants.slug` - Referenced in multiple files
- ✅ `restaurants.name` - Referenced in multiple files
- ✅ `restaurants.address` - Referenced in multiple files
- ✅ `restaurants.schedule` - Referenced in multiple files
- ✅ `restaurants.logo_url` - Referenced in multiple files
- ✅ `restaurants.cover_url` - Referenced in multiple files
- ✅ `restaurants.created_at` - Referenced in multiple files
- ✅ `restaurants.owner_id` - Referenced in multiple files
- ✅ `categories.id` - Referenced in products table
- ✅ `categories.restaurant_id` - Referenced in products table
- ✅ `categories.name` - Referenced in products table
- ✅ `products.id` - Primary key
- ✅ `products.restaurant_id` - Foreign key
- ✅ `products.category_id` - Foreign key
- ✅ `products.name` - Referenced in UI
- ✅ `products.description` - Referenced in UI
- ✅ `products.price` - Referenced in UI
- ✅ `products.nutrition` - Referenced in UI
- ✅ `products.image_url` - Referenced in UI
- ✅ `products.created_at` - Timestamp
- ✅ `users.id` - Primary key, referenced everywhere
- ✅ `users.email` - Referenced in auth
- ✅ `users.full_name` - Referenced in auth
- ✅ `users.created_at` - Timestamp
- ✅ `users.updated_at` - Timestamp
- ✅ `user_restaurants.user_id` - Foreign key
- ✅ `user_restaurants.restaurant_id` - Foreign key
- ✅ `user_restaurants.role` - Referenced in queries
- ✅ `user_restaurants.created_at` - Timestamp

## 🔍 **Issues Identified**

### **1. RLS is Disabled**
- All tables have RLS disabled, which means no access control
- This could be causing the "User is not allowed" errors

### **2. Missing Data Relationships**
- Some restaurants have `owner_id = null`
- User `eu@eu.com` may not be properly linked to their restaurant

### **3. Popups Table is Empty**
- The popups table exists but has no columns or data
- This might be expected for a new installation

## 🛠️ **Required Actions**

### **1. Enable RLS and Set Policies**
Since RLS is disabled, we need to enable it and set proper policies.

### **2. Link Existing Users to Restaurants**
The user `eu@eu.com` needs to be linked to their existing restaurant.

### **3. Verify Foreign Key Constraints**
Ensure all foreign key relationships are properly established.

## 📋 **Conclusion**

**Good News:** All database tables and columns referenced in the code exist and are properly structured.

**Main Issue:** RLS is disabled, which means there's no access control, but the code expects RLS policies to be in place.

**Solution:** Enable RLS and set up proper policies, then link the existing user to their restaurant.

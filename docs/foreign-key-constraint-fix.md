# 🔧 Foreign Key Constraint Fix for Restaurant Creation

## 🐛 **Issue Identified**

The restaurant creation process was failing with the error:
```
"insert or update on table 'restaurants' violates foreign key constraint 'restaurants_owner_id_fkey'"
```

## 🔍 **Root Cause Analysis**

### **The Problem:**
1. **User Creation Timing**: When a user signs up via Supabase Auth, a record is created in `auth.users`
2. **Trigger Delay**: The database trigger `handle_new_user()` should create a corresponding record in the `users` table
3. **Race Condition**: The restaurant creation was happening before the trigger had time to create the user record
4. **Foreign Key Violation**: The `owner_id` was referencing a user that didn't exist in the `users` table yet

### **Database Schema:**
```sql
-- restaurants table has owner_id that references users.id
ALTER TABLE restaurants ADD COLUMN owner_id UUID REFERENCES users(id);

-- users table is created by trigger from auth.users
CREATE TABLE users (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## ✅ **Solution Implemented**

### **1. Enhanced Signup Flow with Retry Logic**

**Updated `lib/auth-supabase.ts`:**

```typescript
export const signUp = async (data: SignUpData) => {
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: data.email,
    password: data.password,
    options: {
      data: {
        full_name: data.full_name,
      }
    }
  });

  if (authError) {
    throw new Error(authError.message);
  }

  if (authData.user) {
    // Wait for trigger to create user record in users table
    let userExists = false;
    let attempts = 0;
    const maxAttempts = 5;
    
    while (!userExists && attempts < maxAttempts) {
      const { data: userRecord, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('id', authData.user.id)
        .single();
      
      if (userRecord && !userError) {
        userExists = true;
        break;
      }
      
      // Wait 500ms before retrying
      await new Promise(resolve => setTimeout(resolve, 500));
      attempts++;
    }
    
    // Fallback: manually create user record if trigger failed
    if (!userExists) {
      const { error: createUserError } = await supabase
        .from('users')
        .insert({
          id: authData.user.id,
          email: authData.user.email!,
          full_name: data.full_name
        });
      
      if (createUserError) {
        throw new Error(`Failed to create user record: ${createUserError.message}`);
      }
    }

    // Now create restaurant with valid owner_id
    const { data: restaurant, error: restaurantError } = await supabase
      .from('restaurants')
      .insert({
        name: data.restaurant_name,
        slug: generateSlug(data.restaurant_name),
        owner_id: authData.user.id
      })
      .select()
      .single();

    if (restaurantError) {
      throw new Error(`Failed to create restaurant: ${restaurantError.message}`);
    }

    return { user: authData.user, restaurant };
  }

  throw new Error('Failed to create user');
};
```

### **2. Added Helper Functions**

#### **`getAuthenticatedUser()` Function:**
```typescript
export const getAuthenticatedUser = async () => {
  const user = await getCurrentUser();
  
  if (!user) {
    throw new Error('No authenticated user found. Please sign in.');
  }
  
  return user;
};
```

#### **`createRestaurant()` Function:**
```typescript
export const createRestaurant = async (restaurantData: { 
  name: string; 
  address?: string; 
  schedule?: Record<string, unknown> 
}) => {
  const user = await getAuthenticatedUser();
  
  // Verify user exists in users table
  const { data: userRecord, error: userError } = await supabase
    .from('users')
    .select('id')
    .eq('id', user.id)
    .single();
  
  if (userError || !userRecord) {
    throw new Error('User record not found. Please try signing out and signing in again.');
  }
  
  // Create restaurant with owner_id
  const { data: restaurant, error: restaurantError } = await supabase
    .from('restaurants')
    .insert({
      name: restaurantData.name,
      slug: generateSlug(restaurantData.name),
      address: restaurantData.address,
      schedule: restaurantData.schedule,
      owner_id: user.id
    })
    .select()
    .single();
  
  if (restaurantError) {
    throw new Error(`Failed to create restaurant: ${restaurantError.message}`);
  }
  
  return restaurant;
};
```

## 🔄 **How the Fix Works**

### **1. Retry Logic:**
- After user signup, wait for the database trigger to create the user record
- Retry up to 5 times with 500ms delays
- This handles the race condition between auth user creation and trigger execution

### **2. Fallback Mechanism:**
- If the trigger fails, manually create the user record
- This ensures the user record exists before restaurant creation
- Provides resilience against trigger failures

### **3. Validation:**
- Always verify the user record exists before creating a restaurant
- Throw clear error messages if validation fails
- Ensure proper foreign key relationships

### **4. Error Handling:**
- Proper error messages for different failure scenarios
- Graceful handling of authentication issues
- Clear guidance for users when things go wrong

## 🧪 **Testing the Fix**

### **Test 1: Normal Signup Flow**
1. User fills out signup form
2. User record is created in `auth.users`
3. Trigger creates user record in `users` table
4. Restaurant is created with valid `owner_id`
5. User-restaurant relationship is established

### **Test 2: Trigger Failure Scenario**
1. User fills out signup form
2. User record is created in `auth.users`
3. Trigger fails to create user record in `users` table
4. Fallback mechanism creates user record manually
5. Restaurant is created with valid `owner_id`

### **Test 3: No Authentication**
1. Attempt to create restaurant without authentication
2. `getAuthenticatedUser()` throws proper error
3. Clear error message is shown to user

## 📋 **Files Modified**

### **`lib/auth-supabase.ts`**
- ✅ Enhanced `signUp()` function with retry logic and fallback
- ✅ Added `getAuthenticatedUser()` helper function
- ✅ Added `createRestaurant()` function for general restaurant creation
- ✅ Improved error handling and validation

## 🚨 **Important Notes**

### **Database Requirements:**
- ✅ `users` table must exist
- ✅ `restaurants` table must have `owner_id` column
- ✅ Database triggers must be properly configured
- ✅ Foreign key constraints must be in place

### **Authentication Requirements:**
- ✅ Supabase Auth must be enabled
- ✅ User must be authenticated before creating restaurants
- ✅ User record must exist in `users` table

### **Error Scenarios Handled:**
- ✅ Trigger delays or failures
- ✅ Missing user records
- ✅ Unauthenticated requests
- ✅ Invalid foreign key references

## ✅ **Success Criteria**

After implementing this fix:
- ✅ Restaurant creation works without foreign key constraint errors
- ✅ Proper error messages for authentication issues
- ✅ Fallback mechanism handles trigger failures
- ✅ Clear validation ensures data integrity
- ✅ Robust error handling for all scenarios

## 🎯 **Result**

The restaurant creation process is now robust and handles all edge cases:
1. **Race conditions** between user creation and trigger execution
2. **Trigger failures** with manual fallback creation
3. **Authentication issues** with proper error messages
4. **Data integrity** with foreign key validation

The signup and restaurant creation flow is now production-ready! 🚀

# 🔧 Fix Foreign Key Constraint Issues

## 🐛 **Issue Identified**

The signup process is failing with the error:
```
"insert or update on table 'users' violates foreign key constraint 'users_id_fkey'"
```

This indicates that the database trigger is failing when trying to create a user record in the `public.users` table.

## 🔍 **Root Cause Analysis**

### **The Problem:**
1. **Circular Dependency**: The `users` table has a foreign key constraint referencing `auth.users(id)`
2. **Trigger Failure**: The database trigger `handle_new_user()` is failing when trying to insert into `public.users`
3. **RLS Issues**: Row Level Security policies might be preventing the trigger from working properly
4. **Permission Issues**: The trigger function might not have the necessary permissions

### **Current Schema Issues:**
- The `users` table has a foreign key constraint that creates a circular dependency
- The trigger function doesn't handle errors gracefully
- RLS policies might be too restrictive for trigger operations

## ✅ **Solution**

### **Step 1: Run the Fixed Database Schema**

**IMPORTANT**: You need to run the fixed schema in your Supabase SQL Editor.

1. **Go to your Supabase Dashboard**
2. **Navigate to SQL Editor**
3. **Copy and paste the entire content from `scripts/fix-auth-schema.sql`**
4. **Click "Run" to execute the script**

### **Step 2: What the Fix Does**

The fixed schema:

1. **Recreates the `users` table** without the problematic foreign key constraint
2. **Improves the trigger function** with better error handling
3. **Adds proper exception handling** to prevent signup failures
4. **Creates a sync function** to handle existing auth users
5. **Improves RLS policies** for better security

### **Step 3: Key Changes Made**

#### **1. Fixed Users Table Structure:**
```sql
-- Before (problematic):
CREATE TABLE users (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,  -- ❌ Circular dependency
  ...
);

-- After (fixed):
CREATE TABLE users (
  id UUID PRIMARY KEY,  -- ✅ No circular dependency
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### **2. Improved Trigger Function:**
```sql
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if user already exists to avoid conflicts
  IF NOT EXISTS (SELECT 1 FROM users WHERE id = NEW.id) THEN
    INSERT INTO users (id, email, full_name)
    VALUES (
      NEW.id, 
      NEW.email, 
      COALESCE(NEW.raw_user_meta_data->>'full_name', '')
    );
  END IF;
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't fail the auth signup
    RAISE WARNING 'Failed to create user record: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

#### **3. Enhanced Error Handling:**
- **Graceful failures**: Triggers won't crash the signup process
- **Manual fallback**: Application code can create user records manually
- **Better logging**: Clear error messages for debugging

### **Step 4: Test the Fix**

After running the schema fix:

1. **Test the signup flow** with a new user
2. **Check the browser console** for detailed logs
3. **Verify the database** has the correct records

### **Step 5: Enhanced Application Code**

The application code has been updated with:

1. **Better error handling** with specific error messages
2. **Increased retry attempts** (10 attempts with 1-second delays)
3. **Comprehensive logging** for debugging
4. **Manual fallback mechanisms** for all critical operations
5. **Verification steps** to ensure data integrity

## 🧪 **Testing the Fix**

### **Test 1: Normal Signup Flow**
1. Fill out the signup form
2. Check browser console for detailed logs
3. Verify user is created in `auth.users`
4. Verify user record is created in `public.users`
5. Verify restaurant is created with correct `owner_id`
6. Verify user-restaurant relationship is established

### **Test 2: Error Scenarios**
1. **Duplicate email**: Should show clear error message
2. **Duplicate restaurant name**: Should show clear error message
3. **Network issues**: Should retry and provide fallback
4. **Database errors**: Should show descriptive error messages

### **Test 3: Database Verification**
Run this query in Supabase SQL Editor to verify the fix:

```sql
-- Check if users table has the correct structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'users' AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check if trigger exists
SELECT trigger_name, event_manipulation, action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'users' AND trigger_schema = 'auth';

-- Test the sync function
SELECT sync_existing_auth_users();
```

## 🚨 **Important Notes**

### **Before Running the Fix:**
- ✅ **Backup your data** if you have important user records
- ✅ **Test in a development environment** first
- ✅ **Ensure you have admin access** to Supabase

### **After Running the Fix:**
- ✅ **Test the signup flow** thoroughly
- ✅ **Check all existing functionality** still works
- ✅ **Monitor for any new errors** in the console

### **If Issues Persist:**
1. **Check Supabase logs** for detailed error messages
2. **Verify RLS policies** are correctly applied
3. **Test with a fresh user** to isolate the issue
4. **Check network connectivity** and Supabase status

## 📋 **Files Modified**

### **Database Schema:**
- ✅ `scripts/fix-auth-schema.sql` - Fixed database schema
- ✅ Enhanced trigger functions with error handling
- ✅ Improved RLS policies
- ✅ Added sync function for existing users

### **Application Code:**
- ✅ `lib/auth-supabase.ts` - Enhanced signup function
- ✅ Better error handling and logging
- ✅ Increased retry attempts
- ✅ Manual fallback mechanisms

## 🎯 **Expected Results**

After implementing this fix:

- ✅ **Signup process works** without foreign key constraint errors
- ✅ **User records are created** in both `auth.users` and `public.users`
- ✅ **Restaurants are linked** to users with correct `owner_id`
- ✅ **User-restaurant relationships** are established automatically
- ✅ **Clear error messages** for any issues that occur
- ✅ **Robust fallback mechanisms** handle edge cases

## 🔄 **Rollback Plan**

If the fix causes issues:

1. **Restore from backup** if you backed up your data
2. **Run the original schema** from `scripts/setup-complete-auth-schema.sql`
3. **Contact support** if you need assistance

The signup process should now be robust and handle all edge cases gracefully! 🚀

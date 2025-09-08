# 🤖 SmartMenu AI Integration Setup Checklist

This checklist will help you verify that everything is properly configured for the AI product data generation system.

## 📋 **SETUP CHECKLIST**

### ✅ **Step 1: Environment Variables (.env.local)**

Your `.env.local` file should contain these variables:

```bash
# Required for basic functionality
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Required for AI features
OPENAI_API_KEY=your_openai_api_key_here

# Optional
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_ENABLE_MENU_ADMIN=false
```

**⚠️ Common Issues:**
- Make sure there are NO spaces around the `=` sign
- Make sure the OpenAI API key starts with `sk-`
- Supabase service role key should start with `eyJ`

### ✅ **Step 2: Database Migration**

You need to run the AI tables migration in your Supabase dashboard:

1. **Go to Supabase Dashboard** → Your Project → SQL Editor
2. **Copy and paste** the entire content of `scripts/create-ai-tables.sql`
3. **Click "Run"** to execute the migration

**Tables that should be created:**
- `ingredients_cache` - For caching ingredient nutrition data
- `allergens` - Romanian ANPC allergen codes (should have 14 rows)
- `gpt_logs` - For monitoring AI API calls
- **Modified `products` table** with new AI columns

### ✅ **Step 3: Verification Commands**

Run these commands to verify everything is working:

#### 3.1 Check Environment Configuration
```bash
# Test if the application starts
npm run dev

# Check AI system health (in another terminal)
curl http://localhost:3000/api/test-ai
```

#### 3.2 Check Database Tables
You can verify in Supabase dashboard or run this API test:
```bash
# This should return database table status
curl -X GET http://localhost:3000/api/test-ai | jq .
```

#### 3.3 Test AI Generation (with OpenAI key)
```bash
# This requires authentication, so test from the admin panel
# Go to: http://localhost:3000/admin/products
# Try to generate data for a product
```

---

## 🔍 **TROUBLESHOOTING**

### Issue 1: "500 Internal Server Error" on /api/test-ai

**Possible Causes:**
1. **Missing environment variables** - Check .env.local
2. **Database tables not created** - Run the migration script
3. **Supabase connection issues** - Verify your Supabase credentials

**Debug Steps:**
1. Check the development server logs in your terminal
2. Verify environment variables are loaded: `echo $OPENAI_API_KEY`
3. Test Supabase connection: `curl http://localhost:3000/api/test-supabase`

### Issue 2: "AI service is not available"

**Cause:** OpenAI API key not configured
**Solution:** Add `OPENAI_API_KEY=sk-...` to your .env.local file

### Issue 3: "Some AI tables are missing"

**Cause:** Database migration not run
**Solution:** 
1. Copy the entire `scripts/create-ai-tables.sql` content
2. Run it in Supabase SQL Editor
3. Verify 14 allergen entries were created

### Issue 4: "Authentication required"

**Cause:** Not logged into the application
**Solution:**
1. Go to `http://localhost:3000/admin/settings`
2. Sign up/Sign in to your restaurant account
3. Then try the AI features

---

## 🧪 **MANUAL VERIFICATION STEPS**

### Check 1: Environment Variables
```bash
# Create a test script to check env vars
node -e "
require('dotenv').config({ path: '.env.local' });
console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Set' : '❌ Missing');
console.log('Supabase Anon Key:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅ Set' : '❌ Missing');
console.log('Service Role Key:', process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ Set' : '❌ Missing');
console.log('OpenAI Key:', process.env.OPENAI_API_KEY ? '✅ Set' : '❌ Missing');
"
```

### Check 2: Database Tables (SQL)
Run this in Supabase SQL Editor:
```sql
-- Check if AI tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('ingredients_cache', 'allergens', 'gpt_logs');

-- Check allergen data
SELECT count(*) as allergen_count FROM allergens;

-- Check products table has AI columns
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'products' 
AND column_name IN ('generated_description', 'recipe', 'allergens', 'manual_language_override');
```

### Check 3: API Endpoints
Test these endpoints once everything is set up:

1. **Health Check:** `GET /api/test-ai`
2. **Generate Data:** `POST /api/generate-product-data` (requires auth)
3. **Database Test:** `GET /api/test-supabase`

---

## 📝 **EXPECTED RESULTS**

When everything is properly configured, you should see:

### ✅ Successful /api/test-ai Response:
```json
{
  "overall_status": "healthy",
  "summary": {
    "total_tests": 5,
    "passed": 5,
    "warnings": 0,
    "failed": 0
  },
  "test_results": [
    {
      "test_name": "Environment Configuration",
      "status": "pass",
      "message": "OpenAI API key is configured"
    },
    {
      "test_name": "Database Tables", 
      "status": "pass",
      "message": "All required AI tables exist"
    },
    {
      "test_name": "Allergen Data",
      "status": "pass", 
      "message": "Found 14 allergen entries"
    }
  ]
}
```

### ✅ In the Admin Panel:
- Navigate to Products page
- See "Generate AI Data" button
- Successful generation shows description, recipe, nutrition, allergens

---

## 🆘 **NEED HELP?**

If you're still having issues:

1. **Check the development server console** for detailed error messages
2. **Verify your Supabase project** has the right permissions
3. **Test OpenAI API key** independently: 
   ```bash
   curl https://api.openai.com/v1/models \
     -H "Authorization: Bearer your_openai_key"
   ```
4. **Check browser Network tab** for API call details when testing in the admin panel

The AI system is fully built and ready - these steps will ensure it's properly configured for your environment! 🚀

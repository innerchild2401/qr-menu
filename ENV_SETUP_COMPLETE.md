# Environment Variables Setup - Complete List

All hardcoded values have been removed and moved to environment variables. Use this list to set up your `.env.local` file and Vercel environment variables.

## Quick Setup

1. **Copy the template:**
   ```bash
   cp env-template.txt .env.local
   ```

2. **Fill in required values** in `.env.local`

3. **For Vercel:** Add all variables in Vercel Dashboard → Settings → Environment Variables

---

## Complete Environment Variables List

### 🔴 REQUIRED (Must be set)

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

### 🟡 RECOMMENDED (For AI features)

```bash
# OpenAI API Key (required for AI features)
OPENAI_API_KEY=your_openai_api_key
```

### 🟢 OPTIONAL (Have defaults)

```bash
# Application Settings
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_ENABLE_MENU_ADMIN=false
NODE_ENV=development

# Admin Configuration
ADMIN_EMAIL=afilip.mme@gmail.com

# AI Configuration
OPENAI_MODEL=gpt-4o-mini
OPENAI_API_URL=https://api.openai.com/v1/chat/completions
OPENAI_MAX_TOKENS=1000
OPENAI_DAILY_COST_LIMIT=10.0
OPENAI_PROMPT_COST=0.00000015
OPENAI_COMPLETION_COST=0.00000060

# Default Values
DEFAULT_LANGUAGE=ro
DEFAULT_CURRENCY=RON

# Test/Development (development only)
TEST_EMAIL=eu@eu.com
TEST_PASSWORD=parolamea
DEMO_EMAIL=admin@bellavista.com
DEMO_PASSWORD=admin123

# Google Business Profile (optional)
GOOGLE_CLIENT_ID=your_google_oauth_client_id
GOOGLE_CLIENT_SECRET=your_google_oauth_client_secret
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback
```

---

## Vercel Environment Variables

When deploying to Vercel, add these in **Vercel Dashboard → Your Project → Settings → Environment Variables**:

### Production Environment

**Required:**
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_API_KEY` (if using AI features)
- `ADMIN_EMAIL` (if different from default)

**Recommended:**
- `NEXT_PUBLIC_APP_URL` (your production domain, e.g., `https://yourdomain.com`)
- `DEFAULT_LANGUAGE`
- `DEFAULT_CURRENCY`
- `OPENAI_DAILY_COST_LIMIT` (if different from $10)

**Optional:**
- `OPENAI_MODEL` (if using different model)
- `OPENAI_MAX_TOKENS` (if different from 1000)
- `OPENAI_PROMPT_COST` / `OPENAI_COMPLETION_COST` (if prices change)

### Preview/Development Environment

You can use the same variables or set different values for testing.

---

## What Was Fixed

✅ **Removed all hardcoded Supabase credentials** from:
- `lib/supabase-server.ts`
- `lib/auth-supabase.ts`
- `next.config.ts` (now uses dynamic domain)

✅ **Made admin email configurable** in:
- `src/app/admin/token-consumption/page.tsx`
- `src/app/api/admin/token-consumption/route.ts`
- `src/app/api/admin/token-consumption/users/route.ts`
- `src/app/api/admin/token-consumption/stats/route.ts`
- `src/app/api/generate-insights/route.ts`

✅ **Made AI configuration configurable** in:
- `src/lib/ai/openai-client.ts`
- `src/lib/api/token-tracker.ts`
- `src/lib/ai/product-generator.ts`
- `src/app/api/generate-product-data/route.ts`
- `src/app/api/ai-usage-stats/route.ts`
- `src/app/api/calculate-ingredient-costs/route.ts`
- `src/app/api/generate-insights/route.ts`
- `src/lib/ai/ingredient-normalizer.ts`
- `src/lib/ingredient-normalization.ts`
- `src/app/api/admin/ingredient-normalization/route.ts`

✅ **Made default values configurable** in:
- `src/lib/ai/product-generator.ts` (default language)
- `src/lib/ingredient-costs.ts` (default language & currency)
- `src/app/api/admin/ingredient-costs/route.ts` (default currency)
- `src/app/api/admin/restaurant/route.ts` (default currency)

✅ **Created centralized config system** in:
- `src/lib/config.ts` (all configuration constants)

---

## Configuration System

All configuration is centralized in `src/lib/config.ts`. The system:

1. **Reads from environment variables** with sensible defaults
2. **Provides helper functions** for common checks (e.g., `isAdminEmail()`)
3. **Type-safe** configuration access
4. **Server and client compatible** (with proper guards)

### Usage Example

```typescript
import { AI_CONFIG, ADMIN_CONFIG, getDefaultLanguage } from '@/lib/config';

// Use AI model
const model = AI_CONFIG.MODEL;

// Check admin access
if (isAdminEmail(user.email)) {
  // Admin access
}

// Get default language
const lang = getDefaultLanguage();
```

---

## Notes

1. **Test credentials** (`TEST_EMAIL`, `TEST_PASSWORD`, etc.) are only used in development scripts and should NOT be used in production.

2. **Supabase credentials** are now required - no fallback values. Make sure to set them in your environment.

3. **Admin email** defaults to `afilip.mme@gmail.com` but can be changed via `ADMIN_EMAIL` env var.

4. **AI pricing** defaults are for `gpt-4o-mini` as of 2024. Update if using different model or if prices change.

5. **Default language/currency** can be set per restaurant in the database, but these env vars set the defaults for new restaurants.

---

## Verification

After setting up your environment variables:

1. **Check required variables are set:**
   ```bash
   # The app will throw an error on startup if required vars are missing
   npm run dev
   ```

2. **Verify Supabase connection:**
   - Visit `/admin/settings` and check if restaurant data loads

3. **Verify AI features:**
   - Visit `/admin/products` and try generating a product description
   - Check `/admin/token-consumption` (if admin email matches)

---

## Support

If you encounter issues:

1. Check that all **required** variables are set
2. Verify Supabase credentials are correct
3. Check that OpenAI API key is valid (if using AI features)
4. Review `ENVIRONMENT_VARIABLES.md` for detailed descriptions

---

**Last Updated:** All hardcoded values removed and moved to environment variables.
**Config System:** `src/lib/config.ts`
**Template File:** `env-template.txt`


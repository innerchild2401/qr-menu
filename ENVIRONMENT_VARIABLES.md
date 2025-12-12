# Environment Variables Reference

This document lists all environment variables used in the SmartMenu application.

## Required Variables

These variables **MUST** be set for the application to function:

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL | `https://xxxxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous/public key | `eyJhbGci...` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-side only) | `eyJhbGci...` |

## Optional Configuration Variables

### Application Settings

| Variable | Default | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` | Base URL for redirects and API calls |
| `NEXT_PUBLIC_ENABLE_MENU_ADMIN` | `false` | Enable menu admin features |
| `NODE_ENV` | `development` | Node environment (development/production) |

### Admin Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `ADMIN_EMAIL` | `afilip.mme@gmail.com` | Admin email for token consumption and insights access |

### AI Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `OPENAI_API_KEY` | - | OpenAI API key (required for AI features) |
| `OPENAI_MODEL` | `gpt-4o-mini` | OpenAI model to use |
| `OPENAI_API_URL` | `https://api.openai.com/v1/chat/completions` | OpenAI API endpoint |
| `OPENAI_MAX_TOKENS` | `1000` | Maximum tokens for product generation |
| `OPENAI_DAILY_COST_LIMIT` | `10.0` | Daily cost limit per restaurant (USD) |
| `OPENAI_PROMPT_COST` | `0.00000015` | Cost per prompt token (USD) |
| `OPENAI_COMPLETION_COST` | `0.00000060` | Cost per completion token (USD) |

### Default Values

| Variable | Default | Description |
|----------|---------|-------------|
| `DEFAULT_LANGUAGE` | `ro` | Default language for new restaurants (`ro` or `en`) |
| `DEFAULT_CURRENCY` | `RON` | Default currency for new restaurants (`RON`, `EUR`, `USD`, `GBP`) |

### Test/Development (Development Only)

| Variable | Default | Description |
|----------|---------|-------------|
| `TEST_EMAIL` | `eu@eu.com` | Test user email (for development scripts) |
| `TEST_PASSWORD` | `parolamea` | Test user password (for development scripts) |
| `DEMO_EMAIL` | `admin@bellavista.com` | Demo user email (for development scripts) |
| `DEMO_PASSWORD` | `admin123` | Demo user password (for development scripts) |

### Google Business Profile (Optional)

| Variable | Default | Description |
|----------|---------|-------------|
| `GOOGLE_CLIENT_ID` | - | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | - | Google OAuth client secret |
| `GOOGLE_REDIRECT_URI` | `http://localhost:3000/api/auth/google/callback` | OAuth redirect URI |

## Setup Instructions

### Local Development

1. Copy `env-template.txt` to `.env.local`:
   ```bash
   cp env-template.txt .env.local
   ```

2. Fill in your actual values in `.env.local`

3. Required minimum setup:
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   ```

### Vercel Deployment

Add environment variables in Vercel Dashboard:
1. Go to your project → Settings → Environment Variables
2. Add all required variables
3. Add optional variables as needed
4. Set different values for Production, Preview, and Development if needed

**Required for Production:**
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_API_KEY` (if using AI features)
- `ADMIN_EMAIL` (if different from default)

**Recommended for Production:**
- `NEXT_PUBLIC_APP_URL` (your production domain)
- `DEFAULT_LANGUAGE`
- `DEFAULT_CURRENCY`

## Security Notes

1. **Never commit `.env.local`** to version control
2. **Use different keys** for development and production
3. **Rotate keys regularly** in production
4. **Service role key** should only be used server-side
5. **Test credentials** should NOT be used in production
6. All hardcoded values have been removed - use environment variables

## Changes Made

All hardcoded values have been moved to environment variables:

- ✅ Removed hardcoded Supabase credentials
- ✅ Made admin email configurable
- ✅ Made default language configurable
- ✅ Made default currency configurable
- ✅ Made AI model configurable
- ✅ Made cost limits configurable
- ✅ Made OpenAI pricing configurable
- ✅ Made test credentials configurable

See `src/lib/config.ts` for the centralized configuration system.


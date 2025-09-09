# Smart Menu - Technical Project Summary

## Overview
SmartMenu is a Next.js 15 application for digital restaurant menus with AI-powered product descriptions, QR code generation, and comprehensive admin management. The system uses Supabase for data storage and authentication, OpenAI GPT-4o-mini for content generation, and modern React patterns for the frontend.

---

## 1. Project Architecture

### Core Framework & Technologies
- **Framework**: Next.js 15 with Turbopack for development
- **Language**: TypeScript throughout
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **AI**: OpenAI GPT-4o-mini
- **Styling**: Tailwind CSS 4.0
- **UI Components**: Radix UI primitives with custom styling
- **Deployment**: Vercel (inferred from analytics)

### Folder Structure
```
src/
├── app/                    # Next.js App Router
│   ├── admin/             # Admin interface (/admin/*)
│   │   ├── categories/    # Category management
│   │   ├── products/      # Product management (main AI features)
│   │   ├── popups/        # Promotional popup management
│   │   ├── qr/           # QR code generation
│   │   ├── settings/     # Restaurant settings
│   │   └── layout.tsx    # Admin layout wrapper
│   ├── api/              # API routes
│   │   ├── admin/        # Admin-only endpoints
│   │   ├── generate-product-data/ # Main AI generation endpoint
│   │   ├── menu/         # Public menu data
│   │   └── upload/       # File upload endpoints
│   ├── menu/[slug]/      # Public restaurant menu pages
│   └── layout.tsx        # Root layout
├── components/           # React components
│   ├── admin/           # Admin-specific components
│   └── ui/              # Reusable UI components (Radix-based)
├── lib/                 # Utility libraries
│   ├── ai/             # AI and language processing
│   ├── pdf/            # PDF menu generation
│   └── *.ts            # Various utilities
├── hooks/              # Custom React hooks
├── contexts/           # React contexts
└── services/           # External service integrations
```

### Key Directories

#### `/src/app/api/` - API Routes
- **`generate-product-data/`**: Main AI generation endpoint with batch processing
- **`admin/`**: Protected admin endpoints for CRUD operations
- **`menu/[slug]/`**: Public menu data serving
- **`upload/`**: File upload handling for images

#### `/src/components/admin/` - Admin Components
- **`ProductList.tsx`**: Product display with table/card views
- **`RecipeTagManager.tsx`**: Recipe tag management interface
- **`LanguageConsistencyChecker.tsx`**: Language analysis and correction
- **`RecipeEditor.tsx`**: Recipe ingredient editing
- **`BulkUploadModal.tsx`**: Excel/CSV import functionality

#### `/src/lib/ai/` - AI Processing
- **`openai-client.ts`**: Direct OpenAI API integration
- **`product-generator.ts`**: Main orchestration logic
- **`language-detector.ts`**: Romanian/English detection
- **`supabase-cache.ts`**: AI data caching system
- **`menuClassifier.ts`**: Menu item categorization

---

## 2. Design & UI Rules

### Component Library
- **Base**: Radix UI primitives (`@radix-ui/react-*`)
- **Styling**: Tailwind CSS with custom CSS variables
- **Theming**: CSS custom properties for colors and spacing
- **Icons**: Lucide React icons

### Design System (`src/lib/design-system.ts`)
```typescript
// Consistent spacing scale
spacing: { xs: 'p-2', sm: 'p-4', md: 'p-6', lg: 'p-8', xl: 'p-12' }

// Typography hierarchy
typography: {
  h1: 'text-4xl md:text-5xl font-bold text-foreground',
  h2: 'text-3xl font-semibold text-foreground',
  body: 'text-base text-foreground',
  bodySmall: 'text-sm text-muted-foreground'
}

// Layout containers
layout: {
  container: 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8',
  card: 'rounded-xl border bg-card text-card-foreground shadow-sm'
}
```

### UI Patterns
1. **Card-based layouts** for content organization
2. **Consistent button variants**: primary, secondary, outline, ghost, destructive
3. **Responsive design** with mobile-first approach
4. **Dark mode support** via CSS custom properties
5. **Rounded corners** (xl = 0.75rem) for modern look

### Color System
- **Primary**: Blue (`hsl(221.2 83.2% 53.3%)`)
- **Secondary**: Light gray for secondary actions
- **Destructive**: Red for dangerous actions
- **Muted**: Subdued text and backgrounds
- **CSS Variables**: All colors defined as HSL custom properties

### Key UI Components
```typescript
// Button variants (src/components/ui/button.tsx)
buttonVariants = {
  variant: { default, destructive, outline, secondary, ghost, link },
  size: { default, sm, lg, icon }
}

// Form components with consistent styling
Input, Select, Checkbox, Badge, Card, Dialog, Toast
```

---

## 3. OpenAI API Usage

### Integration Points

#### Primary Endpoint: `/api/generate-product-data`
- **Model**: GPT-4o-mini (cost-optimized)
- **Purpose**: Generate product descriptions, recipes, nutrition, allergens
- **Batch Processing**: Up to 10 products per batch, max 3 concurrent requests
- **Cost Monitoring**: $10 daily limit per restaurant with usage tracking

#### Core AI Functions (`src/lib/ai/openai-client.ts`)

```typescript
// Main product generation
generateProductData(request: ProductGenerationRequest): Promise<{
  data: GeneratedProductData;
  usage: GPTUsageStats;
}>

// Ingredient nutrition data
generateIngredientNutrition(request: IngredientNutritionRequest): Promise<{
  data: IngredientNutrition;
  usage: GPTUsageStats;
}>
```

### Request Structure
```typescript
// Product generation request
{
  name: string;                    // Product name
  language: 'ro' | 'en';          // Target language
  restaurant_id?: string;         // For context
}

// Generated response
{
  description: string;             // Max 150 chars
  recipe: Array<{
    ingredient: string;
    quantity: string;
  }>;
  nutritional_values: {
    calories: number;
    protein: number;              // Grams
    carbs: number;               // Grams
    fat: number;                 // Grams
  };
  estimated_allergens: string[];  // Ingredient names
}
```

### System Prompts
- **Product Generation**: Optimized for Romanian/English food descriptions
- **Temperature**: 0.7 for creativity, 0.3 for nutritional consistency
- **Token Limits**: 1000 for products, 200 for ingredients
- **Error Handling**: Comprehensive retry logic with exponential backoff

### Cost Management
- **Token Tracking**: Input/output tokens monitored per request
- **Daily Limits**: $10 per restaurant per day
- **Caching**: Aggressive caching to avoid duplicate API calls
- **Bottled Drinks**: Automatic detection and skip (no AI needed)

### Language Detection
Advanced Romanian/English detection using:
- **Diacritics**: Romanian-specific characters (ă, â, î, ș, ț)
- **Food Keywords**: Language-specific culinary terms
- **Cooking Methods**: Language-specific cooking terminology
- **Confidence Scoring**: Weighted detection with fallback to Romanian

---

## 4. Key Integrations

### Supabase Database
**Tables**:
- `restaurants`: Main restaurant data with Google Business fields
- `products`: Menu items with AI-generated fields
- `categories`: Menu organization
- `users`: Authentication and profile data
- `user_restaurants`: Many-to-many user-restaurant relationships
- `popups`: Promotional popup management

**Storage Buckets**:
- `logos`: Restaurant logos
- `covers`: Restaurant cover images  
- `products`: Product images
- `qr_codes`: Generated QR codes
- `popups`: Popup images

### Google Business Profile (Currently Disabled)
**File**: `src/lib/google-business-service.ts`
- **OAuth2 Flow**: Complete implementation present but commented out
- **Features**: Ratings sync, location management, review integration
- **Database Fields**: Ready for Google Business data
- **Status**: Requires `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` to enable

### QR Code Generation
**File**: `lib/qrCodeUtils.ts`
- **Library**: `qrcode` npm package
- **Storage**: Automatic upload to Supabase Storage
- **Naming**: `{restaurant-slug}.png`
- **Features**: Regeneration, download, error correction level M

### File Upload System
**Local Development**: `lib/uploadUtils.ts`
- **Directory**: `public/uploads/{restaurant-slug}/`
- **Validation**: File type, size (5MB max), sanitization
- **Formats**: PNG, JPEG, WebP, GIF, BMP, TIFF

**Production**: Supabase Storage integration
- **Buckets**: Organized by content type
- **Public URLs**: Direct access via CDN
- **Upsert**: Replace existing files automatically

### WhatsApp Integration
**Status**: No current integration found in codebase
**Potential**: Order context suggests possible future integration

### POS System Integration
**Status**: No current integration found in codebase
**Structure**: Database schema supports external integrations

---

## 5. Sensitive Areas

### Critical Components That Could Break Major Functionality

#### 1. **AI Generation Pipeline** (`src/lib/ai/`)
**Risk Level**: HIGH
- **`product-generator.ts`**: Main orchestration logic
- **`openai-client.ts`**: Direct API integration
- **`supabase-cache.ts`**: Caching and cost control

**Why Critical**:
- Core value proposition of the application
- Cost implications if caching breaks
- Complex language detection and batch processing

**Failure Impact**: 
- No AI descriptions generated
- Potential cost overruns
- User experience degradation

#### 2. **Authentication Flow** (`src/lib/auth-supabase.ts`)
**Risk Level**: HIGH
- Complex signup process with user, restaurant, and relationship creation
- Multiple database triggers and foreign key dependencies
- Session management and persistence

**Why Critical**:
- Multi-step process with potential race conditions
- Foreign key constraints between users and restaurants
- Auto-signin after registration

**Failure Impact**:
- Users cannot access admin features
- Orphaned records in database
- Authentication loops

#### 3. **API Route Authentication** (`src/app/api/`)
**Risk Level**: MEDIUM-HIGH
- **`generate-product-data/route.ts`**: Product ownership validation
- **Admin endpoints**: User-restaurant relationship checks
- **Header-based authentication**: `x-user-id` and `Authorization`

**Why Critical**:
- Security boundary between users
- Data isolation per restaurant
- Cost control per restaurant

**Failure Impact**:
- Data leakage between restaurants
- Unauthorized AI generation
- Security vulnerabilities

#### 4. **Database Schema Dependencies**
**Risk Level**: MEDIUM-HIGH
- **Foreign Key Relationships**: Users → Restaurants → Products/Categories
- **RLS Policies**: Row-level security for data isolation
- **Database Triggers**: User creation automation

**Why Critical**:
- Complex relationships with cascading effects
- Security model depends on proper relationships
- Migration scripts can break existing data

**Failure Impact**:
- Data integrity issues
- Broken admin functionality
- Security policy failures

#### 5. **Environment Configuration** (`src/lib/env.ts`)
**Risk Level**: HIGH
- Required variables validation on server startup
- OpenAI API key management
- Supabase connection strings

**Why Critical**:
- Application won't start without proper env vars
- API keys affect core functionality
- No graceful degradation for missing variables

**Failure Impact**:
- Complete application failure
- No AI functionality
- Database connection issues

---

## 6. Known Inconsistencies

### Inconsistent Patterns Found

#### 1. **File Import Paths**
**Issue**: Mix of absolute and relative imports
```typescript
// Inconsistent - some files use relative
import { supabaseAdmin } from '../supabase-server';
// Others use absolute
import { supabaseAdmin } from '@/lib/supabase-server';
```
**Impact**: Maintenance difficulty, potential import resolution issues

#### 2. **Error Handling Styles**
**Issue**: Multiple error handling patterns
```typescript
// Pattern 1: try/catch with detailed logging
try {
  // operation
} catch (error) {
  console.error('Detailed error:', error);
  throw new Error(`Specific message: ${error.message}`);
}

// Pattern 2: Simple error propagation
const { data, error } = await supabase.operation();
if (error) throw error;

// Pattern 3: Return error objects
return { error: 'message', code: 'ERROR_CODE' };
```
**Impact**: Inconsistent error experiences, debugging difficulty

#### 3. **Type Definitions**
**Issue**: Interface duplication across files
```typescript
// Product interface defined in multiple files:
// - src/lib/supabase-server.ts
// - src/app/admin/products/page.tsx  
// - src/components/admin/ProductList.tsx
// - src/app/menu/[slug]/page.tsx
```
**Impact**: Type drift, maintenance overhead, potential bugs

#### 4. **API Response Formats**
**Issue**: Inconsistent response structures
```typescript
// Some APIs return:
{ success: boolean, data: any, error?: string }

// Others return:
{ results: any[], summary: object }

// Others return raw data or throw errors
```
**Impact**: Frontend code complexity, error handling inconsistency

#### 5. **Loading State Management**
**Issue**: Different loading patterns
```typescript
// Pattern 1: Multiple boolean states
const [isLoading, setIsLoading] = useState(false);
const [isRegenerating, setIsRegenerating] = useState(false);
const [isUpdating, setIsUpdating] = useState(false);

// Pattern 2: Single loading state
const [loading, setLoading] = useState(true);

// Pattern 3: No loading states
```
**Impact**: Inconsistent UX, potential race conditions

#### 6. **Console Logging**
**Issue**: Mix of debug levels and formats
```typescript
// Various formats found:
console.log('✅ Success message');
console.error('❌ Error message');
console.log('Simple message');
console.warn('⚠️ Warning');
// And plain console.log without prefixes
```
**Impact**: Inconsistent debugging experience

#### 7. **Component Prop Patterns**
**Issue**: Different prop destructuring styles
```typescript
// Pattern 1: Props interface with destructuring
interface Props { products: Product[]; onUpdate: () => void; }
export default function Component({ products, onUpdate }: Props) {}

// Pattern 2: Inline prop types
export default function Component({ 
  products, 
  onUpdate 
}: { 
  products: Product[]; 
  onUpdate: () => void; 
}) {}

// Pattern 3: React.FC with generic
const Component: React.FC<Props> = ({ products, onUpdate }) => {}
```
**Impact**: Inconsistent code style, review difficulty

### Recommendations for Consistency

1. **Establish Import Standards**: Use absolute imports (`@/`) consistently
2. **Standardize Error Handling**: Create unified error handling utilities
3. **Centralize Types**: Move common interfaces to shared types file
4. **API Response Standards**: Implement consistent response wrapper
5. **Loading State Pattern**: Create unified loading state management
6. **Logging Standards**: Implement structured logging utility
7. **Component Patterns**: Establish component prop and styling standards

---

## Environment Variables

### Required Variables
```bash
NEXT_PUBLIC_SUPABASE_URL=          # Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=     # Supabase anon key
SUPABASE_SERVICE_ROLE_KEY=         # Supabase service role key (server-side)
```

### Optional Variables
```bash
OPENAI_API_KEY=                    # For AI features (required for generation)
NEXT_PUBLIC_APP_URL=               # Base URL (defaults to localhost:3000)
NEXT_PUBLIC_ENABLE_MENU_ADMIN=     # Enable admin features (defaults to false)

# Google Business Profile (currently disabled)
GOOGLE_CLIENT_ID=                  # Google OAuth client ID
GOOGLE_CLIENT_SECRET=              # Google OAuth client secret
GOOGLE_REDIRECT_URI=               # OAuth redirect URI
```

---

## Development Workflow

### Local Development
```bash
npm run dev          # Start development server with Turbopack
npm run build        # Production build
npm run lint         # ESLint check
npm run test         # Playwright tests
```

### Testing
- **Framework**: Playwright for E2E testing
- **Test Files**: `/tests/` directory
- **Commands**: `npm run test:headed`, `npm run test:debug`

### Database Operations
```bash
npm run db:cleanup   # Database cleanup script
```

---

## Production Considerations

### Performance
- **Next.js 15**: Latest optimizations and Turbopack
- **Image Optimization**: Next.js Image component
- **Caching**: Aggressive AI result caching
- **Lazy Loading**: Components and routes

### Security
- **RLS**: Row-level security in Supabase
- **API Authentication**: Header-based with session validation
- **Input Validation**: File uploads and form data
- **CORS**: Proper API endpoint protection

### Monitoring
- **Vercel Analytics**: Integrated for user behavior
- **Console Logging**: Structured logging for debugging
- **Error Boundaries**: React error handling
- **Cost Tracking**: OpenAI usage monitoring

### Scalability
- **Serverless**: Next.js API routes scale automatically
- **Database**: Supabase PostgreSQL with connection pooling
- **Storage**: Supabase Storage with CDN
- **AI Batching**: Efficient OpenAI API usage

---

## Future Enhancement Opportunities

1. **Google Business Integration**: Enable existing implementation
2. **WhatsApp Ordering**: Order context suggests future feature
3. **POS Integration**: Database structure supports external systems
4. **Multi-language Support**: Extend beyond Romanian/English
5. **Advanced Analytics**: User behavior and menu performance
6. **Mobile App**: React Native using existing API structure
7. **Payment Integration**: Order context suggests e-commerce features

---

*Generated: $(date)*
*Version: Smart Menu v0.1.0*

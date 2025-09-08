# SmartMenu - Project Summary

## 1. General Overview

### What the App Does
**SmartMenu** is a comprehensive restaurant menu management system that enables restaurant owners to create, manage, and display their menus digitally. The application provides both customer-facing menu displays and administrative tools for restaurant management.

### Purpose & Functionality
- **Customer Experience**: Interactive digital menus accessible via QR codes or direct URLs
- **Restaurant Management**: Complete admin dashboard for menu, product, and promotional content management
- **QR Code Integration**: Automatic QR code generation for easy menu access
- **Promotional System**: Popup management for promotions and announcements
- **Multi-restaurant Support**: Each restaurant owner manages their own establishment independently

### Current Functionality
- ✅ User authentication and restaurant registration with Supabase Auth
- ✅ Complete menu management (categories, products, pricing)
- ✅ Image upload and management for products and restaurant branding
- ✅ QR code generation and management with automatic upload
- ✅ Promotional popup system with scheduling and frequency control
- ✅ Responsive customer-facing menu display with modern card layout
- ✅ Admin dashboard with comprehensive management tools
- ✅ Real-time data synchronization with Supabase
- ✅ AI-powered menu classification and organization
- ✅ AI-generated product descriptions with language detection
- ✅ Professional PDF menu generation with multiple themes
- ✅ Google Business Profile integration (prepared, temporarily disabled)
- ✅ Advanced debugging and diagnostic tools
- ✅ Comprehensive system health checklist
- ✅ Row Level Security (RLS) for data protection
- ✅ Multi-tenant architecture with user-restaurant relationships
- ✅ Drag-and-drop category and product reordering
- ✅ Product visibility controls
- ✅ Nutritional information tracking
- ✅ Restaurant branding and customization
- ✅ Operating hours management
- ✅ Toast notification system
- ✅ Mobile-first responsive design
- ✅ Dark/light mode support

### Tech Stack

#### Frontend
- **Framework**: Next.js 15.5.0 (App Router)
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS 4
- **UI Components**: Custom React components with Radix UI primitives
- **State Management**: React hooks (useState, useEffect, useCallback)
- **Routing**: Next.js App Router with dynamic routes
- **Icons**: Lucide React icon library
- **Form Handling**: React Hook Form with validation
- **PDF Generation**: jsPDF and html2canvas for menu PDFs

#### Backend
- **Runtime**: Node.js
- **Framework**: Next.js API Routes
- **Authentication**: Supabase Auth
- **Database**: Supabase PostgreSQL
- **Storage**: Supabase Storage
- **Middleware**: Next.js middleware for route protection

#### Database & APIs
- **Primary Database**: Supabase PostgreSQL with Row Level Security
- **Authentication**: Supabase Auth with JWT tokens
- **File Storage**: Supabase Storage buckets with CDN delivery
- **External APIs**: QR code generation (qrcode library)
- **AI Integration**: OpenAI API for menu classification and description generation
- **Google APIs**: Google Business Profile API (prepared, temporarily disabled)

#### Development Tools
- **Package Manager**: npm
- **Linting**: ESLint with Next.js config
- **Build Tool**: Next.js built-in bundler
- **Development Server**: Next.js dev server with Turbopack

## 2. Architecture & Data Flow

### Project Structure
```
smartmenu/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── admin/             # Admin dashboard pages
│   │   ├── api/               # API routes
│   │   ├── menu/              # Customer-facing menu pages
│   │   └── page.tsx           # Landing page
│   ├── components/            # Reusable React components
│   └── hooks/                 # Custom React hooks
├── lib/                       # Utility functions and configurations
├── public/                    # Static assets
├── scripts/                   # Development and diagnostic scripts
├── docs/                      # Documentation
└── types/                     # TypeScript type definitions
```

### Component Architecture
- **Layout Components**: Admin layout with navigation and authentication
- **Modal Components**: SignUp, Login, and form modals
- **UI Components**: Toast notifications, navigation, and form elements
- **Page Components**: Individual page implementations

### Data Flow

#### Authentication Flow
1. User signs up/logs in via Supabase Auth
2. Session stored in browser cookies
3. Middleware validates session for protected routes
4. API routes extract user ID from headers for database operations

#### Menu Data Flow
1. Admin creates/updates menu items via admin dashboard
2. Data stored in Supabase PostgreSQL
3. Customer accesses menu via QR code or direct URL
4. Menu data fetched from database and displayed

#### File Upload Flow
1. User uploads image via admin interface
2. File processed and uploaded to Supabase Storage
3. Public URL generated and stored in database
4. Image displayed in menu or admin interface

### State Management
- **Local State**: React useState for component-level state
- **Session State**: Supabase Auth for user authentication
- **Form State**: Controlled components with local state
- **Global State**: No global state management (uses props and context)

## 3. UI & UX

### Main Screens/Pages

#### Customer-Facing Pages
- **Landing Page** (`/`): Marketing page with signup/login options
- **Menu Page** (`/menu/[slug]`): Interactive restaurant menu display
  - Responsive design for mobile and desktop
  - Category-based menu organization
  - Product images and descriptions
  - Promotional popups

#### Admin Dashboard Pages
- **Settings** (`/admin/settings`): Restaurant information, branding, and Google Business integration
- **Categories** (`/admin/categories`): Menu category management with drag-and-drop reordering
- **Products** (`/admin/products`): Menu item management with images, nutrition, and visibility controls
- **Menu** (`/admin/menu`): Menu overview, PDF generation, and AI-powered organization
- **Popups** (`/admin/popups`): Promotional popup management with scheduling
- **QR Code** (`/admin/qr`): QR code generation, management, and download
- **Checklist** (`/admin/checklist`): System health and setup verification
- **Debug** (`/admin/debug`): Advanced debugging and diagnostic tools

### Reusable Components

#### Authentication Components
- **SignUpModal**: User registration with restaurant creation
- **LoginModal**: User authentication
- **Navbar**: Navigation with authentication status

#### UI Components
- **Toast**: Notification system for success/error messages
- **PromoPopup**: Customer-facing promotional popups
- **Form Components**: Reusable form elements with validation
- **PDFMenuGenerator**: AI-powered PDF menu generation with themes
- **CategoryReviewModal**: AI menu classification review interface
- **ProductForm**: Advanced product creation and editing
- **ConditionalNavbar**: Context-aware navigation component
- **RestaurantNavbar**: Restaurant-specific navigation

#### Layout Components
- **AdminLayout**: Protected layout for admin pages
- **Page Headers**: Consistent page titles and descriptions

### Styling & Design
- **Framework**: Tailwind CSS for utility-first styling
- **Theme**: Dark/light mode support
- **Responsive**: Mobile-first responsive design
- **Consistency**: Standardized color scheme and spacing
- **Accessibility**: Semantic HTML and keyboard navigation

### Navigation & Routing
- **Public Routes**: Landing page, menu display
- **Protected Routes**: All admin pages require authentication
- **Dynamic Routes**: Menu pages with restaurant slugs
- **API Routes**: RESTful API endpoints for data operations

## 4. APIs & Integrations

### Internal API Endpoints

#### Authentication APIs
- **Supabase Auth**: User registration, login, session management
- **Middleware**: Route protection and session validation

#### Public APIs
- **GET /api/menu/[slug]**: Fetch restaurant menu data
- **GET /api/popups/[slug]**: Fetch active promotional popups

#### Admin APIs
- **GET/PUT /api/admin/restaurant**: Restaurant information management
- **GET/POST /api/admin/categories**: Category CRUD operations
- **PUT/DELETE /api/admin/categories/[id]**: Individual category management
- **POST /api/admin/categories/reorder**: Drag-and-drop category reordering
- **GET/POST /api/admin/products**: Product CRUD operations
- **PUT/DELETE /api/admin/products/[id]**: Individual product management
- **POST /api/admin/products/reorder**: Drag-and-drop product reordering
- **PUT /api/admin/products/[id]/visibility**: Product visibility toggle
- **GET/POST /api/admin/popups**: Popup CRUD operations
- **PUT/DELETE /api/admin/popups/[id]**: Individual popup management
- **GET /api/admin/me/restaurant**: Get current user's restaurant
- **GET /api/admin/debug/user-restaurant**: Debug user-restaurant relationships
- **GET /api/admin/debug/check-restaurant/[slug]**: Debug restaurant data

#### Upload APIs
- **POST /api/upload/logo/[slug]**: Restaurant logo upload
- **POST /api/upload/cover/[slug]**: Restaurant cover image upload
- **POST /api/upload/productImage/[slug]**: Product image upload
- **POST /api/upload/categoryImage/[slug]**: Category image upload

#### QR Code APIs
- **GET /api/admin/qr/info**: Get QR code information
- **POST /api/admin/qr/generate**: Generate new QR code
- **POST /api/admin/qr/regenerate**: Regenerate existing QR code

### External Integrations
- **Supabase**: Database, authentication, and file storage
- **QR Code Generation**: qrcode library for menu QR codes
- **Image Processing**: Browser-based image handling
- **OpenAI API**: AI-powered menu classification and description generation
- **Google Business Profile API**: Restaurant ratings and reviews integration (prepared)
- **PDF Generation**: jsPDF and html2canvas for professional menu PDFs

### Data Flow in APIs
1. **Request Validation**: Check authentication and user permissions
2. **Database Operations**: CRUD operations on Supabase PostgreSQL
3. **File Operations**: Upload/delete files in Supabase Storage
4. **Response Formatting**: Consistent JSON response structure
5. **Error Handling**: Comprehensive error messages and status codes

## 5. Database / Storage

### Database Schema

#### Core Tables

**restaurants**
```sql
- id: UUID (Primary Key)
- slug: TEXT (Unique identifier for URLs)
- name: TEXT (Restaurant name)
- address: TEXT (Restaurant address)
- schedule: JSONB (Operating hours)
- logo_url: TEXT (Logo image URL)
- cover_url: TEXT (Cover image URL)
- created_at: TIMESTAMP
- owner_id: UUID (References users.id)
- google_business_location_id: TEXT (Google Business Profile location ID)
- google_business_access_token: TEXT (OAuth access token)
- google_business_refresh_token: TEXT (OAuth refresh token)
- google_business_token_expires_at: TIMESTAMP (Token expiration)
- google_business_place_id: TEXT (Google Places place ID)
- google_business_rating: DECIMAL(3,2) (Cached Google rating)
- google_business_review_count: INTEGER (Cached review count)
- google_business_last_sync: TIMESTAMP (Last sync time)
```

**users**
```sql
- id: UUID (Primary Key, matches auth.users)
- email: TEXT (User email)
- full_name: TEXT (User's full name)
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
```

**user_restaurants**
```sql
- user_id: UUID (References users.id)
- restaurant_id: UUID (References restaurants.id)
- role: TEXT (e.g., 'owner', 'manager')
- created_at: TIMESTAMP
```

**categories**
```sql
- id: SERIAL (Primary Key)
- restaurant_id: UUID (References restaurants.id)
- name: TEXT (Category name)
- sort_order: INTEGER (Drag-and-drop ordering)
- image_url: TEXT (Category image URL)
```

**products**
```sql
- id: SERIAL (Primary Key)
- restaurant_id: UUID (References restaurants.id)
- category_id: INTEGER (References categories.id)
- name: TEXT (Product name)
- description: TEXT (Product description)
- price: DECIMAL (Product price)
- nutrition: JSONB (Nutritional information)
- image_url: TEXT (Product image URL)
- visible: BOOLEAN (Product visibility toggle)
- sort_order: INTEGER (Drag-and-drop ordering)
- created_at: TIMESTAMP
```

**popups**
```sql
- id: TEXT (Primary Key, slugified title)
- restaurant_id: UUID (References restaurants.id)
- title: TEXT (Popup title)
- message: TEXT (Popup content)
- image: TEXT (Popup image URL)
- cta_text: TEXT (Call-to-action button text)
- cta_url: TEXT (Call-to-action URL)
- active: BOOLEAN (Whether popup is enabled)
- start_at: TIMESTAMP (Start date/time)
- end_at: TIMESTAMP (End date/time)
- frequency: TEXT (Display frequency)
```

### Storage Buckets
- **restaurant-logos**: Restaurant logo images
- **restaurant-covers**: Restaurant cover/hero images
- **product-images**: Product photos
- **category-images**: Category images
- **qr-codes**: Generated QR code images
- **popup-images**: Promotional popup images

### Data Persistence
- **Primary Storage**: Supabase PostgreSQL for all structured data
- **File Storage**: Supabase Storage for images and files
- **Session Storage**: Browser cookies for authentication
- **Caching**: No explicit caching (real-time data from database)

### Row Level Security (RLS)
- **User Isolation**: Users can only access their own restaurant data
- **Role-Based Access**: Different permissions for owners vs. managers
- **API Protection**: Service role client for admin operations

## 6. Business Logic

### Core Features

#### Restaurant Management
- **Multi-tenant Architecture**: Each restaurant operates independently
- **Owner Registration**: Automatic restaurant creation during signup
- **Branding Management**: Logo and cover image upload
- **Operating Hours**: Flexible schedule management

#### Menu Management
- **Category Organization**: Hierarchical menu structure
- **Product Management**: Complete product lifecycle
- **Pricing**: Decimal-based pricing with currency support
- **Nutrition Tracking**: Optional nutritional information
- **Image Management**: Product photos with upload/update

#### QR Code System
- **Automatic Generation**: QR codes created for each restaurant
- **Menu URLs**: Direct links to restaurant menus
- **Regeneration**: Ability to update QR codes
- **Storage**: QR codes stored in dedicated bucket

#### Promotional System
- **Popup Management**: Create and manage promotional popups
- **Scheduling**: Start/end date and time control
- **Frequency Control**: Once-per-session or every-visit display
- **Call-to-Action**: Optional buttons with custom URLs

#### AI-Powered Features
- **Menu Classification**: Automatic categorization of menu items using AI
- **Description Generation**: AI-generated product descriptions with language detection
- **Smart Organization**: Intelligent menu structure optimization
- **Language Detection**: Automatic detection of menu language for localization

#### PDF Generation System
- **Professional Templates**: Multiple themed PDF menu templates
- **AI-Enhanced Layout**: Smart organization of menu items in PDFs
- **Custom Branding**: Restaurant-specific styling and colors
- **Export Options**: High-quality PDF generation with customizable content

#### Google Business Integration (Prepared)
- **OAuth 2.0 Authentication**: Secure connection to Google Business Profile
- **Real-time Ratings**: Display actual Google ratings on menus
- **Review Integration**: Show review counts and link to Google reviews
- **Automatic Sync**: Background synchronization of business data

### Key Algorithms & Functions

#### Authentication Flow
```typescript
// User registration with restaurant creation
export const signUp = async (data: SignUpData) => {
  // 1. Create Supabase auth user
  // 2. Create user record in public.users
  // 3. Create restaurant with owner_id
  // 4. Create user_restaurant relationship
  // 5. Auto-login user
}
```

#### Menu Data Retrieval
```typescript
// Fetch complete menu with categories and products
async function getMenuData(slug: string): Promise<MenuData> {
  // 1. Get restaurant by slug
  // 2. Fetch categories and products in parallel
  // 3. Return structured menu data
}
```

#### QR Code Generation
```typescript
// Generate and upload QR code
export async function generateAndUploadQRCode(
  restaurantSlug: string,
  baseUrl: string
): Promise<string> {
  // 1. Construct menu URL
  // 2. Generate QR code buffer
  // 3. Upload to Supabase Storage
  // 4. Return public URL
}
```

#### Popup Scheduling
```typescript
// Check if popup should be displayed
function isPopupActive(popup: Popup): boolean {
  const now = new Date();
  const startAt = new Date(popup.start_at);
  const endAt = new Date(popup.end_at);
  
  return popup.active && now >= startAt && now <= endAt;
}
```

## 7. Recent Major Updates & Improvements

### Supabase Migration (Completed)
- **Full Database Migration**: Migrated from JSON file system to Supabase PostgreSQL
- **Row Level Security**: Implemented comprehensive RLS policies for data protection
- **Storage Integration**: Migrated all file storage to Supabase Storage with CDN
- **Authentication Overhaul**: Complete Supabase Auth integration with proper user-restaurant relationships

### AI-Powered Features (New)
- **Menu Classification**: Automatic categorization of menu items using OpenAI
- **Description Generation**: AI-generated product descriptions with language detection
- **Smart Organization**: Intelligent menu structure optimization
- **PDF Generation**: Professional PDF menu generation with AI-enhanced layouts

### UI/UX Improvements (Recent)
- **Modern Card Layout**: Transformed menu cards from square to rectangular layout
- **Enhanced Mobile Experience**: Improved responsive design with better content density
- **Drag-and-Drop Reordering**: Category and product reordering with visual feedback
- **Product Visibility Controls**: Toggle product visibility without deletion
- **Advanced Form Components**: Enhanced form handling with better validation

### Google Business Integration (Prepared)
- **OAuth 2.0 Setup**: Complete Google Business Profile API integration
- **Database Schema**: Added all necessary fields for Google Business data
- **Rating Display**: Real-time Google ratings and review counts
- **Automatic Sync**: Background synchronization system (temporarily disabled)

### Debug & Diagnostic Tools (New)
- **System Health Checklist**: Comprehensive setup verification
- **Debug Interface**: Advanced debugging tools for user-restaurant relationships
- **Database Analysis**: Automated schema analysis and validation
- **Migration Scripts**: Complete database setup and migration automation

## 8. Known Limitations & TODOs

### Current Limitations
- **Email Confirmation**: Disabled for development (should be enabled in production)
- **Image Optimization**: Using basic `<img>` tags instead of Next.js Image component
- **Caching**: No explicit caching strategy implemented
- **Error Boundaries**: Limited error boundary implementation
- **Loading States**: Some components lack comprehensive loading states
- **Google Business Integration**: Temporarily disabled (requires environment setup)

### Unfinished Features
- **Bulk Operations**: No bulk import/export functionality
- **Analytics**: No usage analytics or reporting
- **Multi-language Support**: Single language (English) only
- **Payment Integration**: No payment processing capabilities
- **Real-time Features**: No live updates or real-time notifications
- **Advanced SEO**: Limited meta tags and structured data

### Potential Improvements
- **Performance**: Implement image optimization and lazy loading
- **SEO**: Add meta tags and structured data
- **Accessibility**: Enhance keyboard navigation and screen reader support
- **Testing**: Add unit and integration tests
- **Monitoring**: Implement error tracking and performance monitoring

### Technical Debt
- **Type Safety**: Some any types in API responses
- **Error Handling**: Inconsistent error handling patterns
- **Code Duplication**: Some repeated logic in admin pages
- **Environment Variables**: Hardcoded fallback values

## 9. How to Run the App

### Prerequisites
- **Node.js**: Version 18 or higher
- **npm**: Package manager
- **Supabase Account**: For database and authentication
- **Git**: Version control

### Installation Steps

1. **Clone the Repository**
   ```bash
   git clone https://github.com/innerchild2401/qr-menu.git
   cd smartmenu
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   ```bash
   # Copy environment template
   cp env-template.txt .env.local
   
   # Edit .env.local with your Supabase credentials
   # Required variables:
   # - NEXT_PUBLIC_SUPABASE_URL
   # - NEXT_PUBLIC_SUPABASE_ANON_KEY
   # - SUPABASE_SERVICE_ROLE_KEY
   # - NEXT_PUBLIC_APP_URL
   ```

4. **Database Setup**
   - Create Supabase project
   - Run database migrations (see docs/)
   - Set up storage buckets
   - Configure Row Level Security policies

5. **Development Server**
   ```bash
   npm run dev
   ```

6. **Build for Production**
   ```bash
   npm run build
   npm start
   ```

### Environment Variables

#### Required Variables
```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# Application Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

#### Optional Variables
```bash
# Feature Flags
NEXT_PUBLIC_ENABLE_MENU_ADMIN=true

# AI Integration (for menu classification and description generation)
OPENAI_API_KEY=your-openai-api-key

# Google Business Profile Integration (temporarily disabled)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback
```

### Available Scripts
- **`npm run dev`**: Start development server with Turbopack
- **`npm run build`**: Build for production
- **`npm start`**: Start production server
- **`npm run lint`**: Run ESLint

### Access Points
- **Landing Page**: http://localhost:3000
- **Admin Dashboard**: http://localhost:3000/admin (requires authentication)
- **Demo Menu**: http://localhost:3000/menu/demo
- **API Documentation**: Available in `/docs/` directory

### Deployment
- **Vercel**: Recommended for Next.js applications
- **Supabase**: Database and authentication backend
- **Environment Variables**: Must be configured in deployment platform
- **Custom Domain**: Can be configured for production use

---

*This project summary provides a comprehensive overview of the SmartMenu application. For detailed technical documentation, refer to the `/docs/` directory.*

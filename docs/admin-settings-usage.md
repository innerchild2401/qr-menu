# Admin Settings Page Usage

## Overview
The Admin Settings page provides a comprehensive interface for restaurant owners to manage their restaurant information, operating hours, and images through an authenticated session.

## Features

### 🔐 **Authentication-Based Data Loading**
- Automatically loads restaurant data based on authenticated user's `restaurantSlug`
- Session-aware API calls ensure users only access their own restaurant data
- Secure middleware protection on all admin routes

### 📝 **Restaurant Information Management**
- **Restaurant Name**: Editable text field for restaurant name
- **Restaurant Slug**: Read-only field (cannot be changed for data integrity)
- **Address**: Full address editing capability

### ⏰ **Operating Hours Management**
- **7-Day Schedule**: Individual time inputs for each day of the week
- **Flexible Format**: Supports any time format (e.g., "11:00 AM - 10:00 PM")
- **Real-time Updates**: Changes reflected immediately in form state

### 🖼️ **Image Upload System**
- **Logo Upload**: Drag-and-drop or click-to-upload logo images
- **Cover Image Upload**: Restaurant cover/hero image management
- **Live Preview**: Immediate preview of uploaded images
- **Progress Indicators**: Loading states during upload process
- **Error Handling**: User-friendly error messages for upload failures

### 💾 **Data Persistence**
- **Auto-save Integration**: Single "Save All Changes" button for all modifications
- **JSON File Updates**: Writes changes back to `/data/restaurants/[slug].json`
- **Optimistic Updates**: UI updates immediately while saving in background

### 🎨 **User Experience Features**
- **Toast Notifications**: Success/error messages for all operations
- **Loading States**: Spinners and disabled states during operations
- **Responsive Design**: Mobile-friendly layout and interactions
- **Dark Mode Support**: Full theming throughout the interface
- **Sticky Save Button**: Always accessible save functionality

## API Integration

### GET /api/admin/restaurant
**Purpose**: Load restaurant data for authenticated user
- **Authentication**: Requires valid session with `restaurantSlug`
- **Response**: Complete restaurant object with all editable fields
- **Error Handling**: 401 for unauthorized, 404 for missing restaurant

### PUT /api/admin/restaurant
**Purpose**: Save updated restaurant data
- **Authentication**: Session-based, writes to user's restaurant only
- **Request Body**: Updated restaurant object (slug cannot be changed)
- **Validation**: Ensures required fields (name, address) are present
- **Response**: Updated restaurant data with success confirmation

### Upload Endpoints
- **POST /api/upload/logo/[slug]**: Upload restaurant logo
- **POST /api/upload/cover/[slug]**: Upload restaurant cover image
- **File Validation**: Size limits, type checking, filename sanitization
- **Response**: New image URL for immediate preview and form update

## Usage Instructions

### Accessing Admin Settings
1. **Login**: Visit `/login` with admin credentials
2. **Navigate**: Automatically redirected to `/admin/settings` or use admin navigation
3. **Authentication**: Middleware ensures only authenticated users can access

### Editing Restaurant Information
1. **Load Data**: Page automatically loads current restaurant data
2. **Edit Fields**: Modify name, address, and operating hours as needed
3. **Image Upload**: Click on image areas to upload new logo/cover images
4. **Save Changes**: Click "Save All Changes" to persist all modifications

### Image Upload Process
1. **Click Upload Area**: Either empty placeholder or existing image overlay
2. **Select File**: Choose image file from device (PNG, JPG, WebP supported)
3. **Upload Progress**: Loading spinner shows upload in progress
4. **Preview Update**: Image preview updates immediately after successful upload
5. **Form Integration**: New image URL automatically added to form data

### Error Handling
- **Network Errors**: Toast notifications for connection issues
- **Validation Errors**: Inline error messages for required fields
- **Upload Errors**: Specific error messages for file upload failures
- **Session Expiry**: Automatic redirect to login if session expires

## Technical Implementation

### Form State Management
```typescript
// Restaurant data structure
interface Restaurant {
  name: string;
  slug: string;        // Read-only
  address: string;
  schedule: Record<string, string>;  // Day-to-time mapping
  logo: string;        // URL path
  cover: string;       // URL path
}

// State management
const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
const [logoPreview, setLogoPreview] = useState<string>('');
const [coverPreview, setCoverPreview] = useState<string>('');
```

### File Upload Integration
```typescript
// Upload handler
const handleFileUpload = async (file: File, type: 'logo' | 'cover') => {
  const formData = new FormData();
  formData.append('file', file);
  
  const response = await fetch(`/api/upload/${type}/${session.restaurantSlug}`, {
    method: 'POST',
    body: formData
  });
  
  // Update preview and form state
  if (response.ok) {
    const result = await response.json();
    setPreview(result.url);
    updateRestaurantState(type, result.url);
  }
};
```

### Toast Notification System
```typescript
// Custom hook for toast management
const { showSuccess, showError } = useToast();

// Usage examples
showSuccess('Restaurant settings saved successfully');
showError('Failed to upload image. Please try again.');
```

## Security Features

- **Session-based Authentication**: All API calls verify user session
- **Restaurant Isolation**: Users can only access their own restaurant data
- **File Upload Security**: Type validation, size limits, filename sanitization
- **Input Validation**: Server-side validation of all form data
- **CSRF Protection**: Next.js built-in CSRF protection for all API routes

## Mobile Responsiveness

- **Responsive Grid**: Form layouts adapt to screen size
- **Touch-friendly**: Large upload areas and buttons for mobile devices
- **Sticky Save Button**: Always accessible on mobile screens
- **Toast Positioning**: Notifications positioned appropriately for mobile

The admin settings page provides a complete, production-ready interface for restaurant management with enterprise-level features including real-time validation, image upload integration, and comprehensive error handling.

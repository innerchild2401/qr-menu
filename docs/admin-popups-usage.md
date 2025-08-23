# Admin Popup Management

## Overview
The Admin Popup Management system provides comprehensive CRUD operations for managing promotional popups and announcements with scheduling, image upload, and call-to-action integration through an authenticated admin interface.

## Features

### 🔐 **Session-Based Access Control**
- Popups are isolated per restaurant using `session.restaurantSlug`
- All API operations require valid authentication
- Users can only manage popups for their own restaurant

### 📋 **Popup Data Structure**
```typescript
interface Popup {
  id: string;                    // Auto-generated from title (slugified)
  title: string;                 // Popup title (required)
  message: string;               // Popup message/content (required)
  image?: string;                // Optional popup image URL
  ctaText?: string;              // Optional call-to-action button text
  ctaUrl?: string;               // Optional call-to-action URL
  active: boolean;               // Whether popup is enabled
  startAt?: string;              // Start datetime (ISO format)
  endAt?: string;                // End datetime (ISO format)
  frequency: "once-per-session" | "every-visit"; // Display frequency
}
```

### ✨ **Full CRUD Operations**
- **Create**: Add new popups with scheduling and media
- **Read**: List all popups with status indicators
- **Update**: Edit popup content, scheduling, and settings
- **Delete**: Remove popups with confirmation dialog

### 📅 **Advanced Scheduling**
- **Date/Time Pickers**: HTML5 datetime-local inputs for precise scheduling
- **Date Validation**: Ensures end date is after start date
- **Active Status Tracking**: Real-time calculation of popup visibility
- **Timezone Handling**: ISO datetime format for consistent scheduling

## API Endpoints

### GET /api/admin/popups
**Purpose**: Retrieve all popups for authenticated restaurant (no filtering)
- **Authentication**: Requires valid session with `restaurantSlug`
- **Response**: Array of all popups (active and inactive)
- **Admin View**: Shows all popups regardless of status or date

```typescript
// Response format
{
  popups: Popup[]
}
```

### POST /api/admin/popups
**Purpose**: Create a new popup
- **Authentication**: Session-based restaurant validation
- **Request Body**: Complete popup data
- **Validation**: Title, message, and frequency are required
- **ID Generation**: Auto-slugified from title
- **Date Validation**: Ensures end date is after start date

```typescript
// Request
{
  title: "Holiday Special!",
  message: "Get 20% off all main courses this week!",
  image: "/uploads/demo/holiday-promo.webp",
  ctaText: "Order Now",
  ctaUrl: "/menu/demo",
  active: true,
  startAt: "2024-12-01T00:00:00",
  endAt: "2024-12-31T23:59:59",
  frequency: "once-per-session"
}

// Response
{
  popup: Popup,
  message: "Popup created successfully"
}
```

### PUT /api/admin/popups/:id
**Purpose**: Update existing popup
- **Authentication**: Session-based validation
- **Request Body**: Updated popup data
- **ID Handling**: If title changes, ID is regenerated with uniqueness check
- **Validation**: Same validation rules as creation

### DELETE /api/admin/popups/:id
**Purpose**: Delete popup
- **Authentication**: Session-based validation
- **Confirmation**: Frontend provides deletion confirmation dialog

```typescript
// Response
{
  popup: Popup, // The deleted popup
  message: "Popup deleted successfully"
}
```

## Integration with Public API

### Existing GET /api/popups/[slug] (from Prompt 3)
The existing public popup API correctly filters popups for end users:
- ✅ **Active Filter**: Only returns `active: true` popups
- ✅ **Date Filter**: Only shows popups within their date window
- ✅ **Sorting**: Orders by most recent start date
- ✅ **No Changes Required**: Admin API is separate and complementary

## Admin Interface Features

### 🎨 **Comprehensive Form Interface**
- **Title & Message**: Required text fields with validation
- **Rich Message Input**: Multiline textarea for detailed content
- **Image Upload**: Integrated upload with live preview
- **CTA Configuration**: Optional button text and URL fields
- **Scheduling Controls**: Datetime pickers for start/end times
- **Frequency Selection**: Dropdown for display frequency
- **Active Toggle**: Checkbox to enable/disable popup

### 🖼️ **Image Management**
- **Upload Integration**: Uses existing productImage upload API
- **Live Preview**: Real-time preview during upload and editing
- **Change Functionality**: Easy image replacement for existing popups
- **Optional Images**: Popups work with or without images

### 📊 **Advanced Status Tracking**
- **Active/Inactive Status**: Visual indicators for popup state
- **Currently Showing**: Real-time calculation of visibility
- **Date Status**: Shows if popup is scheduled, active, or expired
- **Quick Toggle**: One-click activate/deactivate functionality

### 📈 **Statistics Dashboard**
- **Total Popups**: Count of all popups
- **Active Count**: Currently enabled popups
- **Currently Showing**: Popups visible to users right now
- **Image Coverage**: Popups with uploaded images

## Usage Instructions

### Accessing Popup Management
1. **Login**: Authenticate via `/login` with admin credentials
2. **Navigate**: Visit `/admin/popups` or use admin navigation
3. **Authorization**: Middleware ensures authenticated access only

### Creating Popups
1. **Click "Create New Popup"**: Opens comprehensive creation form
2. **Fill Required Fields**:
   - **Title** (required): Short, descriptive popup title
   - **Message** (required): Detailed popup content
   - **Frequency** (required): Display frequency setting
3. **Optional Enhancements**:
   - **Image**: Upload promotional image
   - **CTA Button**: Add call-to-action with text and URL
   - **Scheduling**: Set start and end dates/times
   - **Active Status**: Enable popup immediately or save as draft
4. **Submit**: Click "Create Popup" to save

### Scheduling Popups
1. **Start Date/Time**: When popup should begin showing
2. **End Date/Time**: When popup should stop showing
3. **Date Validation**: System ensures end date is after start date
4. **Optional Dates**: Leave blank for always-active popups
5. **Timezone**: Uses browser timezone for datetime inputs

### Image Upload Process
1. **Click Upload Area**: Select image file from device
2. **Automatic Upload**: System uploads to productImage API
3. **Live Preview**: Image appears immediately after upload
4. **Form Integration**: Image URL automatically included in popup data

### Managing Existing Popups
1. **Quick Actions**:
   - **Activate/Deactivate**: Toggle popup status instantly
   - **Edit**: Modify all popup properties
   - **Delete**: Remove popup with confirmation
2. **Status Indicators**:
   - **Active/Inactive**: Current enabled state
   - **Currently Showing**: Real-time visibility status
3. **Bulk Management**: Easy overview of all popups with actions

## Technical Implementation

### Datetime Handling
```typescript
// Form uses datetime-local inputs
const handleEdit = (popup: Popup) => {
  setFormData({
    // Format ISO datetime for datetime-local input
    startAt: popup.startAt ? popup.startAt.slice(0, 16) : '',
    endAt: popup.endAt ? popup.endAt.slice(0, 16) : '',
    // ... other fields
  });
};

// Validation ensures logical date ranges
if (formData.startAt && formData.endAt) {
  const startDate = new Date(formData.startAt);
  const endDate = new Date(formData.endAt);
  if (endDate <= startDate) {
    showError('End date must be after start date');
    return;
  }
}
```

### Real-time Status Calculation
```typescript
const isPopupActive = (popup: Popup) => {
  if (!popup.active) return false;
  
  const now = new Date();
  const startDate = popup.startAt ? new Date(popup.startAt) : null;
  const endDate = popup.endAt ? new Date(popup.endAt) : null;
  
  if (startDate && now < startDate) return false;
  if (endDate && now > endDate) return false;
  
  return true;
};
```

### Image Upload Integration
```typescript
const handleImageUpload = async (file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  
  const response = await fetch(`/api/upload/productImage/${session.restaurantSlug}`, {
    method: 'POST',
    body: formData
  });
  
  if (response.ok) {
    const result = await response.json();
    setImagePreview(result.url);
    return result.url;
  }
};
```

### Form State Management
```typescript
interface PopupFormData {
  title: string;
  message: string;
  ctaText: string;
  ctaUrl: string;
  active: boolean;
  startAt: string;        // datetime-local format
  endAt: string;          // datetime-local format
  frequency: "once-per-session" | "every-visit";
}
```

## Error Handling

### API Level
- **Authentication Errors**: 401 for invalid/missing session
- **Validation Errors**: 400 for missing required fields or invalid dates
- **Not Found Errors**: 404 for missing popups or invalid IDs
- **Date Validation**: Ensures end date is after start date
- **Frequency Validation**: Ensures valid frequency values

### Frontend Level
- **Form Validation**: Real-time validation with inline error messages
- **Date Validation**: Client-side validation before submission
- **Upload Errors**: Specific error messages for image upload failures
- **Network Errors**: Toast notifications for connection issues
- **Confirmation Dialogs**: Safety prompts for destructive actions

## Security Features

- **Session Authentication**: All operations verify user session
- **Restaurant Isolation**: Users only access their own popups
- **Input Sanitization**: Popup titles sanitized for safe ID generation
- **Date Validation**: Server-side validation of date ranges
- **XSS Prevention**: All user inputs properly escaped in UI

## Mobile Responsiveness

- **Responsive Forms**: Two-column layout adapts to mobile screens
- **Touch-Friendly**: Large buttons and touch targets for mobile
- **Datetime Inputs**: Native mobile datetime pickers
- **Scrollable Lists**: Optimized scrolling for popup management
- **Mobile Actions**: Easy access to edit/delete actions on mobile

## Performance Optimizations

- **Real-time Calculations**: Status calculations performed client-side
- **Optimistic Updates**: UI updates immediately during state changes
- **Efficient Rendering**: Only re-renders when popup data changes
- **Image Optimization**: Uploaded images processed through upload API

The popup management system provides a complete, production-ready solution for managing promotional popups with enterprise-level features including advanced scheduling, image integration, and real-time status tracking.

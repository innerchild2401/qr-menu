# Admin Categories Management

## Overview
The Admin Categories system provides comprehensive CRUD (Create, Read, Update, Delete) operations for managing restaurant menu categories through an authenticated admin interface.

## Features

### 🔐 **Session-Based Access Control**
- Categories are isolated per restaurant using `session.restaurantSlug`
- All API operations require valid authentication
- Users can only manage categories for their own restaurant

### 📋 **Category Data Structure**
```typescript
interface Category {
  id: string;        // Auto-generated from name (slugified)
  name: string;      // Display name (required)
  description: string; // Optional description
  order: number;     // Display order (auto-assigned)
}
```

### ✨ **Full CRUD Operations**
- **Create**: Add new categories with auto-generated IDs and ordering
- **Read**: List all categories sorted by display order
- **Update**: Edit category name and description (ID updates automatically)
- **Delete**: Remove categories with automatic reordering

## API Endpoints

### GET /api/admin/categories
**Purpose**: Retrieve all categories for authenticated restaurant
- **Authentication**: Requires valid session with `restaurantSlug`
- **Response**: Array of categories sorted by `order` field
- **Error Handling**: Returns empty array if no categories file exists

```typescript
// Response format
{
  categories: Category[]
}
```

### POST /api/admin/categories
**Purpose**: Create a new category
- **Authentication**: Session-based restaurant validation
- **Request Body**: `{ name: string, description?: string }`
- **Validation**: Name is required and must be unique
- **ID Generation**: Auto-slugified from name (e.g., "Main Courses" → "main-courses")
- **Order Assignment**: Automatically assigned as highest order + 1

```typescript
// Request
{
  name: "Appetizers",
  description: "Start your meal with our delicious appetizers"
}

// Response
{
  category: Category,
  message: "Category created successfully"
}
```

### PUT /api/admin/categories/:id
**Purpose**: Update existing category
- **Authentication**: Session-based validation
- **Request Body**: `{ name: string, description?: string }`
- **ID Handling**: If name changes, ID is regenerated and uniqueness is checked
- **Order Preservation**: Order number remains unchanged during updates

```typescript
// Request
{
  name: "Updated Name",
  description: "Updated description"
}

// Response
{
  category: Category,
  message: "Category updated successfully"
}
```

### DELETE /api/admin/categories/:id
**Purpose**: Delete category and reorder remaining categories
- **Authentication**: Session-based validation
- **Cascade Handling**: Automatically reorders remaining categories to fill gaps
- **Confirmation**: Frontend provides deletion confirmation dialog

```typescript
// Response
{
  category: Category, // The deleted category
  message: "Category deleted successfully"
}
```

## Admin Interface Features

### 🎨 **Modern UI Components**
- **Responsive Design**: Mobile-friendly layout with Tailwind CSS
- **Dark Mode Support**: Full theming throughout interface
- **Loading States**: Spinners and disabled states during operations
- **Toast Notifications**: Success/error feedback for all operations

### 📝 **Category Management Interface**
- **Category List**: Displays all categories with name, description, and order
- **Add Form**: Inline form for creating new categories
- **Edit Mode**: Click-to-edit functionality with pre-filled forms
- **Delete Confirmation**: Safety prompt before category deletion

### 📊 **Statistics Dashboard**
- **Total Categories**: Count of all categories
- **Description Coverage**: Categories with descriptions
- **Next Order**: Preview of next auto-assigned order number

### 🔄 **Real-time Operations**
- **Instant Updates**: UI updates immediately after successful operations
- **Auto-refresh**: Category list reloads after each modification
- **Optimistic UI**: Form resets and state updates before API confirmation

## Usage Instructions

### Accessing Category Management
1. **Login**: Authenticate via `/login` with admin credentials
2. **Navigate**: Visit `/admin/categories` or use admin navigation
3. **Authorization**: Middleware ensures authenticated access only

### Creating Categories
1. **Click "Add New Category"**: Opens inline creation form
2. **Enter Details**: 
   - **Name** (required): Display name for the category
   - **Description** (optional): Detailed description
3. **Submit**: Click "Create Category" to save
4. **Auto-features**:
   - **ID Generation**: Automatically creates URL-friendly ID
   - **Order Assignment**: Assigns next sequential order number
   - **Validation**: Checks for name uniqueness

### Editing Categories
1. **Click "Edit"**: Opens inline edit form with pre-filled data
2. **Modify Fields**: Update name and/or description
3. **ID Handling**: System automatically updates ID if name changes
4. **Submit**: Click "Update Category" to save changes
5. **Validation**: Ensures new name doesn't conflict with existing categories

### Deleting Categories
1. **Click "Delete"**: Triggers confirmation dialog
2. **Confirm**: Confirm deletion in browser prompt
3. **Auto-reorder**: System automatically reorders remaining categories
4. **Feedback**: Toast notification confirms successful deletion

## Technical Implementation

### File Storage Integration
```typescript
// Uses fsStore helpers for JSON persistence
import { readJson, writeJson } from '../../../../../lib/fsStore';

// Read categories
const categories = await readJson<Category[]>(`data/categories/${restaurantSlug}.json`);

// Write categories
await writeJson(`data/categories/${restaurantSlug}.json`, categories);
```

### ID Generation Logic
```typescript
// Slugify category name for ID
const categoryId = name
  .toLowerCase()
  .replace(/[^a-z0-9]/g, '-')  // Replace non-alphanumeric with hyphens
  .replace(/-+/g, '-')         // Replace multiple hyphens with single
  .replace(/^-|-$/g, '');      // Remove leading/trailing hyphens
```

### Auto-ordering System
```typescript
// Assign next order number
const maxOrder = categories.length > 0 
  ? Math.max(...categories.map(cat => cat.order)) 
  : 0;
const newOrder = maxOrder + 1;

// Reorder after deletion
categories.forEach((cat, index) => {
  cat.order = index + 1;
});
```

### Form State Management
```typescript
interface CategoryFormData {
  name: string;
  description: string;
}

// Form state
const [formData, setFormData] = useState<CategoryFormData>({ 
  name: '', 
  description: '' 
});

// Edit mode
const handleEdit = (category: Category) => {
  setEditingCategory(category);
  setFormData({
    name: category.name,
    description: category.description
  });
  setShowAddForm(true);
};
```

## Error Handling

### API Level
- **Authentication Errors**: 401 for invalid/missing session
- **Validation Errors**: 400 for missing required fields or duplicates
- **Not Found Errors**: 404 for missing categories or invalid IDs
- **Server Errors**: 500 for internal processing failures

### Frontend Level
- **Network Errors**: Toast notifications for connection issues
- **Validation Errors**: Inline form validation and error messages
- **Confirmation Dialogs**: Safety prompts for destructive actions
- **Loading States**: Disabled buttons and spinners during operations

## Security Features

- **Session Authentication**: All operations verify user session
- **Restaurant Isolation**: Users only access their own categories
- **Input Sanitization**: Category names are sanitized for safe ID generation
- **File Path Security**: Restaurant slugs are validated and sanitized
- **XSS Prevention**: All user inputs are properly escaped in UI

## Mobile Responsiveness

- **Responsive Grid**: Layout adapts to different screen sizes
- **Touch-Friendly**: Large buttons and touch targets for mobile
- **Scrollable Lists**: Optimized scrolling for category lists
- **Mobile Forms**: Form inputs sized appropriately for mobile devices

The category management system provides a complete, production-ready solution for organizing menu categories with enterprise-level features including real-time updates, comprehensive validation, and robust error handling.

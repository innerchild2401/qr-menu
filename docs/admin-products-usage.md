# Admin Products Management

## Overview
The Admin Products system provides comprehensive CRUD operations for managing restaurant menu products with integrated image upload, nutrition tracking, and category assignment through an authenticated admin interface.

## Features

### 🔐 **Session-Based Access Control**
- Products are isolated per restaurant using `session.restaurantSlug`
- All API operations require valid authentication
- Users can only manage products for their own restaurant

### 📦 **Product Data Structure**
```typescript
interface Product {
  id: string;           // Auto-generated from name (slugified)
  name: string;         // Product name (required)
  description: string;  // Product description (required)
  price: number;        // Price in decimal format (required)
  image: string;        // Image URL (optional)
  nutrition: {          // Nutrition information
    calories: number;   // Calorie count
    protein: string;    // Protein content (e.g., "25g")
    carbs: string;      // Carbohydrate content (e.g., "30g")
    fat: string;        // Fat content (e.g., "15g")
  };
  categoryId: string;   // Reference to category (required)
}
```

### ✨ **Full CRUD Operations**
- **Create**: Add new products with image upload and nutrition data
- **Read**: List all products with category information and statistics
- **Update**: Edit product details, including image replacement
- **Delete**: Remove products with confirmation dialog

### 🖼️ **Integrated Image Upload**
- **Seamless Integration**: Image upload integrated directly into product form
- **Live Preview**: Real-time image preview during upload and editing
- **Upload Progress**: Visual feedback during image upload process
- **Image Management**: Easy image replacement for existing products

## API Endpoints

### GET /api/admin/products
**Purpose**: Retrieve all products for authenticated restaurant
- **Authentication**: Requires valid session with `restaurantSlug`
- **Response**: Array of products with complete data
- **Error Handling**: Returns empty array if no products file exists

```typescript
// Response format
{
  products: Product[]
}
```

### POST /api/admin/products
**Purpose**: Create a new product
- **Authentication**: Session-based restaurant validation
- **Request Body**: Complete product data including nutrition
- **Validation**: Name, description, price, and categoryId are required
- **ID Generation**: Auto-slugified from name (e.g., "Grilled Salmon" → "grilled-salmon")

```typescript
// Request
{
  name: "Grilled Salmon",
  description: "Fresh Atlantic salmon with herbs",
  price: 24.99,
  image: "/uploads/demo/1234567890_salmon.webp",
  nutrition: {
    calories: 420,
    protein: "35g",
    carbs: "12g",
    fat: "28g"
  },
  categoryId: "mains"
}

// Response
{
  product: Product,
  message: "Product created successfully"
}
```

### PUT /api/admin/products/:id
**Purpose**: Update existing product
- **Authentication**: Session-based validation
- **Request Body**: Updated product data
- **ID Handling**: If name changes, ID is regenerated and uniqueness is checked
- **Partial Updates**: Only provided fields are updated

```typescript
// Request (same format as POST)
// Response
{
  product: Product,
  message: "Product updated successfully"
}
```

### DELETE /api/admin/products/:id
**Purpose**: Delete product
- **Authentication**: Session-based validation
- **Confirmation**: Frontend provides deletion confirmation dialog

```typescript
// Response
{
  product: Product, // The deleted product
  message: "Product deleted successfully"
}
```

## Admin Interface Features

### 🎨 **Dual View Modes**
- **Cards View**: Visual product cards with images and quick info
- **Table View**: Compact table format for bulk management
- **Toggle Control**: Easy switching between view modes

### 📝 **Comprehensive Form**
- **Product Details**: Name, description, price, category selection
- **Image Upload**: Integrated upload with live preview
- **Nutrition Tracking**: Separate fields for calories, protein, carbs, fat
- **Category Assignment**: Dropdown populated from existing categories
- **Form Validation**: Real-time validation with error messages

### 🖼️ **Advanced Image Management**
- **Upload Integration**: Direct integration with product image upload API
- **Preview System**: Live preview during upload and editing
- **Change Functionality**: Easy image replacement for existing products
- **Fallback Display**: Attractive placeholders for products without images
- **Progress Indicators**: Visual feedback during upload process

### 📊 **Statistics Dashboard**
- **Product Count**: Total number of products
- **Image Coverage**: Products with images vs. total
- **Average Price**: Calculated average price across all products
- **Category Distribution**: Number of unique categories used

## Usage Instructions

### Accessing Product Management
1. **Login**: Authenticate via `/login` with admin credentials
2. **Navigate**: Visit `/admin/products` or use admin navigation
3. **Authorization**: Middleware ensures authenticated access only

### Creating Products
1. **Click "Add New Product"**: Opens comprehensive creation form
2. **Fill Basic Info**:
   - **Name** (required): Product display name
   - **Description** (required): Detailed product description
   - **Price** (required): Product price in decimal format
   - **Category** (required): Select from existing categories
3. **Upload Image** (optional):
   - Click upload area to select image file
   - Preview appears immediately after upload
   - System validates file type and size
4. **Add Nutrition Info** (optional):
   - **Calories**: Numeric calorie count
   - **Protein**: Text format (e.g., "25g")
   - **Carbs**: Text format (e.g., "30g")
   - **Fat**: Text format (e.g., "15g")
5. **Submit**: Click "Create Product" to save

### Image Upload Workflow
1. **Select Image**: Click upload area or existing image overlay
2. **File Upload**: System uploads to `/api/upload/productImage/[slug]`
3. **Preview Update**: Image preview updates immediately
4. **Form Integration**: Image URL automatically added to product data
5. **Save Product**: Product saved with image URL reference

### Editing Products
1. **Click "Edit"**: Opens edit form with pre-filled data
2. **Modify Fields**: Update any product information
3. **Change Image**: Click image to upload replacement
4. **Update Nutrition**: Modify nutrition information as needed
5. **Submit**: Click "Update Product" to save changes

### Deleting Products
1. **Click "Delete"**: Triggers confirmation dialog
2. **Confirm**: Confirm deletion in browser prompt
3. **Removal**: Product permanently deleted from system
4. **Feedback**: Toast notification confirms successful deletion

## View Modes

### Cards View
- **Visual Display**: Large product images with overlay pricing
- **Quick Info**: Name, description, category, and nutrition at a glance
- **Action Buttons**: Edit and delete buttons prominently displayed
- **Mobile Friendly**: Responsive grid layout for all screen sizes

### Table View
- **Compact Format**: All products in sortable table format
- **Bulk Management**: Efficient for managing many products
- **Quick Actions**: Inline edit and delete buttons
- **Image Thumbnails**: Small image previews in table cells

## Technical Implementation

### Image Upload Integration
```typescript
// Upload process during form submission
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

### Nutrition Data Handling
```typescript
// Flexible nutrition parsing (JSON or individual fields)
interface NutritionData {
  calories: number;
  protein: string;
  carbs: string;
  fat: string;
}

// Parse nutrition from form or JSON string
const parseNutrition = (nutrition: string | object): NutritionData => {
  if (typeof nutrition === 'string') {
    return JSON.parse(nutrition);
  }
  return nutrition as NutritionData;
};
```

### Category Integration
```typescript
// Load categories for dropdown
const loadCategories = async () => {
  const response = await fetch('/api/admin/categories');
  const data = await response.json();
  setCategories(data.categories || []);
};

// Display category name from ID
const getCategoryName = (categoryId: string) => {
  const category = categories.find(cat => cat.id === categoryId);
  return category ? category.name : 'Unknown Category';
};
```

### Form State Management
```typescript
interface ProductFormData {
  name: string;
  description: string;
  price: string;
  categoryId: string;
  nutrition: {
    calories: string;
    protein: string;
    carbs: string;
    fat: string;
  };
}

// Form submission with image upload
const handleSubmit = async (e: React.FormEvent) => {
  // 1. Validate form data
  // 2. Upload image if provided
  // 3. Prepare product data with image URL
  // 4. Submit to API
  // 5. Handle response and feedback
};
```

## Error Handling

### API Level
- **Authentication Errors**: 401 for invalid/missing session
- **Validation Errors**: 400 for missing required fields or invalid data
- **Not Found Errors**: 404 for missing products or invalid IDs
- **Server Errors**: 500 for internal processing failures

### Frontend Level
- **Form Validation**: Real-time validation with inline error messages
- **Upload Errors**: Specific error messages for image upload failures
- **Network Errors**: Toast notifications for connection issues
- **Confirmation Dialogs**: Safety prompts for destructive actions

## Security Features

- **Session Authentication**: All operations verify user session
- **Restaurant Isolation**: Users only access their own products
- **Input Sanitization**: Product names sanitized for safe ID generation
- **File Upload Security**: Image uploads validated for type and size
- **XSS Prevention**: All user inputs properly escaped in UI

## Mobile Responsiveness

- **Responsive Grid**: Product cards adapt to screen size
- **Touch-Friendly**: Large buttons and touch targets for mobile
- **Optimized Forms**: Form layouts optimized for mobile input
- **Image Upload**: Mobile-friendly image selection and preview
- **Table Scrolling**: Horizontal scrolling for table view on mobile

## Performance Optimizations

- **Parallel Loading**: Products and categories loaded simultaneously
- **Image Optimization**: Uploaded images processed through upload API
- **Lazy Loading**: Large product lists can be paginated if needed
- **Caching Strategy**: API responses can be cached for better performance

The product management system provides a complete, production-ready solution for managing menu products with enterprise-level features including integrated image upload, comprehensive nutrition tracking, and flexible viewing options.

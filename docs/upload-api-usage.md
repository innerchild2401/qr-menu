# File Upload API Usage

## Overview
The SmartMenu application provides three upload endpoints for restaurant assets:

- `/api/upload/logo/[slug]` - For restaurant logos
- `/api/upload/cover/[slug]` - For restaurant cover images  
- `/api/upload/productImage/[slug]` - For product images

## API Endpoints

### POST /api/upload/logo/[slug]
Uploads a restaurant logo image.

**Parameters:**
- `slug` (path): Restaurant identifier

**Request:**
- Content-Type: `multipart/form-data`
- Field: `file` (required) - Image file

**Response:**
```json
{
  "url": "/uploads/demo/1703123456789_logo.webp",
  "filename": "1703123456789_logo.webp",
  "size": 45678
}
```

### POST /api/upload/cover/[slug]
Uploads a restaurant cover image.

**Parameters:**
- `slug` (path): Restaurant identifier

**Request:**
- Content-Type: `multipart/form-data`
- Field: `file` (required) - Image file

**Response:**
```json
{
  "url": "/uploads/demo/1703123456790_cover.webp",
  "filename": "1703123456790_cover.webp", 
  "size": 123456
}
```

### POST /api/upload/productImage/[slug]
Uploads a product image.

**Parameters:**
- `slug` (path): Restaurant identifier

**Request:**
- Content-Type: `multipart/form-data`
- Field: `file` (required) - Image file

**Response:**
```json
{
  "url": "/uploads/demo/1703123456791_product.webp",
  "filename": "1703123456791_product.webp",
  "size": 87654
}
```

## File Validation

### Allowed File Types
- PNG (`.png`)
- JPEG (`.jpg`, `.jpeg`) 
- WebP (`.webp`)

### File Size Limit
- Maximum: 5MB per file

### Filename Sanitization
- Special characters replaced with underscores
- Lowercase conversion
- Timestamp prefix added for uniqueness
- Format: `{timestamp}_{sanitized_name}.{ext}`

## JavaScript Usage Examples

### Using Fetch API
```javascript
// Upload a logo
async function uploadLogo(file, slug) {
  const formData = new FormData();
  formData.append('file', file);
  
  const response = await fetch(`/api/upload/logo/${slug}`, {
    method: 'POST',
    body: formData
  });
  
  if (response.ok) {
    const result = await response.json();
    console.log('Uploaded:', result.url);
    return result;
  } else {
    const error = await response.json();
    throw new Error(error.error);
  }
}

// Upload a product image
async function uploadProductImage(file, slug) {
  const formData = new FormData();
  formData.append('file', file);
  
  try {
    const response = await fetch(`/api/upload/productImage/${slug}`, {
      method: 'POST',
      body: formData
    });
    
    const result = await response.json();
    
    if (response.ok) {
      return result;
    } else {
      throw new Error(result.error);
    }
  } catch (error) {
    console.error('Upload failed:', error);
    throw error;
  }
}
```

### Using with File Input
```html
<input type="file" id="fileInput" accept="image/*" />
<button onclick="handleUpload()">Upload</button>

<script>
async function handleUpload() {
  const fileInput = document.getElementById('fileInput');
  const file = fileInput.files[0];
  
  if (!file) {
    alert('Please select a file');
    return;
  }
  
  try {
    const result = await uploadLogo(file, 'demo');
    alert(`Upload successful: ${result.url}`);
  } catch (error) {
    alert(`Upload failed: ${error.message}`);
  }
}
</script>
```

## Error Responses

### 400 Bad Request
```json
{
  "error": "No file provided"
}
```

```json
{
  "error": "Invalid file type. Allowed types: .png, .jpg, .jpeg, .webp"
}
```

```json
{
  "error": "File too large. Maximum size: 5MB"
}
```

### 500 Internal Server Error
```json
{
  "error": "Internal server error"
}
```

## File Storage

- Files are stored in `/public/uploads/[slug]/`
- Accessible via URL: `/uploads/[slug]/filename`
- Directory structure created automatically
- Files are timestamped to prevent conflicts

## Security Features

- File type validation (MIME type + extension)
- File size limits
- Filename sanitization 
- Directory traversal prevention
- Automatic directory creation with safe paths

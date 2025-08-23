# QR Code Generator & E2E Testing Checklist

## 🎯 Quick Start

### 1. Run Development Server
```bash
npm run dev
```
Server starts at: `http://localhost:3001`

### 2. Login to Admin
- URL: `http://localhost:3001/login`
- Email: `admin@bellavista.com`
- Password: `admin123`

### 3. Access New Features
- **QR Generator**: `http://localhost:3001/admin/qr`
- **E2E Checklist**: `http://localhost:3001/admin/checklist`

## 📱 QR Code Generator (`/admin/qr`)

### Features
- ✅ **Dynamic URL Generation**: Localhost vs Network IP switching
- ✅ **High-Quality QR Codes**: 256×256px with 4-module white border
- ✅ **Download Functionality**: PNG format with optimized settings
- ✅ **Live Preview**: Real-time QR code generation
- ✅ **Mobile Testing**: Network IP mode for phone testing
- ✅ **Best Practices**: Built-in usage guidelines

### Quick Mobile Test
1. Visit `/admin/qr`
2. Switch to "Network IP (192.168.x.x:3001)"
3. Click "Regenerate QR"
4. Click "Download PNG"
5. Scan with phone camera
6. Menu opens automatically

### QR Code Specifications
- **Size**: 256×256 pixels
- **Format**: PNG with transparent background
- **Error Correction**: Medium (M) level
- **Quiet Zone**: 4 modules white border
- **Colors**: Black modules on white background
- **Download Name**: `menu-qr-{restaurantSlug}.png`

### URL Modes
| Mode | URL Format | Use Case |
|------|------------|----------|
| Localhost | `http://localhost:3001/menu/demo` | Development only |
| Network IP | `http://192.168.x.x:3001/menu/demo` | Mobile testing |
| Custom | User-defined domain | Production setup |

## 🧪 E2E Testing Checklist (`/admin/checklist`)

### Automated Tests
- ✅ **JSON File Validation**: Restaurant, categories, products, popups
- ✅ **Upload Directory**: Write permissions and file handling
- ✅ **API Endpoints**: Menu and popups data retrieval
- ✅ **Authentication**: Session management verification

### Test Categories

#### 1. Data Layer Tests
- **Restaurant JSON**: Verifies `/data/restaurants/demo.json` exists and parses
- **Categories JSON**: Checks category data structure and loading
- **Products JSON**: Validates product data with proper formatting
- **Popups JSON**: Ensures popup configuration is correct

#### 2. Infrastructure Tests
- **Uploads Directory**: Tests file upload functionality and permissions
- **API Menu Endpoint**: Validates `/api/menu/[slug]` returns complete data
- **API Popups Endpoint**: Checks `/api/popups/[slug]` filtering logic
- **Auth Session**: Verifies NextAuth session management

### Running Tests

#### All Tests
```bash
# Visit checklist page
http://localhost:3001/admin/checklist

# Click "Run All Tests" button
# Wait for all tests to complete
# Review results summary
```

#### Individual Tests
- Click "Test" button on any individual check
- View real-time status updates
- See detailed error messages for failures
- Check success confirmation for passing tests

### Test Results
- 🟢 **Success**: Green checkmark with result details
- 🔴 **Error**: Red X with specific error message
- 🔵 **Running**: Blue spinner during execution
- ⚪ **Pending**: Gray question mark before execution

## 🚀 Mobile Testing Workflow

### Step 1: Setup Development Environment
```bash
# Start server
npm run dev

# Note the Network URL from output:
# "Network: http://192.168.43.27:3001"
```

### Step 2: Generate QR Code
1. Login to admin dashboard
2. Navigate to "QR Code" in navigation
3. Switch to "Network IP" option
4. Verify generated URL shows your IP
5. Click "Download PNG" to save QR code

### Step 3: Test on Mobile
1. Ensure phone is on same WiFi network
2. Open camera app on phone
3. Point at QR code (printed or on screen)
4. Tap notification that appears
5. Menu opens in mobile browser

### Step 4: Verify E2E Tests
1. Navigate to "Checklist" in admin navigation
2. Click "Run All Tests"
3. Verify all 8 tests pass
4. Use "Open Menu" button for quick testing

## 📋 Common Issues & Solutions

### QR Code Not Scanning
- **Size**: Print at least 2×2 cm (0.8×0.8 inch)
- **Contrast**: Ensure black on white background
- **Lighting**: Avoid glare and ensure good lighting
- **Distance**: Hold phone 6-12 inches from code

### Mobile Access Problems
- **Network**: Verify both devices on same WiFi
- **Firewall**: Allow port 3001 through firewall
- **IP Address**: Check correct IP in dev server output
- **HTTPS**: Some features may require HTTPS (use ngrok)

### Test Failures
- **File Permissions**: Ensure uploads directory is writable
- **JSON Syntax**: Check for malformed JSON in data files
- **API Errors**: Verify server is running and accessible
- **Auth Issues**: Try logging out and back in

## 🎨 Features Overview

### QR Code Generator
- **Smart URL Switching**: Automatic localhost/network detection
- **Print-Ready Output**: High-resolution with proper quiet zone
- **Mobile Optimized**: Touch-friendly interface
- **Real-Time Preview**: Instant QR code generation
- **Usage Guidelines**: Built-in best practices

### E2E Testing Checklist
- **Comprehensive Coverage**: Tests all critical system components
- **Real-Time Feedback**: Live status updates during testing
- **Error Reporting**: Detailed failure messages with context
- **Quick Actions**: Direct links to test endpoints
- **Progress Tracking**: Visual progress bar and statistics

### Navigation Integration
Both features are seamlessly integrated into the admin navigation:
- Accessible via top navigation bar
- Consistent styling with existing admin pages
- Mobile-responsive design
- Authentication-protected access

## 🔗 Quick Reference Links

### Development URLs
- **Admin Dashboard**: `http://localhost:3001/admin/settings`
- **QR Generator**: `http://localhost:3001/admin/qr`
- **Testing Checklist**: `http://localhost:3001/admin/checklist`
- **Demo Menu**: `http://localhost:3001/menu/demo`

### Mobile Testing URLs (Replace with your IP)
- **Demo Menu**: `http://192.168.x.x:3001/menu/demo`
- **Admin Dashboard**: `http://192.168.x.x:3001/admin/settings`

### API Endpoints
- **Menu Data**: `http://localhost:3001/api/menu/demo`
- **Popup Data**: `http://localhost:3001/api/popups/demo`
- **Session Info**: `http://localhost:3001/api/auth/session`

## 📚 Technical Details

### QR Code Library
- **Package**: `qrcode` with `@types/qrcode`
- **Canvas Rendering**: HTML5 Canvas for high-quality output
- **Error Correction**: Medium level for balance of data/reliability
- **Module Size**: Optimized for mobile camera scanning

### Testing Framework
- **Client-Side**: React-based testing interface
- **API Testing**: Fetch-based endpoint validation
- **File System**: Upload and permission testing
- **Authentication**: Session validation and management

### Security Considerations
- **Authentication Required**: Both features require admin login
- **Session-Based Access**: Restaurant data isolated by session
- **File Upload Security**: Validated file types and size limits
- **Network Access**: Development-only IP exposure

The QR code generator and E2E testing checklist provide essential tools for development, testing, and deployment of the SmartMenu application with comprehensive mobile support.

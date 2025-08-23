# SmartMenu Development & Testing Guide

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ installed
- npm or yarn package manager
- Text editor (VS Code recommended)
- Modern web browser

### Initial Setup
1. **Clone and Install Dependencies**
   ```bash
   git clone <repository-url>
   cd smartmenu
   npm install
   ```

2. **Environment Configuration**
   ```bash
   # Create environment file
   echo "NEXTAUTH_SECRET=development-secret-key-change-in-production" > .env.local
   ```

3. **Start Development Server**
   ```bash
   npm run dev
   ```

   The application will start on:
   - **Primary**: `http://localhost:3001` (Port 3000 backup used)
   - **Network**: `http://192.168.x.x:3001` (Your LAN IP)

## 🖥️ Development Server

### Running the Application
```bash
# Start development server with Turbopack
npm run dev

# Alternative commands
npm start          # Production build
npm run build      # Build for production
npm run lint       # Run ESLint
```

### Server Details
- **Framework**: Next.js 15.5.0 with Turbopack
- **Default Port**: 3001 (automatically switches if 3000 is busy)
- **Hot Reload**: Enabled for instant development feedback
- **API Routes**: Available at `/api/*` endpoints

### Development Features
- ✅ **File-based Routing**: Pages automatically created from file structure
- ✅ **API Routes**: Server-side endpoints for data management
- ✅ **Middleware**: Authentication and route protection
- ✅ **Hot Reload**: Instant updates without browser refresh
- ✅ **TypeScript**: Full type safety and IntelliSense
- ✅ **Tailwind CSS**: Utility-first styling with dark mode

## 📱 Mobile Testing Setup

### Method 1: Network IP Access (Recommended)

1. **Find Your Computer's IP Address**
   ```bash
   # Windows
   ipconfig | findstr IPv4
   
   # macOS/Linux
   ifconfig | grep inet
   
   # Alternative: Look at dev server output
   # Next.js shows: "Network: http://192.168.x.x:3001"
   ```

2. **Access from Mobile Device**
   - Ensure both devices are on the same WiFi network
   - Open browser on phone/tablet
   - Navigate to: `http://192.168.x.x:3001/menu/demo`
   - Replace `192.168.x.x` with your actual IP address

3. **Common IP Address Patterns**
   - Home networks: `192.168.1.x` or `192.168.0.x`
   - Office networks: `10.x.x.x` or `172.16-31.x.x`
   - Mobile hotspot: `192.168.43.x`

### Method 2: QR Code Testing

1. **Navigate to QR Generator**
   - Login to admin dashboard
   - Go to `/admin/qr`
   - Switch to "Network IP" option
   - Generate QR code

2. **Mobile Scanning**
   - Open camera app on phone
   - Point at QR code
   - Tap notification that appears
   - Menu opens directly in browser

### Method 3: localhost Tunneling (Advanced)

```bash
# Install ngrok (optional)
npm install -g ngrok

# Create tunnel to localhost:3001
ngrok http 3001

# Use the provided HTTPS URL for mobile testing
```

## 🧪 Testing Checklist

### Automated E2E Testing
Access the built-in testing checklist at `/admin/checklist`:

1. **Navigate to Checklist**
   ```
   http://localhost:3001/admin/checklist
   ```

2. **Run All Tests**
   - Click "Run All Tests" button
   - Verify all checks pass (green status)
   - Review any failures (red status)

3. **Individual Test Categories**
   - ✅ **JSON Files**: Restaurant, categories, products, popups
   - ✅ **Uploads Directory**: File write permissions
   - ✅ **API Endpoints**: Menu and popups data retrieval
   - ✅ **Authentication**: Session management

### Manual Testing Scenarios

#### 📋 Core Functionality Tests
1. **Restaurant Menu Display**
   - Visit `/menu/demo`
   - Verify all products load with images
   - Test category filtering
   - Check responsive design on different screen sizes

2. **Admin Authentication**
   - Login at `/login` with credentials:
     - Email: `admin@bellavista.com`
     - Password: `admin123`
   - Verify redirect to `/admin/settings`
   - Test session persistence across page reloads

3. **Admin Panel Features**
   - **Settings**: Update restaurant info, upload logo/cover
   - **Categories**: Add, edit, delete categories
   - **Products**: Manage menu items with images
   - **Popups**: Create promotional popups with scheduling
   - **QR Code**: Generate menu QR codes for mobile access

#### 📱 Mobile-Specific Tests
1. **Touch Interactions**
   - Tap menu items for details
   - Swipe through product images
   - Test popup close buttons
   - Verify form inputs on mobile keyboards

2. **Responsive Design**
   - Portrait and landscape orientations
   - Different screen sizes (phone, tablet)
   - Menu layout adaptation
   - Admin panel mobile accessibility

3. **QR Code Scanning**
   - Generate QR code with network IP
   - Test scanning from different distances
   - Verify automatic menu opening
   - Check QR code print quality guidelines

## 🔧 Troubleshooting

### Common Development Issues

#### Port Already in Use
```bash
# Kill process using port 3000/3001
# Windows
netstat -ano | findstr :3001
taskkill /PID <process-id> /F

# macOS/Linux
lsof -ti:3001 | xargs kill -9
```

#### Network Access Issues
```bash
# Check firewall settings
# Windows: Windows Defender Firewall > Allow an app
# macOS: System Preferences > Security & Privacy > Firewall
# Linux: sudo ufw allow 3001
```

#### Module Resolution Errors
```bash
# Clear Next.js cache
rm -rf .next
rm -rf node_modules/.cache

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

### Mobile Testing Issues

#### Cannot Access from Phone
1. **Same Network**: Ensure both devices on same WiFi
2. **Firewall**: Allow port 3001 through firewall
3. **IP Address**: Verify correct IP address format
4. **HTTPS**: Some features require HTTPS (use ngrok)

#### QR Code Not Scanning
1. **Size**: Ensure QR code is at least 2×2 cm when printed
2. **Contrast**: Use black code on white background
3. **Distance**: Hold phone 6-12 inches from code
4. **Lighting**: Ensure adequate lighting without glare

#### Slow Loading on Mobile
1. **Network**: Check WiFi signal strength
2. **Images**: Large product images may load slowly
3. **Cache**: Clear browser cache on mobile device
4. **Dev Mode**: Development builds are slower than production

## 📊 Performance Monitoring

### Development Metrics
- **Build Time**: Initial compilation ~27-65 seconds
- **Hot Reload**: Typically under 1 second
- **API Response**: Most endpoints under 500ms
- **Image Upload**: Depends on file size and network

### Production Optimization
```bash
# Build optimized version
npm run build

# Start production server
npm start

# Analyze bundle size
npm run build -- --analyze
```

## 🔐 Security Notes

### Development Environment
- **Authentication**: Uses demo credentials for testing
- **File System**: Direct JSON file storage (development only)
- **Uploads**: Local file system storage
- **HTTPS**: Not required for local development

### Production Considerations
- Change `NEXTAUTH_SECRET` to secure random value
- Use database instead of JSON files
- Implement cloud storage for uploads
- Enable HTTPS with SSL certificates
- Add rate limiting and input validation

## 📝 File Structure

```
smartmenu/
├── src/app/
│   ├── admin/          # Admin dashboard pages
│   │   ├── settings/   # Restaurant settings
│   │   ├── categories/ # Category management
│   │   ├── products/   # Product management
│   │   ├── popups/     # Popup management
│   │   ├── qr/         # QR code generator
│   │   └── checklist/  # E2E testing checklist
│   ├── api/            # API route handlers
│   │   ├── admin/      # Admin-only endpoints
│   │   ├── auth/       # NextAuth endpoints
│   │   ├── menu/       # Public menu API
│   │   ├── popups/     # Public popups API
│   │   └── upload/     # File upload endpoints
│   ├── login/          # Authentication page
│   └── menu/           # Public menu display
├── data/               # JSON data storage
│   ├── restaurants/    # Restaurant information
│   ├── categories/     # Menu categories
│   ├── products/       # Menu products
│   ├── popups/         # Promotional popups
│   └── users.json      # User credentials
├── public/uploads/     # Uploaded images
├── lib/                # Utility functions
├── components/         # Reusable React components
├── hooks/              # Custom React hooks
└── docs/               # Documentation
```

## 🌟 Key URLs for Testing

### Public Pages
- **Home**: `http://localhost:3001/`
- **Demo Menu**: `http://localhost:3001/menu/demo`

### Admin Pages (Authentication Required)
- **Login**: `http://localhost:3001/login`
- **Settings**: `http://localhost:3001/admin/settings`
- **Categories**: `http://localhost:3001/admin/categories`
- **Products**: `http://localhost:3001/admin/products`
- **Popups**: `http://localhost:3001/admin/popups`
- **QR Generator**: `http://localhost:3001/admin/qr`
- **Testing Checklist**: `http://localhost:3001/admin/checklist`

### API Endpoints
- **Menu Data**: `http://localhost:3001/api/menu/demo`
- **Popup Data**: `http://localhost:3001/api/popups/demo`
- **Session Info**: `http://localhost:3001/api/auth/session`

### Mobile Testing URLs
Replace `192.168.x.x` with your actual IP address:
- **Demo Menu**: `http://192.168.x.x:3001/menu/demo`
- **QR Generator**: `http://192.168.x.x:3001/admin/qr`

## 🚀 Quick Start Checklist

1. ✅ **Install Dependencies**: `npm install`
2. ✅ **Set Environment**: Create `.env.local` with `NEXTAUTH_SECRET`
3. ✅ **Start Server**: `npm run dev`
4. ✅ **Test Login**: Visit `/login`, use `admin@bellavista.com` / `admin123`
5. ✅ **Run E2E Tests**: Visit `/admin/checklist`, click "Run All Tests"
6. ✅ **Generate QR Code**: Visit `/admin/qr`, switch to "Network IP"
7. ✅ **Test Mobile**: Scan QR code with phone camera
8. ✅ **Verify Menu**: Check `/menu/demo` loads on mobile

## 📞 Support & Resources

### Documentation
- **Next.js**: https://nextjs.org/docs
- **NextAuth.js**: https://next-auth.js.org
- **Tailwind CSS**: https://tailwindcss.com/docs
- **TypeScript**: https://www.typescriptlang.org/docs

### Development Tools
- **React DevTools**: Browser extension for React debugging
- **VS Code Extensions**: ES7 React/Redux/GraphQL/React-Native snippets
- **Thunder Client**: REST API testing in VS Code
- **Chrome DevTools**: Network tab for API debugging

The SmartMenu application is designed for rapid development and easy testing across devices. Use the built-in checklist and QR code generator to streamline your development workflow and ensure everything works correctly on mobile devices.

# SmartMenu E2E Tests

This directory contains comprehensive end-to-end tests for the SmartMenu application using Playwright.

## Test Files

- `smartmenu.e2e.spec.ts` - Main E2E test suite
- `fixtures/test_menu.xlsx` - Sample Excel file for testing bulk upload
- `fixtures/generate-test-menu.js` - Script to regenerate the test Excel file

## Test Coverage

The tests cover the complete SmartMenu workflow:

1. **Authentication**
   - Login with valid credentials
   - Rejection of invalid credentials

2. **Bulk Menu Upload**
   - Excel file upload
   - Column detection (synonyms + AI)
   - Data validation and preview
   - Supabase insertion

3. **Public Menu Display**
   - Verification that uploaded data appears on public menu
   - Category and product display

4. **Error Handling**
   - Invalid file upload rejection
   - Graceful error handling

## Running the Tests

### Prerequisites

1. Make sure the SmartMenu app is running locally
2. Ensure you have a test user account (eu@eu.com / parolamea)
3. The app should be accessible at `http://localhost:3000`

### Run All Tests

```bash
# Run tests in headless mode
npx playwright test

# Run tests with browser visible (recommended for debugging)
npx playwright test --headed

# Run tests with debug mode
npx playwright test --debug
```

### Run Specific Test

```bash
# Run only the main workflow test
npx playwright test smartmenu.e2e.spec.ts

# Run a specific test by name
npx playwright test -g "Complete menu upload and verification workflow"
```

### Run Tests in Different Browsers

```bash
# Run in Chrome only
npx playwright test --project=chromium

# Run in Firefox only
npx playwright test --project=firefox

# Run in Safari only
npx playwright test --project=webkit
```

## Test Data

### Test Excel File

The test uses `fixtures/test_menu.xlsx` which contains:

**Headers:**
- ID (ignored)
- Product Name (mapped to name)
- Category (mapped to category)
- Description (mapped to description)
- Price (mapped to price)
- SKU (ignored)
- Stock (ignored)
- Barcode (ignored)

**Sample Data:**
- Margherita Pizza - Pizza - $12.99
- Pepperoni Pizza - Pizza - $14.99
- Caesar Salad - Salads - $8.99
- Chicken Wings - Appetizers - $10.99
- Chocolate Cake - Desserts - $6.99

### Regenerating Test Data

To regenerate the test Excel file:

```bash
node tests/fixtures/generate-test-menu.js
```

## Debugging

### View Test Results

```bash
# Open HTML report
npx playwright show-report
```

### Debug Mode

```bash
# Run with debug mode (opens browser with dev tools)
npx playwright test --debug
```

### Screenshots and Videos

- Screenshots are automatically taken on test failure
- Videos are recorded for failed tests
- Files are saved in `test-results/` directory

### Console Logging

The tests include extensive console logging to track progress:

```
🚀 Starting SmartMenu E2E test...
📋 Test data prepared: { testEmail: 'eu@eu.com', testMenuFile: '...' }
🔐 Step 1: Login process...
✅ Login successful - redirected to admin dashboard
📦 Step 2: Navigate to Products page...
✅ Products page loaded successfully
📤 Step 3: Opening bulk upload modal...
✅ Bulk upload modal opened
📁 Step 4: Uploading test Excel file...
✅ File uploaded and processed
🔍 Step 5: Verifying column detection...
📊 Column detection method: Hybrid (Synonyms + AI)
✅ Column detection verified
👀 Step 6: Verifying preview data...
✅ Preview data verified
🚀 Step 7: Uploading menu data to Supabase...
✅ Upload completed: Successfully uploaded 5 products
✅ Products list updated with uploaded data
🌐 Step 8: Verifying public menu page...
✅ Public menu page displays all uploaded products
📂 Step 9: Verifying categories...
✅ Categories are displayed correctly
🚫 Step 10: Verifying ignored columns...
✅ Ignored columns handled correctly - no errors
🎉 All tests passed! SmartMenu workflow is working correctly.
```

## Troubleshooting

### Common Issues

1. **App not running**
   - Ensure `npm run dev` is running on port 3000
   - Check that the app is accessible at `http://localhost:3000`

2. **Login fails**
   - Verify test credentials (eu@eu.com / parolamea)
   - Check if the user exists in your Supabase database

3. **File upload fails**
   - Ensure the test Excel file exists at `tests/fixtures/test_menu.xlsx`
   - Regenerate it using the provided script if needed

4. **Column detection issues**
   - Check browser console for AI model loading errors
   - Verify that the hybrid detection is working correctly

5. **Supabase connection issues**
   - Verify environment variables are set correctly
   - Check Supabase project status and RLS policies

### Getting Help

If tests fail:

1. Run with `--headed` flag to see what's happening
2. Check the HTML report for detailed failure information
3. Look at screenshots and videos in `test-results/`
4. Check browser console for JavaScript errors
5. Verify that all prerequisites are met

## Test Environment

- **Base URL**: http://localhost:3000
- **Test User**: eu@eu.com / parolamea
- **Test Restaurant**: demo (slug)
- **Expected Products**: 5 items from test Excel file
- **Expected Categories**: Pizza, Salads, Appetizers, Desserts

## Continuous Integration

For CI/CD pipelines, use:

```bash
# Install browsers
npx playwright install

# Run tests in headless mode
npx playwright test --reporter=html
```

The tests are designed to be reliable and repeatable, making them suitable for automated testing in CI/CD environments.

import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('SmartMenu Full Workflow', () => {
  test('Complete menu upload and verification workflow', async ({ page }) => {
    console.log('🚀 Starting SmartMenu E2E test...');

    // Test data
    const testEmail = 'eu@eu.com';
    const testPassword = 'parolamea';
    const testMenuFile = path.join(__dirname, 'fixtures', 'test_menu.xlsx');
    
    // Expected data from our test file
    const expectedProducts = [
      { name: 'Margherita Pizza', category: 'Pizza', price: '12.99' },
      { name: 'Pepperoni Pizza', category: 'Pizza', price: '14.99' },
      { name: 'Caesar Salad', category: 'Salads', price: '8.99' },
      { name: 'Chicken Wings', category: 'Appetizers', price: '10.99' },
      { name: 'Chocolate Cake', category: 'Desserts', price: '6.99' }
    ];

    console.log('📋 Test data prepared:', { testEmail, testMenuFile });

    // Step 1: Navigate to the app and login
    console.log('🔐 Step 1: Login process...');
    await page.goto('/');
    
    // Wait for the page to load
    await page.waitForLoadState('networkidle');
    
    // Look for login button or form
    const loginButton = page.locator('button:has-text("Login"), a:has-text("Login"), [data-testid="login-button"]').first();
    if (await loginButton.isVisible()) {
      await loginButton.click();
    }

    // Fill login form
    await page.fill('input[type="email"], input[name="email"], #email', testEmail);
    await page.fill('input[type="password"], input[name="password"], #password', testPassword);
    
    // Submit login form
    await page.click('button[type="submit"], button:has-text("Login"), [data-testid="login-submit"]');
    
    // Wait for navigation to admin dashboard
    await page.waitForURL('**/admin**', { timeout: 10000 });
    console.log('✅ Login successful - redirected to admin dashboard');

    // Step 2: Navigate to Products page and verify it loads
    console.log('📦 Step 2: Navigate to Products page...');
    await page.goto('/admin/products');
    await page.waitForLoadState('networkidle');
    
    // Verify we're on the products page
    await expect(page.locator('h1:has-text("Product Management")')).toBeVisible();
    console.log('✅ Products page loaded successfully');

    // Step 3: Open bulk upload modal
    console.log('📤 Step 3: Opening bulk upload modal...');
    const bulkUploadButton = page.locator('button:has-text("Bulk Upload Menu")');
    await expect(bulkUploadButton).toBeVisible();
    await bulkUploadButton.click();
    
    // Wait for modal to appear
    await expect(page.locator('h2:has-text("Bulk Upload Menu")')).toBeVisible();
    console.log('✅ Bulk upload modal opened');

    // Step 4: Upload the test Excel file
    console.log('📁 Step 4: Uploading test Excel file...');
    
    // Find the file input and upload the file
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(testMenuFile);
    
    // Wait for file processing
    await page.waitForSelector('text=Column Detection Results', { timeout: 30000 });
    console.log('✅ File uploaded and processed');

    // Step 5: Verify column detection results
    console.log('🔍 Step 5: Verifying column detection...');
    
    // Check that the detection method is shown
    const detectionBadge = page.locator('span:has-text("Hybrid"), span:has-text("Fast Synonyms"), span:has-text("AI Semantic")');
    await expect(detectionBadge).toBeVisible();
    
    // Log the detection method
    const detectionText = await detectionBadge.textContent();
    console.log(`📊 Column detection method: ${detectionText}`);

    // Verify that the expected columns are detected
    await expect(page.locator('text=Product Name:')).toBeVisible();
    await expect(page.locator('text=Category:')).toBeVisible();
    await expect(page.locator('text=Description:')).toBeVisible();
    await expect(page.locator('text=Price:')).toBeVisible();
    
    console.log('✅ Column detection verified');

    // Step 6: Verify preview data
    console.log('👀 Step 6: Verifying preview data...');
    
    // Check that preview table shows our test data
    for (const product of expectedProducts.slice(0, 3)) { // Check first 3 products
      await expect(page.locator(`text=${product.name}`)).toBeVisible();
      await expect(page.locator(`text=${product.category}`)).toBeVisible();
      await expect(page.locator(`text=$${product.price}`)).toBeVisible();
    }
    
    console.log('✅ Preview data verified');

    // Step 7: Upload the menu data
    console.log('🚀 Step 7: Uploading menu data to Supabase...');
    
    const uploadButton = page.locator('button:has-text("Upload Menu")');
    await expect(uploadButton).toBeVisible();
    await uploadButton.click();
    
    // Wait for upload to complete
    await page.waitForSelector('text=Upload Results', { timeout: 60000 });
    
    // Verify upload success
    const successMessage = page.locator('text=Successfully uploaded');
    await expect(successMessage).toBeVisible();
    
    // Get the success count
    const successText = await successMessage.textContent();
    console.log(`✅ Upload completed: ${successText}`);
    
    // Verify that products are now in the list
    await page.waitForSelector('text=Products (5)', { timeout: 10000 });
    console.log('✅ Products list updated with uploaded data');

    // Step 8: Navigate to public menu page
    console.log('🌐 Step 8: Verifying public menu page...');
    await page.goto('/menu/demo');
    await page.waitForLoadState('networkidle');
    
    // Verify that all uploaded products are visible on the public menu
    for (const product of expectedProducts) {
      await expect(page.locator(`text=${product.name}`)).toBeVisible();
      await expect(page.locator(`text=$${product.price}`)).toBeVisible();
    }
    
    console.log('✅ Public menu page displays all uploaded products');

    // Step 9: Verify categories are displayed
    console.log('📂 Step 9: Verifying categories...');
    
    const expectedCategories = ['Pizza', 'Salads', 'Appetizers', 'Desserts'];
    for (const category of expectedCategories) {
      await expect(page.locator(`text=${category}`)).toBeVisible();
    }
    
    console.log('✅ Categories are displayed correctly');

    // Step 10: Final verification - check that ignored columns didn't cause issues
    console.log('🚫 Step 10: Verifying ignored columns...');
    
    // Navigate back to admin to check for any errors
    await page.goto('/admin/products');
    await page.waitForLoadState('networkidle');
    
    // Check that there are no error messages about ignored columns
    const errorMessages = page.locator('text=error, text=Error, text=ERROR').filter({ hasText: /id|sku|stock|barcode/i });
    await expect(errorMessages).toHaveCount(0);
    
    console.log('✅ Ignored columns handled correctly - no errors');

    console.log('🎉 All tests passed! SmartMenu workflow is working correctly.');
  });

  test('Verify login with invalid credentials fails', async ({ page }) => {
    console.log('🔒 Testing invalid login...');
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Look for login button
    const loginButton = page.locator('button:has-text("Login"), a:has-text("Login")').first();
    if (await loginButton.isVisible()) {
      await loginButton.click();
    }

    // Fill with invalid credentials
    await page.fill('input[type="email"], input[name="email"]', 'invalid@test.com');
    await page.fill('input[type="password"], input[name="password"]', 'wrongpassword');
    
    await page.click('button[type="submit"], button:has-text("Login")');
    
    // Should show error or stay on login page
    await expect(page.locator('text=Invalid, text=Error, text=Failed')).toBeVisible({ timeout: 5000 });
    
    console.log('✅ Invalid login correctly rejected');
  });

  test('Verify bulk upload with invalid file fails gracefully', async ({ page }) => {
    console.log('📁 Testing invalid file upload...');
    
    // Login first
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    const loginButton = page.locator('button:has-text("Login"), a:has-text("Login")').first();
    if (await loginButton.isVisible()) {
      await loginButton.click();
    }

    await page.fill('input[type="email"], input[name="email"]', 'eu@eu.com');
    await page.fill('input[type="password"], input[name="password"]', 'parolamea');
    await page.click('button[type="submit"], button:has-text("Login")');
    await page.waitForURL('**/admin**', { timeout: 10000 });

    // Navigate to products page
    await page.goto('/admin/products');
    await page.waitForLoadState('networkidle');

    // Open bulk upload modal
    const bulkUploadButton = page.locator('button:has-text("Bulk Upload Menu")');
    await bulkUploadButton.click();
    await expect(page.locator('h2:has-text("Bulk Upload Menu")')).toBeVisible();

    // Try to upload an invalid file (create a simple text file)
    const invalidFile = path.join(__dirname, 'fixtures', 'invalid.txt');
    const fs = require('fs');
    fs.writeFileSync(invalidFile, 'This is not an Excel file');
    
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(invalidFile);
    
    // Should show error message
    await expect(page.locator('text=error, text=Error, text=Please select a valid file')).toBeVisible({ timeout: 10000 });
    
    console.log('✅ Invalid file upload correctly rejected');
    
    // Clean up
    fs.unlinkSync(invalidFile);
  });
});

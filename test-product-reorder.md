# Product Reordering Test Plan

## Test Steps

### 1. Login to Admin Panel
- Navigate to `/admin/menu`
- Verify you can see the menu management page

### 2. Test Category Reordering (Should Work)
- Click "Reorder Categories" button
- Verify drag handles appear next to categories
- Try dragging a category up/down
- Verify the order changes and persists after refresh
- Try using the arrow buttons to reorder
- Click "Done Reordering" to exit reorder mode

### 3. Test Product Reordering (Should Now Work)
- Click on "View Items →" for any category with products
- Click "Reorder Products" button
- Verify drag handles appear next to products
- Try dragging a product up/down within the category
- Verify the order changes and persists after refresh
- Try using the arrow buttons to reorder
- Click "Done Reordering" to exit reorder mode

### 4. Test All Products View
- Go back to categories view
- Click "View Items →" for "All Products" (if available)
- Test reordering in the all products view

## Expected Behavior

### Category Reordering
- ✅ Drag handles appear when reordering is enabled
- ✅ Categories can be dragged up/down
- ✅ Arrow buttons work for reordering
- ✅ Order persists after page refresh
- ✅ Visual feedback during drag (opacity change, shadow)

### Product Reordering
- ✅ Drag handles appear when reordering is enabled
- ✅ Products can be dragged up/down within their category
- ✅ Arrow buttons work for reordering
- ✅ Order persists after page refresh
- ✅ Visual feedback during drag (opacity change, shadow)
- ✅ Products stay within their category when reordering

## Debug Information

### Console Logs to Check
- Look for "🔄 Starting product reorder" messages
- Look for "📊 Reorder indices" messages
- Look for "📤 Sending to API" messages
- Look for "✅ Product reordering successful!" messages

### API Endpoints to Verify
- `PUT /api/admin/products/reorder` - Should return 200 OK
- `PUT /api/admin/categories/reorder` - Should return 200 OK

### Database Changes
- Check that `sort_order` field is updated in the `products` table
- Check that `sort_order` field is updated in the `categories` table

## Common Issues and Solutions

### Issue: Drag handles don't appear
- **Solution**: Make sure "Reorder Products" button is clicked
- **Solution**: Check that `isReorderingProducts` state is true

### Issue: Drag doesn't work
- **Solution**: Verify @dnd-kit dependencies are installed
- **Solution**: Check browser console for JavaScript errors
- **Solution**: Ensure the component is wrapped in DndContext

### Issue: Order doesn't persist
- **Solution**: Check API response in browser network tab
- **Solution**: Verify database has sort_order field
- **Solution**: Check server logs for errors

### Issue: Products appear in wrong category
- **Solution**: Verify category_id is set correctly
- **Solution**: Check that products are filtered by selected category

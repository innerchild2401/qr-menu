const XLSX = require('exceljs');
const path = require('path');

async function generateTestMenu() {
  const workbook = new XLSX.Workbook();
  const worksheet = workbook.addWorksheet('Menu');

  // Define headers with some irrelevant columns to test AI detection
  const headers = [
    'ID',           // Should be ignored
    'Product Name', // Should be mapped to name
    'Category',     // Should be mapped to category
    'Description',  // Should be mapped to description
    'Price',        // Should be mapped to price
    'SKU',          // Should be ignored
    'Stock',        // Should be ignored
    'Barcode'       // Should be ignored
  ];

  // Sample menu data
  const menuData = [
    [1, 'Margherita Pizza', 'Pizza', 'Classic tomato sauce with mozzarella cheese', 12.99, 'PIZ001', 50, '123456789'],
    [2, 'Pepperoni Pizza', 'Pizza', 'Spicy pepperoni with melted cheese', 14.99, 'PIZ002', 45, '123456790'],
    [3, 'Caesar Salad', 'Salads', 'Fresh romaine lettuce with Caesar dressing', 8.99, 'SAL001', 30, '123456791'],
    [4, 'Chicken Wings', 'Appetizers', 'Crispy wings with your choice of sauce', 10.99, 'APP001', 40, '123456792'],
    [5, 'Chocolate Cake', 'Desserts', 'Rich chocolate cake with vanilla ice cream', 6.99, 'DES001', 25, '123456793']
  ];

  // Add headers
  worksheet.addRow(headers);

  // Add data rows
  menuData.forEach(row => {
    worksheet.addRow(row);
  });

  // Style the header row
  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE0E0E0' }
  };

  // Auto-fit columns
  worksheet.columns.forEach(column => {
    column.width = 15;
  });

  // Save the file
  const outputPath = path.join(__dirname, 'test_menu.xlsx');
  await workbook.xlsx.writeFile(outputPath);
  
  console.log(`✅ Test menu file generated: ${outputPath}`);
  console.log('📊 File contains:');
  console.log('  - Headers:', headers.join(', '));
  console.log('  - Data rows:', menuData.length);
  console.log('  - Expected mappings:');
  console.log('    • Product Name → name');
  console.log('    • Category → category');
  console.log('    • Description → description');
  console.log('    • Price → price');
  console.log('  - Expected ignored columns: ID, SKU, Stock, Barcode');
}

generateTestMenu().catch(console.error);

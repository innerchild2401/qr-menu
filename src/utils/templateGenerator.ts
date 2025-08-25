import * as XLSX from 'exceljs';

export async function generateMenuTemplate(): Promise<Blob> {
  const workbook = new XLSX.Workbook();
  const worksheet = workbook.addWorksheet('Menu Items');

  // Define headers
  const headers = [
    'Product Name',
    'Category', 
    'Description',
    'Price'
  ];

  // Add headers
  worksheet.addRow(headers);

  // Style the header row
  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE0E0E0' }
  };

  // Add sample data
  const sampleData = [
    ['Margherita Pizza', 'Pizza', 'Fresh mozzarella, tomato sauce, basil', '15.99'],
    ['Caesar Salad', 'Salads', 'Romaine lettuce, parmesan, croutons', '12.50'],
    ['Chicken Pasta', 'Main Course', 'Grilled chicken with creamy pasta', '18.75'],
    ['Tiramisu', 'Desserts', 'Classic Italian dessert', '8.99'],
    ['Coca Cola', 'Beverages', 'Refreshing soft drink', '3.50']
  ];

  sampleData.forEach(row => {
    worksheet.addRow(row);
  });

  // Auto-fit columns
  worksheet.columns.forEach(column => {
    column.width = 20;
  });

  // Generate the file
  const buffer = await workbook.xlsx.writeBuffer();
  return new Blob([buffer], { 
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
  });
}

export function downloadTemplate(blob: Blob, filename: string = 'menu-template.xlsx') {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export async function downloadMenuTemplate() {
  try {
    const blob = await generateMenuTemplate();
    downloadTemplate(blob);
  } catch (error) {
    console.error('Error generating template:', error);
    throw new Error('Failed to generate template file');
  }
}

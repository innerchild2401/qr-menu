import jsPDF from 'jspdf';
import { ClassifiedItem, organizeMenuItems, getCategoryDisplayName, getCategoryOrder } from '../ai/menuClassifier';

export interface RestaurantInfo {
  name: string;
  address?: string;
  phone?: string;
  website?: string;
  logo_url?: string;
}

export interface MenuGenerationOptions {
  restaurant: RestaurantInfo;
  items: ClassifiedItem[];
  includeDescriptions?: boolean;
  includeNutrition?: boolean;
  customOrder?: string[];
}

export class MenuPDFGenerator {
  private doc: jsPDF;
  private currentY: number = 0;
  private readonly pageWidth: number = 210; // A4 width in mm
  private readonly pageHeight: number = 297; // A4 height in mm
  private readonly margin: number = 20; // 20mm margins
  private readonly contentWidth: number = this.pageWidth - (this.margin * 2);
  private readonly headerHeight: number = 60; // 60mm header space

  constructor() {
    this.doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });
  }

  public generateMenu(options: MenuGenerationOptions): jsPDF {
    const { restaurant, items, includeDescriptions = true, includeNutrition = false, customOrder } = options;
    
    // Reset position
    this.currentY = this.margin;
    
    // Add header with restaurant info
    this.addHeader(restaurant);
    
    // Organize items by category
    const organizedItems = organizeMenuItems(items);
    
    // Use custom order or default order
    const categoryOrder = customOrder || getCategoryOrder();
    
    // Add menu content
    this.addMenuContent(organizedItems, categoryOrder, includeDescriptions, includeNutrition);
    
    // Add footer
    this.addFooter(restaurant);
    
    return this.doc;
  }

  private addHeader(restaurant: RestaurantInfo): void {
    const centerX = this.pageWidth / 2;
    
    // Restaurant name (24pt, bold, centered)
    this.doc.setFontSize(24);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text(restaurant.name, centerX, this.currentY + 15, { align: 'center' });
    
    // Address (if available)
    if (restaurant.address) {
      this.doc.setFontSize(12);
      this.doc.setFont('helvetica', 'normal');
      this.doc.text(restaurant.address, centerX, this.currentY + 25, { align: 'center' });
    }
    
    // Contact info (if available)
    if (restaurant.phone || restaurant.website) {
      this.doc.setFontSize(10);
      const contactInfo = [];
      if (restaurant.phone) contactInfo.push(restaurant.phone);
      if (restaurant.website) contactInfo.push(restaurant.website);
      
      this.doc.text(contactInfo.join(' • '), centerX, this.currentY + 35, { align: 'center' });
    }
    
    // Move to content area
    this.currentY = this.margin + this.headerHeight;
  }

  private addMenuContent(
    organizedItems: Record<string, ClassifiedItem[]>, 
    categoryOrder: string[],
    includeDescriptions: boolean,
    includeNutrition: boolean
  ): void {
    for (const category of categoryOrder) {
      const items = organizedItems[category];
      if (!items || items.length === 0) continue;
      
      // Check if we need a new page
      if (this.currentY > this.pageHeight - 50) {
        this.doc.addPage();
        this.currentY = this.margin;
      }
      
      // Add category header
      this.addCategoryHeader(category);
      
      // Add items in this category
      for (const item of items) {
        this.addMenuItem(item, includeDescriptions, includeNutrition);
      }
      
      // Add spacing after category
      this.currentY += 8;
    }
  }

  private addCategoryHeader(category: string): void {
    const displayName = getCategoryDisplayName(category);
    
    // Add separator line
    this.doc.setDrawColor(0);
    this.doc.setLineWidth(0.5);
    this.doc.line(this.margin, this.currentY, this.pageWidth - this.margin, this.currentY);
    
    // Category name (16pt, bold, uppercase, centered)
    this.doc.setFontSize(16);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text(displayName.toUpperCase(), this.pageWidth / 2, this.currentY + 8, { align: 'center' });
    
    // Bottom separator line
    this.doc.line(this.margin, this.currentY + 12, this.pageWidth - this.margin, this.currentY + 12);
    
    this.currentY += 20;
  }

  private addMenuItem(item: ClassifiedItem, includeDescriptions: boolean, includeNutrition: boolean): void {
    // Check if we need a new page
    if (this.currentY > this.pageHeight - 40) {
      this.doc.addPage();
      this.currentY = this.margin;
    }
    
    const itemName = item.name;
    const price = `$${item.price.toFixed(2)}`;
    const description = item.description;
    
    // Calculate text positions
    const priceX = this.pageWidth - this.margin - 15; // 15mm from right margin
    const nameX = this.margin;
    const maxNameWidth = priceX - nameX - 10; // Leave 10mm gap between name and price
    
    // Item name (12pt, regular)
    this.doc.setFontSize(12);
    this.doc.setFont('helvetica', 'normal');
    
    // Handle long item names
    if (this.doc.getTextWidth(itemName) > maxNameWidth) {
      const words = itemName.split(' ');
      let currentLine = '';
      let yOffset = 0;
      
      for (const word of words) {
        const testLine = currentLine + (currentLine ? ' ' : '') + word;
        if (this.doc.getTextWidth(testLine) > maxNameWidth) {
          if (currentLine) {
            this.doc.text(currentLine, nameX, this.currentY + yOffset);
            currentLine = word;
            yOffset += 5;
          } else {
            // Single word is too long, truncate
            this.doc.text(word.substring(0, 20) + '...', nameX, this.currentY + yOffset);
            yOffset += 5;
          }
        } else {
          currentLine = testLine;
        }
      }
      
      if (currentLine) {
        this.doc.text(currentLine, nameX, this.currentY + yOffset);
      }
      
      // Price aligned with the last line of the name
      this.doc.setFont('helvetica', 'bold');
      this.doc.text(price, priceX, this.currentY + yOffset, { align: 'right' });
      
      this.currentY += yOffset + 8;
    } else {
      // Single line item name
      this.doc.text(itemName, nameX, this.currentY);
      
      // Price (12pt, bold, right-aligned)
      this.doc.setFont('helvetica', 'bold');
      this.doc.text(price, priceX, this.currentY, { align: 'right' });
      
      this.currentY += 8;
    }
    
    // Description (if enabled and available)
    if (includeDescriptions && description) {
      this.doc.setFontSize(10);
      this.doc.setFont('helvetica', 'italic');
      
      // Handle long descriptions
      if (this.doc.getTextWidth(description) > this.contentWidth) {
        const words = description.split(' ');
        let currentLine = '';
        let yOffset = 0;
        
        for (const word of words) {
          const testLine = currentLine + (currentLine ? ' ' : '') + word;
          if (this.doc.getTextWidth(testLine) > this.contentWidth) {
            if (currentLine) {
              this.doc.text(currentLine, nameX, this.currentY + yOffset);
              currentLine = word;
              yOffset += 4;
            } else {
              // Single word is too long, truncate
              this.doc.text(word.substring(0, 30) + '...', nameX, this.currentY + yOffset);
              yOffset += 4;
            }
          } else {
            currentLine = testLine;
          }
        }
        
        if (currentLine) {
          this.doc.text(currentLine, nameX, this.currentY + yOffset);
        }
        
        this.currentY += yOffset + 4;
      } else {
        this.doc.text(description, nameX, this.currentY);
        this.currentY += 4;
      }
    }
    
    // Nutrition info (if enabled and available)
    if (includeNutrition && item.nutrition) {
      this.doc.setFontSize(8);
      this.doc.setFont('helvetica', 'normal');
      
      const nutritionText = this.formatNutritionInfo(item.nutrition);
      if (nutritionText) {
        this.doc.text(nutritionText, nameX, this.currentY);
        this.currentY += 4;
      }
    }
    
    // Add spacing between items
    this.currentY += 4;
  }

  private formatNutritionInfo(nutrition: Record<string, unknown>): string {
    const parts = [];
    
    if (nutrition.calories) {
      parts.push(`${nutrition.calories} cal`);
    }
    if (nutrition.protein) {
      parts.push(`${nutrition.protein} protein`);
    }
    if (nutrition.carbs) {
      parts.push(`${nutrition.carbs} carbs`);
    }
    if (nutrition.fat) {
      parts.push(`${nutrition.fat} fat`);
    }
    
    return parts.length > 0 ? `(${parts.join(', ')})` : '';
  }

  private addFooter(restaurant: RestaurantInfo): void {
    const footerY = this.pageHeight - 15;
    
    this.doc.setFontSize(9);
    this.doc.setFont('helvetica', 'normal');
    
    const footerText = `Generated on ${new Date().toLocaleDateString()} • ${restaurant.name}`;
    this.doc.text(footerText, this.pageWidth / 2, footerY, { align: 'center' });
  }

  public download(filename?: string): void {
    const defaultFilename = `menu_${new Date().toISOString().split('T')[0]}.pdf`;
    this.doc.save(filename || defaultFilename);
  }

  public getDataURL(): string {
    return this.doc.output('datauristring');
  }
}

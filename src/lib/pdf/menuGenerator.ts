import jsPDF from 'jspdf';
import { ClassifiedItem, organizeMenuItems, getCategoryDisplayName, getCategoryOrder } from '../ai/menuClassifier';

export interface RestaurantInfo {
  name: string;
  address?: string;
  phone?: string;
  website?: string;
  logo_url?: string;
  primary_color?: string;
  secondary_color?: string;
}

export interface MenuTheme {
  id: string;
  name: string;
  titleFont: string;
  bodyFont: string;
  accentFont: string;
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  separatorStyle: 'minimal' | 'elegant' | 'decorative' | 'geometric';
  iconStyle: 'minimal' | 'detailed' | 'outlined' | 'filled';
}

export interface MenuGenerationOptions {
  restaurant: RestaurantInfo;
  items: ClassifiedItem[];
  theme: MenuTheme;
  includeDescriptions?: boolean;
  includeNutrition?: boolean;
  includeImages?: boolean;
  customOrder?: string[];
}

export class ProfessionalMenuPDFGenerator {
  private doc: jsPDF;
  private currentY: number = 0;
  private readonly pageWidth: number = 210; // A4 width in mm
  private readonly pageHeight: number = 297; // A4 height in mm
  private readonly margin: number = 20; // 20mm margins
  private readonly contentWidth: number = this.pageWidth - (this.margin * 2);
  private readonly headerHeight: number = 60; // 60mm header space
  private theme: MenuTheme;

  // Category icons (Unicode emojis for simplicity)
  private readonly categoryIcons = {
    starters: '🥗',
    main_courses: '🍽️',
    desserts: '🍰',
    soft_drinks: '🥤',
    hot_beverages: '☕',
    cocktails: '🍸',
    spirits: '🥃',
    wines: '🍷',
    beers: '🍺',
    others: '📋'
  };

  constructor(theme: MenuTheme) {
    this.theme = theme;
    this.doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });
  }

  public generateMenu(options: MenuGenerationOptions): jsPDF {
    const { restaurant, items, includeDescriptions = true, includeNutrition = false, includeImages = false, customOrder } = options;
    
    // Reset position
    this.currentY = this.margin;
    
    // Add header with restaurant info
    this.addHeader(restaurant);
    
    // Organize items by category
    const organizedItems = organizeMenuItems(items);
    
    // Use custom order or default order
    const categoryOrder = customOrder || getCategoryOrder();
    
    // Add menu content
    this.addMenuContent(organizedItems, categoryOrder, includeDescriptions, includeNutrition, includeImages);
    
    // Add footer
    this.addFooter(restaurant);
    
    return this.doc;
  }

  private addHeader(restaurant: RestaurantInfo): void {
    const centerX = this.pageWidth / 2;
    
    // Set theme colors
    this.doc.setTextColor(this.hexToRgb(this.theme.primaryColor));
    
    // Restaurant name with theme typography
    this.doc.setFontSize(26);
    this.doc.setFont(this.theme.titleFont, 'bold');
    this.doc.text(restaurant.name, centerX, this.currentY + 15, { align: 'center' });
    
    // Reset text color for other elements
    this.doc.setTextColor(0, 0, 0);
    
    // Address (if available)
    if (restaurant.address) {
      this.doc.setFontSize(12);
      this.doc.setFont(this.theme.bodyFont, 'normal');
      this.doc.text(restaurant.address, centerX, this.currentY + 25, { align: 'center' });
    }
    
    // Contact info (if available)
    if (restaurant.phone || restaurant.website) {
      this.doc.setFontSize(10);
      this.doc.setFont(this.theme.bodyFont, 'normal');
      const contactInfo = [];
      if (restaurant.phone) contactInfo.push(restaurant.phone);
      if (restaurant.website) contactInfo.push(restaurant.website);
      
      this.doc.text(contactInfo.join(' • '), centerX, this.currentY + 35, { align: 'center' });
    }
    
    // Add elegant separator
    this.addSeparator(this.currentY + 45);
    
    // Move to content area
    this.currentY = this.margin + this.headerHeight;
  }

  private addMenuContent(
    organizedItems: Record<string, ClassifiedItem[]>, 
    categoryOrder: string[],
    includeDescriptions: boolean,
    includeNutrition: boolean,
    includeImages: boolean
  ): void {
    for (const category of categoryOrder) {
      const items = organizedItems[category];
      if (!items || items.length === 0) continue;
      
      // Check if we need a new page
      if (this.currentY > this.pageHeight - 80) {
        this.doc.addPage();
        this.currentY = this.margin;
      }
      
      // Add category header
      this.addCategoryHeader(category);
      
      // Add items in this category
      for (const item of items) {
        this.addMenuItem(item, includeDescriptions, includeNutrition, includeImages);
      }
      
      // Add spacing after category
      this.currentY += 12;
    }
  }

  private addCategoryHeader(category: string): void {
    const displayName = getCategoryDisplayName(category);
    const icon = this.categoryIcons[category as keyof typeof this.categoryIcons] || '📋';
    
    // Set theme colors for category header
    this.doc.setTextColor(this.hexToRgb(this.theme.primaryColor));
    
    // Add category separator based on theme
    this.addCategorySeparator();
    
    // Category name with icon
    this.doc.setFontSize(18);
    this.doc.setFont(this.theme.accentFont, 'bold');
    const categoryText = `${icon} ${displayName.toUpperCase()}`;
    this.doc.text(categoryText, this.pageWidth / 2, this.currentY + 8, { align: 'center' });
    
    // Reset text color
    this.doc.setTextColor(0, 0, 0);
    
    this.currentY += 16;
  }

  private addCategorySeparator(): void {
    const y = this.currentY;
    const lineWidth = this.contentWidth;
    const centerX = this.pageWidth / 2;
    
    this.doc.setDrawColor(this.hexToRgb(this.theme.primaryColor));
    
    switch (this.theme.separatorStyle) {
      case 'minimal':
        this.doc.setLineWidth(0.5);
        this.doc.line(this.margin, y, this.pageWidth - this.margin, y);
        break;
      case 'elegant':
        this.doc.setLineWidth(1);
        this.doc.line(this.margin, y, centerX - 20, y);
        this.doc.line(centerX + 20, y, this.pageWidth - this.margin, y);
        break;
      case 'decorative':
        this.doc.setLineWidth(0.5);
        this.doc.line(this.margin, y, this.pageWidth - this.margin, y);
        this.doc.line(this.margin, y + 2, this.pageWidth - this.margin, y + 2);
        break;
      case 'geometric':
        this.doc.setLineWidth(0.5);
        for (let i = 0; i < 5; i++) {
          const x = this.margin + (i * (this.contentWidth / 4));
          this.doc.line(x, y, x + 10, y);
        }
        break;
    }
  }

  private addMenuItem(item: ClassifiedItem, includeDescriptions: boolean, includeNutrition: boolean, includeImages: boolean): void {
    // Check if we need a new page
    if (this.currentY > this.pageHeight - 50) {
      this.doc.addPage();
      this.currentY = this.margin;
    }
    
    const itemName = item.name;
    const price = `$${item.price.toFixed(2)}`;
    const description = item.description;
    
    // Calculate text positions
    const priceX = this.pageWidth - this.margin - 15; // 15mm from right margin
    const nameX = this.margin;
    const maxNameWidth = priceX - nameX - 20; // Leave 20mm gap for dotted leaders
    
    // Item name with theme typography
    this.doc.setFontSize(14);
    this.doc.setFont(this.theme.bodyFont, 'normal');
    
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
            yOffset += 6;
          } else {
            // Single word is too long, truncate
            this.doc.text(word.substring(0, 25) + '...', nameX, this.currentY + yOffset);
            yOffset += 6;
          }
        } else {
          currentLine = testLine;
        }
      }
      
      if (currentLine) {
        this.doc.text(currentLine, nameX, this.currentY + yOffset);
      }
      
      // Add dotted leaders
      this.addDottedLeaders(nameX + this.doc.getTextWidth(currentLine), this.currentY + yOffset, priceX);
      
      // Price aligned with the last line of the name
      this.doc.setFont(this.theme.bodyFont, 'bold');
      this.doc.text(price, priceX, this.currentY + yOffset, { align: 'right' });
      
      this.currentY += yOffset + 8;
    } else {
      // Single line item name
      this.doc.text(itemName, nameX, this.currentY);
      
      // Add dotted leaders
      this.addDottedLeaders(nameX + this.doc.getTextWidth(itemName), this.currentY, priceX);
      
      // Price (bold, right-aligned)
      this.doc.setFont(this.theme.bodyFont, 'bold');
      this.doc.text(price, priceX, this.currentY, { align: 'right' });
      
      this.currentY += 8;
    }
    
    // Description (if enabled and available)
    if (includeDescriptions && description) {
      this.doc.setFontSize(11);
      this.doc.setFont(this.theme.bodyFont, 'italic');
      
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
              yOffset += 5;
            } else {
              // Single word is too long, truncate
              this.doc.text(word.substring(0, 35) + '...', nameX, this.currentY + yOffset);
              yOffset += 5;
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
      this.doc.setFontSize(9);
      this.doc.setFont(this.theme.bodyFont, 'normal');
      
      const nutritionText = this.formatNutritionInfo(item.nutrition);
      if (nutritionText) {
        this.doc.text(nutritionText, nameX, this.currentY);
        this.currentY += 4;
      }
    }
    
    // Add spacing between items
    this.currentY += 6;
  }

  private addDottedLeaders(startX: number, y: number, endX: number): void {
    const dotSpacing = 2;
    const dotSize = 0.5;
    
    this.doc.setDrawColor(100, 100, 100);
    this.doc.setLineWidth(dotSize);
    
    for (let x = startX + 5; x < endX - 15; x += dotSpacing) {
      this.doc.line(x, y, x, y);
    }
  }

  private addSeparator(y: number): void {
    this.doc.setDrawColor(this.hexToRgb(this.theme.secondaryColor));
    this.doc.setLineWidth(0.5);
    this.doc.line(this.margin, y, this.pageWidth - this.margin, y);
  }

  private formatNutritionInfo(nutrition: Record<string, unknown>): string {
    const parts = [];
    
    if (nutrition.calories) {
      parts.push(`${nutrition.calories} cal`);
    }
    if (nutrition.protein) {
      parts.push(`${nutrition.protein}g protein`);
    }
    if (nutrition.carbs) {
      parts.push(`${nutrition.carbs}g carbs`);
    }
    if (nutrition.fat) {
      parts.push(`${nutrition.fat}g fat`);
    }
    
    return parts.length > 0 ? `(${parts.join(', ')})` : '';
  }

  private addFooter(restaurant: RestaurantInfo): void {
    const footerY = this.pageHeight - 15;
    
    this.doc.setFontSize(9);
    this.doc.setFont(this.theme.bodyFont, 'normal');
    this.doc.setTextColor(100, 100, 100);
    
    const footerText = `Generated on ${new Date().toLocaleDateString()} • ${restaurant.name}`;
    this.doc.text(footerText, this.pageWidth / 2, footerY, { align: 'center' });
  }

  private hexToRgb(hex: string): [number, number, number] {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? [
      parseInt(result[1], 16),
      parseInt(result[2], 16),
      parseInt(result[3], 16)
    ] : [0, 0, 0];
  }

  public download(filename?: string): void {
    const defaultFilename = `menu_${new Date().toISOString().split('T')[0]}.pdf`;
    this.doc.save(filename || defaultFilename);
  }

  public getDataURL(): string {
    return this.doc.output('datauristring');
  }
}

// Predefined themes
export const MENU_THEMES: MenuTheme[] = [
  {
    id: 'minimal',
    name: 'Minimal',
    titleFont: 'helvetica',
    bodyFont: 'helvetica',
    accentFont: 'helvetica',
    primaryColor: '#2c3e50',
    secondaryColor: '#95a5a6',
    backgroundColor: '#ffffff',
    separatorStyle: 'minimal',
    iconStyle: 'minimal'
  },
  {
    id: 'rustic',
    name: 'Rustic',
    titleFont: 'times',
    bodyFont: 'helvetica',
    accentFont: 'helvetica',
    primaryColor: '#8b4513',
    secondaryColor: '#d2691e',
    backgroundColor: '#faf8f5',
    separatorStyle: 'decorative',
    iconStyle: 'detailed'
  },
  {
    id: 'luxury',
    name: 'Luxury',
    titleFont: 'times',
    bodyFont: 'helvetica',
    accentFont: 'helvetica',
    primaryColor: '#1a1a1a',
    secondaryColor: '#d4af37',
    backgroundColor: '#ffffff',
    separatorStyle: 'elegant',
    iconStyle: 'outlined'
  },
  {
    id: 'modern',
    name: 'Modern',
    titleFont: 'helvetica',
    bodyFont: 'helvetica',
    accentFont: 'helvetica',
    primaryColor: '#3498db',
    secondaryColor: '#2c3e50',
    backgroundColor: '#ffffff',
    separatorStyle: 'geometric',
    iconStyle: 'filled'
  }
];

// AI theme selection function
export function selectThemeForRestaurant(restaurant: RestaurantInfo): MenuTheme {
  const name = restaurant.name.toLowerCase();
  const address = restaurant.address?.toLowerCase() || '';
  
  // Analyze restaurant characteristics
  const isFineDining = name.includes('restaurant') || name.includes('bistro') || name.includes('grill');
  const isCasual = name.includes('cafe') || name.includes('bar') || name.includes('pub');
  const isItalian = name.includes('italian') || name.includes('pizza') || name.includes('pasta');
  const isAsian = name.includes('asian') || name.includes('chinese') || name.includes('japanese') || name.includes('thai');
  const isLuxury = name.includes('luxury') || name.includes('premium') || name.includes('exclusive');
  
  // Theme selection logic
  if (isLuxury || isFineDining) {
    return MENU_THEMES.find(t => t.id === 'luxury') || MENU_THEMES[0];
  } else if (isItalian) {
    return MENU_THEMES.find(t => t.id === 'rustic') || MENU_THEMES[0];
  } else if (isAsian) {
    return MENU_THEMES.find(t => t.id === 'minimal') || MENU_THEMES[0];
  } else if (isCasual) {
    return MENU_THEMES.find(t => t.id === 'modern') || MENU_THEMES[0];
  }
  
  // Default to modern theme
  return MENU_THEMES.find(t => t.id === 'modern') || MENU_THEMES[0];
}

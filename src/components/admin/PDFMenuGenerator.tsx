'use client';

import { useState, useEffect } from 'react';
import { ProfessionalMenuPDFGenerator, RestaurantInfo, MenuTheme, MENU_THEMES, selectThemeForRestaurant } from '../../lib/pdf/menuGenerator';
import { ClassifiedItem, organizeMenuItems, getCategoryDisplayName, getCategoryOrder } from '../../lib/ai/menuClassifier';
import { authenticatedApiCall } from '../../../lib/api-helpers';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { typography, spacing } from '@/lib/design-system';

interface PDFMenuGeneratorProps {
  showSuccess: (message: string) => void;
  showError: (message: string) => void;
}

interface MenuItem {
  id: string;
  name: string;
  description?: string;
  price: number;
  category_id?: string;
  nutrition?: Record<string, unknown>;
  image_url?: string;
}

interface Restaurant {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  website?: string;
  logo_url?: string;
  primary_color?: string;
  secondary_color?: string;
}

export default function PDFMenuGenerator({ showSuccess, showError }: PDFMenuGeneratorProps) {
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [organizedItems, setOrganizedItems] = useState<Record<string, ClassifiedItem[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  
  // PDF options
  const [includeDescriptions, setIncludeDescriptions] = useState(true);
  const [includeNutrition, setIncludeNutrition] = useState(false);
  const [includeImages, setIncludeImages] = useState(false);
  const [customOrder, setCustomOrder] = useState<string[]>([]);
  
  // Theme selection
  const [selectedTheme, setSelectedTheme] = useState<MenuTheme | null>(null);
  const [aiSuggestedThemes, setAiSuggestedThemes] = useState<MenuTheme[]>([]);
  
  // Category reordering
  const [categoryOrder, setCategoryOrder] = useState<string[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      
      // Load restaurant info
      const restaurantResponse = await authenticatedApiCall('/api/admin/me/restaurant');
      if (restaurantResponse.ok) {
        const restaurantData = await restaurantResponse.json();
        setRestaurant(restaurantData.restaurant);
        
        // Generate AI-suggested themes
        const restaurantInfo: RestaurantInfo = {
          name: restaurantData.restaurant.name,
          address: restaurantData.restaurant.address,
          phone: restaurantData.restaurant.phone,
          website: restaurantData.restaurant.website,
          logo_url: restaurantData.restaurant.logo_url,
          primary_color: restaurantData.restaurant.primary_color,
          secondary_color: restaurantData.restaurant.secondary_color
        };
        
        const suggestedTheme = selectThemeForRestaurant(restaurantInfo);
        setSelectedTheme(suggestedTheme);
        
        // Generate 3-4 theme suggestions
        const suggestions = generateThemeSuggestions(restaurantInfo);
        setAiSuggestedThemes(suggestions);
      }
      
      // Load menu items
      const itemsResponse = await authenticatedApiCall('/api/admin/products');
      if (itemsResponse.ok) {
        const itemsData = await itemsResponse.json();
        setMenuItems(itemsData.products || []);
        
        // Organize items by AI classification
        const organized = organizeMenuItems(itemsData.products || []);
        setOrganizedItems(organized);
        setCategoryOrder(getCategoryOrder());
      }
    } catch (error) {
      console.error('Error loading data:', error);
      showError('Failed to load menu data');
    } finally {
      setIsLoading(false);
    }
  };

  const generateThemeSuggestions = (restaurant: RestaurantInfo): MenuTheme[] => {
    const suggestions = [];
    
    // Always include the AI-selected theme
    const aiTheme = selectThemeForRestaurant(restaurant);
    suggestions.push(aiTheme);
    
    // Add 2-3 additional themes based on restaurant characteristics
    const name = restaurant.name.toLowerCase();
    const isFineDining = name.includes('restaurant') || name.includes('bistro');
    const isCasual = name.includes('cafe') || name.includes('bar');
    const isItalian = name.includes('italian') || name.includes('pizza');
    const isAsian = name.includes('asian') || name.includes('chinese');
    
    if (isFineDining && aiTheme.id !== 'luxury') {
      suggestions.push(MENU_THEMES.find(t => t.id === 'luxury')!);
    }
    if (isItalian && aiTheme.id !== 'rustic') {
      suggestions.push(MENU_THEMES.find(t => t.id === 'rustic')!);
    }
    if (isAsian && aiTheme.id !== 'minimal') {
      suggestions.push(MENU_THEMES.find(t => t.id === 'minimal')!);
    }
    if (isCasual && aiTheme.id !== 'modern') {
      suggestions.push(MENU_THEMES.find(t => t.id === 'modern')!);
    }
    
    // Fill remaining slots with other themes
    const usedIds = suggestions.map(t => t.id);
    const remainingThemes = MENU_THEMES.filter(t => !usedIds.includes(t.id));
    
    while (suggestions.length < 4 && remainingThemes.length > 0) {
      suggestions.push(remainingThemes.shift()!);
    }
    
    return suggestions;
  };

  const generatePreview = async () => {
    if (!restaurant || menuItems.length === 0 || !selectedTheme) {
      showError('No restaurant, menu items, or theme available');
      return;
    }

    try {
      setIsGenerating(true);
      
      const generator = new ProfessionalMenuPDFGenerator(selectedTheme);
      const restaurantInfo: RestaurantInfo = {
        name: restaurant.name,
        address: restaurant.address,
        phone: restaurant.phone,
        website: restaurant.website,
        logo_url: restaurant.logo_url,
        primary_color: restaurant.primary_color,
        secondary_color: restaurant.secondary_color
      };
      
      const options = {
        restaurant: restaurantInfo,
        items: menuItems as ClassifiedItem[],
        theme: selectedTheme,
        includeDescriptions,
        includeNutrition,
        includeImages,
        customOrder: customOrder.length > 0 ? customOrder : undefined
      };
      
      generator.generateMenu(options);
      const dataUrl = generator.getDataURL();
      setPreviewUrl(dataUrl);
      
      showSuccess('Professional menu preview generated successfully');
    } catch (error) {
      console.error('Error generating preview:', error);
      showError('Failed to generate menu preview');
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadPDF = async () => {
    if (!restaurant || menuItems.length === 0 || !selectedTheme) {
      showError('No restaurant, menu items, or theme available');
      return;
    }

    try {
      setIsGenerating(true);
      
      const generator = new ProfessionalMenuPDFGenerator(selectedTheme);
      const restaurantInfo: RestaurantInfo = {
        name: restaurant.name,
        address: restaurant.address,
        phone: restaurant.phone,
        website: restaurant.website,
        logo_url: restaurant.logo_url,
        primary_color: restaurant.primary_color,
        secondary_color: restaurant.secondary_color
      };
      
      const options = {
        restaurant: restaurantInfo,
        items: menuItems as ClassifiedItem[],
        theme: selectedTheme,
        includeDescriptions,
        includeNutrition,
        includeImages,
        customOrder: customOrder.length > 0 ? customOrder : undefined
      };
      
      generator.generateMenu(options);
      const filename = `${restaurant.name.replace(/[^a-zA-Z0-9]/g, '_')}_menu_${new Date().toISOString().split('T')[0]}.pdf`;
      generator.download(filename);
      
      showSuccess('Professional PDF menu downloaded successfully');
    } catch (error) {
      console.error('Error downloading PDF:', error);
      showError('Failed to download PDF menu');
    } finally {
      setIsGenerating(false);
    }
  };

  const moveCategory = (fromIndex: number, toIndex: number) => {
    const newOrder = [...categoryOrder];
    const [movedCategory] = newOrder.splice(fromIndex, 1);
    newOrder.splice(toIndex, 0, movedCategory);
    setCategoryOrder(newOrder);
    setCustomOrder(newOrder);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className={`${typography.h3} mb-2`}>Professional AI PDF Menu Generator</h2>
        <p className={typography.bodySmall}>
          Generate stunning, print-ready PDF menus with AI-powered themes and professional design
        </p>
      </div>

      {/* AI Theme Selection */}
      <Card className={spacing.md}>
        <h3 className={`${typography.h4} mb-4`}>AI Theme Selection</h3>
        <p className={`${typography.bodySmall} mb-4`}>
          Choose from AI-suggested themes based on your restaurant's style and cuisine
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {aiSuggestedThemes.map((theme) => (
            <div
              key={theme.id}
              className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                selectedTheme?.id === theme.id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => setSelectedTheme(theme)}
            >
              <div className="text-center">
                <div className="text-2xl mb-2">{getThemeIcon(theme.id)}</div>
                <div className="font-medium text-sm">{theme.name}</div>
                <div className="text-xs text-gray-500 mt-1">
                  {getThemeDescription(theme.id)}
                </div>
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-4">
          <Label className="text-sm font-medium">Or choose a custom theme:</Label>
          <Select value={selectedTheme?.id} onValueChange={(value: string) => {
            const theme = MENU_THEMES.find(t => t.id === value);
            if (theme) setSelectedTheme(theme);
          }}>
            <SelectTrigger className="mt-2">
              <SelectValue placeholder="Select theme" />
            </SelectTrigger>
            <SelectContent>
              {MENU_THEMES.map((theme) => (
                <SelectItem key={theme.id} value={theme.id}>
                  {theme.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Options Card */}
      <Card className={spacing.md}>
        <h3 className={`${typography.h4} mb-4`}>Menu Options</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="descriptions" className="text-sm font-medium">
                Include Descriptions
              </Label>
              <Switch
                id="descriptions"
                checked={includeDescriptions}
                onCheckedChange={setIncludeDescriptions}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="nutrition" className="text-sm font-medium">
                Include Nutrition Info
              </Label>
              <Switch
                id="nutrition"
                checked={includeNutrition}
                onCheckedChange={setIncludeNutrition}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="images" className="text-sm font-medium">
                Include Item Images
              </Label>
              <Switch
                id="images"
                checked={includeImages}
                onCheckedChange={setIncludeImages}
              />
            </div>
          </div>
          
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium">Menu Items</Label>
              <p className="text-sm text-gray-600 mt-1">
                {menuItems.length} items available
              </p>
            </div>
            
            <div>
              <Label className="text-sm font-medium">Categories</Label>
              <p className="text-sm text-gray-600 mt-1">
                {Object.keys(organizedItems).length} categories detected
              </p>
            </div>
            
            <div>
              <Label className="text-sm font-medium">Selected Theme</Label>
              <p className="text-sm text-gray-600 mt-1">
                {selectedTheme?.name} - {getThemeDescription(selectedTheme?.id || '')}
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Category Reordering */}
      <Card className={spacing.md}>
        <h3 className={`${typography.h4} mb-4`}>Category Order</h3>
        <p className={`${typography.bodySmall} mb-4`}>
          Reorder categories to customize your menu layout
        </p>
        
        <div className="space-y-2">
          {categoryOrder.map((category, index) => {
            const items = organizedItems[category] || [];
            if (items.length === 0) return null;
            
            return (
              <div
                key={category}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center space-x-3">
                  <div className="text-lg">{getCategoryIcon(category)}</div>
                  <div>
                    <div className="text-sm font-medium">
                      {getCategoryDisplayName(category)}
                    </div>
                    <div className="text-xs text-gray-500">
                      {items.length} item{items.length !== 1 ? 's' : ''}
                    </div>
                  </div>
                </div>
                
                <div className="flex space-x-2">
                  {index > 0 && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => moveCategory(index, index - 1)}
                    >
                      ↑
                    </Button>
                  )}
                  {index < categoryOrder.length - 1 && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => moveCategory(index, index + 1)}
                    >
                      ↓
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Actions */}
      <Card className={spacing.md}>
        <h3 className={`${typography.h4} mb-4`}>Generate Professional Menu</h3>
        
        <div className="flex space-x-4">
          <Button
            onClick={generatePreview}
            disabled={isGenerating || menuItems.length === 0 || !selectedTheme}
            className="flex items-center"
          >
            {isGenerating ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Generating...
              </>
            ) : (
              'Generate Preview'
            )}
          </Button>
          
          <Button
            onClick={downloadPDF}
            disabled={isGenerating || menuItems.length === 0 || !selectedTheme}
            variant="outline"
            className="flex items-center"
          >
            {isGenerating ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                Generating...
              </>
            ) : (
              'Download PDF'
            )}
          </Button>
        </div>
      </Card>

      {/* Preview */}
      {previewUrl && (
        <Card className={spacing.md}>
          <h3 className={`${typography.h4} mb-4`}>Menu Preview</h3>
          <div className="border rounded-lg overflow-hidden">
            <iframe
              src={previewUrl}
              className="w-full h-96"
              title="Menu Preview"
            />
          </div>
        </Card>
      )}

      {/* Menu Statistics */}
      <Card className={spacing.md}>
        <h3 className={`${typography.h4} mb-4`}>Menu Statistics</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Object.entries(organizedItems).map(([category, items]) => (
            <div key={category} className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl mb-2">{getCategoryIcon(category)}</div>
              <div className="text-lg font-semibold">{items.length}</div>
              <div className="text-sm text-gray-600">
                {getCategoryDisplayName(category)}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

// Helper functions
function getThemeIcon(themeId: string): string {
  const icons = {
    minimal: '⚪',
    rustic: '🌿',
    luxury: '👑',
    modern: '⚡'
  };
  return icons[themeId as keyof typeof icons] || '📋';
}

function getThemeDescription(themeId: string): string {
  const descriptions = {
    minimal: 'Clean & Simple',
    rustic: 'Warm & Organic',
    luxury: 'Elegant & Premium',
    modern: 'Contemporary & Bold'
  };
  return descriptions[themeId as keyof typeof descriptions] || 'Professional';
}

function getCategoryIcon(category: string): string {
  const icons = {
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
  return icons[category as keyof typeof icons] || '📋';
}

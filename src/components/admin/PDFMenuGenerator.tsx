'use client';

import { useState, useEffect } from 'react';
import { MenuPDFGenerator, RestaurantInfo } from '../../lib/pdf/menuGenerator';
import { ClassifiedItem, organizeMenuItems, getCategoryDisplayName, getCategoryOrder } from '../../lib/ai/menuClassifier';
import { authenticatedApiCall } from '../../../lib/api-helpers';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
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
}

interface Restaurant {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  website?: string;
  logo_url?: string;
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
  const [customOrder, setCustomOrder] = useState<string[]>([]);
  
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

  const generatePreview = async () => {
    if (!restaurant || menuItems.length === 0) {
      showError('No restaurant or menu items available');
      return;
    }

    try {
      setIsGenerating(true);
      
      const generator = new MenuPDFGenerator();
      const restaurantInfo: RestaurantInfo = {
        name: restaurant.name,
        address: restaurant.address,
        phone: restaurant.phone,
        website: restaurant.website,
        logo_url: restaurant.logo_url
      };
      
      const options = {
        restaurant: restaurantInfo,
        items: menuItems as ClassifiedItem[],
        includeDescriptions,
        includeNutrition,
        customOrder: customOrder.length > 0 ? customOrder : undefined
      };
      
      generator.generateMenu(options);
      const dataUrl = generator.getDataURL();
      setPreviewUrl(dataUrl);
      
      showSuccess('Menu preview generated successfully');
    } catch (error) {
      console.error('Error generating preview:', error);
      showError('Failed to generate menu preview');
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadPDF = async () => {
    if (!restaurant || menuItems.length === 0) {
      showError('No restaurant or menu items available');
      return;
    }

    try {
      setIsGenerating(true);
      
      const generator = new MenuPDFGenerator();
      const restaurantInfo: RestaurantInfo = {
        name: restaurant.name,
        address: restaurant.address,
        phone: restaurant.phone,
        website: restaurant.website,
        logo_url: restaurant.logo_url
      };
      
      const options = {
        restaurant: restaurantInfo,
        items: menuItems as ClassifiedItem[],
        includeDescriptions,
        includeNutrition,
        customOrder: customOrder.length > 0 ? customOrder : undefined
      };
      
      generator.generateMenu(options);
      const filename = `${restaurant.name.replace(/[^a-zA-Z0-9]/g, '_')}_menu_${new Date().toISOString().split('T')[0]}.pdf`;
      generator.download(filename);
      
      showSuccess('PDF menu downloaded successfully');
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
        <h2 className={`${typography.h3} mb-2`}>AI PDF Menu Generator</h2>
        <p className={typography.bodySmall}>
          Generate beautiful, print-ready PDF menus for your restaurant using AI-powered categorization
        </p>
      </div>

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
          </div>
        </div>
      </Card>

      {/* Category Reordering */}
      <Card className={spacing.md}>
        <h3 className={`${typography.h4} mb-4`}>Category Order</h3>
        <p className={`${typography.bodySmall} mb-4`}>
          Drag and drop categories to reorder them in your PDF menu
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
                  <div className="text-sm font-medium">
                    {getCategoryDisplayName(category)}
                  </div>
                  <div className="text-xs text-gray-500">
                    {items.length} item{items.length !== 1 ? 's' : ''}
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
        <h3 className={`${typography.h4} mb-4`}>Generate Menu</h3>
        
        <div className="flex space-x-4">
          <Button
            onClick={generatePreview}
            disabled={isGenerating || menuItems.length === 0}
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
            disabled={isGenerating || menuItems.length === 0}
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

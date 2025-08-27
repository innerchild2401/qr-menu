'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { typography, spacing } from '@/lib/design-system';
import { ClassifiedItem, getCategoryDisplayName, getCategoryOrder } from '../../lib/ai/menuClassifier';

interface CategoryReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (validatedItems: ClassifiedItem[]) => void;
  items: ClassifiedItem[];
  isLoading?: boolean;
}

interface CategoryGroup {
  category: string;
  displayName: string;
  items: ClassifiedItem[];
  confidence: number;
}

export default function CategoryReviewModal({
  isOpen,
  onClose,
  onConfirm,
  items,
  isLoading = false
}: CategoryReviewModalProps) {
  const [validatedItems, setValidatedItems] = useState<ClassifiedItem[]>(items);
  const [categoryGroups, setCategoryGroups] = useState<CategoryGroup[]>([]);
  const [overallConfidence, setOverallConfidence] = useState(0);

  // Available categories for selection
  const availableCategories = [
    'starters',
    'main_courses',
    'desserts',
    'soft_drinks',
    'hot_beverages',
    'cocktails',
    'wines',
    'beers',
    'spirits',
    'sides',
    'sauces',
    'uncategorized'
  ];

  useEffect(() => {
    if (items.length > 0) {
      setValidatedItems(items);
      organizeItemsByCategory(items);
    }
  }, [items]);

  const organizeItemsByCategory = (itemsToOrganize: ClassifiedItem[]) => {
    const groups: Record<string, CategoryGroup> = {};
    
    itemsToOrganize.forEach(item => {
      const category = item.aiCategory || 'uncategorized';
      if (!groups[category]) {
        groups[category] = {
          category,
          displayName: getCategoryDisplayName(category),
          items: [],
          confidence: 0
        };
      }
      groups[category].items.push(item);
    });

    // Calculate average confidence for each category
    Object.values(groups).forEach(group => {
      const totalConfidence = group.items.reduce((sum, item) => sum + item.confidence, 0);
      group.confidence = totalConfidence / group.items.length;
    });

    // Sort by category order
    const categoryOrder = getCategoryOrder();
    const sortedGroups = Object.values(groups).sort((a, b) => {
      const aIndex = categoryOrder.indexOf(a.category);
      const bIndex = categoryOrder.indexOf(b.category);
      if (aIndex === -1 && bIndex === -1) return 0;
      if (aIndex === -1) return 1;
      if (bIndex === -1) return -1;
      return aIndex - bIndex;
    });

    setCategoryGroups(sortedGroups);

    // Calculate overall confidence
    const totalConfidence = itemsToOrganize.reduce((sum, item) => sum + item.confidence, 0);
    setOverallConfidence(totalConfidence / itemsToOrganize.length);
  };

  const handleCategoryChange = (itemId: string, newCategory: string) => {
    const updatedItems = validatedItems.map(item => 
      item.id === itemId 
        ? { ...item, aiCategory: newCategory, confidence: 1.0 } // User override gets full confidence
        : item
    );
    setValidatedItems(updatedItems);
    organizeItemsByCategory(updatedItems);
  };

  const handleConfirm = () => {
    onConfirm(validatedItems);
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'bg-green-100 text-green-800';
    if (confidence >= 0.6) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  const getConfidenceLabel = (confidence: number) => {
    if (confidence >= 0.8) return 'High';
    if (confidence >= 0.6) return 'Medium';
    return 'Low';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className={typography.h3}>
            Review AI Category Suggestions
          </DialogTitle>
          <DialogDescription className={typography.body}>
            Review and adjust the AI-suggested categories for your menu items before generating the PDF.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className={typography.body}>Analyzing menu items...</p>
            </div>
          </div>
        ) : (
          <>
            {/* Overall Confidence Summary */}
            <Card className={`${spacing.sm} mb-6`}>
              <div className="flex items-center justify-between mb-4">
                <h4 className={`${typography.h4} mb-0`}>AI Confidence Summary</h4>
                <Badge className={getConfidenceColor(overallConfidence)}>
                  {getConfidenceLabel(overallConfidence)} Confidence
                </Badge>
              </div>
              <Progress value={overallConfidence * 100} className="mb-2" />
              <p className={`${typography.bodySmall} text-muted-foreground`}>
                Overall confidence: {(overallConfidence * 100).toFixed(1)}%
              </p>
            </Card>

            {/* Category Groups */}
            <div className="space-y-6">
              {categoryGroups.map((group) => (
                <Card key={group.category} className={spacing.sm}>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                                             <h5 className={`${typography.h4} mb-0`}>
                        {group.displayName}
                      </h5>
                      <Badge variant="outline">
                        {group.items.length} item{group.items.length !== 1 ? 's' : ''}
                      </Badge>
                    </div>
                    <Badge className={getConfidenceColor(group.confidence)}>
                      {getConfidenceLabel(group.confidence)}
                    </Badge>
                  </div>

                  <div className="space-y-3">
                    {group.items.map((item) => (
                      <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`${typography.body} font-medium`}>
                              {item.name}
                            </span>
                            <Badge 
                              variant="outline" 
                              className={getConfidenceColor(item.confidence)}
                            >
                              {(item.confidence * 100).toFixed(0)}%
                            </Badge>
                          </div>
                          {item.description && (
                            <p className={`${typography.bodySmall} text-muted-foreground`}>
                              {item.description}
                            </p>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-3">
                          <Select
                            value={item.aiCategory}
                            onValueChange={(value) => handleCategoryChange(item.id, value)}
                          >
                            <SelectTrigger className="w-48">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {availableCategories.map((category) => (
                                <SelectItem key={category} value={category}>
                                  {getCategoryDisplayName(category)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              ))}
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 mt-6 pt-6 border-t">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button onClick={handleConfirm}>
                Save & Generate PDF
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

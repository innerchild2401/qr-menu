'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { typography, spacing } from '@/lib/design-system';

interface RegenerationModeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectMode: (mode: 'description' | 'recipe') => void;
  productName: string;
}

export default function RegenerationModeModal({ 
  isOpen, 
  onClose, 
  onSelectMode, 
  productName 
}: RegenerationModeModalProps) {
  const [selectedMode, setSelectedMode] = useState<'description' | 'recipe' | null>(null);

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (selectedMode) {
      onSelectMode(selectedMode);
      setSelectedMode(null);
    }
  };

  const handleClose = () => {
    setSelectedMode(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className={`${spacing.lg} max-w-md w-full mx-4`}>
        <div className="text-center">
          <h3 className={`${typography.h3} mb-4`}>
            Regenerate Product
          </h3>
          <p className="text-muted-foreground mb-6">
            Do you want to regenerate only the description, or both the recipe and description for <strong>&ldquo;{productName}&rdquo;</strong>?
          </p>
          
          <div className="space-y-3 mb-6">
            <button
              onClick={() => setSelectedMode('description')}
              className={`w-full p-4 text-left border rounded-lg transition-colors ${
                selectedMode === 'description'
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              <div className="flex items-center">
                <div className={`w-4 h-4 rounded-full border-2 mr-3 ${
                  selectedMode === 'description'
                    ? 'border-blue-500 bg-blue-500'
                    : 'border-gray-300 dark:border-gray-600'
                }`}>
                  {selectedMode === 'description' && (
                    <div className="w-2 h-2 bg-white rounded-full mx-auto mt-0.5"></div>
                  )}
                </div>
                <div>
                  <h4 className="font-medium">Description only</h4>
                  <p className="text-sm text-muted-foreground">
                    Keep existing recipe, generate new description and nutritional values
                  </p>
                </div>
              </div>
            </button>

            <button
              onClick={() => setSelectedMode('recipe')}
              className={`w-full p-4 text-left border rounded-lg transition-colors ${
                selectedMode === 'recipe'
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              <div className="flex items-center">
                <div className={`w-4 h-4 rounded-full border-2 mr-3 ${
                  selectedMode === 'recipe'
                    ? 'border-blue-500 bg-blue-500'
                    : 'border-gray-300 dark:border-gray-600'
                }`}>
                  {selectedMode === 'recipe' && (
                    <div className="w-2 h-2 bg-white rounded-full mx-auto mt-0.5"></div>
                  )}
                </div>
                <div>
                  <h4 className="font-medium">Recipe + Description</h4>
                  <p className="text-sm text-muted-foreground">
                    Generate new recipe, description, and nutritional values
                  </p>
                </div>
              </div>
            </button>
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={handleClose}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={!selectedMode}
              className="flex-1"
            >
              Regenerate
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

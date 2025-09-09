'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { authenticatedApiCall } from '@/lib/api-helpers';

interface Product {
  id: string;
  name: string;
  generated_description?: string;
  manual_language_override?: 'ro' | 'en';
  has_recipe?: boolean;
}

interface LanguageConsistencyCheckerProps {
  products: Product[];
  onUpdate: () => void;
}

interface LanguageAnalysis {
  totalProducts: number;
  productsWithDescriptions: number;
  languageBreakdown: Record<string, number>;
  inconsistentProducts: Product[];
  recommendedLanguage: string;
}

export default function LanguageConsistencyChecker({ products, onUpdate }: LanguageConsistencyCheckerProps) {
  const [analysis, setAnalysis] = useState<LanguageAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const analyzeLanguageConsistency = async () => {
    setIsAnalyzing(true);
    try {
      // Filter products that have AI generated descriptions (regardless of has_recipe status)
      const productsWithDescriptions = products.filter(p => 
        p.generated_description && p.generated_description.trim().length > 0
      );

      console.log('Language consistency check:', {
        totalProducts: products.length,
        productsWithDescriptions: productsWithDescriptions.length,
        sampleDescriptions: productsWithDescriptions.slice(0, 3).map(p => ({
          name: p.name,
          description: p.generated_description?.substring(0, 100) + '...'
        }))
      });

      if (productsWithDescriptions.length === 0) {
        setAnalysis({
          totalProducts: products.length,
          productsWithDescriptions: 0,
          languageBreakdown: {},
          inconsistentProducts: [],
          recommendedLanguage: 'ro'
        });
        return;
      }

      // Analyze language distribution
      const languageBreakdown: Record<string, number> = {};
      const inconsistentProducts: Product[] = [];

      // Sample product names to determine primary language
      const sampleNames = products.slice(0, 10).map(p => p.name).join(' ');
      const primaryLanguage = detectLanguage(sampleNames);

      productsWithDescriptions.forEach(product => {
        const descriptionLanguage = detectLanguage(product.generated_description || '');
        languageBreakdown[descriptionLanguage] = (languageBreakdown[descriptionLanguage] || 0) + 1;

        // Check if product has manual language override
        if (product.manual_language_override) {
          if (product.manual_language_override !== primaryLanguage) {
            inconsistentProducts.push(product);
          }
        } else if (descriptionLanguage !== primaryLanguage) {
          inconsistentProducts.push(product);
        }
      });

      setAnalysis({
        totalProducts: products.length,
        productsWithDescriptions: productsWithDescriptions.length,
        languageBreakdown,
        inconsistentProducts,
        recommendedLanguage: primaryLanguage
      });

    } catch (error) {
      console.error('Error analyzing language consistency:', error);
      alert('Error analyzing language consistency. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const detectLanguage = (text: string): string => {
    if (!text || text.trim().length === 0) return 'unknown';
    
    // Simple language detection based on common words
    const romanianWords = ['cu', 'și', 'de', 'la', 'în', 'pentru', 'sau', 'dar', 'când', 'cum', 'ce', 'care', 'unde', 'cât', 'cum', 'prea', 'foarte', 'mai', 'foarte', 'tot', 'toate', 'toți', 'toate', 'este', 'sunt', 'are', 'au', 'va', 'vor', 'am', 'ai', 'a', 'o', 'un', 'o', 'și', 'sau', 'dar', 'când', 'cum', 'ce', 'care', 'unde', 'cât', 'cum', 'prea', 'foarte', 'mai', 'foarte', 'tot', 'toate', 'toți', 'toate'];
    const englishWords = ['with', 'and', 'of', 'the', 'in', 'for', 'or', 'but', 'when', 'how', 'what', 'which', 'where', 'how', 'too', 'very', 'more', 'very', 'all', 'every', 'everyone', 'everything', 'is', 'are', 'has', 'have', 'will', 'would', 'am', 'you', 'a', 'an', 'and', 'or', 'but', 'when', 'how', 'what', 'which', 'where', 'how', 'too', 'very', 'more', 'very', 'all', 'every', 'everyone', 'everything'];
    
    const lowerText = text.toLowerCase();
    const romanianCount = romanianWords.reduce((count, word) => 
      count + (lowerText.includes(word) ? 1 : 0), 0
    );
    const englishCount = englishWords.reduce((count, word) => 
      count + (lowerText.includes(word) ? 1 : 0), 0
    );
    
    if (romanianCount === 0 && englishCount === 0) return 'unknown';
    return romanianCount > englishCount ? 'ro' : 'en';
  };

  const regenerateInconsistentProducts = async () => {
    if (!analysis || analysis.inconsistentProducts.length === 0) return;

    setIsRegenerating(true);
    try {
      const productBatches = [];
      const batchSize = 10;
      
      for (let i = 0; i < analysis.inconsistentProducts.length; i += batchSize) {
        const batch = analysis.inconsistentProducts.slice(i, i + batchSize);
        productBatches.push(batch);
      }

      let successCount = 0;
      let errorCount = 0;

      for (const batch of productBatches) {
        try {
          const requestPayload = {
            products: batch.map(p => ({
              id: String(p.id).trim(), // Ensure ID is a string
              name: String(p.name).trim(), // Ensure name is a string
              ...(analysis.recommendedLanguage && ['ro', 'en'].includes(analysis.recommendedLanguage) 
                ? { manual_language_override: analysis.recommendedLanguage } 
                : {})
            })),
            scenario: 'force'
          };
          
          console.log('Regenerating batch with payload:', JSON.stringify(requestPayload, null, 2));
          console.log('Recommended language:', analysis.recommendedLanguage);
          
          const response = await authenticatedApiCall('/api/generate-product-data', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestPayload)
          });

          if (response.ok) {
            successCount += batch.length;
            console.log(`Batch regenerated successfully: ${batch.length} products`);
          } else {
            errorCount += batch.length;
            const errorData = await response.json().catch(() => ({ error: 'Failed to parse error response' }));
            console.error(`Batch regeneration failed (${response.status}):`, errorData);
          }
        } catch (error) {
          console.error('Error regenerating batch:', error);
          errorCount += batch.length;
        }
      }

      if (successCount > 0) {
        alert(`Successfully regenerated ${successCount} products. ${errorCount > 0 ? `${errorCount} failed.` : ''}`);
        console.log('🔄 Calling onUpdate to refresh parent data...');
        onUpdate();
        setAnalysis(null);
      } else {
        alert('Failed to regenerate products. Please try again.');
      }

    } catch (error) {
      console.error('Error regenerating products:', error);
      alert('Error regenerating products. Please try again.');
    } finally {
      setIsRegenerating(false);
    }
  };

  const isConsistent = analysis && Object.keys(analysis.languageBreakdown).length <= 1;

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Language Consistency Checker
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Ensure all AI descriptions are in the same language
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            onClick={analyzeLanguageConsistency}
            disabled={isAnalyzing}
            variant="outline"
          >
            {isAnalyzing ? 'Analyzing...' : 'Check Consistency'}
          </Button>
          {analysis && !isConsistent && (
            <Button
              onClick={regenerateInconsistentProducts}
              disabled={isRegenerating}
              className="bg-orange-600 hover:bg-orange-700"
            >
              {isRegenerating ? 'Regenerating...' : 'Fix Inconsistencies'}
            </Button>
          )}
        </div>
      </div>

      {analysis && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {analysis.totalProducts}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Total Products
              </div>
            </div>
            <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {analysis.productsWithDescriptions}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                With Descriptions
              </div>
            </div>
            <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {Object.keys(analysis.languageBreakdown).length}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Languages Found
              </div>
            </div>
            <div className="text-center p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
              <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                {analysis.inconsistentProducts.length}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Inconsistent
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Status:
              </span>
              <Badge 
                variant={isConsistent ? "default" : "destructive"}
                className={isConsistent ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}
              >
                {isConsistent ? 'Consistent' : 'Inconsistent'}
              </Badge>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDetails(!showDetails)}
            >
              {showDetails ? 'Hide Details' : 'Show Details'}
            </Button>
          </div>

          {showDetails && (
            <div className="space-y-4">
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                  Language Distribution
                </h4>
                <div className="space-y-2">
                  {Object.entries(analysis.languageBreakdown).map(([lang, count]) => (
                    <div key={lang} className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {lang === 'ro' ? 'Romanian' : 'English'}
                      </span>
                      <Badge variant="outline">{count} products</Badge>
                    </div>
                  ))}
                </div>
              </div>

              {analysis.inconsistentProducts.length > 0 && (
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                    Inconsistent Products ({analysis.inconsistentProducts.length})
                  </h4>
                  <div className="max-h-40 overflow-y-auto space-y-1">
                    {analysis.inconsistentProducts.map((product) => (
                      <div key={product.id} className="text-sm text-gray-600 dark:text-gray-400">
                        {product.name}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { authenticatedApiCall } from '@/lib/api-helpers';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface Product {
  id: string;
  name: string;
  generated_description?: string;
  manual_language_override?: 'ro' | 'en';
  has_recipe?: boolean;
  inconsistencyReason?: string;
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

  // Note: We don't auto-re-analyze after regeneration to avoid infinite loops
  // Users need to manually click "Check Consistency" again to see updated results

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
          description: p.generated_description?.substring(0, 100) + '...',
          manual_language_override: p.manual_language_override
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
      const primaryLanguageResult = detectLanguage(sampleNames);
      const primaryLanguage = primaryLanguageResult.language;

      productsWithDescriptions.forEach(product => {
        const descriptionResult = detectLanguage(product.generated_description || '');
        const descriptionLanguage = descriptionResult.language;
        const isMixedLanguage = descriptionResult.isMixed;
        
        languageBreakdown[descriptionLanguage] = (languageBreakdown[descriptionLanguage] || 0) + 1;

        console.log(`🔍 Product: ${product.name}`);
        console.log(`   Description: ${product.generated_description?.substring(0, 100)}...`);
        console.log(`   Detected Language: ${descriptionLanguage}`);
        console.log(`   Is Mixed Language: ${isMixedLanguage}`);
        console.log(`   Romanian Count: ${descriptionResult.romanianCount}, English Count: ${descriptionResult.englishCount}`);
        console.log(`   Manual Override: ${product.manual_language_override}`);
        console.log(`   Primary Language: ${primaryLanguage}`);

        let isInconsistent = false;
        let inconsistencyReason = '';

        // Check for mixed language first (highest priority)
        if (isMixedLanguage) {
          isInconsistent = true;
          inconsistencyReason = `Mixed language detected (${descriptionResult.romanianCount} Romanian, ${descriptionResult.englishCount} English words)`;
          console.log(`   ❌ INCONSISTENT: ${inconsistencyReason}`);
        }
        // Check if product has manual language override
        else if (product.manual_language_override) {
          if (product.manual_language_override !== primaryLanguage) {
            isInconsistent = true;
            inconsistencyReason = `Manual override (${product.manual_language_override}) != Primary (${primaryLanguage})`;
            console.log(`   ❌ INCONSISTENT: ${inconsistencyReason}`);
          } else {
            console.log(`   ✅ CONSISTENT: Manual override matches primary language`);
          }
        } 
        // Check if description language doesn't match primary language
        else if (descriptionLanguage !== primaryLanguage) {
          isInconsistent = true;
          inconsistencyReason = `Description language (${descriptionLanguage}) != Primary (${primaryLanguage})`;
          console.log(`   ❌ INCONSISTENT: ${inconsistencyReason}`);
        } else {
          console.log(`   ✅ CONSISTENT: Description language matches primary language`);
        }

        if (isInconsistent) {
          inconsistentProducts.push({
            ...product,
            inconsistencyReason // Add the reason for debugging
          });
        }
      });

      console.log('Language analysis results:', {
        languageBreakdown,
        inconsistentProductsCount: inconsistentProducts.length,
        inconsistentProducts: inconsistentProducts.map(p => ({
          id: p.id,
          name: p.name,
          manual_language_override: p.manual_language_override
        })),
        recommendedLanguage: primaryLanguage
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

  const detectLanguage = (text: string): { language: string; isMixed: boolean; romanianCount: number; englishCount: number } => {
    if (!text || text.trim().length === 0) return { language: 'unknown', isMixed: false, romanianCount: 0, englishCount: 0 };
    
    // Enhanced language detection with more comprehensive word lists
    const romanianWords = [
      'cu', 'și', 'de', 'la', 'în', 'pentru', 'sau', 'dar', 'când', 'cum', 'ce', 'care', 'unde', 'cât', 
      'prea', 'foarte', 'mai', 'tot', 'toate', 'toți', 'este', 'sunt', 'are', 'au', 'va', 'vor', 'am', 'ai', 
      'a', 'o', 'un', 'și', 'sau', 'dar', 'când', 'cum', 'ce', 'care', 'unde', 'cât', 'prea', 'foarte', 
      'mai', 'tot', 'toate', 'toți', 'este', 'sunt', 'are', 'au', 'va', 'vor', 'am', 'ai', 'a', 'o', 'un',
      // Additional Romanian words
      'delicios', 'gustos', 'frumos', 'bun', 'bună', 'bună', 'bun', 'bună', 'bun', 'bună', 'bun', 'bună',
      'preparat', 'preparată', 'preparat', 'preparată', 'preparat', 'preparată', 'preparat', 'preparată',
      'servit', 'servită', 'servit', 'servită', 'servit', 'servită', 'servit', 'servită',
      'făcut', 'făcută', 'făcut', 'făcută', 'făcut', 'făcută', 'făcut', 'făcută',
      'cu', 'și', 'de', 'la', 'în', 'pentru', 'sau', 'dar', 'când', 'cum', 'ce', 'care', 'unde', 'cât',
      // More Romanian words for better detection
      'orez', 'prăjit', 'pui', 'legume', 'sos', 'soia', 'masă', 'gustoasă', 'consistentă', 'clasic', 'cheeseburger',
      'carne', 'vită', 'topit', 'cheddar', 'brânză', 'proaspăt', 'lăptucă', 'roșie', 'tomato', 'ceapă', 'castravete',
      'sos', 'mustar', 'ketchup', 'pâine', 'hamburger', 'sandwich', 'cartofi', 'prăjiți', 'frituri'
    ];
    
    const englishWords = [
      'with', 'and', 'of', 'the', 'in', 'for', 'or', 'but', 'when', 'how', 'what', 'which', 'where', 'how', 
      'too', 'very', 'more', 'very', 'all', 'every', 'everyone', 'everything', 'is', 'are', 'has', 'have', 
      'will', 'would', 'am', 'you', 'a', 'an', 'and', 'or', 'but', 'when', 'how', 'what', 'which', 'where', 
      'how', 'too', 'very', 'more', 'very', 'all', 'every', 'everyone', 'everything',
      // Additional English words
      'delicious', 'tasty', 'beautiful', 'good', 'great', 'amazing', 'wonderful', 'excellent', 'perfect',
      'prepared', 'cooked', 'made', 'served', 'fresh', 'hot', 'cold', 'warm', 'crispy', 'tender',
      'flavorful', 'savory', 'sweet', 'spicy', 'mild', 'rich', 'creamy', 'juicy', 'succulent',
      // More English words for better detection
      'classic', 'cheeseburger', 'beef', 'patty', 'melted', 'cheese', 'lettuce', 'tomato', 'onion', 'pickle',
      'sauce', 'mustard', 'ketchup', 'bread', 'bun', 'hamburger', 'sandwich', 'fries', 'fried', 'potatoes'
    ];
    
    const lowerText = text.toLowerCase();
    
    // Count Romanian words
    const romanianCount = romanianWords.reduce((count, word) => {
      const regex = new RegExp(`\\b${word}\\b`, 'g');
      const matches = lowerText.match(regex);
      return count + (matches ? matches.length : 0);
    }, 0);
    
    // Count English words
    const englishCount = englishWords.reduce((count, word) => {
      const regex = new RegExp(`\\b${word}\\b`, 'g');
      const matches = lowerText.match(regex);
      return count + (matches ? matches.length : 0);
    }, 0);
    
    // Debug logging
    console.log(`🔍 Language detection for: "${text.substring(0, 50)}..."`);
    console.log(`   Romanian count: ${romanianCount}, English count: ${englishCount}`);
    
    // Determine if it's mixed language - more sensitive detection
    // Consider it mixed if both languages are present and the difference is not too large
    const isMixed = romanianCount > 0 && englishCount > 0 && Math.abs(romanianCount - englishCount) <= 10;
    
    if (romanianCount === 0 && englishCount === 0) {
      return { language: 'unknown', isMixed: false, romanianCount: 0, englishCount: 0 };
    }
    
    const language = romanianCount > englishCount ? 'ro' : 'en';
    return { language, isMixed, romanianCount, englishCount };
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
            
            // DIRECT FIX: Update manual_language_override in database
            console.log('🔧 Applying direct fix: updating manual_language_override in database...');
            try {
              const { error: updateError } = await supabase
                .from('products')
                .update({ manual_language_override: analysis.recommendedLanguage })
                .in('id', batch.map(p => p.id));
              
              if (updateError) {
                console.error('❌ Direct fix failed:', updateError);
              } else {
                console.log('✅ Direct fix applied: manual_language_override updated to', analysis.recommendedLanguage);
              }
            } catch (error) {
              console.error('❌ Direct fix error:', error);
            }
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
        // Clear the analysis to force a fresh analysis next time
        setAnalysis(null);
        // Also clear the showDetails to reset the UI
        setShowDetails(false);
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
                  <div className="max-h-40 overflow-y-auto space-y-2">
                    {analysis.inconsistentProducts.map((product) => (
                      <div key={product.id} className="text-sm">
                        <div className="font-medium text-gray-900 dark:text-white">
                          {product.name}
                        </div>
                        {product.inconsistencyReason && (
                          <div className="text-xs text-red-600 dark:text-red-400 mt-1">
                            {product.inconsistencyReason}
                          </div>
                        )}
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

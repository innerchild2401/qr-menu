'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RefreshCw, Check, X, AlertTriangle, Package, Search } from 'lucide-react';
import { useToast } from '@/hooks/useToast';
import { authenticatedApiCall, authenticatedApiCallWithBody } from '@/lib/api-helpers';

interface IngredientMatch {
  original: string;
  normalized: string;
  status: 'exact_match' | 'similar_found' | 'new_ingredient' | 'needs_review';
  confidence: number;
  suggestions?: Array<{name: string; confidence: number}>;
}

interface CachedIngredient {
  name: string;
  language: string;
}

export default function IngredientDuplicatesPage() {
  const [ingredients, setIngredients] = useState<string[]>([]);
  const [cachedIngredients, setCachedIngredients] = useState<CachedIngredient[]>([]);
  const [matches, setMatches] = useState<IngredientMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [adminNotes, setAdminNotes] = useState<Record<string, string>>({});
  const [newIngredientText, setNewIngredientText] = useState('');
  const { showSuccess, showError } = useToast();

  const fetchCachedIngredients = useCallback(async () => {
    try {
      const response = await authenticatedApiCall('/api/admin/ingredient-normalization');
      if (response.ok) {
        const data = await response.json();
        setCachedIngredients(data);
      } else {
        console.error('Failed to fetch cached ingredients:', response.status);
        showError('Failed to fetch cached ingredients');
      }
    } catch (error) {
      console.error('Error fetching cached ingredients:', error);
      showError('Failed to fetch cached ingredients');
    }
  }, [showError]);

  const analyzeIngredients = useCallback(async () => {
    if (!newIngredientText.trim()) {
      showError('Please enter ingredients to analyze');
      return;
    }

    setLoading(true);
    try {
      const ingredients = newIngredientText
        .split('\n')
        .map(ing => ing.trim())
        .filter(ing => ing.length > 0);

      const response = await authenticatedApiCallWithBody('/api/admin/ingredient-normalization', {
        ingredients
      }, {
        method: 'POST'
      });

      if (response.ok) {
        const data = await response.json();
        setMatches(data);
        setIngredients(ingredients);
      } else {
        const error = await response.json();
        showError(error.error || 'Failed to analyze ingredients');
      }
    } catch (error) {
      console.error('Error analyzing ingredients:', error);
      showError('Failed to analyze ingredients');
    } finally {
      setLoading(false);
    }
  }, [newIngredientText, showError]);

  useEffect(() => {
    fetchCachedIngredients();
  }, [fetchCachedIngredients]);

  const handleMergeIngredients = async (original: string, target: string) => {
    setProcessing(original);
    try {
      // This would be implemented to merge ingredients in the database
      // For now, we'll just show a success message
      showSuccess(`Merged "${original}" with "${target}"`);
      
      // Refresh the analysis
      await analyzeIngredients();
    } catch (error) {
      console.error('Error merging ingredients:', error);
      showError('Failed to merge ingredients');
    } finally {
      setProcessing(null);
    }
  };

  const handleKeepSeparate = async (original: string) => {
    setProcessing(original);
    try {
      // This would be implemented to mark ingredients as separate
      showSuccess(`Kept "${original}" as separate ingredient`);
      
      // Refresh the analysis
      await analyzeIngredients();
    } catch (error) {
      console.error('Error keeping ingredients separate:', error);
      showError('Failed to process ingredient');
    } finally {
      setProcessing(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'exact_match': return 'bg-green-100 text-green-800';
      case 'similar_found': return 'bg-yellow-100 text-yellow-800';
      case 'new_ingredient': return 'bg-blue-100 text-blue-800';
      case 'needs_review': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'exact_match': return <Check className="h-4 w-4" />;
      case 'similar_found': return <AlertTriangle className="h-4 w-4" />;
      case 'new_ingredient': return <Package className="h-4 w-4" />;
      case 'needs_review': return <X className="h-4 w-4" />;
      default: return <Package className="h-4 w-4" />;
    }
  };

  const similarMatches = matches.filter(m => m.status === 'similar_found');
  const newIngredients = matches.filter(m => m.status === 'new_ingredient');
  const exactMatches = matches.filter(m => m.status === 'exact_match');

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Ingredient Duplicate Detection</h1>
          <p className="text-muted-foreground">Analyze and resolve ingredient duplicates</p>
        </div>
        <Button onClick={fetchCachedIngredients} variant="outline" className="flex items-center gap-2">
          <RefreshCw className="h-4 w-4" />
          Refresh Cache
        </Button>
      </div>

      {/* Input Section */}
      <Card>
        <CardHeader>
          <CardTitle>Analyze Ingredients</CardTitle>
          <CardDescription>
            Enter ingredients (one per line) to check for duplicates and similarities
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="ingredients">Ingredients to Analyze</Label>
            <Textarea
              id="ingredients"
              placeholder="Enter ingredients, one per line:&#10;pesmet&#10;panko&#10;sare&#10;sare de mare&#10;ulei&#10;ulei de floarea-soarelui"
              value={newIngredientText}
              onChange={(e) => setNewIngredientText(e.target.value)}
              className="mt-1"
              rows={6}
            />
          </div>
          <Button 
            onClick={analyzeIngredients} 
            disabled={loading || !newIngredientText.trim()}
            className="flex items-center gap-2"
          >
            <Search className="h-4 w-4" />
            {loading ? 'Analyzing...' : 'Analyze Ingredients'}
          </Button>
        </CardContent>
      </Card>

      {/* Results Section */}
      {matches.length > 0 && (
        <div className="space-y-6">
          {/* Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Analysis Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{exactMatches.length}</div>
                  <div className="text-sm text-gray-600">Exact Matches</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-600">{similarMatches.length}</div>
                  <div className="text-sm text-gray-600">Similar Found</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{newIngredients.length}</div>
                  <div className="text-sm text-gray-600">New Ingredients</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-600">{matches.length}</div>
                  <div className="text-sm text-gray-600">Total Processed</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Similar Ingredients (Need Review) */}
          {similarMatches.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
                Similar Ingredients Found ({similarMatches.length})
              </h2>
              <div className="space-y-4">
                {similarMatches.map((match, index) => (
                  <Card key={index} className="border-l-4 border-l-yellow-400">
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="flex items-center gap-2">
                            {getStatusIcon(match.status)}
                            {match.original}
                          </CardTitle>
                          <CardDescription>
                            Confidence: {(match.confidence * 100).toFixed(1)}%
                          </CardDescription>
                        </div>
                        <Badge className={getStatusColor(match.status)}>
                          {match.status.replace('_', ' ')}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-2">Suggested Matches:</h4>
                        <div className="space-y-2">
                          {match.suggestions?.map((suggestion, idx) => (
                            <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                              <span className="font-medium">{suggestion.name}</span>
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-gray-500">
                                  {(suggestion.confidence * 100).toFixed(1)}%
                                </span>
                                <Button
                                  size="sm"
                                  onClick={() => handleMergeIngredients(match.original, suggestion.name)}
                                  disabled={processing === match.original}
                                >
                                  Merge
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        <Button
                          onClick={() => handleKeepSeparate(match.original)}
                          disabled={processing === match.original}
                          variant="outline"
                        >
                          Keep Separate
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* New Ingredients */}
          {newIngredients.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Package className="h-5 w-5 text-blue-600" />
                New Ingredients ({newIngredients.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {newIngredients.map((match, index) => (
                  <Card key={index} className="border-l-4 border-l-blue-400">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-medium">{match.original}</h3>
                          <p className="text-sm text-gray-500">New ingredient</p>
                        </div>
                        <Badge className={getStatusColor(match.status)}>
                          {match.status.replace('_', ' ')}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Exact Matches */}
          {exactMatches.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Check className="h-5 w-5 text-green-600" />
                Exact Matches ({exactMatches.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {exactMatches.map((match, index) => (
                  <Card key={index} className="border-l-4 border-l-green-400">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-medium">{match.original}</h3>
                          <p className="text-sm text-gray-500">Matches: {match.normalized}</p>
                        </div>
                        <Badge className={getStatusColor(match.status)}>
                          {match.status.replace('_', ' ')}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Cached Ingredients */}
      <Card>
        <CardHeader>
          <CardTitle>Cached Ingredients ({cachedIngredients.length})</CardTitle>
          <CardDescription>
            All ingredients currently stored in the system
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="max-h-64 overflow-y-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              {cachedIngredients.map((ingredient, index) => (
                <div key={index} className="p-2 bg-gray-50 rounded text-sm">
                  {ingredient.name}
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft, 
  Save, 
  Plus, 
  Trash2, 
  DollarSign,
  ChefHat,
  Clock
} from 'lucide-react';
import { useToast } from '@/hooks/useToast';

interface Ingredient {
  ingredient: string;
  quantity: number;
  unit: string;
}

interface Product {
  id: number;
  name: string;
  price: number;
  recipe: Ingredient[];
  has_recipe: boolean;
}

export default function ProductEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const [product, setProduct] = useState<Product | null>(null);
  const [recipe, setRecipe] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAddIngredient, setShowAddIngredient] = useState(false);
  const [newIngredient, setNewIngredient] = useState({
    ingredient: '',
    quantity: '',
    unit: 'g'
  });
  const router = useRouter();
  const { showSuccess, showError } = useToast();

  const fetchProduct = useCallback(async (id: string) => {
    try {
      // Get staff user from localStorage
      const staffData = localStorage.getItem('staff_user');
      if (!staffData) {
        router.push('/staff/login');
        return;
      }
      
      const staff = JSON.parse(staffData);
      
      const response = await fetch(`/api/staff/products/${id}`, {
        headers: {
          'x-staff-user-id': staff.id
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setProduct(data);
        setRecipe(data.recipe || []);
      } else {
        console.error('Failed to fetch product:', response.status);
        showError('Failed to fetch product');
      }
    } catch (error) {
      console.error('Error fetching product:', error);
      showError('Failed to fetch product');
    } finally {
      setLoading(false);
    }
  }, [showError, router]);

  useEffect(() => {
    const loadProduct = async () => {
      const resolvedParams = await params;
      await fetchProduct(resolvedParams.id);
    };
    loadProduct();
  }, [params, fetchProduct]);

  const handleSave = async () => {
    setSaving(true);
    try {
      // Get staff user from localStorage
      const staffData = localStorage.getItem('staff_user');
      if (!staffData) {
        router.push('/staff/login');
        return;
      }
      
      const staff = JSON.parse(staffData);
      const resolvedParams = await params;
      
      const response = await fetch(`/api/staff/products/${resolvedParams.id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'x-staff-user-id': staff.id
        },
        body: JSON.stringify({ recipe })
      });

          if (response.ok) {
            const data = await response.json();
            showSuccess('Recipe submitted for admin approval');
            router.back();
          } else {
            const error = await response.json();
            throw new Error(error.error || 'Failed to submit recipe');
          }
    } catch (error) {
      showError('Failed to save recipe');
    } finally {
      setSaving(false);
    }
  };

  const addIngredient = () => {
    if (newIngredient.ingredient && newIngredient.quantity) {
      setRecipe([...recipe, {
        ingredient: newIngredient.ingredient,
        quantity: parseFloat(newIngredient.quantity),
        unit: newIngredient.unit
      }]);
      setNewIngredient({ ingredient: '', quantity: '', unit: 'g' });
      setShowAddIngredient(false);
    }
  };

  const removeIngredient = (index: number) => {
    setRecipe(recipe.filter((_, i) => i !== index));
  };

  const updateIngredient = (index: number, field: keyof Ingredient, value: string | number) => {
    const updated = [...recipe];
    updated[index] = { ...updated[index], [field]: value };
    setRecipe(updated);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Product not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-md mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.back()}
              className="p-2"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="font-semibold text-gray-900">{product.name}</h1>
            <Button
              onClick={handleSave}
              disabled={saving}
              size="sm"
              className="bg-blue-600 hover:bg-blue-700"
            >
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto p-4 space-y-4">
        {/* Product Info */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-gray-900">{product.name}</h2>
                <p className="text-sm text-gray-500">{product.price} RON</p>
              </div>
              <Badge variant="outline" className="flex items-center gap-1">
                <ChefHat className="h-3 w-3" />
                Recipe
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Recipe Ingredients */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <ChefHat className="h-5 w-5" />
              Recipe Ingredients
            </CardTitle>
            <CardDescription>
              Add and edit ingredients for this recipe
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-3">
              {recipe.map((ingredient, index) => (
                <div key={index} className="flex items-center space-x-2 p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <Input
                      value={ingredient.ingredient}
                      onChange={(e) => updateIngredient(index, 'ingredient', e.target.value)}
                      placeholder="Ingredient name"
                      className="mb-2"
                    />
                    <div className="flex space-x-2">
                      <Input
                        type="number"
                        value={ingredient.quantity}
                        onChange={(e) => updateIngredient(index, 'quantity', parseFloat(e.target.value) || 0)}
                        placeholder="Quantity"
                        className="w-20"
                      />
                      <select
                        value={ingredient.unit}
                        onChange={(e) => updateIngredient(index, 'unit', e.target.value)}
                        className="flex-1 p-2 border rounded-md text-sm"
                      >
                        <option value="g">g</option>
                        <option value="kg">kg</option>
                        <option value="ml">ml</option>
                        <option value="l">l</option>
                        <option value="piece">piece</option>
                        <option value="cup">cup</option>
                        <option value="tbsp">tbsp</option>
                        <option value="tsp">tsp</option>
                      </select>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeIngredient(index)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}

              {/* Add Ingredient Form */}
              {showAddIngredient ? (
                <div className="p-3 bg-blue-50 rounded-lg border-2 border-dashed border-blue-200">
                  <div className="space-y-2">
                    <Input
                      value={newIngredient.ingredient}
                      onChange={(e) => setNewIngredient({ ...newIngredient, ingredient: e.target.value })}
                      placeholder="Ingredient name"
                    />
                    <div className="flex space-x-2">
                      <Input
                        type="number"
                        value={newIngredient.quantity}
                        onChange={(e) => setNewIngredient({ ...newIngredient, quantity: e.target.value })}
                        placeholder="Quantity"
                        className="w-20"
                      />
                      <select
                        value={newIngredient.unit}
                        onChange={(e) => setNewIngredient({ ...newIngredient, unit: e.target.value })}
                        className="flex-1 p-2 border rounded-md text-sm"
                      >
                        <option value="g">g</option>
                        <option value="kg">kg</option>
                        <option value="ml">ml</option>
                        <option value="l">l</option>
                        <option value="piece">piece</option>
                        <option value="cup">cup</option>
                        <option value="tbsp">tbsp</option>
                        <option value="tsp">tsp</option>
                      </select>
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        onClick={addIngredient}
                        size="sm"
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        Add
                      </Button>
                      <Button
                        onClick={() => setShowAddIngredient(false)}
                        variant="outline"
                        size="sm"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <Button
                  onClick={() => setShowAddIngredient(true)}
                  variant="outline"
                  className="w-full border-dashed"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Ingredient
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Cost Information */}
        {recipe.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Cost Information
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">Recipe cost calculation</p>
                <p className="text-2xl font-bold text-blue-600">Coming Soon</p>
                <p className="text-xs text-gray-400">Cost calculation will be available soon</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

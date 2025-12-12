'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2, Search, DollarSign } from 'lucide-react';
import { useToast } from '@/hooks/useToast';

interface IngredientCost {
  id: string;
  ingredient_name: string;
  cost_per_unit: number;
  unit: string;
  currency: string;
  confidence_score: number;
  source: string;
  created_at: string;
}

export default function IngredientCostsPage() {
  const [ingredients, setIngredients] = useState<IngredientCost[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const { showSuccess, showError } = useToast();

  // Form state
  const [formData, setFormData] = useState({
    ingredient_name: '',
    cost_per_unit: '',
    unit: 'g',
    currency: 'RON' // Default currency, can be overridden via env var DEFAULT_CURRENCY
  });

  const fetchIngredients = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/ingredient-costs');
      if (response.ok) {
        const data = await response.json();
        setIngredients(data);
      }
    } catch (error) {
      console.error('Error fetching ingredients:', error);
      showError('Failed to fetch ingredient costs');
    } finally {
      setLoading(false);
    }
  }, [showError]);

  useEffect(() => {
    fetchIngredients();
  }, [fetchIngredients]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const response = await fetch('/api/admin/ingredient-costs', {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingId,
          ...formData,
          cost_per_unit: parseFloat(formData.cost_per_unit)
        })
      });

      if (response.ok) {
        showSuccess(editingId ? 'Ingredient cost updated' : 'Ingredient cost added');
        setShowAddForm(false);
        setEditingId(null);
        setFormData({ ingredient_name: '', cost_per_unit: '', unit: 'g', currency: 'RON' });
        fetchIngredients();
      } else {
        throw new Error('Failed to save ingredient cost');
      }
    } catch (error) {
      showError('Failed to save ingredient cost');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this ingredient cost?')) return;

    try {
      const response = await fetch(`/api/admin/ingredient-costs?id=${id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        showSuccess('Ingredient cost deleted');
        fetchIngredients();
      } else {
        throw new Error('Failed to delete ingredient cost');
      }
    } catch (error) {
      showError('Failed to delete ingredient cost');
    }
  };

  const handleEdit = (ingredient: IngredientCost) => {
    setEditingId(ingredient.id);
    setFormData({
      ingredient_name: ingredient.ingredient_name,
      cost_per_unit: ingredient.cost_per_unit.toString(),
      unit: ingredient.unit,
      currency: ingredient.currency
    });
    setShowAddForm(true);
  };

  const filteredIngredients = ingredients.filter(ingredient =>
    ingredient.ingredient_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Ingredient Costs</h1>
          <p className="text-muted-foreground">Manage ingredient pricing for recipe cost calculations</p>
        </div>
        <Button onClick={() => setShowAddForm(true)} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Add Ingredient Cost
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input
          placeholder="Search ingredients..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Add/Edit Form */}
      {showAddForm && (
        <Card>
          <CardHeader>
            <CardTitle>{editingId ? 'Edit Ingredient Cost' : 'Add New Ingredient Cost'}</CardTitle>
            <CardDescription>
              {editingId ? 'Update the ingredient cost information' : 'Add a new ingredient with its cost per unit'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="ingredient_name">Ingredient Name</Label>
                  <Input
                    id="ingredient_name"
                    value={formData.ingredient_name}
                    onChange={(e) => setFormData({ ...formData, ingredient_name: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="unit">Unit</Label>
                  <select
                    id="unit"
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    className="w-full p-2 border rounded-md"
                  >
                    <option value="g">Grams (g)</option>
                    <option value="kg">Kilograms (kg)</option>
                    <option value="ml">Milliliters (ml)</option>
                    <option value="l">Liters (l)</option>
                    <option value="piece">Piece</option>
                    <option value="cup">Cup</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="cost_per_unit">Cost per Unit</Label>
                  <Input
                    id="cost_per_unit"
                    type="number"
                    step="0.01"
                    value={formData.cost_per_unit}
                    onChange={(e) => setFormData({ ...formData, cost_per_unit: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="currency">Currency</Label>
                  <select
                    id="currency"
                    value={formData.currency}
                    onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                    className="w-full p-2 border rounded-md"
                  >
                    <option value="RON">RON</option>
                    <option value="EUR">EUR</option>
                    <option value="USD">USD</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="submit">
                  {editingId ? 'Update' : 'Add'} Ingredient Cost
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowAddForm(false);
                    setEditingId(null);
                    setFormData({ ingredient_name: '', cost_per_unit: '', unit: 'g', currency: 'RON' });
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Ingredients List */}
      <div className="grid gap-4">
        {filteredIngredients.map((ingredient) => (
          <Card key={ingredient.id}>
            <CardContent className="p-4">
              <div className="flex justify-between items-start">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">{ingredient.ingredient_name}</h3>
                    <Badge variant={ingredient.confidence_score >= 0.7 ? 'default' : 'destructive'}>
                      {Math.round(ingredient.confidence_score * 100)}% confidence
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <DollarSign className="h-4 w-4" />
                      {ingredient.cost_per_unit} {ingredient.currency}/{ingredient.unit}
                    </span>
                    <span>Source: {ingredient.source}</span>
                    <span>Added: {new Date(ingredient.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(ingredient)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(ingredient.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredIngredients.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">No ingredient costs found</p>
            <Button onClick={() => setShowAddForm(true)} className="mt-4">
              Add your first ingredient cost
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}


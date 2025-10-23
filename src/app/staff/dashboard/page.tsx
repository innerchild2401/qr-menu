'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  ChefHat, 
  Clock, 
  DollarSign, 
  Edit3, 
  LogOut, 
  Package,
  Plus,
  TrendingUp,
  User
} from 'lucide-react';
import { useToast } from '@/hooks/useToast';
import { staffStorage } from '@/lib/secure-storage';

interface StaffUser {
  id: string;
  name: string;
  role: string;
}

interface Category {
  category_id: number;
  category_name: string;
  can_edit: boolean;
}

interface Product {
  id: number;
  name: string;
  category_id: number;
  category_name: string;
  price: number;
  has_recipe: boolean;
  recipe: Array<{
    ingredient: string;
    quantity: number;
    unit: string;
  }>;
  last_modified_at: string;
}

interface DraftRecipe {
  id: number;
  product_id: number;
  product_name: string;
  category_name: string;
  proposed_recipe: Array<{
    ingredient: string;
    quantity: number;
    unit: string;
  }>;
  current_recipe: Array<{
    ingredient: string;
    quantity: number;
    unit: string;
  }> | null;
  status: 'pending' | 'approved' | 'rejected';
  admin_notes: string | null;
  created_at: string;
  reviewed_at: string | null;
}

interface ProductProposal {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  has_recipe: boolean;
  recipe: Array<{
    ingredient: string;
    quantity: number;
    unit: string;
  }> | null;
  is_frozen: boolean;
  is_vegetarian: boolean;
  is_spicy: boolean;
  status: 'pending' | 'approved' | 'rejected';
  admin_notes: string | null;
  created_at: string;
  reviewed_at: string | null;
  category_id: number | null;
  category_name: string;
}

export default function StaffDashboardPage() {
  const [staff, setStaff] = useState<StaffUser | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [draftRecipes, setDraftRecipes] = useState<DraftRecipe[]>([]);
  const [productProposals, setProductProposals] = useState<ProductProposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [showDraftModal, setShowDraftModal] = useState(false);
  const [showProposalModal, setShowProposalModal] = useState(false);
  const [showNewProposalModal, setShowNewProposalModal] = useState(false);
  const router = useRouter();
  const { showError, showSuccess } = useToast();

  const fetchProducts = useCallback(async () => {
    try {
      // Get staff user from secure storage
      const staff = staffStorage.getUser() as StaffUser | null;
      if (!staff) {
        router.push('/staff/login');
        return;
      }
      
      const response = await fetch('/api/staff/products', {
        headers: {
          'x-staff-user-id': staff.id
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setProducts(data);
      } else {
        console.error('Failed to fetch products:', response.status);
        showError('Failed to fetch products');
      }
    } catch (error) {
      console.error('Error fetching products:', error);
      showError('Failed to fetch products');
    } finally {
      setLoading(false);
    }
  }, [showError, router]);

  const fetchDraftRecipes = useCallback(async () => {
    try {
      // Get staff user from secure storage
      const staff = staffStorage.getUser() as StaffUser | null;
      if (!staff) {
        return;
      }
      
      const response = await fetch('/api/staff/draft-recipes', {
        headers: {
          'x-staff-user-id': staff.id
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setDraftRecipes(data);
      } else {
        console.error('Failed to fetch draft recipes:', response.status);
      }
    } catch (error) {
      console.error('Error fetching draft recipes:', error);
    }
  }, []);

  const fetchProductProposals = useCallback(async () => {
    try {
      // Get staff user from secure storage
      const staff = staffStorage.getUser() as StaffUser | null;
      if (!staff) {
        return;
      }
      
      const response = await fetch('/api/staff/product-proposals', {
        headers: {
          'x-staff-user-id': staff.id
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setProductProposals(data);
      } else {
        console.error('Failed to fetch product proposals:', response.status);
      }
    } catch (error) {
      console.error('Error fetching product proposals:', error);
    }
  }, []);

  useEffect(() => {
    // Check if staff is logged in
    const staff = staffStorage.getUser() as StaffUser | null;
    const categories = staffStorage.getCategories() as Category[] | null;

    console.log('Staff dashboard - Retrieved data:', { staff, categories });

    if (!staff || !categories) {
      router.push('/staff/login');
      return;
    }

    setStaff(staff);
    setCategories(categories);
    fetchProducts();
    fetchDraftRecipes();
    fetchProductProposals();
  }, [router, fetchProducts, fetchDraftRecipes, fetchProductProposals]);

  const handleLogout = () => {
    staffStorage.clear();
    router.push('/staff/login');
  };

  const filteredProducts = selectedCategory 
    ? products.filter(p => p.category_id === selectedCategory)
    : products;

  const productsNeedingReview = products.filter(p => p.has_recipe && !p.recipe);
  const pendingDraftRecipes = draftRecipes.filter(d => d.status === 'pending');
  const pendingProductProposals = productProposals.filter(p => p.status === 'pending');

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!staff) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-md mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <User className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h1 className="font-semibold text-gray-900">{staff.name}</h1>
                <p className="text-sm text-gray-500 capitalize">{staff.role}</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="text-gray-500"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto p-4 space-y-4">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-3">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Package className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="text-2xl font-bold">{filteredProducts.length}</p>
                  <p className="text-xs text-gray-500">Products</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Edit3 className="h-5 w-5 text-orange-600" />
                <div>
                  <p className="text-2xl font-bold">{productsNeedingReview.length}</p>
                  <p className="text-xs text-gray-500">Need Review</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Pending Approvals Notice */}
        <Card 
          className="border-yellow-200 bg-yellow-50 cursor-pointer hover:bg-yellow-100 transition-colors"
          onClick={() => setShowDraftModal(true)}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Clock className="h-5 w-5 text-yellow-600" />
                <div>
                  <p className="text-sm font-medium text-yellow-800">📝 Draft Recipes Submitted</p>
                  <p className="text-xs text-yellow-600">Your recipe changes are saved as drafts and pending admin approval</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-yellow-800">{pendingDraftRecipes.length}</p>
                <p className="text-xs text-yellow-600">Pending</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Product Proposals Card */}
        <Card 
          className="border-blue-200 bg-blue-50 cursor-pointer hover:bg-blue-100 transition-colors"
          onClick={() => setShowProposalModal(true)}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Plus className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="text-sm font-medium text-blue-800">📝 Product Proposals Submitted</p>
                  <p className="text-xs text-blue-600">Your new product suggestions are pending admin approval</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-blue-800">{pendingProductProposals.length}</p>
                <p className="text-xs text-blue-600">Pending</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Add New Product Button */}
        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-4">
            <Button
              onClick={() => setShowNewProposalModal(true)}
              className="w-full bg-green-600 hover:bg-green-700 text-white"
            >
              <Plus className="h-4 w-4 mr-2" />
              Propose New Product
            </Button>
          </CardContent>
        </Card>

        {/* Category Filter */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Categories</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex flex-wrap gap-2">
              <Button
                variant={selectedCategory === null ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(null)}
                className="text-xs"
              >
                All
              </Button>
              {categories.map((category) => {
                console.log('Rendering category:', category);
                return (
                  <Button
                    key={category.category_id}
                    variant={selectedCategory === category.category_id ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedCategory(category.category_id)}
                    className="text-xs"
                  >
                    {category.category_name}
                  </Button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Products List */}
        <div className="space-y-3">
          <h2 className="font-semibold text-gray-900">Products</h2>
          {filteredProducts.map((product) => (
            <Card key={product.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900">{product.name}</h3>
                    <p className="text-sm text-gray-500">{product.category_name}</p>
                    <div className="flex items-center space-x-2 mt-2">
                      <Badge variant="outline" className="text-xs">
                        {product.price} RON
                      </Badge>
                      {product.has_recipe && (
                        <Badge variant="secondary" className="text-xs">
                          <ChefHat className="h-3 w-3 mr-1" />
                          Recipe
                        </Badge>
                      )}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => router.push(`/staff/products/${product.id}`)}
                    className="ml-3"
                  >
                    <Edit3 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredProducts.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center">
              <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No products found</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Draft Recipes Modal */}
      {showDraftModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-hidden">
            <div className="p-4 border-b flex justify-between items-center">
              <h2 className="text-lg font-semibold">Draft Recipes Submitted</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDraftModal(false)}
              >
                ✕
              </Button>
            </div>
            <div className="p-4 overflow-y-auto max-h-[60vh]">
              {draftRecipes.length === 0 ? (
                <div className="text-center py-8">
                  <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No draft recipes submitted yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {draftRecipes.map((draft) => (
                    <Card key={draft.id} className="border-l-4 border-l-yellow-400">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h3 className="font-medium text-gray-900">{draft.product_name}</h3>
                            <p className="text-sm text-gray-500">{draft.category_name}</p>
                          </div>
                          <Badge 
                            variant={draft.status === 'pending' ? 'secondary' : 
                                   draft.status === 'approved' ? 'default' : 'destructive'}
                            className="text-xs"
                          >
                            {draft.status}
                          </Badge>
                        </div>
                        
                        <div className="mt-3">
                          <h4 className="text-sm font-medium text-gray-700 mb-2">Proposed Recipe:</h4>
                          <div className="bg-gray-50 p-3 rounded text-sm">
                            {draft.proposed_recipe && draft.proposed_recipe.length > 0 ? (
                              <ul className="space-y-1">
                                {draft.proposed_recipe.map((ingredient, index) => (
                                  <li key={index} className="flex justify-between">
                                    <span>{ingredient.ingredient}</span>
                                    <span className="text-gray-500">
                                      {ingredient.quantity} {ingredient.unit}
                                    </span>
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <p className="text-gray-500 italic">No recipe proposed</p>
                            )}
                          </div>
                        </div>

                        {draft.admin_notes && (
                          <div className="mt-3">
                            <h4 className="text-sm font-medium text-gray-700 mb-1">Admin Notes:</h4>
                            <p className="text-sm text-gray-600 bg-blue-50 p-2 rounded">
                              {draft.admin_notes}
                            </p>
                          </div>
                        )}

                        <div className="mt-3 text-xs text-gray-500">
                          <p>Submitted: {new Date(draft.created_at).toLocaleString()}</p>
                          {draft.reviewed_at && (
                            <p>Reviewed: {new Date(draft.reviewed_at).toLocaleString()}</p>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Product Proposals Modal */}
      {showProposalModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-hidden">
            <div className="p-4 border-b flex justify-between items-center">
              <h2 className="text-lg font-semibold">Product Proposals Submitted</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowProposalModal(false)}
              >
                ✕
              </Button>
            </div>
            <div className="p-4 overflow-y-auto max-h-[60vh]">
              {productProposals.length === 0 ? (
                <div className="text-center py-8">
                  <Plus className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No product proposals submitted yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {productProposals.map((proposal) => (
                    <Card key={proposal.id} className="border-l-4 border-l-blue-400">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h3 className="font-medium text-gray-900">{proposal.name}</h3>
                            <p className="text-sm text-gray-500">{proposal.category_name}</p>
                            <p className="text-sm text-gray-600">Price: {proposal.price} RON</p>
                          </div>
                          <Badge 
                            variant={proposal.status === 'pending' ? 'secondary' : 
                                   proposal.status === 'approved' ? 'default' : 'destructive'}
                            className="text-xs"
                          >
                            {proposal.status}
                          </Badge>
                        </div>
                        
                        {proposal.description && (
                          <div className="mt-3">
                            <h4 className="text-sm font-medium text-gray-700 mb-1">Description:</h4>
                            <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                              {proposal.description}
                            </p>
                          </div>
                        )}

                        {proposal.recipe && proposal.recipe.length > 0 && (
                          <div className="mt-3">
                            <h4 className="text-sm font-medium text-gray-700 mb-2">Recipe:</h4>
                            <div className="bg-gray-50 p-3 rounded text-sm">
                              <ul className="space-y-1">
                                {proposal.recipe.map((ingredient, index) => (
                                  <li key={index} className="flex justify-between">
                                    <span>{ingredient.ingredient}</span>
                                    <span className="text-gray-500">
                                      {ingredient.quantity} {ingredient.unit}
                                    </span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        )}

                        {proposal.admin_notes && (
                          <div className="mt-3">
                            <h4 className="text-sm font-medium text-gray-700 mb-1">Admin Notes:</h4>
                            <p className="text-sm text-gray-600 bg-blue-50 p-2 rounded">
                              {proposal.admin_notes}
                            </p>
                          </div>
                        )}

                        <div className="mt-3 text-xs text-gray-500">
                          <p>Submitted: {new Date(proposal.created_at).toLocaleString()}</p>
                          {proposal.reviewed_at && (
                            <p>Reviewed: {new Date(proposal.reviewed_at).toLocaleString()}</p>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* New Product Proposal Modal */}
      {showNewProposalModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-hidden">
            <div className="p-4 border-b flex justify-between items-center">
              <h2 className="text-lg font-semibold">Propose New Product</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowNewProposalModal(false)}
              >
                ✕
              </Button>
            </div>
            <div className="p-4 overflow-y-auto max-h-[60vh]">
              <NewProductProposalForm 
                categories={categories}
                onSuccess={() => {
                  setShowNewProposalModal(false);
                  fetchProductProposals();
                  showSuccess('Product proposal submitted successfully!');
                }}
                onCancel={() => setShowNewProposalModal(false)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// New Product Proposal Form Component
function NewProductProposalForm({ 
  categories, 
  onSuccess, 
  onCancel 
}: { 
  categories: Category[]; 
  onSuccess: () => void; 
  onCancel: () => void; 
}) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    category_id: '',
    image_url: '',
    has_recipe: false,
    recipe: [] as Array<{ingredient: string; quantity: number; unit: string}>,
    is_frozen: false,
    is_vegetarian: false,
    is_spicy: false
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const staff = staffStorage.getUser() as StaffUser | null;
      if (!staff) {
        throw new Error('Staff user not found');
      }
      
      const response = await fetch('/api/staff/product-proposals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-staff-user-id': staff.id
        },
        body: JSON.stringify({
          ...formData,
          price: parseFloat(formData.price),
          category_id: formData.category_id ? parseInt(formData.category_id) : null
        })
      });

      if (response.ok) {
        onSuccess();
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Failed to submit proposal');
      }
    } catch (error) {
      console.error('Error submitting proposal:', error);
      alert('Failed to submit proposal: ' + (error as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const addRecipeIngredient = () => {
    setFormData(prev => ({
      ...prev,
      recipe: [...prev.recipe, { ingredient: '', quantity: 0, unit: 'g' }]
    }));
  };

  const updateRecipeIngredient = (index: number, field: string, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      recipe: prev.recipe.map((item, i) => 
        i === index ? { ...item, [field]: value } : item
      )
    }));
  };

  const removeRecipeIngredient = (index: number) => {
    setFormData(prev => ({
      ...prev,
      recipe: prev.recipe.filter((_, i) => i !== index)
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Product Name *</label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
          className="w-full p-2 border rounded-md"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
        <textarea
          value={formData.description}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          className="w-full p-2 border rounded-md"
          rows={3}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Price (RON) *</label>
          <input
            type="number"
            step="0.01"
            value={formData.price}
            onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
            className="w-full p-2 border rounded-md"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
          <select
            value={formData.category_id}
            onChange={(e) => setFormData(prev => ({ ...prev, category_id: e.target.value }))}
            className="w-full p-2 border rounded-md"
          >
            <option value="">Select Category</option>
            {categories.map(category => (
              <option key={category.category_id} value={category.category_id}>
                {category.category_name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Image URL</label>
        <input
          type="url"
          value={formData.image_url}
          onChange={(e) => setFormData(prev => ({ ...prev, image_url: e.target.value }))}
          className="w-full p-2 border rounded-md"
        />
      </div>

      <div className="flex items-center space-x-4">
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={formData.has_recipe}
            onChange={(e) => setFormData(prev => ({ ...prev, has_recipe: e.target.checked }))}
            className="mr-2"
          />
          Has Recipe
        </label>
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={formData.is_frozen}
            onChange={(e) => setFormData(prev => ({ ...prev, is_frozen: e.target.checked }))}
            className="mr-2"
          />
          Frozen
        </label>
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={formData.is_vegetarian}
            onChange={(e) => setFormData(prev => ({ ...prev, is_vegetarian: e.target.checked }))}
            className="mr-2"
          />
          Vegetarian
        </label>
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={formData.is_spicy}
            onChange={(e) => setFormData(prev => ({ ...prev, is_spicy: e.target.checked }))}
            className="mr-2"
          />
          Spicy
        </label>
      </div>

      {formData.has_recipe && (
        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="block text-sm font-medium text-gray-700">Recipe</label>
            <Button
              type="button"
              onClick={addRecipeIngredient}
              size="sm"
              variant="outline"
            >
              Add Ingredient
            </Button>
          </div>
          <div className="space-y-2">
            {formData.recipe.map((ingredient, index) => (
              <div key={index} className="flex gap-2 items-center">
                <input
                  type="text"
                  placeholder="Ingredient"
                  value={ingredient.ingredient}
                  onChange={(e) => updateRecipeIngredient(index, 'ingredient', e.target.value)}
                  className="flex-1 p-2 border rounded-md"
                />
                <input
                  type="number"
                  placeholder="Qty"
                  value={ingredient.quantity}
                  onChange={(e) => updateRecipeIngredient(index, 'quantity', parseFloat(e.target.value) || 0)}
                  className="w-20 p-2 border rounded-md"
                />
                <select
                  value={ingredient.unit}
                  onChange={(e) => updateRecipeIngredient(index, 'unit', e.target.value)}
                  className="w-20 p-2 border rounded-md"
                >
                  <option value="g">g</option>
                  <option value="kg">kg</option>
                  <option value="ml">ml</option>
                  <option value="l">l</option>
                  <option value="pcs">pcs</option>
                </select>
                <Button
                  type="button"
                  onClick={() => removeRecipeIngredient(index)}
                  size="sm"
                  variant="destructive"
                >
                  ✕
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-2 pt-4">
        <Button
          type="submit"
          disabled={submitting}
          className="flex-1"
        >
          {submitting ? 'Submitting...' : 'Submit Proposal'}
        </Button>
        <Button
          type="button"
          onClick={onCancel}
          variant="outline"
          className="flex-1"
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}

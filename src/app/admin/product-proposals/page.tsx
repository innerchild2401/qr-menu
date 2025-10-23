'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RefreshCw, Check, X, Clock, User, Package, Plus } from 'lucide-react';
import { useToast } from '@/hooks/useToast';
import { authenticatedApiCall, authenticatedApiCallWithBody } from '@/lib/api-helpers';

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
  admin_notes?: string;
  created_at: string;
  reviewed_at: string | null;
  category_id: number | null;
  category_name: string;
  staff_user: {
    id: string;
    name: string;
    role: string;
  };
}

export default function ProductProposalsPage() {
  const [proposals, setProposals] = useState<ProductProposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [adminNotes, setAdminNotes] = useState<Record<string, string>>({});
  const { showSuccess, showError } = useToast();

  const fetchProposals = useCallback(async () => {
    try {
      const response = await authenticatedApiCall('/api/admin/product-proposals');
      if (response.ok) {
        const data = await response.json();
        setProposals(data);
      } else {
        console.error('Failed to fetch proposals:', response.status);
        showError('Failed to fetch product proposals');
      }
    } catch (error) {
      console.error('Error fetching proposals:', error);
      showError('Failed to fetch product proposals');
    } finally {
      setLoading(false);
    }
  }, [showError]);

  useEffect(() => {
    fetchProposals();
  }, [fetchProposals]);

  const handleApproval = async (proposalId: string, action: 'approve' | 'reject') => {
    setProcessing(proposalId);
    try {
      const response = await authenticatedApiCallWithBody('/api/admin/product-proposals', {
        proposal_id: proposalId,
        action,
        admin_notes: adminNotes[proposalId] || ''
      }, {
        method: 'PUT'
      });

      if (response.ok) {
        showSuccess(`Product proposal ${action}d successfully`);
        setAdminNotes(prev => ({ ...prev, [proposalId]: '' }));
        await fetchProposals();
      } else {
        const error = await response.json();
        showError(error.error || `Failed to ${action} product proposal`);
      }
    } catch (error) {
      console.error(`Error ${action}ing product proposal:`, error);
      showError(`Failed to ${action} product proposal`);
    } finally {
      setProcessing(null);
    }
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const renderRecipe = (recipe: Array<{ingredient: string; quantity: number; unit: string}> | null, title: string) => {
    if (!recipe || recipe.length === 0) return null;

    return (
      <div>
        <h4 className="text-sm font-medium text-gray-700 mb-2">{title}</h4>
        <div className="bg-gray-50 p-3 rounded text-sm">
          <ul className="space-y-1">
            {recipe.map((ingredient, index) => (
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
    );
  };

  const pendingProposals = proposals.filter(p => p.status === 'pending');
  const processedProposals = proposals.filter(p => p.status !== 'pending');

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
          <h1 className="text-3xl font-bold">Product Proposals</h1>
          <p className="text-muted-foreground">Review and approve product proposals from staff</p>
        </div>
        <Button onClick={fetchProposals} variant="outline" className="flex items-center gap-2">
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Pending Proposals */}
      {pendingProposals.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Clock className="h-5 w-5 text-yellow-600" />
            Pending Approvals ({pendingProposals.length})
          </h2>
          <div className="space-y-4">
            {pendingProposals.map((proposal) => (
              <Card key={proposal.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Package className="h-5 w-5" />
                        {proposal.name}
                      </CardTitle>
                      <CardDescription className="flex items-center gap-4 mt-2">
                        <span className="flex items-center gap-1">
                          <User className="h-4 w-4" />
                          {proposal.staff_user.name} ({proposal.staff_user.role})
                        </span>
                        <span>Price: {proposal.price} RON</span>
                        <span>Category: {proposal.category_name}</span>
                      </CardDescription>
                    </div>
                    <Badge className={getStatusColor(proposal.status)}>
                      {proposal.status}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {proposal.description && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-1">Description:</h4>
                      <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                        {proposal.description}
                      </p>
                    </div>
                  )}

                  {proposal.has_recipe && renderRecipe(proposal.recipe, 'Recipe')}

                  <div className="flex flex-wrap gap-2">
                    {proposal.is_frozen && <Badge variant="outline">Frozen</Badge>}
                    {proposal.is_vegetarian && <Badge variant="outline">Vegetarian</Badge>}
                    {proposal.is_spicy && <Badge variant="outline">Spicy</Badge>}
                  </div>
                  
                  <div>
                    <Label htmlFor={`notes-${proposal.id}`}>Admin Notes (Optional)</Label>
                    <Textarea
                      id={`notes-${proposal.id}`}
                      placeholder="Add notes for the staff member..."
                      value={adminNotes[proposal.id] || ''}
                      onChange={(e) => setAdminNotes(prev => ({ ...prev, [proposal.id]: e.target.value }))}
                      className="mt-1"
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleApproval(proposal.id, 'approve')}
                      disabled={processing === proposal.id}
                      className="flex items-center gap-2"
                    >
                      <Check className="h-4 w-4" />
                      Approve
                    </Button>
                    <Button
                      onClick={() => handleApproval(proposal.id, 'reject')}
                      disabled={processing === proposal.id}
                      variant="destructive"
                      className="flex items-center gap-2"
                    >
                      <X className="h-4 w-4" />
                      Reject
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Processed Proposals */}
      {processedProposals.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Clock className="h-5 w-5 text-gray-600" />
            Processed Proposals ({processedProposals.length})
          </h2>
          <div className="space-y-4">
            {processedProposals.map((proposal) => (
              <Card key={proposal.id} className="opacity-75">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Package className="h-5 w-5" />
                        {proposal.name}
                      </CardTitle>
                      <CardDescription className="flex items-center gap-4 mt-2">
                        <span className="flex items-center gap-1">
                          <User className="h-4 w-4" />
                          {proposal.staff_user.name} ({proposal.staff_user.role})
                        </span>
                        <span>Price: {proposal.price} RON</span>
                        <span>Category: {proposal.category_name}</span>
                      </CardDescription>
                    </div>
                    <Badge className={getStatusColor(proposal.status)}>
                      {proposal.status}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {proposal.description && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-1">Description:</h4>
                      <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                        {proposal.description}
                      </p>
                    </div>
                  )}

                  {proposal.has_recipe && renderRecipe(proposal.recipe, 'Recipe')}

                  {proposal.admin_notes && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-1">Admin Notes:</h4>
                      <p className="text-sm text-gray-600 bg-blue-50 p-2 rounded">
                        {proposal.admin_notes}
                      </p>
                    </div>
                  )}

                  <div className="text-xs text-gray-500">
                    <p>Submitted: {formatTime(proposal.created_at)}</p>
                    {proposal.reviewed_at && (
                      <p>Reviewed: {formatTime(proposal.reviewed_at)}</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {proposals.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No product proposals found</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

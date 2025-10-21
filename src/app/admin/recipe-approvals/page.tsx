'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RefreshCw, Check, X, Clock, User, Package } from 'lucide-react';
import { useToast } from '@/hooks/useToast';
import { authenticatedApiCall, authenticatedApiCallWithBody } from '@/lib/api-helpers';

interface RecipeApproval {
  id: string;
  product_id: number;
  product_name: string;
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
  admin_notes?: string;
  created_at: string;
  reviewed_at?: string;
  staff_user: {
    id: string;
    name: string;
    role: string;
  };
}

export default function RecipeApprovalsPage() {
  const [approvals, setApprovals] = useState<RecipeApproval[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [adminNotes, setAdminNotes] = useState<Record<string, string>>({});
  const { showSuccess, showError } = useToast();

  const fetchApprovals = useCallback(async () => {
    try {
      const response = await authenticatedApiCall('/api/admin/recipe-approvals');
      if (response.ok) {
        const data = await response.json();
        setApprovals(data);
      } else {
        console.error('Failed to fetch approvals:', response.status);
        showError('Failed to fetch recipe approvals');
      }
    } catch (error) {
      console.error('Error fetching approvals:', error);
      showError('Failed to fetch recipe approvals');
    } finally {
      setLoading(false);
    }
  }, [showError]);

  useEffect(() => {
    fetchApprovals();
  }, [fetchApprovals]);

  const handleApproval = async (approvalId: string, action: 'approve' | 'reject') => {
    setProcessing(approvalId);
    try {
      const response = await authenticatedApiCallWithBody('/api/admin/recipe-approvals', {
        approval_id: approvalId,
        action,
        admin_notes: adminNotes[approvalId] || ''
      });

      if (response.ok) {
        showSuccess(`Recipe ${action}d successfully`);
        setAdminNotes(prev => ({ ...prev, [approvalId]: '' }));
        await fetchApprovals();
      } else {
        const error = await response.json();
        showError(error.error || `Failed to ${action} recipe`);
      }
    } catch (error) {
      console.error(`Error ${action}ing recipe:`, error);
      showError(`Failed to ${action} recipe`);
    } finally {
      setProcessing(null);
    }
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const renderRecipe = (recipe: Array<{ ingredient: string; quantity: number; unit: string; }> | null, title: string) => {
    if (!recipe || recipe.length === 0) {
      return <p className="text-muted-foreground italic">No recipe</p>;
    }

    return (
      <div>
        <h4 className="font-medium mb-2">{title}</h4>
        <ul className="space-y-1">
          {recipe.map((item, index) => (
            <li key={index} className="text-sm">
              <span className="font-medium">{item.quantity} {item.unit}</span> - {item.ingredient}
            </li>
          ))}
        </ul>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  const pendingApprovals = approvals.filter(a => a.status === 'pending');
  const processedApprovals = approvals.filter(a => a.status !== 'pending');

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Recipe Approvals</h1>
          <p className="text-muted-foreground">
            Review and approve staff recipe changes
          </p>
        </div>
        <Button onClick={fetchApprovals} variant="outline" className="flex items-center gap-2">
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      {approvals.length === 0 ? (
        <Card>
          <CardContent className="flex items-center justify-center h-32">
            <p className="text-muted-foreground">No recipe approvals found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Pending Approvals */}
          {pendingApprovals.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Pending Approvals ({pendingApprovals.length})
              </h2>
              <div className="space-y-4">
                {pendingApprovals.map((approval) => (
                  <Card key={approval.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="flex items-center gap-2">
                            <Package className="h-5 w-5" />
                            {approval.product_name}
                          </CardTitle>
                          <CardDescription>
                            Submitted by {approval.staff_user.name} ({approval.staff_user.role}) on {formatTime(approval.created_at)}
                          </CardDescription>
                        </div>
                        <Badge className={getStatusColor(approval.status)}>
                          {approval.status.toUpperCase()}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid md:grid-cols-2 gap-4">
                        {renderRecipe(approval.current_recipe, 'Current Recipe')}
                        {renderRecipe(approval.proposed_recipe, 'Proposed Recipe')}
                      </div>
                      
                      <div>
                        <Label htmlFor={`notes-${approval.id}`}>Admin Notes (Optional)</Label>
                        <Textarea
                          id={`notes-${approval.id}`}
                          placeholder="Add notes for the staff member..."
                          value={adminNotes[approval.id] || ''}
                          onChange={(e) => setAdminNotes(prev => ({ ...prev, [approval.id]: e.target.value }))}
                          className="mt-1"
                        />
                      </div>

                      <div className="flex gap-2">
                        <Button
                          onClick={() => handleApproval(approval.id, 'approve')}
                          disabled={processing === approval.id}
                          className="flex items-center gap-2"
                        >
                          <Check className="h-4 w-4" />
                          Approve
                        </Button>
                        <Button
                          onClick={() => handleApproval(approval.id, 'reject')}
                          disabled={processing === approval.id}
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

          {/* Processed Approvals */}
          {processedApprovals.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Processed Approvals</h2>
              <div className="space-y-4">
                {processedApprovals.map((approval) => (
                  <Card key={approval.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Package className="h-4 w-4" />
                            <span className="font-medium">{approval.product_name}</span>
                            <Badge className={getStatusColor(approval.status)}>
                              {approval.status.toUpperCase()}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            By {approval.staff_user.name} • {formatTime(approval.created_at)}
                            {approval.reviewed_at && ` • Reviewed ${formatTime(approval.reviewed_at)}`}
                          </p>
                          {approval.admin_notes && (
                            <p className="text-sm mt-2 italic text-muted-foreground">
                              Admin notes: {approval.admin_notes}
                            </p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

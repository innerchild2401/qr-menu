'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button-improved';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, 
  Trash2, 
  ChevronDown, 
  ChevronRight, 
  Calculator,
  TrendingUp,
  Calendar,
  FileText,
  Sparkles,
  BarChart3,
  Target
} from 'lucide-react';
import { typography, spacing } from '@/lib/design-system';

interface FixedCost {
  id: string;
  label: string;
  amount: number;
  isPercentage: boolean;
  category: 'fixed' | 'percentage';
}

interface InsightFolder {
  id: string;
  title: string;
  summary: string;
  createdAt: string;
  costs: FixedCost[];
  isExpanded: boolean;
}

const predefinedCosts: Omit<FixedCost, 'id'>[] = [
  { label: 'Labour', amount: 0, isPercentage: false, category: 'fixed' },
  { label: 'Rent', amount: 0, isPercentage: false, category: 'fixed' },
  { label: 'Utilities', amount: 0, isPercentage: false, category: 'fixed' },
  { label: 'Software', amount: 0, isPercentage: false, category: 'fixed' },
  { label: 'Marketing', amount: 0, isPercentage: false, category: 'fixed' },
  { label: 'Labour Taxes', amount: 0, isPercentage: true, category: 'percentage' },
  { label: 'Business Taxes', amount: 0, isPercentage: true, category: 'percentage' },
  { label: 'Others', amount: 0, isPercentage: false, category: 'fixed' },
];

export default function AdminInsights() {
  const [fixedCosts, setFixedCosts] = useState<FixedCost[]>([]);
  const [insightFolders, setInsightFolders] = useState<InsightFolder[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize predefined costs
  useEffect(() => {
    const initialCosts = predefinedCosts.map((cost, index) => ({
      ...cost,
      id: `predefined-${index}`,
    }));
    setFixedCosts(initialCosts);
    setIsLoading(false);
  }, []);

  const addCustomCost = () => {
    const newCost: FixedCost = {
      id: `custom-${Date.now()}`,
      label: '',
      amount: 0,
      isPercentage: false,
      category: 'fixed',
    };
    setFixedCosts([...fixedCosts, newCost]);
  };

  const removeCost = (id: string) => {
    setFixedCosts(fixedCosts.filter(cost => cost.id !== id));
  };

  const updateCost = (id: string, field: keyof FixedCost, value: string | boolean) => {
    setFixedCosts(fixedCosts.map(cost => {
      if (cost.id === id) {
        if (field === 'amount') {
          return { ...cost, amount: parseFloat(value as string) || 0 };
        } else if (field === 'isPercentage') {
          return { ...cost, isPercentage: value as boolean, category: value ? 'percentage' : 'fixed' };
        } else {
          return { ...cost, [field]: value };
        }
      }
      return cost;
    }));
  };

  const generateInsights = async () => {
    setIsGenerating(true);
    
    try {
      // Simulate API call to generate insights
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const newInsight: InsightFolder = {
        id: `insight-${Date.now()}`,
        title: `Insight Analysis - ${new Date().toLocaleDateString()}`,
        summary: `Based on your fixed costs analysis, here are the key insights for your restaurant operations:

**Cost Breakdown:**
${fixedCosts.map(cost => 
  `• ${cost.label}: ${cost.isPercentage ? `${cost.amount}%` : `$${cost.amount.toLocaleString()}`}`
).join('\n')}

**Key Recommendations:**
1. **Labor Optimization**: Consider implementing scheduling software to optimize labor costs
2. **Energy Efficiency**: Review utility usage patterns and implement energy-saving measures
3. **Marketing ROI**: Track marketing spend effectiveness and adjust strategies accordingly
4. **Tax Planning**: Ensure proper tax planning to minimize business tax burden

**Next Steps:**
- Monitor these costs monthly for trend analysis
- Set up automated reporting for better visibility
- Consider seasonal adjustments for variable costs`,
        createdAt: new Date().toISOString(),
        costs: [...fixedCosts],
        isExpanded: false,
      };
      
      setInsightFolders([newInsight, ...insightFolders]);
    } catch (error) {
      console.error('Error generating insights:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const toggleInsightExpansion = (id: string) => {
    setInsightFolders(insightFolders.map(insight => 
      insight.id === id ? { ...insight, isExpanded: !insight.isExpanded } : insight
    ));
  };

  const totalFixedCosts = fixedCosts
    .filter(cost => !cost.isPercentage)
    .reduce((sum, cost) => sum + cost.amount, 0);

  const totalPercentageCosts = fixedCosts
    .filter(cost => cost.isPercentage)
    .reduce((sum, cost) => sum + cost.amount, 0);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center gap-3">
          <h1 className={`${typography.h1} text-high-contrast`}>
            Insight Ledger
          </h1>
          <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300">
            Beta
          </Badge>
        </div>
        <p className={`${typography.body} text-medium-contrast max-w-2xl mx-auto`}>
          AI-driven analyst for your restaurant operations
        </p>
      </div>

      {/* Fixed Costs Section */}
      <Card className={`${spacing.lg} bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/10 dark:to-indigo-900/10 border-blue-200 dark:border-blue-800`}>
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
              <Calculator className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className={`${typography.h3} text-high-contrast`}>Fixed Costs Analysis</h2>
              <p className="text-medium-contrast">Enter your monthly fixed costs and percentages</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Cost Inputs */}
            <div className="space-y-4">
              <h3 className={`${typography.h4} text-high-contrast`}>Cost Categories</h3>
              <div className="space-y-3">
                {fixedCosts.map((cost) => (
                  <div key={cost.id} className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                    <div className="flex-1">
                      <Input
                        value={cost.label}
                        onChange={(e) => updateCost(cost.id, 'label', e.target.value)}
                        placeholder="Cost category"
                        className="text-high-contrast"
                      />
                    </div>
                    <div className="w-32">
                      <Input
                        type="number"
                        value={cost.amount}
                        onChange={(e) => updateCost(cost.id, 'amount', e.target.value)}
                        placeholder="0"
                        className="text-high-contrast"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Label className="text-sm text-medium-contrast">%</Label>
                      <input
                        type="checkbox"
                        checked={cost.isPercentage}
                        onChange={(e) => updateCost(cost.id, 'isPercentage', e.target.checked)}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                    </div>
                    {cost.id.startsWith('custom-') && (
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => removeCost(cost.id)}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
              
              <Button
                variant="outline"
                onClick={addCustomCost}
                className="w-full border-dashed border-2 border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Custom Cost
              </Button>
            </div>

            {/* Summary */}
            <div className="space-y-4">
              <h3 className={`${typography.h4} text-high-contrast`}>Cost Summary</h3>
              <div className="space-y-3">
                <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between">
                    <span className="text-medium-contrast">Total Fixed Costs</span>
                    <span className={`${typography.h4} text-green-600 dark:text-green-400`}>
                      ${totalFixedCosts.toLocaleString()}
                    </span>
                  </div>
                </div>
                <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between">
                    <span className="text-medium-contrast">Total Percentage Costs</span>
                    <span className={`${typography.h4} text-orange-600 dark:text-orange-400`}>
                      {totalPercentageCosts.toFixed(1)}%
                    </span>
                  </div>
                </div>
                <div className="p-4 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg text-white">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Monthly Analysis Ready</span>
                    <Sparkles className="w-5 h-5" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-center pt-4">
            <Button
              onClick={generateInsights}
              disabled={isGenerating || fixedCosts.length === 0}
              loading={isGenerating}
              size="lg"
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg"
            >
              {isGenerating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Generating Insights...
                </>
              ) : (
                <>
                  <BarChart3 className="w-5 h-5 mr-2" />
                  Generate Insights
                </>
              )}
            </Button>
          </div>
        </div>
      </Card>

      {/* Insight Folders */}
      {insightFolders.length > 0 && (
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
              <FileText className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h2 className={`${typography.h3} text-high-contrast`}>Saved Insights</h2>
              <p className="text-medium-contrast">{insightFolders.length} analysis saved</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {insightFolders.map((insight) => (
              <Card 
                key={insight.id} 
                className={`${spacing.md} bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:shadow-lg transition-all duration-200 cursor-pointer`}
                onClick={() => toggleInsightExpansion(insight.id)}
              >
                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className={`${typography.h4} text-high-contrast truncate`}>
                        {insight.title}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        <Calendar className="w-4 h-4 text-medium-contrast" />
                        <span className="text-sm text-medium-contrast">
                          {new Date(insight.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="text-medium-contrast hover:text-high-contrast"
                    >
                      {insight.isExpanded ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                    </Button>
                  </div>

                  {insight.isExpanded && (
                    <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                      <div className="prose prose-sm max-w-none dark:prose-invert">
                        <div className="whitespace-pre-line text-medium-contrast leading-relaxed">
                          {insight.summary}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 pt-2">
                        <Target className="w-4 h-4 text-blue-500" />
                        <span className="text-sm text-medium-contrast">
                          {insight.costs.length} cost categories analyzed
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {insightFolders.length === 0 && (
        <Card className={`${spacing.lg} text-center bg-gray-50 dark:bg-gray-800/50`}>
          <div className="space-y-4">
            <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center mx-auto">
              <TrendingUp className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h3 className={`${typography.h4} text-high-contrast`}>No Insights Yet</h3>
              <p className="text-medium-contrast">
                Generate your first AI-powered analysis by entering your fixed costs above
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

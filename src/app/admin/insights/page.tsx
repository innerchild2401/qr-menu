'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button-improved';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, 
  Trash2, 
  ChevronRight, 
  Calculator,
  TrendingUp,
  FileText,
  Sparkles,
  BarChart3,
  Target,
  CheckCircle,
  XCircle,
  Brain,
  Zap,
  Activity,
  DollarSign,
  PieChart,
  Lightbulb,
  ArrowRight,
  Clock,
  Shield
} from 'lucide-react';
import { typography } from '@/lib/design-system';
import { 
  generateRestaurantInsights, 
  saveInsightFolder, 
  getInsightFolders,
  type GPTInsightResponse,
  type APIFixedCost
} from '@/lib/api/gpt-insights';
import { authenticatedApiCall } from '@/lib/api-helpers';

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
  data: GPTInsightResponse;
  isExpanded: boolean;
}

interface Restaurant {
  id: string;
  name: string;
  slug: string;
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
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Load restaurant data and existing insights
  useEffect(() => {
    const loadData = async () => {
      try {
        // Load restaurant data
        const restaurantResponse = await authenticatedApiCall('/api/admin/me/restaurant');
        const restaurantData = await restaurantResponse.json();
        
        if (restaurantData.success && restaurantData.data) {
          setRestaurant(restaurantData.data);
          
          // Load existing insight folders
          const insightsResponse = await getInsightFolders(restaurantData.data.id);
          if (insightsResponse.success && insightsResponse.data) {
            setInsightFolders(insightsResponse.data);
          }
        }

        // Initialize predefined costs
        const initialCosts = predefinedCosts.map((cost, index) => ({
          ...cost,
          id: `predefined-${index}`,
        }));
        setFixedCosts(initialCosts);
      } catch (error) {
        console.error('Error loading data:', error);
        setError('Failed to load restaurant data');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
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
    if (!restaurant) {
      setError('Restaurant data not available');
      return;
    }

    setIsGenerating(true);
    setError(null);
    setSuccess(null);
    
    try {
      // Prepare fixed costs for API
      const apiFixedCosts: APIFixedCost[] = fixedCosts.map(cost => ({
        label: cost.label,
        amount: cost.amount,
        isPercentage: cost.isPercentage,
        category: cost.category,
      }));

      // Generate insights using GPT API
      const insightData = await generateRestaurantInsights({
        fixedCosts: apiFixedCosts,
        restaurantId: restaurant.id,
        userCountry: 'US', // TODO: Get from user location
      });

      // Save insight folder to database
      const saveResult = await saveInsightFolder(insightData, restaurant.id);
      
      if (saveResult.success && saveResult.id) {
        const newInsight: InsightFolder = {
          id: saveResult.id,
          title: `Insight Analysis - ${new Date().toLocaleDateString()}`,
          summary: insightData.summary,
          createdAt: new Date().toISOString(),
          data: insightData,
          isExpanded: false,
        };
        
        setInsightFolders([newInsight, ...insightFolders]);
        setSuccess('Insights generated successfully!');
      } else {
        throw new Error(saveResult.error || 'Failed to save insights');
      }
    } catch (error) {
      console.error('Error generating insights:', error);
      setError(
        error instanceof Error 
          ? error.message 
          : 'Failed to generate insights. Please try again.'
      );
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-blue-900/20 dark:to-indigo-900/30">
      {/* Premium Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 via-purple-600/10 to-indigo-600/10 dark:from-blue-400/5 dark:via-purple-400/5 dark:to-indigo-400/5" />
        <div className="relative px-6 py-12">
          <div className="max-w-7xl mx-auto text-center space-y-6">
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="flex items-center justify-center gap-4"
            >
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl blur-lg opacity-30 animate-pulse" />
                <div className="relative bg-gradient-to-r from-blue-500 to-purple-600 p-4 rounded-2xl">
                  <Brain className="w-8 h-8 text-white" />
                </div>
              </div>
              <div className="text-left">
                <h1 className={`${typography.h1} bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent`}>
                  Insight Ledger
                </h1>
                <div className="flex items-center gap-2">
                  <Badge className="bg-gradient-to-r from-blue-500 to-purple-600 text-white border-0 px-3 py-1">
                    <Zap className="w-3 h-3 mr-1" />
                    AI-Powered
                  </Badge>
                  <Badge variant="outline" className="border-blue-200 text-blue-700 dark:border-blue-800 dark:text-blue-300">
                    Beta
                  </Badge>
                </div>
              </div>
            </motion.div>
            
            <motion.p 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.5 }}
              className={`${typography.body} text-slate-600 dark:text-slate-300 max-w-3xl mx-auto leading-relaxed`}
            >
              Your AI financial analyst is ready to optimize your restaurant operations. 
              Enter your costs and let artificial intelligence provide actionable insights.
            </motion.p>
          </div>
        </div>
      </motion.div>

      {/* Error/Success Messages */}
      <AnimatePresence>
        {error && (
          <motion.div 
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ duration: 0.3 }}
            className="max-w-7xl mx-auto px-6 mb-6"
          >
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 flex items-center gap-3 shadow-lg">
              <XCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-red-800 dark:text-red-200">Analysis Error</h3>
                <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
              </div>
            </div>
          </motion.div>
        )}

        {success && (
          <motion.div 
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ duration: 0.3 }}
            className="max-w-7xl mx-auto px-6 mb-6"
          >
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4 flex items-center gap-3 shadow-lg">
              <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-green-800 dark:text-green-200">Analysis Complete</h3>
                <p className="text-sm text-green-700 dark:text-green-300">{success}</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content - 2 Column Layout */}
      <div className="max-w-7xl mx-auto px-6 pb-12">
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          
          {/* Left Column - Cost Inputs */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="space-y-6"
          >
            <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-0 shadow-xl">
              <div className="p-8">
                <div className="flex items-center gap-4 mb-6">
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl blur-md opacity-20" />
                    <div className="relative bg-gradient-to-r from-blue-500 to-purple-600 p-3 rounded-xl">
                      <Calculator className="w-6 h-6 text-white" />
                    </div>
                  </div>
                  <div>
                    <h2 className={`${typography.h3} text-slate-800 dark:text-slate-100`}>Cost Analysis</h2>
                    <p className="text-slate-600 dark:text-slate-400">Configure your operational expenses</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className={`${typography.h4} text-slate-700 dark:text-slate-200 flex items-center gap-2`}>
                    <PieChart className="w-5 h-5" />
                    Cost Categories
                  </h3>
                  
                  <div className="space-y-3">
                    <AnimatePresence>
                      {fixedCosts.map((cost, index) => (
                        <motion.div
                          key={cost.id}
                          initial={{ opacity: 0, y: 20, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: -20, scale: 0.95 }}
                          transition={{ duration: 0.3, delay: index * 0.05 }}
                          className="group flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl border border-slate-200 dark:border-slate-600 hover:border-blue-300 dark:hover:border-blue-500 transition-all duration-200 hover:shadow-md"
                        >
                          <div className="flex-1">
                            <Input
                              value={cost.label}
                              onChange={(e) => updateCost(cost.id, 'label', e.target.value)}
                              placeholder="Cost category"
                              className="border-0 bg-transparent text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500/20"
                            />
                          </div>
                          <div className="w-28">
                            <Input
                              type="number"
                              value={cost.amount}
                              onChange={(e) => updateCost(cost.id, 'amount', e.target.value)}
                              placeholder="0"
                              className="border-0 bg-transparent text-slate-800 dark:text-slate-100 text-center focus:ring-2 focus:ring-blue-500/20"
                            />
                          </div>
                          <div className="flex items-center gap-2">
                            <Label className="text-sm text-slate-500 dark:text-slate-400">%</Label>
                            <input
                              type="checkbox"
                              checked={cost.isPercentage}
                              onChange={(e) => updateCost(cost.id, 'isPercentage', e.target.checked)}
                              className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                            />
                          </div>
                          {cost.id.startsWith('custom-') && (
                            <motion.div
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                            >
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                onClick={() => removeCost(cost.id)}
                                className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </motion.div>
                          )}
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                  
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Button
                      variant="outline"
                      onClick={addCustomCost}
                      className="w-full border-dashed border-2 border-slate-300 dark:border-slate-600 hover:border-blue-400 dark:hover:border-blue-500 bg-transparent hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all duration-200"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Custom Cost
                    </Button>
                  </motion.div>
                </div>
              </div>
            </Card>

            {/* Cost Summary Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.6 }}
            >
              <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-200 dark:border-blue-800">
                <div className="p-6">
                  <h3 className={`${typography.h4} text-slate-700 dark:text-slate-200 mb-4 flex items-center gap-2`}>
                    <DollarSign className="w-5 h-5" />
                    Cost Summary
                  </h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-white/60 dark:bg-slate-800/60 rounded-xl">
                      <span className="text-slate-600 dark:text-slate-300">Fixed Costs</span>
                      <span className={`${typography.h4} text-green-600 dark:text-green-400 font-bold`}>
                        ${totalFixedCosts.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-4 bg-white/60 dark:bg-slate-800/60 rounded-xl">
                      <span className="text-slate-600 dark:text-slate-300">Percentage Costs</span>
                      <span className={`${typography.h4} text-orange-600 dark:text-orange-400 font-bold`}>
                        {totalPercentageCosts.toFixed(1)}%
                      </span>
                    </div>
                    <div className="p-4 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl text-white">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold">Ready for AI Analysis</span>
                        <Activity className="w-5 h-5" />
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            </motion.div>
          </motion.div>

          {/* Right Column - AI Insights */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="space-y-6"
          >
            {/* Generate Button */}
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Button
                onClick={generateInsights}
                disabled={isGenerating || fixedCosts.length === 0}
                size="lg"
                className="w-full h-16 bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 hover:from-blue-700 hover:via-purple-700 hover:to-indigo-700 text-white shadow-2xl border-0 rounded-2xl font-semibold text-lg relative overflow-hidden group"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="relative flex items-center gap-3">
                  {isGenerating ? (
                    <>
                      <div className="animate-spin rounded-full h-6 w-6 border-2 border-white border-t-transparent" />
                      <span>AI Analyzing...</span>
                    </>
                  ) : (
                    <>
                      <div className="relative">
                        <Brain className="w-6 h-6" />
                        <div className="absolute inset-0 animate-ping">
                          <Brain className="w-6 h-6 opacity-30" />
                        </div>
                      </div>
                      <span>Generate AI Insights</span>
                      <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </div>
              </Button>
            </motion.div>

            {/* AI Insights Section */}
            <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-0 shadow-xl">
              <div className="p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-600 rounded-xl blur-md opacity-20" />
                    <div className="relative bg-gradient-to-r from-purple-500 to-pink-600 p-3 rounded-xl">
                      <Brain className="w-6 h-6 text-white" />
                    </div>
                  </div>
                  <div>
                    <h2 className={`${typography.h3} text-slate-800 dark:text-slate-100`}>AI Reports</h2>
                    <p className="text-slate-600 dark:text-slate-400">
                      {insightFolders.length > 0 ? `${insightFolders.length} analysis completed` : 'No reports yet'}
                    </p>
                  </div>
                </div>

                {insightFolders.length > 0 ? (
                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    <AnimatePresence>
                      {insightFolders.map((insight, index) => (
                        <motion.div
                          key={insight.id}
                          initial={{ opacity: 0, y: 20, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: -20, scale: 0.95 }}
                          transition={{ duration: 0.3, delay: index * 0.1 }}
                          className="group"
                        >
                          <Card 
                            className="bg-gradient-to-r from-slate-50 to-blue-50 dark:from-slate-700/50 dark:to-blue-900/20 border-slate-200 dark:border-slate-600 hover:border-purple-300 dark:hover:border-purple-500 transition-all duration-300 cursor-pointer hover:shadow-lg"
                            onClick={() => toggleInsightExpansion(insight.id)}
                          >
                            <div className="p-5">
                              <div className="flex items-start justify-between">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-2">
                                    <div className="w-2 h-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full" />
                                    <h3 className={`${typography.h4} text-slate-800 dark:text-slate-100 truncate`}>
                                      {insight.title}
                                    </h3>
                                  </div>
                                  <div className="flex items-center gap-3 text-sm text-slate-500 dark:text-slate-400">
                                    <div className="flex items-center gap-1">
                                      <Clock className="w-4 h-4" />
                                      {new Date(insight.createdAt).toLocaleDateString()}
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <Shield className="w-4 h-4" />
                                      AI Verified
                                    </div>
                                  </div>
                                </div>
                                <motion.div
                                  animate={{ rotate: insight.isExpanded ? 90 : 0 }}
                                  transition={{ duration: 0.2 }}
                                >
                                  <Button
                                    variant="ghost"
                                    size="icon-sm"
                                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                                  >
                                    <ChevronRight className="w-4 h-4" />
                                  </Button>
                                </motion.div>
                              </div>

                              <AnimatePresence>
                                {insight.isExpanded && (
                                  <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    transition={{ duration: 0.3 }}
                                    className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-600"
                                  >
                                    {/* Summary */}
                                    <div className="mb-6">
                                      <h4 className="font-semibold text-slate-700 dark:text-slate-200 mb-3 flex items-center gap-2">
                                        <Lightbulb className="w-4 h-4" />
                                        Executive Summary
                                      </h4>
                                      <div className="prose prose-sm max-w-none dark:prose-invert">
                                        <div className="whitespace-pre-line text-slate-600 dark:text-slate-300 leading-relaxed">
                                          {insight.summary}
                                        </div>
                                      </div>
                                    </div>

                                    {/* Structured Data Display */}
                                    <div className="grid grid-cols-1 gap-4">
                                      {/* Break Even Analysis */}
                                      {insight.data.breakEvenAnalysis && insight.data.breakEvenAnalysis.length > 0 && (
                                        <div className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-xl p-4 border border-blue-200 dark:border-blue-800">
                                          <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-3 flex items-center gap-2">
                                            <BarChart3 className="w-4 h-4" />
                                            Break Even Analysis
                                          </h4>
                                          <div className="space-y-3">
                                            {insight.data.breakEvenAnalysis.slice(0, 3).map((item, index) => (
                                              <div key={index} className="flex items-center justify-between p-3 bg-white/60 dark:bg-slate-800/60 rounded-lg">
                                                <div>
                                                  <div className="font-medium text-blue-800 dark:text-blue-200">{item.menuItem}</div>
                                                  <div className="text-sm text-blue-600 dark:text-blue-300">
                                                    {item.isProfitable ? '✓ Profitable' : '⚠ Needs Review'}
                                                  </div>
                                                </div>
                                                <div className="text-right">
                                                  <div className="font-bold text-blue-900 dark:text-blue-100">
                                                    {item.profitMargin.toFixed(1)}%
                                                  </div>
                                                  <div className="text-xs text-blue-600 dark:text-blue-400">Margin</div>
                                                </div>
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      )}

                                      {/* Profitability Suggestions */}
                                      {insight.data.profitabilitySuggestions && insight.data.profitabilitySuggestions.length > 0 && (
                                        <div className="bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-xl p-4 border border-green-200 dark:border-green-800">
                                          <h4 className="font-semibold text-green-900 dark:text-green-100 mb-3 flex items-center gap-2">
                                            <TrendingUp className="w-4 h-4" />
                                            Profitability Opportunities
                                          </h4>
                                          <div className="space-y-3">
                                            {insight.data.profitabilitySuggestions.slice(0, 3).map((suggestion, index) => (
                                              <div key={index} className="flex items-center justify-between p-3 bg-white/60 dark:bg-slate-800/60 rounded-lg">
                                                <div>
                                                  <div className="font-medium text-green-800 dark:text-green-200">{suggestion.menuItem}</div>
                                                  <div className="text-sm text-green-600 dark:text-green-300">{suggestion.reasoning}</div>
                                                </div>
                                                <div className="text-right">
                                                  <div className="font-bold text-green-900 dark:text-green-100">
                                                    +${suggestion.expectedProfitIncrease.toFixed(2)}
                                                  </div>
                                                  <div className="text-xs text-green-600 dark:text-green-400">Potential</div>
                                                </div>
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      )}

                                      {/* Upsell Ideas */}
                                      {insight.data.upsellIdeas && insight.data.upsellIdeas.length > 0 && (
                                        <div className="bg-gradient-to-r from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-xl p-4 border border-purple-200 dark:border-purple-800">
                                          <h4 className="font-semibold text-purple-900 dark:text-purple-100 mb-3 flex items-center gap-2">
                                            <Sparkles className="w-4 h-4" />
                                            Upsell Opportunities
                                          </h4>
                                          <div className="space-y-3">
                                            {insight.data.upsellIdeas.slice(0, 3).map((idea, index) => (
                                              <div key={index} className="p-3 bg-white/60 dark:bg-slate-800/60 rounded-lg">
                                                <div className="font-medium text-purple-800 dark:text-purple-200 mb-1">{idea.menuItem}</div>
                                                <div className="text-sm text-purple-600 dark:text-purple-300 mb-2">
                                                  +{idea.upsellItem} (+${idea.additionalRevenue.toFixed(2)})
                                                </div>
                                                <div className="text-xs text-purple-500 dark:text-purple-400">{idea.reasoning}</div>
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      )}

                                      {/* Marketing Popups */}
                                      {insight.data.marketingPopups && insight.data.marketingPopups.length > 0 && (
                                        <div className="bg-gradient-to-r from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 rounded-xl p-4 border border-orange-200 dark:border-orange-800">
                                          <h4 className="font-semibold text-orange-900 dark:text-orange-100 mb-3 flex items-center gap-2">
                                            <FileText className="w-4 h-4" />
                                            Marketing Campaigns
                                          </h4>
                                          <div className="space-y-3">
                                            {insight.data.marketingPopups.slice(0, 2).map((popup, index) => (
                                              <div key={index} className="p-3 bg-white/60 dark:bg-slate-800/60 rounded-lg">
                                                <div className="font-medium text-orange-800 dark:text-orange-200 mb-1">{popup.title}</div>
                                                <div className="text-sm text-orange-600 dark:text-orange-300 mb-2">{popup.message}</div>
                                                <div className="text-xs text-orange-500 dark:text-orange-400">
                                                  Timing: {popup.timing} | Impact: {popup.expectedImpact}
                                                </div>
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                    
                                    <div className="flex items-center gap-2 pt-4 mt-4 border-t border-slate-200 dark:border-slate-600 text-sm text-slate-500 dark:text-slate-400">
                                      <Target className="w-4 h-4" />
                                      <span>Generated on {new Date(insight.createdAt).toLocaleString()}</span>
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          </Card>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                ) : (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5 }}
                    className="text-center py-12"
                  >
                    <div className="w-20 h-20 bg-gradient-to-r from-blue-100 to-purple-100 dark:from-blue-900/20 dark:to-purple-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Brain className="w-10 h-10 text-blue-600 dark:text-blue-400" />
                    </div>
                    <h3 className={`${typography.h4} text-slate-700 dark:text-slate-200 mb-2`}>Ready for AI Analysis</h3>
                    <p className="text-slate-500 dark:text-slate-400">
                      Enter your costs and generate your first AI-powered insights
                    </p>
                  </motion.div>
                )}
              </div>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

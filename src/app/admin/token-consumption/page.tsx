'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button-improved';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Shield, 
  DollarSign, 
  Users, 
  Download,
  Filter,
  ChevronLeft,
  ChevronRight,
  BarChart3,
  Clock,
  Zap
} from 'lucide-react';
import { typography } from '@/lib/design-system';
import { authenticatedApiCall } from '@/lib/api-helpers';
import { supabase } from '@/lib/auth-supabase';

interface TokenConsumption {
  id: string;
  userEmail: string;
  apiEndpoint: string;
  requestId: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  promptCostUsd: number;
  completionCostUsd: number;
  totalCostUsd: number;
  model: string;
  createdAt: string;
}

interface DashboardStats {
  totalTokens: number;
  totalCost: number;
  topUsers: Array<{
    userEmail: string;
    totalTokens: number;
    totalCost: number;
  }>;
}

interface User {
  id: string;
  email: string;
}

export default function TokenConsumptionPage() {
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [consumptionData, setConsumptionData] = useState<TokenConsumption[]>([]);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Filters
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [users, setUsers] = useState<User[]>([]);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const itemsPerPage = 20;

  // Check authorization
  useEffect(() => {
    const checkAuthorization = async () => {
      try {
        // Get user session to check email
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session?.user) {
          setIsAuthorized(false);
          setIsLoading(false);
          return;
        }

        // Check if user is authorized (afilip.mme@gmail.com)
        const isAdmin = session.user.email === 'afilip.mme@gmail.com';
        setIsAuthorized(isAdmin);
        
        if (isAdmin) {
          await loadData();
        }
      } catch (error) {
        console.error('Authorization check failed:', error);
        setIsAuthorized(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuthorization();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      
      // Load consumption data
      const consumptionResponse = await authenticatedApiCall('/api/admin/token-consumption');
      const consumptionData = await consumptionResponse.json();
      
      if (consumptionData.success) {
        setConsumptionData(consumptionData.data.consumption);
        setTotalPages(Math.ceil(consumptionData.data.total / itemsPerPage));
      }
      
      // Load dashboard stats
      const statsResponse = await authenticatedApiCall('/api/admin/token-consumption/stats');
      const statsData = await statsResponse.json();
      
      if (statsData.success) {
        setDashboardStats(statsData.data);
      }
      
      // Load users for filter
      const usersResponse = await authenticatedApiCall('/api/admin/token-consumption/users');
      const usersData = await usersResponse.json();
      
      if (usersData.success) {
        setUsers(usersData.data);
      }
      
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const exportToCSV = () => {
    const headers = [
      'User Email',
      'Date/Time',
      'API Endpoint',
      'Prompt Tokens',
      'Completion Tokens',
      'Total Tokens',
      'Cost (USD)',
      'Model'
    ];
    
    const csvData = consumptionData.map(item => [
      item.userEmail || 'Unknown',
      item.createdAt ? new Date(item.createdAt).toLocaleString() : 'Unknown',
      item.apiEndpoint || 'Unknown',
      item.promptTokens || 0,
      item.completionTokens || 0,
      item.totalTokens || 0,
      (item.totalCostUsd || 0).toFixed(6),
      item.model || 'Unknown'
    ]);
    
    const csvContent = [headers, ...csvData]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `token-consumption-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const applyFilters = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: itemsPerPage.toString(),
        ...(selectedUser && { user: selectedUser }),
        ...(dateFrom && { dateFrom }),
        ...(dateTo && { dateTo })
      });
      
      const response = await authenticatedApiCall(`/api/admin/token-consumption?${params}`);
      const data = await response.json();
      
      if (data.success) {
        setConsumptionData(data.data.consumption);
        setTotalPages(Math.ceil(data.data.total / itemsPerPage));
      }
    } catch (error) {
      console.error('Failed to apply filters:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const resetFilters = () => {
    setSelectedUser('');
    setDateFrom('');
    setDateTo('');
    setCurrentPage(1);
    loadData();
  };

  // Show 403 Forbidden if not authorized
  if (isAuthorized === false) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-100 dark:from-red-900/20 dark:to-orange-900/30 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          <div className="w-24 h-24 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <Shield className="w-12 h-12 text-red-600 dark:text-red-400" />
          </div>
          <h1 className="text-4xl font-bold text-red-800 dark:text-red-200 mb-4">
            403 Forbidden
          </h1>
            <p className="text-lg text-red-600 dark:text-red-300 mb-6">
              You don&apos;t have permission to access this page.
            </p>
          <Button
            onClick={() => window.history.back()}
            variant="outline"
            className="border-red-200 text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-900/20"
          >
            Go Back
          </Button>
        </motion.div>
      </div>
    );
  }

  if (isLoading && isAuthorized === null) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-blue-900/20 dark:to-indigo-900/30">
      {/* Header */}
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
                  <BarChart3 className="w-8 h-8 text-white" />
                </div>
              </div>
              <div className="text-left">
                <h1 className={`${typography.h1} bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent`}>
                  Token Consumption
                </h1>
                <div className="flex items-center gap-2">
                  <Badge className="bg-gradient-to-r from-blue-500 to-purple-600 text-white border-0 px-3 py-1">
                    <Shield className="w-3 h-3 mr-1" />
                    Admin Only
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
              Monitor GPT API usage and costs across all users. Track token consumption, 
              analyze spending patterns, and optimize AI resource utilization.
            </motion.p>
          </div>
        </div>
      </motion.div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 pb-12">
        {/* Dashboard Stats */}
        {dashboardStats && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8"
          >
            <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-0 shadow-xl">
              <div className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                    <Zap className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-slate-600 dark:text-slate-400">Total Tokens</h3>
                    <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                      {(dashboardStats.totalTokens || 0).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            </Card>

            <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-0 shadow-xl">
              <div className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
                    <DollarSign className="w-6 h-6 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-slate-600 dark:text-slate-400">Total Cost</h3>
                    <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                      ${dashboardStats.totalCost.toFixed(4)}
                    </p>
                  </div>
                </div>
              </div>
            </Card>

            <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-0 shadow-xl">
              <div className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                    <Users className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-slate-600 dark:text-slate-400">Active Users</h3>
                    <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                      {dashboardStats.topUsers.length}
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>
        )}

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="mb-8"
        >
          <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-0 shadow-xl">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <Filter className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                <h2 className={`${typography.h4} text-slate-800 dark:text-slate-100`}>Filters</h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    User
                  </label>
                  <select
                    value={selectedUser}
                    onChange={(e) => setSelectedUser(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                  >
                    <option value="">All Users</option>
                    {users.map((user) => (
                      <option key={user.id} value={user.email}>
                        {user.email}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Date From
                  </label>
                  <Input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="w-full"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Date To
                  </label>
                  <Input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="w-full"
                  />
                </div>
                
                <div className="flex items-end gap-2">
                  <Button onClick={applyFilters} className="flex-1">
                    Apply Filters
                  </Button>
                  <Button onClick={resetFilters} variant="outline">
                    Reset
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Data Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.6 }}
        >
          <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-0 shadow-xl">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                  <h2 className={`${typography.h4} text-slate-800 dark:text-slate-100`}>Consumption Logs</h2>
                </div>
                <Button onClick={exportToCSV} variant="outline" className="flex items-center gap-2">
                  <Download className="w-4 h-4" />
                  Export CSV
                </Button>
              </div>

              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-700">
                        <th className="text-left py-3 px-4 font-semibold text-slate-700 dark:text-slate-300">User Email</th>
                        <th className="text-left py-3 px-4 font-semibold text-slate-700 dark:text-slate-300">Date/Time</th>
                        <th className="text-left py-3 px-4 font-semibold text-slate-700 dark:text-slate-300">API Endpoint</th>
                        <th className="text-right py-3 px-4 font-semibold text-slate-700 dark:text-slate-300">Prompt Tokens</th>
                        <th className="text-right py-3 px-4 font-semibold text-slate-700 dark:text-slate-300">Completion Tokens</th>
                        <th className="text-right py-3 px-4 font-semibold text-slate-700 dark:text-slate-300">Total Tokens</th>
                        <th className="text-right py-3 px-4 font-semibold text-slate-700 dark:text-slate-300">Cost (USD)</th>
                      </tr>
                    </thead>
                    <tbody>
                      <AnimatePresence>
                        {consumptionData.map((item, index) => (
                          <motion.tr
                            key={item.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.2, delay: index * 0.05 }}
                            className="border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50"
                          >
                            <td className="py-3 px-4 text-slate-900 dark:text-slate-100">{item.userEmail}</td>
                            <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                              {new Date(item.createdAt).toLocaleString()}
                            </td>
                            <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                              <Badge variant="outline" className="text-xs">
                                {item.apiEndpoint}
                              </Badge>
                            </td>
                            <td className="py-3 px-4 text-right text-slate-900 dark:text-slate-100">
                              {(item.promptTokens || 0).toLocaleString()}
                            </td>
                            <td className="py-3 px-4 text-right text-slate-900 dark:text-slate-100">
                              {(item.completionTokens || 0).toLocaleString()}
                            </td>
                            <td className="py-3 px-4 text-right font-semibold text-slate-900 dark:text-slate-100">
                              {(item.totalTokens || 0).toLocaleString()}
                            </td>
                            <td className="py-3 px-4 text-right font-semibold text-green-600 dark:text-green-400">
                              ${(item.totalCostUsd || 0).toFixed(6)}
                            </td>
                          </motion.tr>
                        ))}
                      </AnimatePresence>
                    </tbody>
                  </table>
                </div>
              )}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-6">
                  <div className="text-sm text-slate-600 dark:text-slate-400">
                    Page {currentPage} of {totalPages}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                      variant="outline"
                      size="sm"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <Button
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                      variant="outline"
                      size="sm"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}

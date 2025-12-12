'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { 
  Settings, 
  FolderOpen, 
  Package, 
  QrCode, 
  MessageSquare, 
  CheckSquare, 
  Menu, 
  LogOut,
  ChevronRight,
  BarChart3,
  Activity,
  DollarSign,
  Users,
  History,
  ClipboardCheck,
  Plus,
  LayoutDashboard,
  Map,
  Contact
} from 'lucide-react';
import { supabase } from '@/lib/auth-supabase';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const getSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) {
          console.error('Session error:', error);
          router.push('/');
          return;
        }
        if (!session) {
          router.push('/');
          return;
        }
        setUser(session.user);
        setIsLoading(false);
      } catch (error) {
        console.error('Error getting session:', error);
        router.push('/');
      }
    };

    getSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        try {
          if (!session) {
            router.push('/');
            return;
          }
          setUser(session.user);
          setIsLoading(false);
        } catch (error) {
          console.error('Auth state change error:', error);
          router.push('/');
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [router]);

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Sign out error:', error);
      }
      router.push('/');
    } catch (error) {
      console.error('Error during sign out:', error);
      router.push('/');
    }
  };

  const navigationItems = [
    { href: '/admin/settings', icon: Settings, label: 'Settings' },
    { href: '/admin/dining-room', icon: LayoutDashboard, label: 'Dining Room' },
    { href: '/admin/areas-tables', icon: Map, label: 'Areas & Tables' },
    { href: '/admin/crm/customers', icon: Contact, label: 'Customers' },
    { href: '/admin/categories', icon: FolderOpen, label: 'Categories' },
    { href: '/admin/products', icon: Package, label: 'Products' },
    { href: '/admin/menu', icon: Menu, label: 'Menu Preview' },
    { href: '/admin/popups', icon: MessageSquare, label: 'Popups' },
    { href: '/admin/qr', icon: QrCode, label: 'QR Codes' },
    { href: '/admin/insights', icon: BarChart3, label: 'Insight Ledger' },
    { href: '/admin/token-consumption', icon: Activity, label: 'Token Consumption' },
    { href: '/admin/ingredient-costs', icon: DollarSign, label: 'Ingredient Costs' },
    { href: '/admin/staff', icon: Users, label: 'Staff Management' },
    { href: '/admin/staff-activity', icon: History, label: 'Staff Activity' },
    { href: '/admin/recipe-approvals', icon: ClipboardCheck, label: 'Recipe Approvals' },
    { href: '/admin/product-proposals', icon: Plus, label: 'Product Proposals' },
    { href: '/admin/checklist', icon: CheckSquare, label: 'Checklist' },
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </Card>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background flex overflow-hidden">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      
      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-card border-r border-border transform transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:inset-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-6 border-b border-border">
            <div className="flex items-center justify-between">
              <h1 className="text-xl font-bold text-foreground">Admin Panel</h1>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSidebarOpen(false)}
                className="lg:hidden"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </Button>
            </div>
            {user && (
              <div className="mt-2 text-sm text-muted-foreground break-words">
                {user.email}
              </div>
            )}
          </div>
          
          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className="flex items-center space-x-3 px-3 py-2 rounded-lg text-foreground hover:bg-muted transition-colors"
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  <span className="flex-1 break-words">{item.label}</span>
                  <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                </Link>
              );
            })}
          </nav>
          
          {/* Footer */}
          <div className="p-4 border-t border-border">
            <Button
              onClick={handleSignOut}
              variant="ghost"
              className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <LogOut className="w-5 h-5 mr-3 flex-shrink-0" />
              <span className="break-words">Sign Out</span>
            </Button>
          </div>
        </div>
      </div>
      
      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile header */}
        <div className="lg:hidden p-4 border-b border-border bg-card">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSidebarOpen(true)}
            className="p-2"
          >
            <Menu className="w-5 h-5" />
          </Button>
        </div>
        
        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <div className="max-w-full min-w-0">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

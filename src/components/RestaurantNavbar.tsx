'use client';

import { Button } from '@/components/ui/button';
import { QrCode, ShoppingCart } from 'lucide-react';
import { layout } from '@/lib/design-system';
import { useOrder } from '@/contexts/OrderContext';

export default function RestaurantNavbar() {
  const { totalItems, setShowOrderSummary } = useOrder();

  const handleLogoClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (confirm('Are you sure you want to leave this restaurant? You\'ll be taken to SmartMenu\'s digital menu creation service.')) {
      window.location.href = '/';
    }
  };

  return (
    <nav className="bg-white/95 backdrop-blur-sm border-b sticky top-0 z-50 shadow-sm">
      <div className={layout.container}>
        <div className="flex justify-between items-center h-16">
          {/* Logo - triggers confirmation dialog */}
          <button 
            onClick={handleLogoClick}
            className="flex items-center space-x-2 hover:opacity-80 transition-opacity"
          >
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <QrCode className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold text-foreground">SmartMenu</span>
          </button>

          {/* My Order Button - replaces hamburger menu */}
          <Button 
            variant="default" 
            size="sm" 
            className="rounded-lg shadow-sm hover:shadow-md transition-shadow bg-blue-600 hover:bg-blue-700 relative"
            onClick={() => setShowOrderSummary(true)}
          >
            <ShoppingCart className="w-4 h-4 mr-2" />
            My Order
            {totalItems > 0 && (
              <div className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">
                {totalItems}
              </div>
            )}
          </Button>
        </div>
      </div>
    </nav>
  );
}

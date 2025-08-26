'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { QrCode, Menu, X } from 'lucide-react';
import LoginModal from './LoginModal';

export default function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);

  return (
    <>
      <nav className="bg-white border-b sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <QrCode className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold text-foreground">SmartMenu</span>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-6">
              <Link 
                href="/menu/demo" 
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                Demo Menu
              </Link>
              <Link 
                href="#features" 
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                Features
              </Link>
              <Button variant="outline" onClick={() => setShowLoginModal(true)}>
                Sign In
              </Button>
            </div>

            {/* Mobile menu button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden"
            >
              {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden border-t bg-white">
            <div className="px-4 py-4 space-y-4">
              <Link 
                href="/menu/demo" 
                className="block text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                Demo Menu
              </Link>
              <Link 
                href="#features" 
                className="block text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                Features
              </Link>
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowLoginModal(true);
                  setIsMenuOpen(false);
                }}
                className="w-full"
              >
                Sign In
              </Button>
            </div>
          </div>
        )}
      </nav>

      {/* Login Modal */}
      <LoginModal 
        isOpen={showLoginModal} 
        onClose={() => setShowLoginModal(false)} 
      />
    </>
  );
}

'use client';

import { usePathname } from 'next/navigation';
import Navbar from './Navbar';
import RestaurantNavbar from './RestaurantNavbar';

export default function ConditionalNavbar() {
  const pathname = usePathname();
  
  // Don't render Navbar on admin pages
  if (pathname?.startsWith('/admin')) {
    return null;
  }
  
  // Use special navbar for restaurant menu pages
  if (pathname?.startsWith('/menu/')) {
    return <RestaurantNavbar />;
  }
  
  return <Navbar />;
}

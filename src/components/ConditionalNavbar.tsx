'use client';

import { usePathname } from 'next/navigation';
import Navbar from './Navbar';

export default function ConditionalNavbar() {
  const pathname = usePathname();
  
  // Don't render Navbar on admin pages
  if (pathname?.startsWith('/admin')) {
    return null;
  }
  
  // Don't render Navbar on restaurant menu pages (it will be rendered inside the page)
  if (pathname?.startsWith('/menu/')) {
    return null;
  }
  
  return <Navbar />;
}

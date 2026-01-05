'use client';

import { useState, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Home, Scan, Clock } from 'lucide-react';

export function BottomNav() {
  const pathname = usePathname();
  const [isVisible, setIsVisible] = useState(true);
  
  // ✅ FIX: Use useRef to track scroll values without triggering re-renders
  const lastScrollY = useRef(0);

  // Hide entirely on scan page
  if (pathname === '/scan') return null;

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      // Always show at the very top (safeguard)
      if (currentScrollY < 10) {
        setIsVisible(true);
        lastScrollY.current = currentScrollY;
        return;
      }

      // Determine scroll direction
      // We use a small threshold (10px) to prevent flickering on small movements
      if (currentScrollY > lastScrollY.current + 10) {
        // Scrolling DOWN -> Hide
        setIsVisible(false);
      } else if (currentScrollY < lastScrollY.current - 10) {
        // Scrolling UP -> Show
        setIsVisible(true);
      }

      // Update ref (does not trigger re-render)
      lastScrollY.current = currentScrollY;
    };

    // Add event listener
    window.addEventListener('scroll', handleScroll, { passive: true });

    // Cleanup
    return () => window.removeEventListener('scroll', handleScroll);
  }, []); // ✅ FIX: Empty dependency array ensures this runs once and doesn't loop

  // Helper to define active link styles
  const getLinkClass = (path: string) => {
    const isActive = pathname === path;
    return `
      flex flex-col items-center justify-center w-16 h-full space-y-1 transition-colors duration-200
      ${isActive ? 'text-blue-600' : 'text-slate-500 hover:text-slate-900'} 
    `;
  };

  return (
    <div 
      className={`
        fixed bottom-6 left-4 right-4 md:hidden z-50
        transition-transform duration-500 cubic-bezier(0.32, 0.72, 0, 1)
        ${isVisible ? 'translate-y-0' : 'translate-y-[200%]'}
      `}
    >
      <nav className="
        flex justify-between items-center px-6 h-[72px]
        bg-white/95 backdrop-blur-md supports-[backdrop-filter]:bg-white/80
        rounded-[2rem]
        shadow-[0_8px_30px_rgb(0,0,0,0.12)]
        border border-white/20 ring-1 ring-black/5
      ">
        
        {/* Home Link */}
        <Link href="/" className={getLinkClass('/')}>
          <Home size={24} strokeWidth={pathname === '/' ? 2.5 : 2} />
          <span className="text-[10px] font-bold">Home</span>
        </Link>

        {/* Scan Link - Floating Action Button Style */}
        <Link href="/scan" className="relative -top-8 group outline-none select-none">
          <div className="
            flex flex-col items-center justify-center
            w-16 h-16
            bg-gradient-to-tr from-blue-600 to-indigo-600 
            rounded-full 
            shadow-[0_8px_20px_rgba(37,99,235,0.4)]
            ring-[6px] ring-slate-50/80 backdrop-blur-sm
            transition-transform duration-200 group-active:scale-95
          ">
             <Scan size={28} className="text-white drop-shadow-md" strokeWidth={2.5} />
          </div>
          {/* Label outside the circle */}
          <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] font-bold text-slate-500 group-hover:text-blue-600 transition-colors">
            Scan
          </span>
        </Link>

        {/* History Link */}
        <Link href="/history" className={getLinkClass('/history')}>
          <Clock size={24} strokeWidth={pathname === '/history' ? 2.5 : 2} />
          <span className="text-[10px] font-bold">History</span>
        </Link>

      </nav>
    </div>
  );
}

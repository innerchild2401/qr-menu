import { useEffect, useRef } from 'react';

/**
 * Custom hook to lock body scroll when modals/drawers are open
 * Prevents scroll chaining and maintains scroll position
 */
export function useBodyScrollLock(isLocked: boolean) {
  const scrollPosition = useRef(0);
  const originalStyle = useRef<{
    overflow: string;
    position: string;
    top: string;
    width: string;
  } | null>(null);

  useEffect(() => {
    if (isLocked) {
      // Store current scroll position
      scrollPosition.current = window.pageYOffset;
      
      // Store original styles
      const body = document.body;
      originalStyle.current = {
        overflow: body.style.overflow,
        position: body.style.position,
        top: body.style.top,
        width: body.style.width,
      };

      // Apply scroll lock styles
      body.style.overflow = 'hidden';
      body.style.position = 'fixed';
      body.style.top = `-${scrollPosition.current}px`;
      body.style.width = '100%';
      
      // Add class for additional styling
      body.classList.add('scroll-locked');
    } else {
      // Restore original styles
      if (originalStyle.current) {
        const body = document.body;
        body.style.overflow = originalStyle.current.overflow;
        body.style.position = originalStyle.current.position;
        body.style.top = originalStyle.current.top;
        body.style.width = originalStyle.current.width;
        
        // Remove scroll lock class
        body.classList.remove('scroll-locked');
        
        // Restore scroll position
        window.scrollTo(0, scrollPosition.current);
      }
    }

    // Cleanup function
    return () => {
      if (isLocked && originalStyle.current) {
        const body = document.body;
        body.style.overflow = originalStyle.current.overflow;
        body.style.position = originalStyle.current.position;
        body.style.top = originalStyle.current.top;
        body.style.width = originalStyle.current.width;
        body.classList.remove('scroll-locked');
        window.scrollTo(0, scrollPosition.current);
      }
    };
  }, [isLocked]);
}

/**
 * Hook for managing multiple scroll locks (e.g., nested modals)
 */
export function useScrollLockManager() {
  const lockCount = useRef(0);
  const isLocked = lockCount.current > 0;

  const lock = () => {
    lockCount.current += 1;
  };

  const unlock = () => {
    lockCount.current = Math.max(0, lockCount.current - 1);
  };

  useBodyScrollLock(isLocked);

  return { lock, unlock, isLocked };
}

import React, { useCallback, useMemo, useRef, useEffect } from 'react';

/**
 * Performance optimization hook that provides memoization utilities
 */
export const usePerformance = () => {
  const renderCount = useRef(0);
  const lastRenderTime = useRef(performance.now());

  useEffect(() => {
    renderCount.current += 1;
    const currentTime = performance.now();
    const timeSinceLastRender = currentTime - lastRenderTime.current;
    lastRenderTime.current = currentTime;

    if (process.env.NODE_ENV === 'development') {
      
    }
  });

  return {
    renderCount: renderCount.current,
    timeSinceLastRender: performance.now() - lastRenderTime.current,
  };
};

/**
 * Optimized useCallback with dependency comparison
 */
export const useOptimizedCallback = <T extends (...args: any[]) => any>(
  callback: T,
  deps: React.DependencyList
): T => {
  return useCallback(callback, deps);
};

/**
 * Optimized useMemo with dependency comparison
 */
export const useOptimizedMemo = <T>(
  factory: () => T,
  deps: React.DependencyList
): T => {
  return useMemo(factory, deps);
};

/**
 * Hook to debounce function calls
 */
export const useDebounce = <T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T => {
  const timeoutRef = useRef<NodeJS.Timeout>();

  return useCallback(
    ((...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => callback(...args), delay);
    }) as T,
    [callback, delay]
  );
};

/**
 * Hook to throttle function calls
 */
export const useThrottle = <T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T => {
  const lastCall = useRef(0);
  const lastCallTimer = useRef<NodeJS.Timeout>();

  return useCallback(
    ((...args: Parameters<T>) => {
      const now = Date.now();
      if (now - lastCall.current >= delay) {
        callback(...args);
        lastCall.current = now;
      } else {
        if (lastCallTimer.current) {
          clearTimeout(lastCallTimer.current);
        }
        lastCallTimer.current = setTimeout(() => {
          callback(...args);
          lastCall.current = Date.now();
        }, delay - (now - lastCall.current));
      }
    }) as T,
    [callback, delay]
  );
};

/**
 * Hook to measure component performance
 */
export const usePerformanceMonitor = (componentName: string) => {
  const startTime = useRef(performance.now());
  const mountTime = useRef<number | null>(null);

  useEffect(() => {
    mountTime.current = performance.now() - startTime.current;
    
    if (process.env.NODE_ENV === 'development') {
      
    }

    return () => {
      if (process.env.NODE_ENV === 'development') {
        
      }
    };
  }, [componentName]);

  return {
    mountTime: mountTime.current,
  };
};

/**
 * Hook to optimize list rendering with virtualization hints
 */
export const useListOptimization = <T>(
  items: T[],
  itemHeight: number,
  containerHeight: number
) => {
  return useMemo(() => {
    const visibleCount = Math.ceil(containerHeight / itemHeight) + 2; // +2 for buffer
    const startIndex = 0;
    const endIndex = Math.min(visibleCount, items.length);

    return {
      visibleItems: items.slice(startIndex, endIndex),
      totalHeight: items.length * itemHeight,
      startIndex,
      endIndex,
      itemHeight,
    };
  }, [items, itemHeight, containerHeight]);
};

/**
 * Hook to optimize expensive calculations
 */
export const useExpensiveCalculation = <T>(
  calculation: () => T,
  deps: React.DependencyList,
  shouldRecalculate: boolean = true
): T | null => {
  return useMemo(() => {
    if (!shouldRecalculate) return null;
    return calculation();
  }, [...deps, shouldRecalculate]);
};

/**
 * Hook to batch state updates for better performance
 */
export const useBatchedState = <T>(initialState: T) => {
  const [state, setState] = React.useState<T>(initialState);
  const batchRef = useRef<T[]>([]);
  const timeoutRef = useRef<NodeJS.Timeout>();

  const batchedSetState = useCallback((updates: T[]) => {
    batchRef.current.push(...updates);
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      if (batchRef.current.length > 0) {
        const lastUpdate = batchRef.current[batchRef.current.length - 1];
        setState(lastUpdate);
        batchRef.current = [];
      }
    }, 16); // ~60fps
  }, []);

  return [state, batchedSetState] as const;
}; 
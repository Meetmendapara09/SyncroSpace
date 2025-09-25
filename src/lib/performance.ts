/**
 * Performance optimization utilities for real-time operations
 * This module provides throttling and debouncing mechanisms to optimize resource usage
 */

/**
 * Throttles a function to limit how often it can be called
 * @param fn The function to throttle
 * @param delay The minimum time between function calls in milliseconds
 * @returns A throttled version of the function
 */
export function throttle<T extends (...args: any[]) => any>(
  fn: T, 
  delay: number
): (...args: Parameters<T>) => ReturnType<T> | undefined {
  let lastCall = 0;
  let lastResult: ReturnType<T>;

  return function(this: any, ...args: Parameters<T>) {
    const now = Date.now();
    if (now - lastCall < delay) {
      return lastResult;
    }
    lastCall = now;
    lastResult = fn.apply(this, args);
    return lastResult;
  };
}

/**
 * Debounces a function to delay its execution until after a specified delay
 * @param fn The function to debounce
 * @param delay The delay in milliseconds
 * @returns A debounced version of the function
 */
export function debounce<T extends (...args: any[]) => any>(
  fn: T, 
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout;

  return function(this: any, ...args: Parameters<T>) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      fn.apply(this, args);
    }, delay);
  };
}

/**
 * Rate limits the number of calls to a function within a time window
 * @param fn The function to rate limit
 * @param limit The maximum number of calls allowed in the time window
 * @param timeWindow The time window in milliseconds
 * @returns A rate-limited version of the function
 */
export function rateLimit<T extends (...args: any[]) => any>(
  fn: T, 
  limit: number, 
  timeWindow: number
): (...args: Parameters<T>) => ReturnType<T> | undefined {
  let calls = 0;
  let resetTimeout: NodeJS.Timeout | null = null;
  let lastResult: ReturnType<T>;

  return function(this: any, ...args: Parameters<T>) {
    if (calls < limit) {
      calls++;
      lastResult = fn.apply(this, args);
      
      if (!resetTimeout) {
        resetTimeout = setTimeout(() => {
          calls = 0;
          resetTimeout = null;
        }, timeWindow);
      }
      
      return lastResult;
    }
    
    return undefined;
  };
}

/**
 * Batch multiple calls to a function into a single call
 * @param fn The function to batch
 * @param delay The delay before processing the batch
 * @returns A batched version of the function
 */
export function batchCalls<T extends (...args: any[]) => any>(
  fn: T, 
  delay: number
): (...args: Parameters<T>) => void {
  let batched = false;
  let args: Parameters<T>[] = [];

  return function(this: any, ...newArgs: Parameters<T>) {
    args.push(newArgs);
    
    if (!batched) {
      batched = true;
      setTimeout(() => {
        fn.call(this, args);
        batched = false;
        args = [];
      }, delay);
    }
  };
}

/**
 * Creates a memory-efficient version of a function that caches its results
 * @param fn The function to memoize
 * @param maxSize The maximum cache size (items)
 * @returns A memoized version of the function
 */
export function memoizeWithLimit<T extends (...args: any[]) => any>(
  fn: T, 
  maxSize: number = 100
): (...args: Parameters<T>) => ReturnType<T> {
  const cache = new Map<string, ReturnType<T>>();

  return function(this: any, ...args: Parameters<T>) {
    const key = JSON.stringify(args);
    
    if (cache.has(key)) {
      return cache.get(key)!;
    }
    
    const result = fn.apply(this, args);
    
    // If cache is full, remove oldest entry
    if (cache.size >= maxSize) {
      const firstKey = cache.keys().next().value;
      if (firstKey !== undefined) {
        cache.delete(firstKey);
      }
    }
    
    cache.set(key, result);
    return result;
  };
}

/**
 * Limits the maximum number of concurrent calls to async functions
 * @param fn The async function to limit concurrency for
 * @param maxConcurrent The maximum number of concurrent executions
 * @returns A concurrency-limited version of the function
 */
export function limitConcurrency<T extends (...args: any[]) => Promise<any>>(
  fn: T, 
  maxConcurrent: number
): (...args: Parameters<T>) => Promise<ReturnType<T>> {
  let running = 0;
  const queue: { args: Parameters<T>, resolve: (value: ReturnType<T>) => void, reject: (reason: any) => void }[] = [];

  const runNext = () => {
    if (running >= maxConcurrent || queue.length === 0) return;
    
    running++;
    const { args, resolve, reject } = queue.shift()!;
    
    fn(...args)
      .then((result) => {
        running--;
        resolve(result);
        runNext();
      })
      .catch((err) => {
        running--;
        reject(err);
        runNext();
      });
  };

  return async function(this: any, ...args: Parameters<T>): Promise<ReturnType<T>> {
    return new Promise((resolve, reject) => {
      queue.push({ args, resolve, reject });
      runNext();
    });
  };
}
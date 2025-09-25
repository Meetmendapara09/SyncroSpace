/**
 * Caching utilities for API responses and data fetching
 * 
 * This file provides utilities for efficiently caching data in memory,
 * localStorage, and using the SWR pattern.
 */

// Cache expiration time in milliseconds
const DEFAULT_CACHE_EXPIRY = 5 * 60 * 1000; // 5 minutes
const LONG_CACHE_EXPIRY = 60 * 60 * 1000; // 1 hour

// In-memory cache
const memoryCache: Record<string, { data: any; expiresAt: number }> = {};

/**
 * Cache an item in memory
 */
export function setMemoryCache(
  key: string, 
  data: any, 
  expiryMs: number = DEFAULT_CACHE_EXPIRY
): void {
  memoryCache[key] = {
    data,
    expiresAt: Date.now() + expiryMs,
  };
}

/**
 * Retrieve an item from memory cache
 */
export function getMemoryCache<T>(key: string): T | null {
  const cached = memoryCache[key];
  
  if (!cached) return null;
  
  // Return null if expired
  if (cached.expiresAt < Date.now()) {
    delete memoryCache[key];
    return null;
  }
  
  return cached.data as T;
}

/**
 * Clear the memory cache
 */
export function clearMemoryCache(keyPattern?: RegExp): void {
  if (keyPattern) {
    Object.keys(memoryCache).forEach((key) => {
      if (keyPattern.test(key)) {
        delete memoryCache[key];
      }
    });
  } else {
    Object.keys(memoryCache).forEach((key) => delete memoryCache[key]);
  }
}

/**
 * Store data in localStorage with expiration
 */
export function setLocalCache(
  key: string, 
  data: any, 
  expiryMs: number = DEFAULT_CACHE_EXPIRY
): void {
  if (typeof window === 'undefined') return;
  
  try {
    const item = {
      data,
      expiresAt: Date.now() + expiryMs,
    };
    
    localStorage.setItem(`cache_${key}`, JSON.stringify(item));
  } catch (error) {
    console.warn('Failed to store in localStorage:', error);
  }
}

/**
 * Get data from localStorage cache
 */
export function getLocalCache<T>(key: string): T | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const item = localStorage.getItem(`cache_${key}`);
    
    if (!item) return null;
    
    const parsed = JSON.parse(item);
    
    // Return null if expired
    if (parsed.expiresAt < Date.now()) {
      localStorage.removeItem(`cache_${key}`);
      return null;
    }
    
    return parsed.data as T;
  } catch (error) {
    console.warn('Failed to retrieve from localStorage:', error);
    return null;
  }
}

/**
 * Clear localStorage cache items
 */
export function clearLocalCache(keyPattern?: RegExp): void {
  if (typeof window === 'undefined') return;
  
  try {
    if (keyPattern) {
      const keys = Object.keys(localStorage);
      keys.forEach((fullKey) => {
        if (fullKey.startsWith('cache_')) {
          const key = fullKey.substring(6); // Remove 'cache_' prefix
          if (keyPattern.test(key)) {
            localStorage.removeItem(fullKey);
          }
        }
      });
    } else {
      const keys = Object.keys(localStorage);
      keys.forEach((key) => {
        if (key.startsWith('cache_')) {
          localStorage.removeItem(key);
        }
      });
    }
  } catch (error) {
    console.warn('Failed to clear localStorage cache:', error);
  }
}

/**
 * Enhanced fetch with caching
 */
export async function cachedFetch<T>(
  url: string,
  options: {
    method?: string;
    headers?: Record<string, string>;
    body?: any;
    useCache?: boolean;
    cacheKey?: string;
    cacheDuration?: number;
    useLocalStorage?: boolean;
  } = {}
): Promise<T> {
  const {
    method = 'GET',
    headers = {},
    body,
    useCache = true,
    cacheKey = url,
    cacheDuration = DEFAULT_CACHE_EXPIRY,
    useLocalStorage = false,
  } = options;

  // Only cache GET requests
  const canCache = useCache && method === 'GET';
  
  // Try to get from cache first
  if (canCache) {
    // First check memory cache (faster)
    const memCached = getMemoryCache<T>(cacheKey);
    if (memCached) return memCached;
    
    // Then check localStorage if enabled
    if (useLocalStorage) {
      const localCached = getLocalCache<T>(cacheKey);
      if (localCached) {
        // Also put in memory cache for faster access next time
        setMemoryCache(cacheKey, localCached, cacheDuration);
        return localCached;
      }
    }
  }
  
  // Perform the fetch
  const response = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  
  if (!response.ok) {
    throw new Error(`HTTP error ${response.status}: ${response.statusText}`);
  }
  
  // Parse the response
  const data = await response.json() as T;
  
  // Cache the result if appropriate
  if (canCache) {
    setMemoryCache(cacheKey, data, cacheDuration);
    if (useLocalStorage) {
      setLocalCache(cacheKey, data, cacheDuration);
    }
  }
  
  return data;
}

/**
 * Create a cached version of any function
 */
export function createCachedFunction<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  options: {
    getCacheKey?: (...args: Parameters<T>) => string;
    cacheDuration?: number;
    useLocalStorage?: boolean;
  } = {}
): T {
  const {
    getCacheKey = (...args) => JSON.stringify(args),
    cacheDuration = DEFAULT_CACHE_EXPIRY,
    useLocalStorage = false,
  } = options;
  
  return (async (...args: Parameters<T>) => {
    const cacheKey = getCacheKey(...args);
    
    // Check memory cache first
    const memCached = getMemoryCache<ReturnType<T>>(cacheKey);
    if (memCached) return memCached;
    
    // Then check localStorage if enabled
    if (useLocalStorage) {
      const localCached = getLocalCache<ReturnType<T>>(cacheKey);
      if (localCached) {
        // Also put in memory cache for faster access next time
        setMemoryCache(cacheKey, localCached, cacheDuration);
        return localCached;
      }
    }
    
    // Call the original function
    const result = await fn(...args);
    
    // Cache the result
    setMemoryCache(cacheKey, result, cacheDuration);
    if (useLocalStorage) {
      setLocalCache(cacheKey, result, cacheDuration);
    }
    
    return result;
  }) as T;
}

/**
 * Implement cache control headers for Next.js API routes
 */
export function addCacheHeaders(
  res: any,
  options: {
    maxAge?: number; // seconds
    staleWhileRevalidate?: number; // seconds
    isPublic?: boolean;
    isImmutable?: boolean;
  } = {}
) {
  const { 
    maxAge = 3600, // 1 hour default
    staleWhileRevalidate = 86400, // 1 day default
    isPublic = true,
    isImmutable = false,
  } = options;
  
  let cacheControl = isPublic ? 'public, ' : 'private, ';
  cacheControl += `max-age=${maxAge}`;
  
  if (staleWhileRevalidate > 0) {
    cacheControl += `, stale-while-revalidate=${staleWhileRevalidate}`;
  }
  
  if (isImmutable) {
    cacheControl += ', immutable';
  }
  
  res.setHeader('Cache-Control', cacheControl);
  return res;
}
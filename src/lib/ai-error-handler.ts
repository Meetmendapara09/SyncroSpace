/**
 * Standardized error handling utility for AI functions
 * Provides consistent error handling, logging, and retries for AI operations
 * Implements circuit breaker pattern to prevent cascading failures
 * Includes error monitoring and performance metrics
 */

import { toast } from '@/hooks/use-toast';

export interface AIErrorOptions {
  operation: string;
  maxRetries?: number;
  retryDelayMs?: number;
  timeoutMs?: number;
  silent?: boolean;
  logError?: boolean;
  fallbackFn?: () => any; // Optional fallback function to use when circuit is open
}

const DEFAULT_OPTIONS: Partial<AIErrorOptions> = {
  maxRetries: 2,
  retryDelayMs: 1000,
  timeoutMs: 30000, // 30 seconds
  silent: false,
  logError: true
};

// Circuit breaker implementation
interface CircuitBreakerState {
  failures: number;
  lastFailure: number;
  status: 'closed' | 'open' | 'half-open';
}

// Initial state for each service
const circuitBreakers: Record<string, CircuitBreakerState> = {};

// Circuit breaker thresholds
const FAILURE_THRESHOLD = 5; // Number of failures before opening circuit
const RESET_TIMEOUT = 30000; // Time in ms before trying half-open state
const ERROR_MONITORING_WINDOW = 60000; // 1 minute window for error rate calculation

// Error monitoring
interface ErrorMetrics {
  errors: {timestamp: number, error: string}[];
  totalCalls: number;
  successfulCalls: number;
  totalLatency: number;
}

// Track metrics per operation
const errorMetrics: Record<string, ErrorMetrics> = {};

// Initialize metrics for an operation
function initializeMetricsIfNeeded(operation: string) {
  if (!errorMetrics[operation]) {
    errorMetrics[operation] = {
      errors: [],
      totalCalls: 0,
      successfulCalls: 0,
      totalLatency: 0
    };
  }
}

// Get circuit breaker for a specific operation
function getCircuitBreaker(operation: string): CircuitBreakerState {
  if (!circuitBreakers[operation]) {
    circuitBreakers[operation] = {
      failures: 0,
      lastFailure: 0,
      status: 'closed'
    };
  }
  return circuitBreakers[operation];
}

/**
 * Wraps an async AI function with standardized error handling, retry logic and timeout
 * Implements circuit breaker pattern to prevent cascading failures
 * Collects performance metrics and error rates
 * 
 * @param fn The async function to wrap
 * @param options Error handling options
 * @returns Promise with the result of the function or error
 */
export async function withAIErrorHandling<T>(
  fn: () => Promise<T>,
  options: AIErrorOptions
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const operation = opts.operation;
  let retries = 0;
  let lastError: Error | null = null;
  
  // Initialize metrics for this operation
  initializeMetricsIfNeeded(operation);
  const metrics = errorMetrics[operation];
  metrics.totalCalls++;
  
  // Get circuit breaker for this operation
  const circuit = getCircuitBreaker(operation);
  
  // Check if circuit is open (service is considered down)
  if (circuit.status === 'open') {
    const timeSinceLastFailure = Date.now() - circuit.lastFailure;
    
    if (timeSinceLastFailure < RESET_TIMEOUT) {
      // Circuit is open and timeout hasn't elapsed, use fallback or fail fast
      if (opts.fallbackFn) {
        console.log(`Circuit open for '${operation}', using fallback function`);
        return opts.fallbackFn() as T;
      }
      
      // No fallback available, fail fast
      const circuitError = new Error(`AI operation '${operation}' is currently unavailable (circuit open)`);
      
      if (!opts.silent) {
        toast({
          variant: 'destructive',
          title: `${operation} unavailable`,
          description: 'This feature is temporarily unavailable. Please try again later.'
        });
      }
      
      throw circuitError;
    } else {
      // Timeout elapsed, move to half-open state to test if service is back up
      console.log(`Moving circuit for '${operation}' to half-open state`);
      circuit.status = 'half-open';
    }
  }

  // Create timeout promise
  const timeoutPromise = new Promise<never>((_, reject) => {
    if (opts.timeoutMs) {
      setTimeout(() => reject(new Error(`AI operation '${operation}' timed out after ${opts.timeoutMs}ms`)), 
        opts.timeoutMs);
    }
  });

  const startTime = performance.now();
  
  while (retries <= (opts.maxRetries || 0)) {
    try {
      // Race the function against timeout
      const result = await Promise.race([fn(), timeoutPromise]);
      
      // Success - reset circuit breaker if it was half-open
      if (circuit.status === 'half-open') {
        circuit.status = 'closed';
        circuit.failures = 0;
      }
      
      // Record success metrics
      metrics.successfulCalls++;
      metrics.totalLatency += performance.now() - startTime;
      
      // If success rate is very low, log a warning
      const successRate = metrics.successfulCalls / metrics.totalCalls;
      if (metrics.totalCalls > 10 && successRate < 0.5) {
        console.warn(`Warning: AI operation '${operation}' has a low success rate of ${(successRate * 100).toFixed(1)}%`);
      }
      
      return result;
    } catch (error: any) {
      lastError = error;
      
      // Record error metrics
      const timestamp = Date.now();
      metrics.errors.push({
        timestamp,
        error: error.message || 'Unknown error'
      });
      
      // Trim old errors outside our window
      metrics.errors = metrics.errors.filter(e => 
        (timestamp - e.timestamp) <= ERROR_MONITORING_WINDOW);
      
      if (opts.logError) {
        console.error(`AI operation '${operation}' failed:`, error);
      }

      // Handle circuit breaker logic
      if (circuit.status === 'closed' || circuit.status === 'half-open') {
        circuit.failures++;
        circuit.lastFailure = Date.now();
        
        // If we've reached the failure threshold, open the circuit
        if (circuit.failures >= FAILURE_THRESHOLD) {
          circuit.status = 'open';
          console.error(`Circuit opened for AI operation '${operation}' after ${circuit.failures} failures`);
          
          // If this is a critical service, alert
          if (!opts.silent) {
            toast({
              variant: 'destructive',
              title: `${operation} service issue detected`,
              description: 'This feature is temporarily unavailable due to service issues.'
            });
          }
        }
      }

      // If we've used all retries, break out
      if (retries >= (opts.maxRetries || 0)) {
        break;
      }

      // Wait before retrying
      if (opts.retryDelayMs) {
        await new Promise(resolve => setTimeout(resolve, opts.retryDelayMs));
      }
      
      retries++;
    }
  }

  // All retries failed
  if (!opts.silent) {
    toast({
      variant: 'destructive',
      title: `${operation} failed`,
      description: lastError?.message || 'An unexpected error occurred'
    });
  }

  throw lastError || new Error(`AI operation '${operation}' failed after ${retries} retries`);
}

/**
 * Simple wrapper to log and format AI-specific errors
 * @param error The original error
 * @param operation Name of the AI operation that failed
 * @returns Formatted error
 */
export function formatAIError(error: unknown, operation: string): Error {
  console.error(`AI operation '${operation}' error:`, error);
  
  if (error instanceof Error) {
    return new Error(`${operation} failed: ${error.message}`);
  }
  
  return new Error(`${operation} failed: Unexpected error`);
}

/**
 * Gets the current metrics for an AI operation
 * @param operation The operation to get metrics for
 * @returns The metrics for the operation or null if not found
 */
export function getAIMetrics(operation: string) {
  if (!errorMetrics[operation]) return null;
  
  const metrics = errorMetrics[operation];
  const now = Date.now();
  
  // Calculate current error rate
  const recentErrors = metrics.errors.filter(e => 
    (now - e.timestamp) <= ERROR_MONITORING_WINDOW).length;
    
  const errorRate = metrics.totalCalls > 0 ? recentErrors / metrics.totalCalls : 0;
  const successRate = metrics.totalCalls > 0 ? metrics.successfulCalls / metrics.totalCalls : 1;
  const avgLatency = metrics.successfulCalls > 0 ? metrics.totalLatency / metrics.successfulCalls : 0;
  
  return {
    operation,
    totalCalls: metrics.totalCalls,
    successfulCalls: metrics.successfulCalls,
    recentErrors,
    errorRate,
    successRate,
    avgLatency,
    circuitStatus: getCircuitBreaker(operation).status
  };
}

/**
 * Gets metrics for all AI operations
 * @returns Metrics for all operations
 */
export function getAllAIMetrics() {
  return Object.keys(errorMetrics).map(getAIMetrics).filter(Boolean);
}

/**
 * Resets the circuit breaker for an operation, forcing it to closed state
 * @param operation The operation to reset
 */
export function resetCircuitBreaker(operation: string) {
  if (circuitBreakers[operation]) {
    circuitBreakers[operation] = {
      failures: 0,
      lastFailure: 0,
      status: 'closed'
    };
    console.log(`Circuit breaker for '${operation}' manually reset to closed`);
  }
}

/**
 * Provides a fallback function for when an AI service is unavailable
 * @param fallbackData The data to return as a fallback
 * @returns A function that returns the fallback data
 */
export function createAIFallback<T>(fallbackData: T) {
  return () => fallbackData;
}
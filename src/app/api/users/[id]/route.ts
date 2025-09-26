import { NextRequest, NextResponse } from 'next/server';
import { addCacheHeaders, getMemoryCache, setMemoryCache } from '@/lib/cache-utils';

// Required for static export
export const dynamic = 'force-static';
export const revalidate = false;

// Define the types
interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

// Mock data for demonstration
const users: Record<string, User> = {
  'user-1': { id: 'user-1', name: 'John Doe', email: 'john@example.com', role: 'admin' },
  'user-2': { id: 'user-2', name: 'Jane Smith', email: 'jane@example.com', role: 'user' },
  'user-3': { id: 'user-3', name: 'Bob Johnson', email: 'bob@example.com', role: 'editor' },
};

// Helper function to validate and sanitize user ID
function validateUserId(id: string): boolean {
  // Basic validation - only alphanumeric characters and hyphens allowed
  return /^[a-zA-Z0-9\-]+$/.test(id) && id.length < 50;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: userId } = await params;
    
    // Validate user ID to prevent injection attacks
    if (!validateUserId(userId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid user ID format' },
        { status: 400 }
      );
    }
    
    const cacheKey = `user_${userId}`;
    
    console.log(`Fetching user data for ${userId}`);
    
    // Check cache first
    const cachedUser = getMemoryCache<User>(cacheKey);
    
    if (cachedUser) {
      console.log(`Cache hit for user ${userId}`);
      // Return cached data with headers
      const res = NextResponse.json({ success: true, user: cachedUser });
      return addCacheHeaders(res, { 
        maxAge: 3600, 
        staleWhileRevalidate: 86400,
        isImmutable: false
      });
    }
    
    console.log(`Cache miss for user ${userId}, fetching from database`);
    
    // In a real application, this would be a database query
    const userData = users[userId];
    
    if (!userData) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }
    
    // Cache the result (5 minutes)
    setMemoryCache(cacheKey, userData, 5 * 60 * 1000);
    
    // Return with cache headers
    const res = NextResponse.json({ success: true, user: userData });
    return addCacheHeaders(res, { 
      maxAge: 3600, 
      staleWhileRevalidate: 86400,
      isImmutable: false
    });
    
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch user data' },
      { status: 500 }
    );
  }
}
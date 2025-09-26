import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { permissionService } from '../services/auth/PermissionService';
import { initAdmin } from '../services/firebase/firebaseAdmin';

// Initialize Firebase Admin if it hasn't been initialized
initAdmin();

/**
 * Authentication Middleware
 * Verifies the user's authentication token
 * @param req Next.js request
 * @returns Response or undefined to continue
 */
export async function authMiddleware(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized: Missing or invalid token' },
        { status: 401 }
      );
    }
    
    const token = authHeader.split(' ')[1];
    
    try {
      // Verify token with Firebase Admin
      const decodedToken = await getAuth().verifyIdToken(token);
      
      // Add user ID to request headers for downstream handlers
      const headers = new Headers(req.headers);
      headers.set('x-user-id', decodedToken.uid);
      
      // Continue to the next middleware or API route
      return NextResponse.next({ request: { headers } });
    } catch (error) {
      console.error('Error verifying auth token:', error);
      return NextResponse.json(
        { error: 'Unauthorized: Invalid token' },
        { status: 401 }
      );
    }
  } catch (error) {
    console.error('Error in auth middleware:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Team Permission Middleware
 * Checks if the user has the required permission for a team
 * @param req Next.js request
 * @param permission Required permission
 * @returns Response or undefined to continue
 */
export async function teamPermissionMiddleware(
  req: NextRequest,
  permission: string
) {
  try {
    const userId = req.headers.get('x-user-id');
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized: User not authenticated' },
        { status: 401 }
      );
    }
    
    // Extract team ID from URL or query parameters
    const url = new URL(req.url);
    const teamId = url.pathname.split('/').find(segment => 
      segment.startsWith('team_')
    ) || url.searchParams.get('teamId');
    
    if (!teamId) {
      return NextResponse.json(
        { error: 'Bad Request: Team ID not provided' },
        { status: 400 }
      );
    }
    
    // Check if user has the required permission
    const hasPermission = await permissionService.hasPermission(
      userId,
      teamId,
      permission as any
    );
    
    if (!hasPermission) {
      return NextResponse.json(
        { error: `Forbidden: Insufficient permissions for ${permission}` },
        { status: 403 }
      );
    }
    
    // Continue to the next middleware or API route
    return NextResponse.next();
  } catch (error) {
    console.error('Error in team permission middleware:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Resource Permission Middleware
 * Checks if the user has the required permission for a resource
 * @param req Next.js request
 * @param resourceType Type of resource
 * @param requiredPermission Permission required
 * @returns Response or undefined to continue
 */
export async function resourcePermissionMiddleware(
  req: NextRequest,
  resourceType: string,
  requiredPermission: string
) {
  try {
    const userId = req.headers.get('x-user-id');
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized: User not authenticated' },
        { status: 401 }
      );
    }
    
    // Extract resource ID from URL or query parameters
    const url = new URL(req.url);
    const resourceId = url.pathname.split('/').pop() || url.searchParams.get('id');
    
    if (!resourceId) {
      return NextResponse.json(
        { error: 'Bad Request: Resource ID not provided' },
        { status: 400 }
      );
    }
    
    // Check if user has access to the resource
    const hasAccess = await permissionService.canAccessResource(
      userId,
      resourceType,
      resourceId,
      requiredPermission
    );
    
    if (!hasAccess) {
      return NextResponse.json(
        { error: `Forbidden: Insufficient permissions for ${resourceType}` },
        { status: 403 }
      );
    }
    
    // Continue to the next middleware or API route
    return NextResponse.next();
  } catch (error) {
    console.error('Error in resource permission middleware:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Middleware configuration
 */
export const config = {
  matcher: [
    // Apply to all API routes that require authentication
    '/api/teams/:path*',
    '/api/resources/:path*',
    '/api/tasks/:path*',
    '/api/calendar/:path*',
    '/api/files/:path*',
    '/api/goals/:path*',
    '/api/analytics/:path*',
  ],
};
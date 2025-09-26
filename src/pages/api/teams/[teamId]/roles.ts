import { NextApiRequest, NextApiResponse } from 'next';
import { getAdminAuth } from '../../../../services/firebase/firebaseAdmin';
import { teamService } from '../../../../services/team/TeamService';
import { permissionService } from '../../../../services/auth/PermissionService';
import { TeamPermissions } from '../../../../models/team/TeamMember';

/**
 * API endpoint for team roles management
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    // Get auth token from request
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const token = authHeader.split(' ')[1];
    
    // Verify token
    let userId: string;
    try {
      const decodedToken = await getAdminAuth().verifyIdToken(token);
      userId = decodedToken.uid;
    } catch (error) {
      console.error('Error verifying token:', error);
      return res.status(401).json({ error: 'Invalid token' });
    }
    
    // Get team ID from URL
    const teamId = req.query.teamId as string;
    
    if (!teamId) {
      return res.status(400).json({ error: 'Team ID is required' });
    }
    
    // Check if user has permission to view team
    const canViewTeam = await permissionService.hasPermission(
      userId,
      teamId,
      'viewResources'
    );
    
    if (!canViewTeam) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Handle different HTTP methods
    switch (req.method) {
      case 'GET':
        return handleGetRoles(req, res, teamId);
        
      case 'POST':
        return handleCreateRole(req, res, teamId, userId);
        
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Error in team roles API:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Handle get roles request
 */
async function handleGetRoles(
  req: NextApiRequest,
  res: NextApiResponse,
  teamId: string
) {
  try {
    const roles = await teamService.getTeamRoles(teamId);
    return res.status(200).json({ roles });
  } catch (error) {
    console.error('Error getting team roles:', error);
    return res.status(500).json({ error: 'Failed to get team roles' });
  }
}

/**
 * Handle create role request
 */
async function handleCreateRole(
  req: NextApiRequest,
  res: NextApiResponse,
  teamId: string,
  userId: string
) {
  try {
    // Check if user has permission to manage team roles
    const canManageTeamRoles = await permissionService.hasPermission(
      userId,
      teamId,
      'manageTeamRoles'
    );
    
    if (!canManageTeamRoles) {
      return res.status(403).json({
        error: 'You do not have permission to create roles'
      });
    }
    
    const { name, description, permissions, isDefault } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Role name is required' });
    }
    
    if (!permissions || typeof permissions !== 'object') {
      return res.status(400).json({ error: 'Valid permissions object is required' });
    }
    
    const role = await teamService.createRole(teamId, {
      name,
      description,
      isDefault,
      permissions: permissions as Partial<TeamPermissions>,
    });
    
    return res.status(201).json({ role });
  } catch (error: any) {
    console.error('Error creating team role:', error);
    
    if (error?.message === 'Role with this name already exists') {
      return res.status(400).json({ error: error.message });
    }
    
    return res.status(500).json({ error: 'Failed to create team role' });
  }
}
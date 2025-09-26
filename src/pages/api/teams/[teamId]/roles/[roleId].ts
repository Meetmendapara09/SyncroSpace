import { NextApiRequest, NextApiResponse } from 'next';
import { getAdminAuth } from '../../../../../services/firebase/firebaseAdmin';
import { teamService } from '../../../../../services/team/TeamService';
import { permissionService } from '../../../../../services/auth/PermissionService';
import { TeamPermissions } from '../../../../../models/team/TeamMember';

/**
 * API endpoint for managing a specific team role
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
    
    // Get team ID and role ID from URL
    const teamId = req.query.teamId as string;
    const roleId = req.query.roleId as string;
    
    if (!teamId || !roleId) {
      return res.status(400).json({ 
        error: 'Team ID and role ID are required' 
      });
    }
    
    // Handle different HTTP methods
    switch (req.method) {
      case 'GET':
        return handleGetRole(req, res, teamId, roleId, userId);
        
      case 'PUT':
        return handleUpdateRole(req, res, teamId, roleId, userId);
        
      case 'DELETE':
        return handleDeleteRole(req, res, teamId, roleId, userId);
        
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Error in team role API:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Handle get role request
 */
async function handleGetRole(
  req: NextApiRequest,
  res: NextApiResponse,
  teamId: string,
  roleId: string,
  userId: string
) {
  try {
    // Check if user has permission to view team
    const canViewTeam = await permissionService.hasPermission(
      userId,
      teamId,
      'viewResources'
    );
    
    if (!canViewTeam) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Get all roles for the team and find the requested role
    const roles = await teamService.getTeamRoles(teamId);
    const role = roles.find(r => r.id === roleId);
    
    if (!role) {
      return res.status(404).json({ error: 'Role not found' });
    }
    
    return res.status(200).json({ role });
  } catch (error) {
    console.error('Error getting team role:', error);
    return res.status(500).json({ error: 'Failed to get team role' });
  }
}

/**
 * Handle update role request
 */
async function handleUpdateRole(
  req: NextApiRequest,
  res: NextApiResponse,
  teamId: string,
  roleId: string,
  userId: string
) {
  try {
    // Check if user has permission to manage team roles
    const canManageRoles = await permissionService.hasPermission(
      userId,
      teamId,
      'manageTeamRoles'
    );
    
    if (!canManageRoles) {
      return res.status(403).json({
        error: 'You do not have permission to update roles'
      });
    }
    
    const { name, description, permissions, isDefault } = req.body;
    
    // Validate required fields
    if (name === '') {
      return res.status(400).json({ error: 'Role name cannot be empty' });
    }
    
    if (permissions && typeof permissions !== 'object') {
      return res.status(400).json({ error: 'Permissions must be an object' });
    }
    
    const role = await teamService.updateRole(roleId, {
      name,
      description,
      isDefault,
      permissions: permissions as Partial<TeamPermissions>,
    });
    
    return res.status(200).json({ role });
  } catch (error: any) {
    console.error('Error updating team role:', error);
    
    if (error?.message === 'Cannot modify built-in role') {
      return res.status(400).json({ error: error.message });
    }
    
    return res.status(500).json({ error: 'Failed to update team role' });
  }
}

/**
 * Handle delete role request
 */
async function handleDeleteRole(
  req: NextApiRequest,
  res: NextApiResponse,
  teamId: string,
  roleId: string,
  userId: string
) {
  try {
    // Check if user has permission to manage team roles
    const canManageRoles = await permissionService.hasPermission(
      userId,
      teamId,
      'manageTeamRoles'
    );
    
    if (!canManageRoles) {
      return res.status(403).json({
        error: 'You do not have permission to delete roles'
      });
    }
    
    await teamService.deleteRole(roleId);
    
    return res.status(200).json({ success: true });
  } catch (error: any) {
    console.error('Error deleting team role:', error);
    
    if (error?.message === 'Cannot delete built-in role') {
      return res.status(400).json({ error: error.message });
    }
    
    if (error?.message === 'Cannot delete role that is assigned to members') {
      return res.status(400).json({ error: error.message });
    }
    
    return res.status(500).json({ error: 'Failed to delete team role' });
  }
}
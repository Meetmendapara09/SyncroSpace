import { NextApiRequest, NextApiResponse } from 'next';
import { getAdminAuth } from '../../../../../services/firebase/firebaseAdmin';
import { teamService } from '../../../../../services/team/TeamService';
import { permissionService } from '../../../../../services/auth/PermissionService';

/**
 * API endpoint for operations on a specific team member
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
    
    // Get team ID and member ID from URL
    const teamId = req.query.teamId as string;
    const memberId = req.query.memberId as string;
    
    if (!teamId || !memberId) {
      return res.status(400).json({ 
        error: 'Team ID and member ID are required' 
      });
    }
    
    // Check if user is a team member
    const isTeamMember = await permissionService.hasPermission(
      userId,
      teamId,
      'viewResources'
    );
    
    if (!isTeamMember) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Handle different HTTP methods
    switch (req.method) {
      case 'PUT':
        // Update member
        return handleUpdateMember(req, res, teamId, memberId, userId);
        
      case 'DELETE':
        // Remove member
        return handleRemoveMember(req, res, teamId, memberId, userId);
        
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Error in team member API:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Handle update member request
 */
async function handleUpdateMember(
  req: NextApiRequest,
  res: NextApiResponse,
  teamId: string,
  memberId: string,
  requestUserId: string
) {
  try {
    const { roleId, displayName, status, notificationSettings, metadata } = req.body;
    
    // Check if user is updating their own notification settings
    const isUpdatingSelf = memberId === requestUserId;
    const isUpdatingOnlyNotifications = 
      Object.keys(req.body).length === 1 && 
      notificationSettings !== undefined;
    
    // Allow users to update their own notification settings
    if (isUpdatingSelf && isUpdatingOnlyNotifications) {
      const member = await teamService.updateMember(teamId, memberId, {
        notificationSettings,
      });
      
      return res.status(200).json({ member });
    }
    
    // For other updates, check if user has permission to manage members
    const canManageMembers = await permissionService.hasPermission(
      requestUserId,
      teamId,
      'manageTeamMembers'
    );
    
    if (!canManageMembers) {
      return res.status(403).json({ 
        error: 'You do not have permission to update members' 
      });
    }
    
    const member = await teamService.updateMember(teamId, memberId, {
      roleId,
      displayName,
      status,
      notificationSettings,
      metadata,
    });
    
    return res.status(200).json({ member });
  } catch (error) {
    console.error('Error updating team member:', error);
    return res.status(500).json({ error: 'Failed to update team member' });
  }
}

/**
 * Handle remove member request
 */
async function handleRemoveMember(
  req: NextApiRequest,
  res: NextApiResponse,
  teamId: string,
  memberId: string,
  requestUserId: string
) {
  try {
    // Check if user has permission to manage members
    const canManageMembers = await permissionService.hasPermission(
      requestUserId,
      teamId,
      'manageTeamMembers'
    );
    
    if (!canManageMembers) {
      return res.status(403).json({ 
        error: 'You do not have permission to remove members' 
      });
    }
    
    // Prevent removing yourself
    if (memberId === requestUserId) {
      return res.status(400).json({ 
        error: 'You cannot remove yourself from the team' 
      });
    }
    
    await teamService.removeMember(teamId, memberId);
    
    return res.status(200).json({ success: true });
  } catch (error: any) {
    console.error('Error removing team member:', error);
    
    if (error?.message === 'Cannot remove the last admin from a team') {
      return res.status(400).json({ error: error.message });
    }
    
    return res.status(500).json({ error: 'Failed to remove team member' });
  }
}
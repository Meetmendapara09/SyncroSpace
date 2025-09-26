import { NextApiRequest, NextApiResponse } from 'next';
import { getAdminAuth } from '../../../../services/firebase/firebaseAdmin';
import { teamService } from '../../../../services/team/TeamService';
import { permissionService } from '../../../../services/auth/PermissionService';

/**
 * API endpoint for team members
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
      case 'GET':
        // Get team members
        return handleGetTeamMembers(req, res, teamId);
        
      case 'POST':
        // Add or invite a member
        return handleAddMember(req, res, teamId, userId);
        
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Error in team members API:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Handle get team members request
 */
async function handleGetTeamMembers(
  req: NextApiRequest,
  res: NextApiResponse,
  teamId: string
) {
  try {
    const limit = parseInt(req.query.limit as string) || undefined;
    const offset = parseInt(req.query.offset as string) || undefined;
    const status = req.query.status as 
      'active' | 'inactive' | 'invited' | 'pending_approval' | undefined;
    
    const members = await teamService.getTeamMembers(teamId, {
      limit,
      offset,
      status,
    });
    
    return res.status(200).json({ members });
  } catch (error) {
    console.error('Error getting team members:', error);
    return res.status(500).json({ error: 'Failed to get team members' });
  }
}

/**
 * Handle add member request
 */
async function handleAddMember(
  req: NextApiRequest,
  res: NextApiResponse,
  teamId: string,
  userId: string
) {
  try {
    // Check if user has permission to manage members
    const canManageMembers = await permissionService.hasPermission(
      userId,
      teamId,
      'manageTeamMembers'
    );
    
    if (!canManageMembers) {
      return res.status(403).json({ 
        error: 'You do not have permission to add members' 
      });
    }
    
    const { type, email, userId: targetUserId, roleId, displayName } = req.body;
    
    if (type === 'invite') {
      // Invite by email
      if (!email || !roleId) {
        return res.status(400).json({ 
          error: 'Email and roleId are required for invitations' 
        });
      }
      
      const member = await teamService.inviteMember(
        teamId,
        userId,
        email,
        roleId
      );
      
      return res.status(201).json({ member });
    } else {
      // Add directly by user ID
      if (!targetUserId || !roleId) {
        return res.status(400).json({ 
          error: 'userId and roleId are required to add members' 
        });
      }
      
      const member = await teamService.addMember(teamId, {
        userId: targetUserId,
        roleId,
        displayName,
      });
      
      return res.status(201).json({ member });
    }
  } catch (error) {
    console.error('Error adding team member:', error);
    return res.status(500).json({ error: 'Failed to add team member' });
  }
}
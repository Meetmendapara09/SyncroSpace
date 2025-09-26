import { NextApiRequest, NextApiResponse } from 'next';
import { getAdminAuth } from '../../../services/firebase/firebaseAdmin';
import { teamService } from '../../../services/team/TeamService';
import { permissionService } from '../../../services/auth/PermissionService';

/**
 * API endpoint for operations on a specific team
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
    
    // Handle different HTTP methods
    switch (req.method) {
      case 'GET':
        // Get team details
        return handleGetTeam(req, res, teamId, userId);
        
      case 'PUT':
        // Update team details
        return handleUpdateTeam(req, res, teamId, userId);
        
      case 'DELETE':
        // Delete team
        return handleDeleteTeam(req, res, teamId, userId);
        
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Error in team API:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Handle get team request
 */
async function handleGetTeam(
  req: NextApiRequest,
  res: NextApiResponse,
  teamId: string,
  userId: string
) {
  try {
    // Get the team
    const team = await teamService.getTeam(teamId);
    
    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }
    
    // Check if team is private and user is a member
    if (team.isPrivate) {
      const isTeamMember = await permissionService.hasPermission(
        userId,
        teamId,
        'viewResources'
      );
      
      if (!isTeamMember) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }
    
    return res.status(200).json({ team });
  } catch (error) {
    console.error('Error getting team:', error);
    return res.status(500).json({ error: 'Failed to get team' });
  }
}

/**
 * Handle update team request
 */
async function handleUpdateTeam(
  req: NextApiRequest,
  res: NextApiResponse,
  teamId: string,
  userId: string
) {
  try {
    // Check if user is team admin
    const isTeamAdmin = await permissionService.isTeamAdmin(userId, teamId);
    
    if (!isTeamAdmin) {
      return res.status(403).json({ error: 'Only team admins can update team details' });
    }
    
    const { name, description, avatarUrl, isPrivate, settings, metadata } = req.body;
    
    const updatedTeam = await teamService.updateTeam(teamId, {
      name,
      description,
      avatarUrl,
      isPrivate,
      settings,
      metadata,
    });
    
    return res.status(200).json({ team: updatedTeam });
  } catch (error) {
    console.error('Error updating team:', error);
    return res.status(500).json({ error: 'Failed to update team' });
  }
}

/**
 * Handle delete team request
 */
async function handleDeleteTeam(
  req: NextApiRequest,
  res: NextApiResponse,
  teamId: string,
  userId: string
) {
  try {
    // Check if user is team admin
    const isTeamAdmin = await permissionService.isTeamAdmin(userId, teamId);
    
    if (!isTeamAdmin) {
      return res.status(403).json({ error: 'Only team admins can delete teams' });
    }
    
    await teamService.deleteTeam(teamId);
    
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error deleting team:', error);
    return res.status(500).json({ error: 'Failed to delete team' });
  }
}
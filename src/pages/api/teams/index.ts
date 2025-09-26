import { NextApiRequest, NextApiResponse } from 'next';
import { getAdminAuth } from '../../../services/firebase/firebaseAdmin';
import { teamService } from '../../../services/team/TeamService';
import { Team } from '../../../models/team/Team';

/**
 * API endpoint for team operations
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
    
    // Handle different HTTP methods
    switch (req.method) {
      case 'GET':
        // Get user's teams or search teams
        if (req.query.search) {
          return handleSearchTeams(req, res);
        } else {
          return handleGetUserTeams(req, res, userId);
        }
        
      case 'POST':
        // Create a new team
        return handleCreateTeam(req, res, userId);
        
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Error in teams API:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Handle team search request
 */
async function handleSearchTeams(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const searchTerm = req.query.search as string;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = parseInt(req.query.offset as string) || 0;
    const organizationId = req.query.organizationId as string;
    
    if (!searchTerm) {
      return res.status(400).json({ error: 'Search term is required' });
    }
    
    const teams = await teamService.searchTeams(searchTerm, {
      limit,
      offset,
      organizationId,
      includePrivate: false,
    });
    
    return res.status(200).json({ teams });
  } catch (error) {
    console.error('Error searching teams:', error);
    return res.status(500).json({ error: 'Failed to search teams' });
  }
}

/**
 * Handle get user's teams request
 */
async function handleGetUserTeams(
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string
) {
  try {
    const limit = parseInt(req.query.limit as string) || undefined;
    const lastTeamId = req.query.lastTeamId as string;
    const includeArchived = req.query.includeArchived === 'true';
    
    const teams = await teamService.getUserTeams(userId, {
      limit,
      lastTeamId,
      includeArchived,
    });
    
    return res.status(200).json({ teams });
  } catch (error) {
    console.error('Error getting user teams:', error);
    return res.status(500).json({ error: 'Failed to get teams' });
  }
}

/**
 * Handle team creation request
 */
async function handleCreateTeam(
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string
) {
  try {
    const { name, description, avatarUrl, isPrivate, organizationId, settings } = req.body;
    
    if (!name || !organizationId) {
      return res.status(400).json({ 
        error: 'Name and organizationId are required' 
      });
    }
    
    const team = await teamService.createTeam(userId, {
      name,
      description: description || '',
      avatarUrl,
      isPrivate: isPrivate || false,
      organizationId,
      settings,
    });
    
    return res.status(201).json({ team });
  } catch (error) {
    console.error('Error creating team:', error);
    return res.status(500).json({ error: 'Failed to create team' });
  }
}
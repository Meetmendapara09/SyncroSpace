import { NextApiRequest, NextApiResponse } from 'next';
import { getAdminAuth } from '../../../../../../services/firebase/firebaseAdmin';
import { permissionService } from '../../../../../../services/auth/PermissionService';
import { 
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc as firestoreDeleteDoc,
  collection,
  addDoc,
  query,
  where,
  getDocs,
  Timestamp
} from 'firebase/firestore';
import { db } from '../../../../../../services/firebase/firebaseConfig';

/**
 * API endpoint for managing individual onboarding workflow steps
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
    
    // Get team ID and workflow ID from URL
    const teamId = req.query.teamId as string;
    const workflowId = req.query.workflowId as string;
    const stepId = req.query.stepId as string;
    
    if (!teamId || !workflowId || !stepId) {
      return res.status(400).json({ error: 'Team ID, workflow ID, and step ID are required' });
    }
    
    // Ensure the workflow exists and belongs to this team
    const workflowRef = doc(db, 'teamOnboardingWorkflows', workflowId);
    const workflowSnap = await getDoc(workflowRef);
    
    if (!workflowSnap.exists()) {
      return res.status(404).json({ error: 'Workflow not found' });
    }
    
    const workflow = workflowSnap.data();
    if (workflow.teamId !== teamId) {
      return res.status(403).json({ error: 'Access denied: Workflow does not belong to team' });
    }
    
    // Process different HTTP methods
    switch (req.method) {
      case 'GET':
        return await getStep(req, res, userId, teamId, workflowId, stepId);
        
      case 'PUT':
        return await updateStep(req, res, userId, teamId, workflowId, stepId);
        
      case 'DELETE':
        return await deleteStep(req, res, userId, teamId, workflowId, stepId);
        
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Error in onboarding workflow step API:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Get onboarding workflow step details
 */
async function getStep(
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string,
  teamId: string,
  workflowId: string,
  stepId: string
) {
  try {
    // Check if user has permission to view onboarding workflows
    const canViewOnboarding = await permissionService.hasPermission(
      userId,
      teamId,
      'viewOnboarding'
    );
    
    if (!canViewOnboarding) {
      return res.status(403).json({ error: 'Access denied: Insufficient permissions' });
    }
    
    // Get step details
    const stepRef = doc(db, 'onboardingWorkflowSteps', stepId);
    const stepSnap = await getDoc(stepRef);
    
    if (!stepSnap.exists()) {
      return res.status(404).json({ error: 'Step not found' });
    }
    
    const step = stepSnap.data();
    
    // Ensure step belongs to the specified workflow
    if (step.workflowId !== workflowId) {
      return res.status(403).json({ error: 'Access denied: Step does not belong to workflow' });
    }
    
    // Get associated resources if requested
    const includeResources = req.query.includeResources === 'true';
    let resources: any[] = [];
    
    if (includeResources && Array.isArray(step.resources) && step.resources.length > 0) {
      resources = await Promise.all(step.resources.map(async (resourceId: string) => {
        try {
          const resourceRef = doc(db, 'teamResources', resourceId);
          const resourceSnap = await getDoc(resourceRef);
          
          if (resourceSnap.exists()) {
            return {
              id: resourceSnap.id,
              ...resourceSnap.data()
            };
          }
          return null;
        } catch (error) {
          console.error(`Error fetching resource ${resourceId}:`, error);
          return null;
        }
      }));
      
      // Filter out null values (resources that couldn't be fetched)
      resources = resources.filter(r => r !== null);
    }
    
    return res.status(200).json({
      step: {
        id: stepId,
        ...step,
        resourceDetails: includeResources ? resources : undefined
      }
    });
  } catch (error) {
    console.error('Error getting workflow step:', error);
    return res.status(500).json({ error: 'Failed to get workflow step' });
  }
}

/**
 * Update onboarding workflow step
 */
async function updateStep(
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string,
  teamId: string,
  workflowId: string,
  stepId: string
) {
  try {
    // Check if user has permission to manage onboarding workflows
    const canManageOnboarding = await permissionService.hasPermission(
      userId,
      teamId,
      'manageOnboarding'
    );
    
    if (!canManageOnboarding) {
      return res.status(403).json({ error: 'Access denied: Insufficient permissions' });
    }
    
    // Get step details
    const stepRef = doc(db, 'onboardingWorkflowSteps', stepId);
    const stepSnap = await getDoc(stepRef);
    
    if (!stepSnap.exists()) {
      return res.status(404).json({ error: 'Step not found' });
    }
    
    const existingStep = stepSnap.data();
    
    // Ensure step belongs to the specified workflow
    if (existingStep.workflowId !== workflowId) {
      return res.status(403).json({ error: 'Access denied: Step does not belong to workflow' });
    }
    
    // Get update data
    const { title, description, order, resources, type, automationDetails } = req.body;
    
    // Validate required fields
    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }
    
    // Create update object
    const updateData: any = {
      updatedAt: Timestamp.now()
    };
    
    if (title) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (order !== undefined) updateData.order = order;
    if (resources !== undefined) updateData.resources = resources;
    if (type) updateData.type = type;
    if (automationDetails !== undefined) updateData.automationDetails = automationDetails;
    
    // Update the step
    await updateDoc(stepRef, updateData);
    
    // If order was changed, need to reorder other steps
    if (order !== undefined && order !== existingStep.order) {
      await reorderWorkflowSteps(workflowId);
    }
    
    return res.status(200).json({
      step: {
        id: stepId,
        ...existingStep,
        ...updateData
      }
    });
  } catch (error) {
    console.error('Error updating workflow step:', error);
    return res.status(500).json({ error: 'Failed to update workflow step' });
  }
}

/**
 * Delete onboarding workflow step
 */
async function deleteStep(
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string,
  teamId: string,
  workflowId: string,
  stepId: string
) {
  try {
    // Check if user has permission to manage onboarding workflows
    const canManageOnboarding = await permissionService.hasPermission(
      userId,
      teamId,
      'manageOnboarding'
    );
    
    if (!canManageOnboarding) {
      return res.status(403).json({ error: 'Access denied: Insufficient permissions' });
    }
    
    // Get step details
    const stepRef = doc(db, 'onboardingWorkflowSteps', stepId);
    const stepSnap = await getDoc(stepRef);
    
    if (!stepSnap.exists()) {
      return res.status(404).json({ error: 'Step not found' });
    }
    
    const step = stepSnap.data();
    
    // Ensure step belongs to the specified workflow
    if (step.workflowId !== workflowId) {
      return res.status(403).json({ error: 'Access denied: Step does not belong to workflow' });
    }
    
    // Check if step has active progress records
    const activeProgressQuery = query(
      collection(db, 'memberOnboardingProgress'),
      where('stepId', '==', stepId),
      where('completed', '==', true)
    );
    
    const activeProgressSnap = await getDocs(activeProgressQuery);
    
    // Allow deletion with warning if there are completed steps
    let hasCompletedProgress = false;
    
    if (!activeProgressSnap.empty) {
      hasCompletedProgress = true;
    }
    
    // Delete the step
    await firestoreDeleteDoc(stepRef);
    
    // Reorder remaining steps
    await reorderWorkflowSteps(workflowId);
    
    return res.status(200).json({
      message: 'Step deleted successfully',
      warning: hasCompletedProgress ? 
        'Some members had already completed this step. Their progress records were retained.' : 
        undefined
    });
  } catch (error) {
    console.error('Error deleting workflow step:', error);
    return res.status(500).json({ error: 'Failed to delete workflow step' });
  }
}

/**
 * Reorder workflow steps after changes
 */
async function reorderWorkflowSteps(workflowId: string) {
  try {
    // Get all steps for this workflow
    const stepsQuery = query(
      collection(db, 'onboardingWorkflowSteps'),
      where('workflowId', '==', workflowId)
    );
    
    const stepsSnap = await getDocs(stepsQuery);
    const steps = stepsSnap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    // Sort by current order
    steps.sort((a, b) => (a as any).order - (b as any).order);
    
    // Update orders to be sequential
    for (let i = 0; i < steps.length; i++) {
      if ((steps[i] as any).order !== i) {
        await updateDoc(doc(db, 'onboardingWorkflowSteps', steps[i].id), {
          order: i,
          updatedAt: Timestamp.now()
        });
      }
    }
  } catch (error) {
    console.error('Error reordering workflow steps:', error);
    throw error;
  }
}
import { NextApiRequest, NextApiResponse } from 'next';
import { getAdminAuth } from '../../../../services/firebase/firebaseAdmin';
import { permissionService } from '../../../../services/auth/PermissionService';
import { 
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  addDoc,
  query,
  where,
  getDocs,
  Timestamp
} from 'firebase/firestore';
import { db } from '../../../../services/firebase/firebaseConfig';
import { v4 as uuidv4 } from 'uuid';

/**
 * API endpoint for team onboarding workflows
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
    
    // Process different HTTP methods
    switch (req.method) {
      case 'GET':
        return await handleGet(req, res, userId, teamId);
        
      case 'POST':
        return await handlePost(req, res, userId, teamId);
        
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Error in team onboarding workflow API:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Handle GET request to list onboarding workflows
 */
async function handleGet(
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string,
  teamId: string
) {
  try {
    // Check if user has permission to view onboarding workflows
    const canViewOnboarding = await permissionService.hasPermission(
      userId,
      teamId,
      'viewOnboarding' as any
    );
    
    if (!canViewOnboarding) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Get workflow ID from query parameters
    const workflowId = req.query.workflowId as string;
    
    if (workflowId) {
      // Return specific workflow
      return await getWorkflowById(res, teamId, workflowId);
    }
    
    // List workflows
    const memberId = req.query.memberId as string;
    
    if (memberId) {
      // Return workflows for specific member
      return await getWorkflowsByMember(res, teamId, memberId);
    }
    
    // Return all team workflows
    const workflowsQuery = query(
      collection(db, 'teamOnboardingWorkflows'),
      where('teamId', '==', teamId)
    );
    
    const workflowsSnap = await getDocs(workflowsQuery);
    const workflows = workflowsSnap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    return res.status(200).json({ workflows });
  } catch (error) {
    console.error('Error getting onboarding workflows:', error);
    return res.status(500).json({ error: 'Failed to get onboarding workflows' });
  }
}

/**
 * Get specific workflow by ID
 */
async function getWorkflowById(
  res: NextApiResponse,
  teamId: string,
  workflowId: string
) {
  try {
    const workflowRef = doc(db, 'teamOnboardingWorkflows', workflowId);
    const workflowSnap = await getDoc(workflowRef);
    
    if (!workflowSnap.exists()) {
      return res.status(404).json({ error: 'Workflow not found' });
    }
    
    const workflow = {
      id: workflowSnap.id,
      ...workflowSnap.data()
    };
    
    // Ensure workflow belongs to this team
    if ((workflow as any).teamId !== teamId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Get workflow steps
    const stepsQuery = query(
      collection(db, 'onboardingWorkflowSteps'),
      where('workflowId', '==', workflowId)
    );
    
    const stepsSnap = await getDocs(stepsQuery);
    const steps = stepsSnap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    // Sort steps by order
    steps.sort((a: any, b: any) => a.order - b.order);
    
    return res.status(200).json({
      workflow: {
        ...workflow,
        steps
      }
    });
  } catch (error) {
    console.error('Error getting workflow by ID:', error);
    return res.status(500).json({ error: 'Failed to get workflow' });
  }
}

/**
 * Get workflows for specific member
 */
async function getWorkflowsByMember(
  res: NextApiResponse,
  teamId: string,
  memberId: string
) {
  try {
    // Get all member assignments
    const assignmentsQuery = query(
      collection(db, 'memberOnboardingAssignments'),
      where('teamId', '==', teamId),
      where('memberId', '==', memberId)
    );
    
    const assignmentsSnap = await getDocs(assignmentsQuery);
    const assignments = assignmentsSnap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    // Get workflow details for each assignment
    const memberWorkflows = [];
    
    for (const assignment of assignments) {
      const workflowRef = doc(db, 'teamOnboardingWorkflows', (assignment as any).workflowId);
      const workflowSnap = await getDoc(workflowRef);
      
      if (workflowSnap.exists()) {
        const workflow = {
          id: workflowSnap.id,
          ...workflowSnap.data()
        };
        
        // Get workflow steps with progress
        const stepsQuery = query(
          collection(db, 'onboardingWorkflowSteps'),
          where('workflowId', '==', workflow.id)
        );
        
        const stepsSnap = await getDocs(stepsQuery);
        const steps = stepsSnap.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        // Get step progress
        const progressQuery = query(
          collection(db, 'memberOnboardingProgress'),
          where('assignmentId', '==', assignment.id)
        );
        
        const progressSnap = await getDocs(progressQuery);
        const progressItems = progressSnap.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        // Associate progress with steps
        const stepsWithProgress = steps.map((step: any) => {
          const stepProgress = progressItems.find((p: any) => p.stepId === step.id) || {
            completed: false,
            completedAt: null
          };
          
          return {
            ...step,
            progress: stepProgress
          };
        });
        
        // Sort steps by order
        stepsWithProgress.sort((a: any, b: any) => a.order - b.order);
        
        // Calculate overall progress
        const completedSteps = stepsWithProgress.filter((step: any) => step.progress.completed).length;
        const progressPercentage = steps.length > 0 ? 
          Math.round((completedSteps / steps.length) * 100) : 0;
        
        memberWorkflows.push({
          assignment: assignment,
          workflow: {
            ...workflow,
            steps: stepsWithProgress,
            progress: {
              completed: completedSteps,
              total: steps.length,
              percentage: progressPercentage
            }
          }
        });
      }
    }
    
    return res.status(200).json({ memberWorkflows });
  } catch (error) {
    console.error('Error getting workflows by member:', error);
    return res.status(500).json({ error: 'Failed to get member workflows' });
  }
}

/**
 * Handle POST request to create or update onboarding workflows
 */
async function handlePost(
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string,
  teamId: string
) {
  try {
    // Check if user has permission to manage onboarding workflows
    const canManageOnboarding = await permissionService.hasPermission(
      userId,
      teamId,
      'manageOnboarding' as any
    );
    
    if (!canManageOnboarding) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Get action from request
    const action = req.body.action;
    
    switch (action) {
      case 'create_workflow':
        return await createWorkflow(req, res, userId, teamId);
        
      case 'update_workflow':
        return await updateWorkflow(req, res, userId, teamId);
        
      case 'delete_workflow':
        return await deleteWorkflow(req, res, teamId);
        
      case 'assign_workflow':
        return await assignWorkflow(req, res, userId, teamId);
        
      case 'update_progress':
        return await updateProgress(req, res, userId, teamId);
        
      default:
        return res.status(400).json({ error: 'Invalid action' });
    }
  } catch (error) {
    console.error('Error in onboarding workflow POST:', error);
    return res.status(500).json({ error: 'Failed to process onboarding workflow action' });
  }
}

/**
 * Create new onboarding workflow
 */
async function createWorkflow(
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string,
  teamId: string
) {
  try {
    const { title, description, isDefault, steps } = req.body;
    
    if (!title || !Array.isArray(steps) || steps.length === 0) {
      return res.status(400).json({ error: 'Title and at least one step are required' });
    }
    
    // Create the workflow
    const workflowData = {
      teamId,
      title,
      description: description || '',
      isDefault: isDefault || false,
      createdBy: userId,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      active: true
    };
    
    const workflowRef = await addDoc(collection(db, 'teamOnboardingWorkflows'), workflowData);
    const workflowId = workflowRef.id;
    
    // Add workflow steps
    const createdSteps = [];
    
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      
      if (!step.title) {
        return res.status(400).json({ error: `Step ${i + 1} requires a title` });
      }
      
      const stepData = {
        workflowId,
        title: step.title,
        description: step.description || '',
        order: i,
        resources: step.resources || [],
        type: step.type || 'manual', // manual, automated, document
        automationDetails: step.automationDetails || null,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      };
      
      const stepRef = await addDoc(collection(db, 'onboardingWorkflowSteps'), stepData);
      createdSteps.push({
        id: stepRef.id,
        ...stepData
      });
    }
    
    // If this is marked as default and there's no other default,
    // set it as the team's default onboarding workflow
    if (isDefault) {
      await setDefaultWorkflow(teamId, workflowId);
    }
    
    return res.status(201).json({
      workflow: {
        id: workflowId,
        ...workflowData,
        steps: createdSteps
      }
    });
  } catch (error) {
    console.error('Error creating workflow:', error);
    return res.status(500).json({ error: 'Failed to create workflow' });
  }
}

/**
 * Update existing onboarding workflow
 */
async function updateWorkflow(
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string,
  teamId: string
) {
  try {
    const { workflowId, title, description, isDefault, steps } = req.body;
    
    if (!workflowId) {
      return res.status(400).json({ error: 'Workflow ID is required' });
    }
    
    // Ensure the workflow exists and belongs to this team
    const workflowRef = doc(db, 'teamOnboardingWorkflows', workflowId);
    const workflowSnap = await getDoc(workflowRef);
    
    if (!workflowSnap.exists()) {
      return res.status(404).json({ error: 'Workflow not found' });
    }
    
    const existingWorkflow = workflowSnap.data();
    if (existingWorkflow.teamId !== teamId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Update the workflow document
    const workflowUpdates: any = {
      updatedAt: Timestamp.now()
    };
    
    if (title) workflowUpdates.title = title;
    if (description !== undefined) workflowUpdates.description = description;
    if (isDefault !== undefined) workflowUpdates.isDefault = isDefault;
    
    await updateDoc(workflowRef, workflowUpdates);
    
    // Handle steps if provided
    let updatedSteps = [];
    
    if (Array.isArray(steps)) {
      // Get existing steps
      const existingStepsQuery = query(
        collection(db, 'onboardingWorkflowSteps'),
        where('workflowId', '==', workflowId)
      );
      
      const existingStepsSnap = await getDocs(existingStepsQuery);
      const existingStepsDocs = existingStepsSnap.docs;
      
      // Track existing step IDs for deletion check
      const existingStepIds = existingStepsDocs.map(doc => doc.id);
      const updatedStepIds = steps.filter(s => s.id).map(s => s.id);
      
      // Delete steps that were removed
      for (const stepId of existingStepIds) {
        if (!updatedStepIds.includes(stepId)) {
          await deleteDoc(doc(db, 'onboardingWorkflowSteps', stepId));
        }
      }
      
      // Update or create steps
      for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        
        if (!step.title) {
          return res.status(400).json({ error: `Step ${i + 1} requires a title` });
        }
        
        const stepData = {
          workflowId,
          title: step.title,
          description: step.description || '',
          order: i, // Update order based on new position
          resources: step.resources || [],
          type: step.type || 'manual',
          automationDetails: step.automationDetails || null,
          updatedAt: Timestamp.now(),
          createdAt: Timestamp.now()
        };
        
        if (step.id) {
          // Update existing step
          const stepRef = doc(db, 'onboardingWorkflowSteps', step.id);
          await updateDoc(stepRef, stepData);
          updatedSteps.push({
            id: step.id,
            ...stepData
          });
        } else {
          // Create new step
          stepData.createdAt = Timestamp.now();
          const stepRef = await addDoc(collection(db, 'onboardingWorkflowSteps'), stepData);
          updatedSteps.push({
            id: stepRef.id,
            ...stepData
          });
        }
      }
    } else {
      // If steps not provided, get existing steps
      const stepsQuery = query(
        collection(db, 'onboardingWorkflowSteps'),
        where('workflowId', '==', workflowId)
      );
      
      const stepsSnap = await getDocs(stepsQuery);
      updatedSteps = stepsSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Sort steps by order
      updatedSteps.sort((a: any, b: any) => a.order - b.order);
    }
    
    // If this is marked as default, update team's default workflow
    if (isDefault) {
      await setDefaultWorkflow(teamId, workflowId);
    }
    
    return res.status(200).json({
      workflow: {
        id: workflowId,
        ...workflowSnap.data(),
        ...workflowUpdates,
        steps: updatedSteps
      }
    });
  } catch (error) {
    console.error('Error updating workflow:', error);
    return res.status(500).json({ error: 'Failed to update workflow' });
  }
}

/**
 * Delete onboarding workflow
 */
async function deleteWorkflow(
  req: NextApiRequest,
  res: NextApiResponse,
  teamId: string
) {
  try {
    const { workflowId } = req.body;
    
    if (!workflowId) {
      return res.status(400).json({ error: 'Workflow ID is required' });
    }
    
    // Ensure the workflow exists and belongs to this team
    const workflowRef = doc(db, 'teamOnboardingWorkflows', workflowId);
    const workflowSnap = await getDoc(workflowRef);
    
    if (!workflowSnap.exists()) {
      return res.status(404).json({ error: 'Workflow not found' });
    }
    
    const existingWorkflow = workflowSnap.data();
    if (existingWorkflow.teamId !== teamId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Check if there are any active assignments for this workflow
    const activeAssignmentsQuery = query(
      collection(db, 'memberOnboardingAssignments'),
      where('workflowId', '==', workflowId),
      where('status', 'in', ['pending', 'in_progress'])
    );
    
    const activeAssignmentsSnap = await getDocs(activeAssignmentsQuery);
    
    if (!activeAssignmentsSnap.empty) {
      return res.status(400).json({ 
        error: 'Cannot delete workflow with active assignments',
        activeAssignments: activeAssignmentsSnap.size
      });
    }
    
    // Delete all steps
    const stepsQuery = query(
      collection(db, 'onboardingWorkflowSteps'),
      where('workflowId', '==', workflowId)
    );
    
    const stepsSnap = await getDocs(stepsQuery);
    
    // Batch delete steps
    const batch = writeBatch(db);
    stepsSnap.forEach(doc => {
      batch.delete(doc.ref);
    });
    
    // Delete the workflow itself
    batch.delete(workflowRef);
    
    await batch.commit();
    
    // If this was the default workflow, clear the team's default
    if (existingWorkflow.isDefault) {
      await clearDefaultWorkflow(teamId);
    }
    
    return res.status(200).json({
      message: 'Workflow deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting workflow:', error);
    return res.status(500).json({ error: 'Failed to delete workflow' });
  }
}

/**
 * Assign workflow to team member
 */
async function assignWorkflow(
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string,
  teamId: string
) {
  try {
    const { workflowId, memberId, dueDate } = req.body;
    
    if (!workflowId || !memberId) {
      return res.status(400).json({ error: 'Workflow ID and member ID are required' });
    }
    
    // Ensure the workflow exists and belongs to this team
    const workflowRef = doc(db, 'teamOnboardingWorkflows', workflowId);
    const workflowSnap = await getDoc(workflowRef);
    
    if (!workflowSnap.exists()) {
      return res.status(404).json({ error: 'Workflow not found' });
    }
    
    const workflow = workflowSnap.data();
    if (workflow.teamId !== teamId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Ensure the member is part of the team
    const teamRef = doc(db, 'teams', teamId);
    const teamSnap = await getDoc(teamRef);
    
    if (!teamSnap.exists()) {
      return res.status(404).json({ error: 'Team not found' });
    }
    
    const team = teamSnap.data();
    if (!team.members.includes(memberId)) {
      return res.status(400).json({ error: 'Member is not part of this team' });
    }
    
    // Check if member already has this workflow assigned
    const existingAssignmentQuery = query(
      collection(db, 'memberOnboardingAssignments'),
      where('teamId', '==', teamId),
      where('memberId', '==', memberId),
      where('workflowId', '==', workflowId),
      where('status', 'in', ['pending', 'in_progress'])
    );
    
    const existingAssignmentSnap = await getDocs(existingAssignmentQuery);
    
    if (!existingAssignmentSnap.empty) {
      return res.status(400).json({ 
        error: 'Member already has this workflow assigned',
        assignmentId: existingAssignmentSnap.docs[0].id
      });
    }
    
    // Create the assignment
    const dueDateTimestamp = dueDate ? Timestamp.fromDate(new Date(dueDate)) : null;
    
    const assignmentData = {
      teamId,
      workflowId,
      memberId,
      assignedBy: userId,
      assignedAt: Timestamp.now(),
      dueDate: dueDateTimestamp,
      status: 'pending',
      startedAt: null,
      completedAt: null
    };
    
    const assignmentRef = await addDoc(
      collection(db, 'memberOnboardingAssignments'), 
      assignmentData
    );
    
    return res.status(201).json({
      assignment: {
        id: assignmentRef.id,
        ...assignmentData
      }
    });
  } catch (error) {
    console.error('Error assigning workflow:', error);
    return res.status(500).json({ error: 'Failed to assign workflow' });
  }
}

/**
 * Update onboarding progress for member
 */
async function updateProgress(
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string,
  teamId: string
) {
  try {
    const { assignmentId, stepId, completed } = req.body;
    
    if (!assignmentId || !stepId) {
      return res.status(400).json({ error: 'Assignment ID and step ID are required' });
    }
    
    // Ensure the assignment exists and belongs to this team
    const assignmentRef = doc(db, 'memberOnboardingAssignments', assignmentId);
    const assignmentSnap = await getDoc(assignmentRef);
    
    if (!assignmentSnap.exists()) {
      return res.status(404).json({ error: 'Assignment not found' });
    }
    
    const assignment = assignmentSnap.data();
    if (assignment.teamId !== teamId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Check if the step belongs to the assigned workflow
    const stepRef = doc(db, 'onboardingWorkflowSteps', stepId);
    const stepSnap = await getDoc(stepRef);
    
    if (!stepSnap.exists()) {
      return res.status(404).json({ error: 'Step not found' });
    }
    
    const step = stepSnap.data();
    if (step.workflowId !== assignment.workflowId) {
      return res.status(400).json({ error: 'Step does not belong to assigned workflow' });
    }
    
    // Update or create progress record
    const progressQuery = query(
      collection(db, 'memberOnboardingProgress'),
      where('assignmentId', '==', assignmentId),
      where('stepId', '==', stepId)
    );
    
    const progressSnap = await getDocs(progressQuery);
    
    let progressId;
    const now = Timestamp.now();
    
    if (!progressSnap.empty) {
      // Update existing progress
      progressId = progressSnap.docs[0].id;
      const progressRef = doc(db, 'memberOnboardingProgress', progressId);
      
      await updateDoc(progressRef, {
        completed: completed,
        completedAt: completed ? now : null,
        updatedAt: now,
        updatedBy: userId
      });
    } else {
      // Create new progress record
      const progressData = {
        assignmentId,
        stepId,
        completed: completed,
        completedAt: completed ? now : null,
        createdAt: now,
        updatedAt: now,
        createdBy: userId,
        updatedBy: userId
      };
      
      const progressRef = await addDoc(
        collection(db, 'memberOnboardingProgress'),
        progressData
      );
      
      progressId = progressRef.id;
    }
    
    // If this step was marked as completed, update assignment status
    if (completed) {
      // Get all steps for this workflow
      const allStepsQuery = query(
        collection(db, 'onboardingWorkflowSteps'),
        where('workflowId', '==', assignment.workflowId)
      );
      
      const allStepsSnap = await getDocs(allStepsQuery);
      const totalSteps = allStepsSnap.size;
      
      // Get completed steps for this assignment
      const completedStepsQuery = query(
        collection(db, 'memberOnboardingProgress'),
        where('assignmentId', '==', assignmentId),
        where('completed', '==', true)
      );
      
      const completedStepsSnap = await getDocs(completedStepsQuery);
      const completedSteps = completedStepsSnap.size;
      
      // Update assignment status
      const assignmentUpdate: any = {
        updatedAt: now
      };
      
      if (assignment.status === 'pending') {
        // First step completed, mark as in progress
        assignmentUpdate.status = 'in_progress';
        assignmentUpdate.startedAt = now;
      }
      
      if (completedSteps === totalSteps) {
        // All steps completed, mark as completed
        assignmentUpdate.status = 'completed';
        assignmentUpdate.completedAt = now;
      }
      
      await updateDoc(assignmentRef, assignmentUpdate);
    }
    
    return res.status(200).json({
      progress: {
        id: progressId,
        assignmentId,
        stepId,
        completed,
        completedAt: completed ? now.toDate() : null,
        updatedAt: now.toDate(),
        updatedBy: userId
      }
    });
  } catch (error) {
    console.error('Error updating progress:', error);
    return res.status(500).json({ error: 'Failed to update progress' });
  }
}

/**
 * Set default workflow for team
 */
async function setDefaultWorkflow(teamId: string, workflowId: string) {
  try {
    // Clear other default workflows
    const defaultWorkflowsQuery = query(
      collection(db, 'teamOnboardingWorkflows'),
      where('teamId', '==', teamId),
      where('isDefault', '==', true)
    );
    
    const defaultWorkflowsSnap = await getDocs(defaultWorkflowsQuery);
    
    for (const doc of defaultWorkflowsSnap.docs) {
      if (doc.id !== workflowId) {
        await updateDoc(doc.ref, { isDefault: false });
      }
    }
    
    // Update team's default workflow reference
    const teamRef = doc(db, 'teams', teamId);
    await updateDoc(teamRef, {
      defaultOnboardingWorkflowId: workflowId,
      updatedAt: Timestamp.now()
    });
  } catch (error) {
    console.error('Error setting default workflow:', error);
    throw error;
  }
}

/**
 * Clear default workflow for team
 */
async function clearDefaultWorkflow(teamId: string) {
  try {
    const teamRef = doc(db, 'teams', teamId);
    await updateDoc(teamRef, {
      defaultOnboardingWorkflowId: null,
      updatedAt: Timestamp.now()
    });
  } catch (error) {
    console.error('Error clearing default workflow:', error);
    throw error;
  }
}

/**
 * Delete document
 */
async function deleteDoc(docRef: any) {
  try {
    await docRef.delete();
  } catch (error) {
    console.error('Error deleting document:', error);
    throw error;
  }
}

/**
 * Create write batch
 */
function writeBatch(db: any) {
  return db.batch();
}
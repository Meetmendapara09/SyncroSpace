'use client';

import { useState, useEffect } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '@/lib/firebase';
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  onSnapshot,
  serverTimestamp,
  orderBy,
} from 'firebase/firestore';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import {
  Plus,
  Settings,
  Users,
  Check,
  X,
  ClipboardCheck,
  ArrowRight,
  FileCheck,
  Clock,
  ArrowUpRight,
  PlusCircle,
  Trash2,
  Edit,
  MoreHorizontal,
  UserPlus,
  CalendarCheck,
  LogIn,
  BookOpen,
  MessageSquare,
  Workflow
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

// Types and Interfaces
interface WorkflowStep {
  id: string;
  title: string;
  description: string;
  status: 'not-started' | 'in-progress' | 'completed' | 'skipped';
  assignedTo: string[];
  dueDate?: any;
  resources?: WorkflowResource[];
  order: number;
}

interface WorkflowResource {
  id: string;
  title: string;
  type: 'document' | 'video' | 'link' | 'meeting';
  url: string;
}

interface OnboardingWorkflow {
  id: string;
  teamId: string;
  title: string;
  description: string;
  createdBy: string;
  createdAt: any;
  updatedAt: any;
  assignedTo: string[];
  status: 'active' | 'completed' | 'archived';
  steps: WorkflowStep[];
  progress: number;
}

interface TeamOnboardingWorkflowProps {
  teamId: string;
}

export function TeamOnboardingWorkflow({ teamId }: TeamOnboardingWorkflowProps) {
  const [user] = useAuthState(auth);
  const [workflows, setWorkflows] = useState<OnboardingWorkflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddWorkflow, setShowAddWorkflow] = useState(false);
  const [showAddStep, setShowAddStep] = useState(false);
  const [selectedWorkflow, setSelectedWorkflow] = useState<OnboardingWorkflow | null>(null);
  const [showWorkflowDetail, setShowWorkflowDetail] = useState(false);
  const [showResourceForm, setShowResourceForm] = useState(false);
  const [activeTabIndex, setActiveTabIndex] = useState(0);

  // New workflow form state
  const [newWorkflow, setNewWorkflow] = useState({
    title: '',
    description: '',
    assignedTo: [] as string[],
  });

  // New step form state
  const [newStep, setNewStep] = useState({
    title: '',
    description: '',
    assignedTo: [] as string[],
    dueDate: null as Date | null,
    workflowId: '',
  });

  // New resource form state
  const [newResource, setNewResource] = useState({
    title: '',
    type: 'document' as const,
    url: '',
    stepId: '',
  });
  
  useEffect(() => {
    if (!user || !teamId) return;

    setLoading(true);

    // Load team workflows
    const workflowsQuery = query(
      collection(db, 'teamOnboardingWorkflows'),
      where('teamId', '==', teamId),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(workflowsQuery, (snapshot) => {
      const workflowList = snapshot.docs.map(doc => {
        const data = doc.data();
        
        // Calculate progress based on steps
        let completedSteps = 0;
        if (data.steps && Array.isArray(data.steps)) {
          completedSteps = data.steps.filter((step: any) => step.status === 'completed').length;
        }
        const totalSteps = data.steps?.length || 0;
        const progress = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;
        
        return {
          id: doc.id,
          ...data,
          progress
        };
      }) as OnboardingWorkflow[];
      
      setWorkflows(workflowList);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, teamId]);

  // Create new workflow
  const createWorkflow = async () => {
    if (!user || !teamId || !newWorkflow.title.trim()) return;

    try {
      const workflowData = {
        teamId,
        title: newWorkflow.title.trim(),
        description: newWorkflow.description.trim(),
        createdBy: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        assignedTo: newWorkflow.assignedTo,
        status: 'active' as const,
        steps: [],
      };

      await addDoc(collection(db, 'teamOnboardingWorkflows'), workflowData);
      
      setShowAddWorkflow(false);
      resetNewWorkflowForm();

      toast({
        title: "Workflow created",
        description: "New onboarding workflow has been created successfully.",
      });

    } catch (error) {
      console.error('Error creating workflow:', error);
      toast({
        title: "Error",
        description: "Failed to create workflow. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Create new workflow step
  const createWorkflowStep = async () => {
    if (!selectedWorkflow || !newStep.title.trim()) return;

    try {
      const stepData: WorkflowStep = {
        id: `step-${Date.now()}`,
        title: newStep.title.trim(),
        description: newStep.description.trim(),
        status: 'not-started',
        assignedTo: newStep.assignedTo,
        dueDate: newStep.dueDate,
        resources: [],
        order: selectedWorkflow.steps?.length || 0
      };

      const updatedSteps = [...(selectedWorkflow.steps || []), stepData];

      await updateDoc(doc(db, 'teamOnboardingWorkflows', selectedWorkflow.id), {
        steps: updatedSteps,
        updatedAt: serverTimestamp()
      });
      
      setShowAddStep(false);
      resetNewStepForm();

      toast({
        title: "Step added",
        description: "New step has been added to the workflow.",
      });

    } catch (error) {
      console.error('Error adding step:', error);
      toast({
        title: "Error",
        description: "Failed to add step. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Add resource to step
  const addResourceToStep = async () => {
    if (!selectedWorkflow || !newResource.stepId || !newResource.title.trim() || !newResource.url.trim()) return;

    try {
      const resourceData: WorkflowResource = {
        id: `resource-${Date.now()}`,
        title: newResource.title.trim(),
        type: newResource.type,
        url: newResource.url.trim()
      };

      // Find the step and add the resource
      const updatedSteps = selectedWorkflow.steps.map(step => {
        if (step.id === newResource.stepId) {
          return {
            ...step,
            resources: [...(step.resources || []), resourceData]
          };
        }
        return step;
      });

      await updateDoc(doc(db, 'teamOnboardingWorkflows', selectedWorkflow.id), {
        steps: updatedSteps,
        updatedAt: serverTimestamp()
      });
      
      setShowResourceForm(false);
      resetNewResourceForm();

      toast({
        title: "Resource added",
        description: "Resource has been added to the step.",
      });

    } catch (error) {
      console.error('Error adding resource:', error);
      toast({
        title: "Error",
        description: "Failed to add resource. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Update step status
  const updateStepStatus = async (workflowId: string, stepId: string, newStatus: WorkflowStep['status']) => {
    if (!workflowId || !stepId) return;

    try {
      const workflow = workflows.find(w => w.id === workflowId);
      if (!workflow) return;

      // Update the step status
      const updatedSteps = workflow.steps.map(step => {
        if (step.id === stepId) {
          return { ...step, status: newStatus };
        }
        return step;
      });

      await updateDoc(doc(db, 'teamOnboardingWorkflows', workflowId), {
        steps: updatedSteps,
        updatedAt: serverTimestamp()
      });

      toast({
        title: "Step updated",
        description: `Step marked as ${newStatus.replace('-', ' ')}.`,
      });

    } catch (error) {
      console.error('Error updating step:', error);
      toast({
        title: "Error",
        description: "Failed to update step status.",
        variant: "destructive"
      });
    }
  };

  // Delete workflow
  const deleteWorkflow = async (workflowId: string) => {
    try {
      await deleteDoc(doc(db, 'teamOnboardingWorkflows', workflowId));
      
      if (selectedWorkflow?.id === workflowId) {
        setSelectedWorkflow(null);
        setShowWorkflowDetail(false);
      }

      toast({
        title: "Workflow deleted",
        description: "Workflow has been deleted successfully.",
      });

    } catch (error) {
      console.error('Error deleting workflow:', error);
      toast({
        title: "Error",
        description: "Failed to delete workflow.",
        variant: "destructive"
      });
    }
  };

  // Delete workflow step
  const deleteWorkflowStep = async (workflowId: string, stepId: string) => {
    try {
      const workflow = workflows.find(w => w.id === workflowId);
      if (!workflow) return;

      const updatedSteps = workflow.steps.filter(step => step.id !== stepId);

      await updateDoc(doc(db, 'teamOnboardingWorkflows', workflowId), {
        steps: updatedSteps,
        updatedAt: serverTimestamp()
      });

      toast({
        title: "Step deleted",
        description: "Step has been deleted from the workflow.",
      });

    } catch (error) {
      console.error('Error deleting step:', error);
      toast({
        title: "Error",
        description: "Failed to delete step.",
        variant: "destructive"
      });
    }
  };

  // Reset form states
  const resetNewWorkflowForm = () => {
    setNewWorkflow({
      title: '',
      description: '',
      assignedTo: [],
    });
  };

  const resetNewStepForm = () => {
    setNewStep({
      title: '',
      description: '',
      assignedTo: [],
      dueDate: null,
      workflowId: '',
    });
  };

  const resetNewResourceForm = () => {
    setNewResource({
      title: '',
      type: 'document',
      url: '',
      stepId: '',
    });
  };

  // Get status badge color
  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'in-progress':
        return 'bg-blue-100 text-blue-800';
      case 'active':
        return 'bg-blue-100 text-blue-800';
      case 'not-started':
        return 'bg-gray-100 text-gray-800';
      case 'skipped':
        return 'bg-yellow-100 text-yellow-800';
      case 'archived':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Get resource icon by type
  const getResourceIcon = (type: WorkflowResource['type']) => {
    switch (type) {
      case 'document':
        return <FileCheck className="h-4 w-4" />;
      case 'video':
        return <BookOpen className="h-4 w-4" />;
      case 'link':
        return <ArrowUpRight className="h-4 w-4" />;
      case 'meeting':
        return <Users className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading onboarding workflows...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Team Onboarding</h2>
          <p className="text-muted-foreground">
            Create and manage onboarding workflows for team members
          </p>
        </div>
        <Button onClick={() => setShowAddWorkflow(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Workflow
        </Button>
      </div>

      {/* Workflows List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {workflows.length > 0 ? (
          workflows.map(workflow => (
            <Card key={workflow.id} className="overflow-hidden">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <Badge className={getStatusBadgeColor(workflow.status)}>
                    {workflow.status}
                  </Badge>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => {
                        setSelectedWorkflow(workflow);
                        setShowWorkflowDetail(true);
                      }}>
                        View Details
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => {
                        // Implement edit workflow
                      }}>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        className="text-destructive" 
                        onClick={() => deleteWorkflow(workflow.id)}>
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <CardTitle className="mt-2 cursor-pointer"
                  onClick={() => {
                    setSelectedWorkflow(workflow);
                    setShowWorkflowDetail(true);
                  }}>
                  {workflow.title}
                </CardTitle>
                <CardDescription className="line-clamp-2">
                  {workflow.description}
                </CardDescription>
              </CardHeader>
              
              <CardContent>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Progress</span>
                      <span>{workflow.progress}%</span>
                    </div>
                    <Progress value={workflow.progress} />
                  </div>
                  
                  <div className="text-sm">
                    <p className="font-medium flex items-center gap-2 mb-2">
                      <ClipboardCheck className="h-4 w-4" />
                      Steps ({workflow.steps?.length || 0})
                    </p>
                    
                    {workflow.steps && workflow.steps.length > 0 ? (
                      <div className="space-y-1">
                        {workflow.steps.slice(0, 3).map(step => (
                          <div key={step.id} className="flex items-center gap-2">
                            {step.status === 'completed' ? (
                              <Check className="h-3 w-3 text-green-500" />
                            ) : (
                              <Clock className="h-3 w-3 text-muted-foreground" />
                            )}
                            <span className={step.status === 'completed' ? 'line-through text-muted-foreground' : ''}>
                              {step.title}
                            </span>
                          </div>
                        ))}
                        {workflow.steps.length > 3 && (
                          <div className="text-xs text-muted-foreground pl-5">
                            +{workflow.steps.length - 3} more steps
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-sm">No steps defined yet</p>
                    )}
                  </div>
                </div>
              </CardContent>
              
              <CardFooter className="bg-muted/30 flex justify-between pt-3">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">
                    {workflow.assignedTo?.length || 0} assignees
                  </span>
                </div>
                
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => {
                    setSelectedWorkflow(workflow);
                    setShowWorkflowDetail(true);
                  }}
                >
                  View
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </CardFooter>
            </Card>
          ))
        ) : (
          <Card className="col-span-full">
            <CardContent className="flex items-center justify-center flex-col py-12">
              <Workflow className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No onboarding workflows</h3>
              <p className="text-muted-foreground mb-4 text-center max-w-md">
                Create onboarding workflows to help new team members get up to speed quickly.
              </p>
              <Button onClick={() => setShowAddWorkflow(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Workflow
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Create Workflow Dialog */}
      <Dialog open={showAddWorkflow} onOpenChange={setShowAddWorkflow}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Workflow</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="workflowTitle">Workflow Title</Label>
              <Input
                id="workflowTitle"
                value={newWorkflow.title}
                onChange={(e) => setNewWorkflow(prev => ({ ...prev, title: e.target.value }))}
                placeholder="e.g., New Developer Onboarding"
              />
            </div>
            <div>
              <Label htmlFor="workflowDescription">Description</Label>
              <Textarea
                id="workflowDescription"
                value={newWorkflow.description}
                onChange={(e) => setNewWorkflow(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Provide details about this workflow"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => {
                setShowAddWorkflow(false);
                resetNewWorkflowForm();
              }}>
                Cancel
              </Button>
              <Button onClick={createWorkflow} disabled={!newWorkflow.title.trim()}>
                Create Workflow
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Workflow Detail Dialog */}
      <Dialog 
        open={showWorkflowDetail} 
        onOpenChange={(open) => {
          setShowWorkflowDetail(open);
          if (!open) {
            setActiveTabIndex(0);
          }
        }}
      >
        {selectedWorkflow && (
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
            <DialogHeader>
              <div className="flex items-center gap-2">
                <DialogTitle className="text-xl">{selectedWorkflow.title}</DialogTitle>
                <Badge className={getStatusBadgeColor(selectedWorkflow.status)}>
                  {selectedWorkflow.status}
                </Badge>
              </div>
            </DialogHeader>
            
            <Tabs defaultValue="steps" className="flex flex-col h-full overflow-hidden">
              <TabsList>
                <TabsTrigger value="steps" onClick={() => setActiveTabIndex(0)}>
                  <ClipboardCheck className="h-4 w-4 mr-2" />
                  Steps
                </TabsTrigger>
                <TabsTrigger value="overview" onClick={() => setActiveTabIndex(1)}>
                  <Settings className="h-4 w-4 mr-2" />
                  Overview
                </TabsTrigger>
                <TabsTrigger value="assignees" onClick={() => setActiveTabIndex(2)}>
                  <Users className="h-4 w-4 mr-2" />
                  Assignees
                </TabsTrigger>
              </TabsList>
              
              {/* Steps Tab */}
              <TabsContent value="steps" className="flex-1 overflow-hidden">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold">Workflow Steps</h3>
                    <p className="text-sm text-muted-foreground">
                      Complete these steps in sequence to finish onboarding
                    </p>
                  </div>
                  <Button 
                    size="sm"
                    onClick={() => {
                      setNewStep(prev => ({ ...prev, workflowId: selectedWorkflow.id }));
                      setShowAddStep(true);
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Step
                  </Button>
                </div>
                
                <ScrollArea className="h-[calc(90vh-250px)]">
                  <div className="space-y-4">
                    {selectedWorkflow.steps && selectedWorkflow.steps.length > 0 ? (
                      selectedWorkflow.steps.map((step, index) => (
                        <Card key={step.id} className="relative overflow-hidden">
                          <div className={`absolute top-0 left-0 w-1 h-full 
                            ${step.status === 'completed' ? 'bg-green-500' : 
                               step.status === 'in-progress' ? 'bg-blue-500' : 
                               step.status === 'skipped' ? 'bg-yellow-500' : 'bg-gray-300'}`} 
                          />
                          <CardContent className="p-4 pl-6">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <div className="flex items-center justify-center h-6 w-6 rounded-full bg-muted text-xs font-medium">
                                    {index + 1}
                                  </div>
                                  <h4 className="text-base font-medium">{step.title}</h4>
                                  <Badge className={getStatusBadgeColor(step.status)}>
                                    {step.status.replace('-', ' ')}
                                  </Badge>
                                </div>
                                <p className="text-sm text-muted-foreground mb-3">
                                  {step.description}
                                </p>
                                
                                {step.dueDate && (
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
                                    <Calendar className="h-3 w-3" />
                                    <span>
                                      Due by {format(new Date(step.dueDate.seconds * 1000), 'MMM dd, yyyy')}
                                    </span>
                                  </div>
                                )}
                                
                                {/* Resources section */}
                                {step.resources && step.resources.length > 0 && (
                                  <div className="mb-3">
                                    <p className="text-xs font-medium text-muted-foreground mb-2">Resources:</p>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                      {step.resources.map(resource => (
                                        <a 
                                          key={resource.id}
                                          href={resource.url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="flex items-center gap-2 text-xs p-2 bg-muted/30 hover:bg-muted rounded-md"
                                        >
                                          {getResourceIcon(resource.type)}
                                          <span>{resource.title}</span>
                                        </a>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                
                                {/* Add resource button */}
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  className="h-7 text-xs"
                                  onClick={() => {
                                    setNewResource(prev => ({ ...prev, stepId: step.id }));
                                    setShowResourceForm(true);
                                  }}
                                >
                                  <Plus className="h-3 w-3 mr-1" />
                                  Add Resource
                                </Button>
                              </div>
                              
                              <div className="flex items-center gap-1">
                                {step.status !== 'completed' && (
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    className="h-7"
                                    onClick={() => updateStepStatus(selectedWorkflow.id, step.id, 'completed')}
                                  >
                                    <Check className="h-4 w-4 mr-1" />
                                    Complete
                                  </Button>
                                )}
                                
                                {step.status !== 'skipped' && step.status !== 'completed' && (
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    className="h-7"
                                    onClick={() => updateStepStatus(selectedWorkflow.id, step.id, 'skipped')}
                                  >
                                    <X className="h-4 w-4 mr-1" />
                                    Skip
                                  </Button>
                                )}
                                
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                                      <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => {
                                      // Implement edit step
                                    }}>
                                      <Edit className="h-4 w-4 mr-2" />
                                      Edit
                                    </DropdownMenuItem>
                                    <DropdownMenuItem 
                                      className="text-destructive" 
                                      onClick={() => deleteWorkflowStep(selectedWorkflow.id, step.id)}
                                    >
                                      <Trash2 className="h-4 w-4 mr-2" />
                                      Delete
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))
                    ) : (
                      <div className="text-center py-8">
                        <ClipboardCheck className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                        <h4 className="text-lg font-medium mb-2">No steps defined</h4>
                        <p className="text-sm text-muted-foreground mb-4">
                          Add steps to create a structured onboarding experience
                        </p>
                        <Button
                          onClick={() => {
                            setNewStep(prev => ({ ...prev, workflowId: selectedWorkflow.id }));
                            setShowAddStep(true);
                          }}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add First Step
                        </Button>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>
              
              {/* Overview Tab */}
              <TabsContent value="overview" className="flex-1 overflow-hidden">
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Description</h3>
                    <div className="p-4 bg-muted/30 rounded-md">
                      <p>{selectedWorkflow.description || 'No description provided.'}</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Progress</CardTitle>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Overall Completion</span>
                            <span>{selectedWorkflow.progress}%</span>
                          </div>
                          <Progress value={selectedWorkflow.progress} />
                          <div className="flex items-center justify-between text-xs text-muted-foreground mt-4">
                            <span>
                              {selectedWorkflow.steps?.filter(s => s.status === 'completed')?.length || 0} of {selectedWorkflow.steps?.length || 0} steps completed
                            </span>
                            <span>
                              {selectedWorkflow.steps?.filter(s => s.status === 'skipped')?.length || 0} steps skipped
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Workflow Details</CardTitle>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="space-y-3 text-sm">
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Status</span>
                            <Badge className={getStatusBadgeColor(selectedWorkflow.status)}>
                              {selectedWorkflow.status}
                            </Badge>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Created</span>
                            <span>
                              {selectedWorkflow.createdAt && 
                                format(new Date(selectedWorkflow.createdAt.seconds * 1000), 'MMM dd, yyyy')}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Last Updated</span>
                            <span>
                              {selectedWorkflow.updatedAt && 
                                format(new Date(selectedWorkflow.updatedAt.seconds * 1000), 'MMM dd, yyyy')}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Assignees</span>
                            <span>{selectedWorkflow.assignedTo?.length || 0} people</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </TabsContent>
              
              {/* Assignees Tab */}
              <TabsContent value="assignees" className="flex-1 overflow-hidden">
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Assigned Team Members</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      People who need to complete this onboarding workflow
                    </p>
                    
                    {selectedWorkflow.assignedTo && selectedWorkflow.assignedTo.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {selectedWorkflow.assignedTo.map((userId, index) => (
                          <Card key={index}>
                            <CardContent className="p-4 flex items-center gap-4">
                              <Avatar>
                                <AvatarFallback>{userId.charAt(0).toUpperCase()}</AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium">{userId}</p>
                                <p className="text-sm text-muted-foreground">
                                  Progress: {selectedWorkflow.progress}%
                                </p>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <UserPlus className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                        <h4 className="text-lg font-medium mb-2">No assignees</h4>
                        <p className="text-sm text-muted-foreground mb-4">
                          Assign team members to this workflow
                        </p>
                        <Button>
                          <Plus className="h-4 w-4 mr-2" />
                          Add Assignees
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </DialogContent>
        )}
      </Dialog>

      {/* Add Step Dialog */}
      <Dialog open={showAddStep} onOpenChange={setShowAddStep}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Step</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="stepTitle">Step Title</Label>
              <Input
                id="stepTitle"
                value={newStep.title}
                onChange={(e) => setNewStep(prev => ({ ...prev, title: e.target.value }))}
                placeholder="e.g., Complete account setup"
              />
            </div>
            <div>
              <Label htmlFor="stepDescription">Description</Label>
              <Textarea
                id="stepDescription"
                value={newStep.description}
                onChange={(e) => setNewStep(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Provide details about this step"
              />
            </div>
            <div>
              <Label>Due Date (Optional)</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    {newStep.dueDate ? (
                      format(newStep.dueDate, "PPP")
                    ) : (
                      <span>Set due date</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={newStep.dueDate || undefined}
                    onSelect={(date) => setNewStep(prev => ({ ...prev, dueDate: date || null }))}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => {
                setShowAddStep(false);
                resetNewStepForm();
              }}>
                Cancel
              </Button>
              <Button onClick={createWorkflowStep} disabled={!newStep.title.trim()}>
                Add Step
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Resource Dialog */}
      <Dialog open={showResourceForm} onOpenChange={setShowResourceForm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Resource</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="resourceTitle">Resource Title</Label>
              <Input
                id="resourceTitle"
                value={newResource.title}
                onChange={(e) => setNewResource(prev => ({ ...prev, title: e.target.value }))}
                placeholder="e.g., Setup Guide"
              />
            </div>
            <div>
              <Label htmlFor="resourceType">Resource Type</Label>
              <Select
                value={newResource.type}
                onValueChange={(value) => setNewResource(prev => ({ ...prev, type: value as any }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="document">Document</SelectItem>
                  <SelectItem value="video">Video</SelectItem>
                  <SelectItem value="link">Link</SelectItem>
                  <SelectItem value="meeting">Meeting</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="resourceUrl">URL</Label>
              <Input
                id="resourceUrl"
                value={newResource.url}
                onChange={(e) => setNewResource(prev => ({ ...prev, url: e.target.value }))}
                placeholder="https://"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => {
                setShowResourceForm(false);
                resetNewResourceForm();
              }}>
                Cancel
              </Button>
              <Button 
                onClick={addResourceToStep} 
                disabled={!newResource.title.trim() || !newResource.url.trim()}
              >
                Add Resource
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
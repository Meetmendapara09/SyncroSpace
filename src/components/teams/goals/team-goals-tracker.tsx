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
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Plus,
  Target,
  Calendar,
  Users,
  CheckCircle2,
  Clock,
  AlertCircle,
  CircleDot,
  ArrowUpRight,
  ArrowRight,
  BarChart,
  Edit,
  Trash2,
  MoreHorizontal
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

// Types and Interfaces
interface TeamGoal {
  id: string;
  teamId: string;
  title: string;
  description: string;
  targetValue: number;
  currentValue: number;
  startDate: any;
  dueDate: any;
  status: 'on-track' | 'at-risk' | 'completed' | 'not-started';
  type: 'objective' | 'key-result';
  parentId?: string; // For key results, references parent objective
  ownerId: string;
  ownerName?: string;
  ownerAvatar?: string;
  createdAt: any;
  updatedAt: any;
  keyResults?: TeamGoal[]; // For objectives only
}

interface TeamGoalsTrackerProps {
  teamId: string;
}

export function TeamGoalsTracker({ teamId }: TeamGoalsTrackerProps) {
  const [user] = useAuthState(auth);
  const [goals, setGoals] = useState<TeamGoal[]>([]);
  const [keyResults, setKeyResults] = useState<TeamGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddObjective, setShowAddObjective] = useState(false);
  const [showAddKeyResult, setShowAddKeyResult] = useState(false);
  const [showGoalDetail, setShowGoalDetail] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<TeamGoal | null>(null);
  const [filter, setFilter] = useState('all'); // 'all', 'my-goals', 'completed', 'at-risk'
  const [timeFrame, setTimeFrame] = useState('current'); // 'current', 'past', 'future'

  // New goal form state
  const [newObjective, setNewObjective] = useState({
    title: '',
    description: '',
    targetValue: 100,
    startDate: new Date(),
    dueDate: null as Date | null,
    ownerId: '',
    ownerName: '',
  });

  // New key result form state
  const [newKeyResult, setNewKeyResult] = useState({
    title: '',
    description: '',
    targetValue: 100,
    currentValue: 0,
    parentId: '',
    ownerId: '',
  });

  // Progress update form state
  const [progressUpdate, setProgressUpdate] = useState({
    goalId: '',
    currentValue: 0,
  });
  
  useEffect(() => {
    if (!user || !teamId) return;

    setLoading(true);

    // Load team objectives
    const objectivesQuery = query(
      collection(db, 'teamGoals'),
      where('teamId', '==', teamId),
      where('type', '==', 'objective'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribeObjectives = onSnapshot(objectivesQuery, (snapshot) => {
      const objectivesList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as TeamGoal[];
      
      setGoals(objectivesList);
    });

    // Load team key results
    const keyResultsQuery = query(
      collection(db, 'teamGoals'),
      where('teamId', '==', teamId),
      where('type', '==', 'key-result'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribeKeyResults = onSnapshot(keyResultsQuery, (snapshot) => {
      const keyResultsList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as TeamGoal[];
      
      setKeyResults(keyResultsList);
      setLoading(false);
    });

    return () => {
      unsubscribeObjectives();
      unsubscribeKeyResults();
    };
  }, [user, teamId]);

  // Create new objective
  const createObjective = async () => {
    if (!user || !teamId || !newObjective.title.trim()) return;

    try {
      const objectiveData = {
        teamId,
        title: newObjective.title.trim(),
        description: newObjective.description.trim(),
        targetValue: newObjective.targetValue,
        currentValue: 0,
        startDate: newObjective.startDate,
        dueDate: newObjective.dueDate,
        status: 'not-started' as const,
        type: 'objective' as const,
        ownerId: newObjective.ownerId || user.uid,
        ownerName: newObjective.ownerName || user.displayName || user.email?.split('@')[0],
        ownerAvatar: user.photoURL || undefined,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      await addDoc(collection(db, 'teamGoals'), objectiveData);
      
      setShowAddObjective(false);
      resetNewObjectiveForm();

      toast({
        title: "Objective created",
        description: "New objective has been created successfully.",
      });

    } catch (error) {
      console.error('Error creating objective:', error);
      toast({
        title: "Error",
        description: "Failed to create objective. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Create new key result
  const createKeyResult = async () => {
    if (!user || !teamId || !newKeyResult.title.trim() || !newKeyResult.parentId) return;

    try {
      const keyResultData = {
        teamId,
        title: newKeyResult.title.trim(),
        description: newKeyResult.description.trim(),
        targetValue: newKeyResult.targetValue,
        currentValue: newKeyResult.currentValue,
        parentId: newKeyResult.parentId,
        status: 'not-started' as const,
        type: 'key-result' as const,
        ownerId: newKeyResult.ownerId || user.uid,
        ownerName: user.displayName || user.email?.split('@')[0],
        ownerAvatar: user.photoURL || undefined,
        startDate: serverTimestamp(),
        dueDate: null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      await addDoc(collection(db, 'teamGoals'), keyResultData);
      
      setShowAddKeyResult(false);
      resetNewKeyResultForm();

      toast({
        title: "Key Result created",
        description: "New key result has been created successfully.",
      });

    } catch (error) {
      console.error('Error creating key result:', error);
      toast({
        title: "Error",
        description: "Failed to create key result. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Update goal progress
  const updateGoalProgress = async (goalId: string, newValue: number) => {
    if (!goalId) return;

    try {
      // Update the goal's current value
      await updateDoc(doc(db, 'teamGoals', goalId), {
        currentValue: newValue,
        updatedAt: serverTimestamp(),
        status: newValue >= 100 ? 'completed' : 'on-track'
      });

      // If this is a key result, update the parent objective's progress
      const updatedGoal = keyResults.find(kr => kr.id === goalId);
      
      if (updatedGoal && updatedGoal.parentId) {
        const parentObjective = goals.find(obj => obj.id === updatedGoal.parentId);
        
        if (parentObjective) {
          const relatedKeyResults = keyResults.filter(kr => kr.parentId === parentObjective.id);
          let totalProgress = 0;
          
          relatedKeyResults.forEach(kr => {
            const currentValue = kr.id === goalId ? newValue : kr.currentValue;
            totalProgress += currentValue;
          });
          
          const avgProgress = totalProgress / relatedKeyResults.length;
          
          await updateDoc(doc(db, 'teamGoals', parentObjective.id), {
            currentValue: avgProgress,
            updatedAt: serverTimestamp(),
            status: avgProgress >= 100 ? 'completed' : 'on-track'
          });
        }
      }

      toast({
        title: "Progress updated",
        description: "Goal progress has been updated.",
      });

    } catch (error) {
      console.error('Error updating goal progress:', error);
      toast({
        title: "Error",
        description: "Failed to update progress.",
        variant: "destructive"
      });
    }
  };

  // Delete goal (objective or key result)
  const deleteGoal = async (goalId: string, isObjective: boolean) => {
    try {
      await deleteDoc(doc(db, 'teamGoals', goalId));
      
      // If this is an objective, delete all related key results
      if (isObjective) {
        const relatedKeyResults = keyResults.filter(kr => kr.parentId === goalId);
        
        for (const kr of relatedKeyResults) {
          await deleteDoc(doc(db, 'teamGoals', kr.id));
        }
      }

      if (selectedGoal?.id === goalId) {
        setSelectedGoal(null);
        setShowGoalDetail(false);
      }

      toast({
        title: isObjective ? "Objective deleted" : "Key result deleted",
        description: isObjective ? 
          "Objective and all related key results have been deleted." : 
          "Key result has been deleted.",
      });

    } catch (error) {
      console.error('Error deleting goal:', error);
      toast({
        title: "Error",
        description: "Failed to delete goal.",
        variant: "destructive"
      });
    }
  };

  // Reset form states
  const resetNewObjectiveForm = () => {
    setNewObjective({
      title: '',
      description: '',
      targetValue: 100,
      startDate: new Date(),
      dueDate: null,
      ownerId: '',
      ownerName: '',
    });
  };

  const resetNewKeyResultForm = () => {
    setNewKeyResult({
      title: '',
      description: '',
      targetValue: 100,
      currentValue: 0,
      parentId: '',
      ownerId: '',
    });
  };

  // Get status icon
  const getStatusIcon = (status: TeamGoal['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'on-track':
        return <ArrowUpRight className="h-4 w-4 text-blue-500" />;
      case 'at-risk':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case 'not-started':
        return <CircleDot className="h-4 w-4 text-gray-500" />;
    }
  };

  // Get status color
  const getStatusColor = (status: TeamGoal['status']) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'on-track':
        return 'bg-blue-100 text-blue-800';
      case 'at-risk':
        return 'bg-yellow-100 text-yellow-800';
      case 'not-started':
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Process objectives and their key results
  const processedObjectives = goals.map(objective => {
    const objectiveKeyResults = keyResults.filter(kr => kr.parentId === objective.id);
    return {
      ...objective,
      keyResults: objectiveKeyResults
    };
  });

  // Apply filters to objectives
  const filteredObjectives = processedObjectives.filter(objective => {
    if (filter === 'all') return true;
    if (filter === 'my-goals') return objective.ownerId === user?.uid;
    if (filter === 'completed') return objective.status === 'completed';
    if (filter === 'at-risk') return objective.status === 'at-risk';
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading goals...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Team Goals</h2>
          <p className="text-muted-foreground">
            Track objectives and key results (OKRs)
          </p>
        </div>
        <Button onClick={() => setShowAddObjective(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Objective
        </Button>
      </div>

      {/* Filters and Options */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex gap-2">
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-36">
              <Target className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Goals</SelectItem>
              <SelectItem value="my-goals">My Goals</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="at-risk">At Risk</SelectItem>
            </SelectContent>
          </Select>
          <Select value={timeFrame} onValueChange={setTimeFrame}>
            <SelectTrigger className="w-40">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Time Frame" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="current">Current Quarter</SelectItem>
              <SelectItem value="past">Previous Quarters</SelectItem>
              <SelectItem value="future">Future Objectives</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              // Implement export functionality
            }}
          >
            <BarChart className="h-4 w-4 mr-2" />
            View Reports
          </Button>
        </div>
      </div>

      {/* OKR List */}
      <div className="space-y-6">
        {filteredObjectives.length > 0 ? (
          filteredObjectives.map(objective => (
            <Card key={objective.id} className="overflow-hidden">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(objective.status)}
                    <CardTitle className="text-lg cursor-pointer" 
                      onClick={() => {
                        setSelectedGoal(objective);
                        setShowGoalDetail(true);
                      }}>
                      {objective.title}
                    </CardTitle>
                    <Badge className={getStatusColor(objective.status)}>
                      {objective.status.replace('-', ' ')}
                    </Badge>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => {
                        setSelectedGoal(objective);
                        setShowGoalDetail(true);
                      }}>
                        View Details
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => {
                        setNewKeyResult(prev => ({
                          ...prev,
                          parentId: objective.id
                        }));
                        setShowAddKeyResult(true);
                      }}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Key Result
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => {
                        // Implement edit objective
                      }}>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        className="text-destructive" 
                        onClick={() => deleteGoal(objective.id, true)}>
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <CardDescription className="line-clamp-2">
                  {objective.description}
                </CardDescription>
                <div className="flex items-center gap-4 mt-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-5 w-5">
                      <AvatarImage src={objective.ownerAvatar} />
                      <AvatarFallback>{objective.ownerName?.charAt(0) || 'U'}</AvatarFallback>
                    </Avatar>
                    <span className="text-muted-foreground">{objective.ownerName || 'Unassigned'}</span>
                  </div>
                  {objective.dueDate && (
                    <div className="flex items-center gap-2">
                      <Calendar className="h-3 w-3 text-muted-foreground" />
                      <span className="text-muted-foreground">
                        Due {format(new Date(objective.dueDate.seconds * 1000), 'MMM dd, yyyy')}
                      </span>
                    </div>
                  )}
                </div>
              </CardHeader>
              
              <CardContent className="pt-2 pb-4">
                <div className="mb-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Progress</span>
                    <span className="text-sm font-medium">{Math.round(objective.currentValue)}%</span>
                  </div>
                  <Progress value={objective.currentValue} className="h-2" />
                </div>
                
                {objective.keyResults && objective.keyResults.length > 0 ? (
                  <div className="space-y-3 pl-4 border-l">
                    <h4 className="text-sm font-medium flex items-center gap-1">
                      <Target className="h-4 w-4" />
                      Key Results
                    </h4>
                    {objective.keyResults.map(kr => (
                      <div key={kr.id} className="flex items-center justify-between py-2 border-b border-dashed last:border-0">
                        <div className="flex items-start gap-2 flex-1">
                          {getStatusIcon(kr.status)}
                          <div className="flex-1">
                            <p className="text-sm font-medium">{kr.title}</p>
                            <div className="flex items-center justify-between mt-1">
                              <div className="flex-1">
                                <Progress value={kr.currentValue} className="h-1" />
                              </div>
                              <span className="text-xs font-medium ml-2">{Math.round(kr.currentValue)}%</span>
                            </div>
                          </div>
                        </div>
                        <div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={() => {
                              setSelectedGoal(kr);
                              setShowGoalDetail(true);
                            }}
                          >
                            <ArrowRight className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-sm text-muted-foreground">No key results defined</p>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="mt-2"
                      onClick={() => {
                        setNewKeyResult(prev => ({
                          ...prev,
                          parentId: objective.id
                        }));
                        setShowAddKeyResult(true);
                      }}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Key Result
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        ) : (
          <Card>
            <CardContent className="flex items-center justify-center flex-col py-12">
              <Target className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No objectives found</h3>
              <p className="text-muted-foreground mb-4 text-center max-w-md">
                Set team objectives and track progress with key results to align your team's efforts.
              </p>
              <Button onClick={() => setShowAddObjective(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Objective
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Create Objective Dialog */}
      <Dialog open={showAddObjective} onOpenChange={setShowAddObjective}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Objective</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="objectiveTitle">Objective Title</Label>
              <Input
                id="objectiveTitle"
                value={newObjective.title}
                onChange={(e) => setNewObjective(prev => ({ ...prev, title: e.target.value }))}
                placeholder="What do you want to achieve?"
              />
            </div>
            <div>
              <Label htmlFor="objectiveDescription">Description</Label>
              <Textarea
                id="objectiveDescription"
                value={newObjective.description}
                onChange={(e) => setNewObjective(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Provide details about this objective"
              />
            </div>
            <div>
              <Label>Start Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    {newObjective.startDate ? (
                      format(newObjective.startDate, "PPP")
                    ) : (
                      <span>Pick a date</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={newObjective.startDate}
                    onSelect={(date) => date && setNewObjective(prev => ({ ...prev, startDate: date }))}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div>
              <Label>Due Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    {newObjective.dueDate ? (
                      format(newObjective.dueDate, "PPP")
                    ) : (
                      <span>Pick a date</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={newObjective.dueDate || undefined}
                    onSelect={(date) => setNewObjective(prev => ({ ...prev, dueDate: date || null }))}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => {
                setShowAddObjective(false);
                resetNewObjectiveForm();
              }}>
                Cancel
              </Button>
              <Button onClick={createObjective} disabled={!newObjective.title.trim()}>
                Create Objective
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Key Result Dialog */}
      <Dialog open={showAddKeyResult} onOpenChange={setShowAddKeyResult}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Key Result</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="keyResultParent">Parent Objective</Label>
              <Select
                value={newKeyResult.parentId}
                onValueChange={(value) => setNewKeyResult(prev => ({ ...prev, parentId: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select an objective" />
                </SelectTrigger>
                <SelectContent>
                  {goals.map(objective => (
                    <SelectItem key={objective.id} value={objective.id}>
                      {objective.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="keyResultTitle">Key Result Title</Label>
              <Input
                id="keyResultTitle"
                value={newKeyResult.title}
                onChange={(e) => setNewKeyResult(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Measurable result that indicates success"
              />
            </div>
            <div>
              <Label htmlFor="keyResultDescription">Description</Label>
              <Textarea
                id="keyResultDescription"
                value={newKeyResult.description}
                onChange={(e) => setNewKeyResult(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Provide details about this key result"
              />
            </div>
            <div>
              <Label htmlFor="keyResultTarget">Target Value (100%)</Label>
              <Input
                id="keyResultTarget"
                type="number"
                value={newKeyResult.targetValue}
                onChange={(e) => setNewKeyResult(prev => ({ ...prev, targetValue: parseInt(e.target.value) }))}
              />
            </div>
            <div>
              <Label htmlFor="keyResultInitial">Initial Value (0%)</Label>
              <Input
                id="keyResultInitial"
                type="number"
                value={newKeyResult.currentValue}
                onChange={(e) => setNewKeyResult(prev => ({ ...prev, currentValue: parseInt(e.target.value) }))}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => {
                setShowAddKeyResult(false);
                resetNewKeyResultForm();
              }}>
                Cancel
              </Button>
              <Button 
                onClick={createKeyResult} 
                disabled={!newKeyResult.title.trim() || !newKeyResult.parentId}
              >
                Add Key Result
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Goal Detail Dialog */}
      <Dialog open={showGoalDetail} onOpenChange={setShowGoalDetail}>
        {selectedGoal && (
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <div className="flex items-center gap-2">
                {getStatusIcon(selectedGoal.status)}
                <DialogTitle className="text-xl">
                  {selectedGoal.type === 'objective' ? 'Objective: ' : 'Key Result: '}
                  {selectedGoal.title}
                </DialogTitle>
              </div>
            </DialogHeader>

            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-2">Description</h3>
                <p className="bg-muted/30 p-4 rounded-md">
                  {selectedGoal.description || 'No description provided.'}
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Progress</span>
                  <span className="text-sm">{Math.round(selectedGoal.currentValue)}%</span>
                </div>
                <Progress value={selectedGoal.currentValue} />
              </div>

              {/* Update Progress Section */}
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-2">Update Progress</h3>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={progressUpdate.currentValue || selectedGoal.currentValue}
                    onChange={(e) => setProgressUpdate(prev => ({ 
                      ...prev, 
                      goalId: selectedGoal.id,
                      currentValue: parseInt(e.target.value) 
                    }))}
                    className="w-24"
                  />
                  <span className="text-sm">%</span>
                  <Button 
                    onClick={() => updateGoalProgress(selectedGoal.id, progressUpdate.currentValue || selectedGoal.currentValue)}
                    disabled={progressUpdate.currentValue === selectedGoal.currentValue}
                  >
                    Update
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">Details</h3>
                  <div className="space-y-3 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Type</span>
                      <Badge variant="outline">
                        {selectedGoal.type === 'objective' ? 'Objective' : 'Key Result'}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Status</span>
                      <Badge className={getStatusColor(selectedGoal.status)}>
                        {selectedGoal.status.replace('-', ' ')}
                      </Badge>
                    </div>
                    {selectedGoal.startDate && (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Start Date</span>
                        <span>
                          {format(new Date(selectedGoal.startDate.seconds * 1000), 'MMM dd, yyyy')}
                        </span>
                      </div>
                    )}
                    {selectedGoal.dueDate && (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Due Date</span>
                        <span>
                          {format(new Date(selectedGoal.dueDate.seconds * 1000), 'MMM dd, yyyy')}
                        </span>
                      </div>
                    )}
                    {selectedGoal.createdAt && (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Created</span>
                        <span>
                          {format(new Date(selectedGoal.createdAt.seconds * 1000), 'MMM dd, yyyy')}
                        </span>
                      </div>
                    )}
                    {selectedGoal.updatedAt && (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Last Updated</span>
                        <span>
                          {format(new Date(selectedGoal.updatedAt.seconds * 1000), 'MMM dd, yyyy')}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">Owner</h3>
                  <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-md">
                    <Avatar>
                      <AvatarImage src={selectedGoal.ownerAvatar} />
                      <AvatarFallback>{selectedGoal.ownerName?.charAt(0) || 'U'}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{selectedGoal.ownerName}</p>
                      <p className="text-sm text-muted-foreground">Owner</p>
                    </div>
                  </div>

                  {/* Related Items */}
                  {selectedGoal.type === 'key-result' && selectedGoal.parentId && (
                    <div className="mt-6">
                      <h3 className="text-sm font-medium text-muted-foreground mb-2">Parent Objective</h3>
                      <Card className="border">
                        <CardContent className="p-3">
                          <div className="flex items-center gap-2">
                            <Target className="h-4 w-4 text-primary" />
                            <p className="text-sm font-medium">
                              {goals.find(o => o.id === selectedGoal.parentId)?.title || 'Unknown objective'}
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  )}

                  {selectedGoal.type === 'objective' && selectedGoal.keyResults && (
                    <div className="mt-6">
                      <h3 className="text-sm font-medium text-muted-foreground mb-2">
                        Key Results ({selectedGoal.keyResults.length})
                      </h3>
                      {selectedGoal.keyResults.length > 0 ? (
                        <ScrollArea className="h-32">
                          <div className="space-y-2">
                            {selectedGoal.keyResults.map(kr => (
                              <Card key={kr.id} className="border">
                                <CardContent className="p-3">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      {getStatusIcon(kr.status)}
                                      <p className="text-sm font-medium">{kr.title}</p>
                                    </div>
                                    <Badge variant="outline">{Math.round(kr.currentValue)}%</Badge>
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        </ScrollArea>
                      ) : (
                        <p className="text-sm text-muted-foreground">No key results defined</p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button 
                  variant="outline"
                  onClick={() => {
                    // Implement edit goal
                  }}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
                <Button 
                  variant="destructive"
                  onClick={() => deleteGoal(selectedGoal.id, selectedGoal.type === 'objective')}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </div>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
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
  arrayUnion,
  arrayRemove
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Plus,
  CheckCircle2,
  Clock,
  AlertCircle,
  CircleDot,
  Calendar,
  Users,
  Tag,
  MessageSquare,
  MoreHorizontal,
  Search,
  Filter,
  SortAsc,
  ArrowUpDown,
  CheckSquare,
  Trash2,
  Edit,
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
interface TeamTask {
  id: string;
  teamId: string;
  title: string;
  description: string;
  status: 'not-started' | 'in-progress' | 'completed' | 'blocked';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  dueDate: any;
  createdBy: string;
  createdAt: any;
  updatedAt: any;
  assignedTo: string[];
  labels: string[];
  comments: TaskComment[];
  checklist: ChecklistItem[];
}

interface TaskComment {
  id: string;
  content: string;
  createdBy: string;
  createdAt: any;
  userAvatar?: string;
  userName: string;
}

interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
}

interface TeamTaskBoardProps {
  teamId: string;
}

export function TeamTaskBoard({ teamId }: TeamTaskBoardProps) {
  const [user] = useAuthState(auth);
  const [tasks, setTasks] = useState<TeamTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddTask, setShowAddTask] = useState(false);
  const [showTaskDetail, setShowTaskDetail] = useState(false);
  const [selectedTask, setSelectedTask] = useState<TeamTask | null>(null);
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  const [filter, setFilter] = useState('all'); // 'all', 'my-tasks', 'completed', etc.
  const [sortBy, setSortBy] = useState('dueDate'); // 'dueDate', 'priority', 'status', etc.

  // New task form state
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    status: 'not-started' as const,
    priority: 'medium' as const,
    dueDate: null as Date | null,
    assignedTo: [] as string[],
    labels: [] as string[]
  });

  // Comment form state
  const [commentText, setCommentText] = useState('');
  
  // Checklist form state
  const [checklistItem, setChecklistItem] = useState('');
  
  useEffect(() => {
    if (!user || !teamId) return;

    setLoading(true);

    // Load team tasks
    const tasksQuery = query(
      collection(db, 'teamTasks'),
      where('teamId', '==', teamId),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(tasksQuery, (snapshot) => {
      const taskList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as TeamTask[];
      
      setTasks(taskList);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, teamId]);

  // Create new task
  const createTask = async () => {
    if (!user || !teamId || !newTask.title.trim()) return;

    try {
      const taskData = {
        teamId,
        title: newTask.title.trim(),
        description: newTask.description.trim(),
        status: newTask.status,
        priority: newTask.priority,
        dueDate: newTask.dueDate ? new Date(newTask.dueDate) : null,
        createdBy: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        assignedTo: newTask.assignedTo,
        labels: newTask.labels,
        comments: [],
        checklist: []
      };

      await addDoc(collection(db, 'teamTasks'), taskData);
      
      setShowAddTask(false);
      resetNewTaskForm();

      toast({
        title: "Task created",
        description: "New task has been created successfully.",
      });

    } catch (error) {
      console.error('Error creating task:', error);
      toast({
        title: "Error",
        description: "Failed to create task. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Update task status
  const updateTaskStatus = async (taskId: string, newStatus: TeamTask['status']) => {
    if (!taskId) return;

    try {
      await updateDoc(doc(db, 'teamTasks', taskId), {
        status: newStatus,
        updatedAt: serverTimestamp()
      });

      toast({
        title: "Task updated",
        description: "Task status has been updated.",
      });

    } catch (error) {
      console.error('Error updating task status:', error);
      toast({
        title: "Error",
        description: "Failed to update task status.",
        variant: "destructive"
      });
    }
  };

  // Add comment to task
  const addComment = async () => {
    if (!user || !selectedTask || !commentText.trim()) return;

    try {
      const newComment: TaskComment = {
        id: `comment-${Date.now()}`,
        content: commentText.trim(),
        createdBy: user.uid,
        createdAt: serverTimestamp(),
        userName: user.displayName || user.email?.split('@')[0] || 'Anonymous',
        userAvatar: user.photoURL || undefined
      };

      await updateDoc(doc(db, 'teamTasks', selectedTask.id), {
        comments: arrayUnion(newComment),
        updatedAt: serverTimestamp()
      });

      setCommentText('');
      toast({
        title: "Comment added",
        description: "Your comment has been added to the task.",
      });

    } catch (error) {
      console.error('Error adding comment:', error);
      toast({
        title: "Error",
        description: "Failed to add comment.",
        variant: "destructive"
      });
    }
  };

  // Add checklist item
  const addChecklistItem = async () => {
    if (!selectedTask || !checklistItem.trim()) return;

    try {
      const newItem: ChecklistItem = {
        id: `item-${Date.now()}`,
        text: checklistItem.trim(),
        completed: false
      };

      await updateDoc(doc(db, 'teamTasks', selectedTask.id), {
        checklist: arrayUnion(newItem),
        updatedAt: serverTimestamp()
      });

      setChecklistItem('');
      toast({
        title: "Item added",
        description: "Checklist item has been added.",
      });

    } catch (error) {
      console.error('Error adding checklist item:', error);
      toast({
        title: "Error",
        description: "Failed to add checklist item.",
        variant: "destructive"
      });
    }
  };

  // Toggle checklist item completion
  const toggleChecklistItem = async (itemId: string, currentValue: boolean) => {
    if (!selectedTask) return;

    try {
      const updatedChecklist = selectedTask.checklist.map(item => 
        item.id === itemId ? { ...item, completed: !currentValue } : item
      );

      await updateDoc(doc(db, 'teamTasks', selectedTask.id), {
        checklist: updatedChecklist,
        updatedAt: serverTimestamp()
      });

    } catch (error) {
      console.error('Error updating checklist item:', error);
      toast({
        title: "Error",
        description: "Failed to update checklist item.",
        variant: "destructive"
      });
    }
  };

  // Delete task
  const deleteTask = async (taskId: string) => {
    try {
      await deleteDoc(doc(db, 'teamTasks', taskId));
      
      if (selectedTask?.id === taskId) {
        setSelectedTask(null);
        setShowTaskDetail(false);
      }

      toast({
        title: "Task deleted",
        description: "Task has been deleted successfully.",
      });

    } catch (error) {
      console.error('Error deleting task:', error);
      toast({
        title: "Error",
        description: "Failed to delete task.",
        variant: "destructive"
      });
    }
  };

  // Reset new task form
  const resetNewTaskForm = () => {
    setNewTask({
      title: '',
      description: '',
      status: 'not-started',
      priority: 'medium',
      dueDate: null,
      assignedTo: [],
      labels: []
    });
  };

  // Get status icon
  const getStatusIcon = (status: TeamTask['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'in-progress':
        return <Clock className="h-4 w-4 text-blue-500" />;
      case 'blocked':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'not-started':
        return <CircleDot className="h-4 w-4 text-gray-500" />;
    }
  };

  // Get priority color
  const getPriorityColor = (priority: TeamTask['priority']) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-800';
      case 'high':
        return 'bg-orange-100 text-orange-800';
      case 'medium':
        return 'bg-blue-100 text-blue-800';
      case 'low':
        return 'bg-green-100 text-green-800';
    }
  };

  // Filter tasks based on current filter
  const filteredTasks = tasks.filter(task => {
    if (filter === 'all') return true;
    if (filter === 'my-tasks') return task.assignedTo.includes(user?.uid || '');
    if (filter === 'completed') return task.status === 'completed';
    if (filter === 'in-progress') return task.status === 'in-progress';
    if (filter === 'not-started') return task.status === 'not-started';
    if (filter === 'blocked') return task.status === 'blocked';
    return true;
  });

  // Sort tasks based on current sort
  const sortedTasks = [...filteredTasks].sort((a, b) => {
    if (sortBy === 'dueDate') {
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return a.dueDate.seconds - b.dueDate.seconds;
    }
    if (sortBy === 'priority') {
      const priorityWeight = { 'urgent': 3, 'high': 2, 'medium': 1, 'low': 0 };
      return priorityWeight[b.priority] - priorityWeight[a.priority];
    }
    // Default to createdAt
    return b.createdAt?.seconds - a.createdAt?.seconds;
  });

  // Group tasks by status for Kanban view
  const tasksByStatus = {
    'not-started': sortedTasks.filter(task => task.status === 'not-started'),
    'in-progress': sortedTasks.filter(task => task.status === 'in-progress'),
    'blocked': sortedTasks.filter(task => task.status === 'blocked'),
    'completed': sortedTasks.filter(task => task.status === 'completed'),
  };

  // Task card component
  const TaskCard = ({ task }: { task: TeamTask }) => (
    <Card className="mb-3 cursor-pointer hover:shadow-md transition-shadow" 
      onClick={() => {
        setSelectedTask(task);
        setShowTaskDetail(true);
      }}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex-1">
            <h3 className="font-medium line-clamp-2">{task.title}</h3>
          </div>
          {getStatusIcon(task.status)}
        </div>
        
        <div className="text-sm text-muted-foreground line-clamp-2 mb-3">
          {task.description}
        </div>
        
        <div className="flex flex-wrap gap-2 mb-3">
          {task.labels.map((label, idx) => (
            <Badge key={idx} variant="outline" className="text-xs">
              {label}
            </Badge>
          ))}
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            <span>
              {task.dueDate ? format(new Date(task.dueDate.seconds * 1000), 'MMM dd') : 'No date'}
            </span>
          </div>
          
          <Badge className={`text-xs ${getPriorityColor(task.priority)}`}>
            {task.priority}
          </Badge>
        </div>
        
        <div className="mt-3 flex items-center justify-between">
          <div className="flex -space-x-2">
            {task.assignedTo.slice(0, 3).map((memberId, idx) => (
              <Avatar key={idx} className="h-6 w-6 border-2 border-background">
                <AvatarFallback className="text-xs">
                  {memberId.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            ))}
            {task.assignedTo.length > 3 && (
              <div className="flex items-center justify-center h-6 w-6 rounded-full bg-muted text-xs">
                +{task.assignedTo.length - 3}
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            {task.comments.length > 0 && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <MessageSquare className="h-3 w-3" />
                <span>{task.comments.length}</span>
              </div>
            )}
            {task.checklist.length > 0 && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <CheckSquare className="h-3 w-3" />
                <span>
                  {task.checklist.filter(item => item.completed).length}/{task.checklist.length}
                </span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading tasks...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Task Management</h2>
          <p className="text-muted-foreground">
            Manage and track team tasks
          </p>
        </div>
        <Button onClick={() => setShowAddTask(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Task
        </Button>
      </div>

      {/* Filters and View Options */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search tasks..."
              className="pl-10 w-64"
            />
          </div>
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-36">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Tasks</SelectItem>
              <SelectItem value="my-tasks">My Tasks</SelectItem>
              <SelectItem value="not-started">Not Started</SelectItem>
              <SelectItem value="in-progress">In Progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="blocked">Blocked</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-40">
              <SortAsc className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="dueDate">Due Date</SelectItem>
              <SelectItem value="priority">Priority</SelectItem>
              <SelectItem value="createdAt">Created Date</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2">
          <Button
            variant={viewMode === 'kanban' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('kanban')}
          >
            Kanban
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('list')}
          >
            List
          </Button>
        </div>
      </div>

      {/* Task Board */}
      {viewMode === 'kanban' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Not Started Column */}
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-sm font-medium flex items-center">
                <CircleDot className="h-4 w-4 mr-2 text-gray-500" />
                Not Started
                <Badge variant="outline" className="ml-2">
                  {tasksByStatus['not-started'].length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3">
              <ScrollArea className="h-[calc(100vh-300px)]">
                {tasksByStatus['not-started'].map(task => (
                  <TaskCard key={task.id} task={task} />
                ))}
                {tasksByStatus['not-started'].length === 0 && (
                  <div className="py-8 text-center text-muted-foreground">
                    <p className="text-sm">No tasks in this column</p>
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>

          {/* In Progress Column */}
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-sm font-medium flex items-center">
                <Clock className="h-4 w-4 mr-2 text-blue-500" />
                In Progress
                <Badge variant="outline" className="ml-2">
                  {tasksByStatus['in-progress'].length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3">
              <ScrollArea className="h-[calc(100vh-300px)]">
                {tasksByStatus['in-progress'].map(task => (
                  <TaskCard key={task.id} task={task} />
                ))}
                {tasksByStatus['in-progress'].length === 0 && (
                  <div className="py-8 text-center text-muted-foreground">
                    <p className="text-sm">No tasks in this column</p>
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Blocked Column */}
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-sm font-medium flex items-center">
                <AlertCircle className="h-4 w-4 mr-2 text-red-500" />
                Blocked
                <Badge variant="outline" className="ml-2">
                  {tasksByStatus['blocked'].length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3">
              <ScrollArea className="h-[calc(100vh-300px)]">
                {tasksByStatus['blocked'].map(task => (
                  <TaskCard key={task.id} task={task} />
                ))}
                {tasksByStatus['blocked'].length === 0 && (
                  <div className="py-8 text-center text-muted-foreground">
                    <p className="text-sm">No tasks in this column</p>
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Completed Column */}
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-sm font-medium flex items-center">
                <CheckCircle2 className="h-4 w-4 mr-2 text-green-500" />
                Completed
                <Badge variant="outline" className="ml-2">
                  {tasksByStatus['completed'].length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3">
              <ScrollArea className="h-[calc(100vh-300px)]">
                {tasksByStatus['completed'].map(task => (
                  <TaskCard key={task.id} task={task} />
                ))}
                {tasksByStatus['completed'].length === 0 && (
                  <div className="py-8 text-center text-muted-foreground">
                    <p className="text-sm">No tasks in this column</p>
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      ) : (
        /* List View */
        <Card>
          <CardContent className="p-0">
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex-1 grid grid-cols-10 gap-4 font-medium text-sm">
                <div className="col-span-4">Task</div>
                <div className="col-span-1">Status</div>
                <div className="col-span-1">Priority</div>
                <div className="col-span-2">Assigned</div>
                <div className="col-span-1">Due Date</div>
                <div className="col-span-1 text-right">Actions</div>
              </div>
            </div>
            <ScrollArea className="h-[calc(100vh-300px)]">
              {sortedTasks.length > 0 ? (
                sortedTasks.map(task => (
                  <div key={task.id} className="flex items-center justify-between p-4 border-b hover:bg-muted/30">
                    <div className="flex-1 grid grid-cols-10 gap-4 items-center text-sm">
                      <div className="col-span-4 cursor-pointer"
                        onClick={() => {
                          setSelectedTask(task);
                          setShowTaskDetail(true);
                        }}>
                        <div className="font-medium">{task.title}</div>
                        <div className="text-muted-foreground line-clamp-1">{task.description}</div>
                      </div>
                      <div className="col-span-1 flex items-center gap-1">
                        {getStatusIcon(task.status)}
                        <span className="text-xs">{task.status.replace('-', ' ')}</span>
                      </div>
                      <div className="col-span-1">
                        <Badge className={`text-xs ${getPriorityColor(task.priority)}`}>
                          {task.priority}
                        </Badge>
                      </div>
                      <div className="col-span-2">
                        <div className="flex -space-x-2">
                          {task.assignedTo.slice(0, 3).map((memberId, idx) => (
                            <Avatar key={idx} className="h-6 w-6 border-2 border-background">
                              <AvatarFallback className="text-xs">
                                {memberId.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                          ))}
                          {task.assignedTo.length > 3 && (
                            <div className="flex items-center justify-center h-6 w-6 rounded-full bg-muted text-xs">
                              +{task.assignedTo.length - 3}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="col-span-1 text-muted-foreground text-xs">
                        {task.dueDate ? format(new Date(task.dueDate.seconds * 1000), 'MMM dd, yyyy') : 'No date'}
                      </div>
                      <div className="col-span-1 flex items-center justify-end gap-2">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => {
                              setSelectedTask(task);
                              setShowTaskDetail(true);
                            }}>
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => {
                              // Implement edit task
                            }}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              className="text-destructive" 
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteTask(task.id);
                              }}>
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex items-center justify-center h-32">
                  <div className="text-center text-muted-foreground">
                    <p>No tasks found matching your criteria</p>
                  </div>
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Create Task Dialog */}
      <Dialog open={showAddTask} onOpenChange={setShowAddTask}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Task</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="taskTitle">Task Title</Label>
              <Input
                id="taskTitle"
                value={newTask.title}
                onChange={(e) => setNewTask(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Enter task title"
              />
            </div>
            <div>
              <Label htmlFor="taskDescription">Description</Label>
              <Textarea
                id="taskDescription"
                value={newTask.description}
                onChange={(e) => setNewTask(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Brief description of the task"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Status</Label>
                <Select
                  value={newTask.status}
                  onValueChange={(value) => setNewTask(prev => ({ ...prev, status: value as any }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="not-started">Not Started</SelectItem>
                    <SelectItem value="in-progress">In Progress</SelectItem>
                    <SelectItem value="blocked">Blocked</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Priority</Label>
                <Select
                  value={newTask.priority}
                  onValueChange={(value) => setNewTask(prev => ({ ...prev, priority: value as any }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
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
                    {newTask.dueDate ? (
                      format(newTask.dueDate, "PPP")
                    ) : (
                      <span>Pick a date</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={newTask.dueDate || undefined}
                    onSelect={(date) => setNewTask(prev => ({ ...prev, dueDate: date || null }))}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => {
                setShowAddTask(false);
                resetNewTaskForm();
              }}>
                Cancel
              </Button>
              <Button onClick={createTask} disabled={!newTask.title.trim()}>
                Create Task
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Task Detail Dialog */}
      <Dialog open={showTaskDetail} onOpenChange={setShowTaskDetail}>
        {selectedTask && (
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden">
            <DialogHeader>
              <div className="flex items-center gap-2">
                {getStatusIcon(selectedTask.status)}
                <DialogTitle className="text-xl">{selectedTask.title}</DialogTitle>
              </div>
            </DialogHeader>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 overflow-hidden">
              <div className="md:col-span-2 overflow-y-auto max-h-[calc(90vh-180px)]">
                <div className="space-y-6">
                  {/* Description */}
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-2">Description</h3>
                    <div className="bg-muted/30 rounded-md p-3">
                      <p>{selectedTask.description || 'No description provided.'}</p>
                    </div>
                  </div>

                  {/* Checklist */}
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-2 flex items-center justify-between">
                      <span>Checklist</span>
                      <span className="text-xs">
                        {selectedTask.checklist.filter(item => item.completed).length}/{selectedTask.checklist.length}
                      </span>
                    </h3>
                    <div className="space-y-2">
                      {selectedTask.checklist.map(item => (
                        <div key={item.id} className="flex items-center space-x-2">
                          <Checkbox 
                            checked={item.completed}
                            onCheckedChange={() => toggleChecklistItem(item.id, item.completed)}
                          />
                          <Label className={item.completed ? 'line-through text-muted-foreground' : ''}>
                            {item.text}
                          </Label>
                        </div>
                      ))}
                      <div className="flex items-center gap-2 mt-2">
                        <Input 
                          value={checklistItem}
                          onChange={(e) => setChecklistItem(e.target.value)}
                          placeholder="Add new item"
                          className="text-sm"
                        />
                        <Button size="sm" onClick={addChecklistItem} disabled={!checklistItem.trim()}>
                          Add
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Comments */}
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-2">
                      Comments ({selectedTask.comments.length})
                    </h3>
                    <div className="space-y-4">
                      {selectedTask.comments.map(comment => (
                        <div key={comment.id} className="flex items-start gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={comment.userAvatar} />
                            <AvatarFallback>{comment.userName.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="bg-muted/30 rounded-md p-3">
                              <div className="flex items-center justify-between mb-1">
                                <span className="font-medium text-sm">{comment.userName}</span>
                                <span className="text-xs text-muted-foreground">
                                  {comment.createdAt && format(new Date(comment.createdAt.seconds * 1000), 'MMM dd, h:mm a')}
                                </span>
                              </div>
                              <p className="text-sm">{comment.content}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                      <div className="flex items-start gap-3 mt-4">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={user?.photoURL || undefined} />
                          <AvatarFallback>
                            {(user?.displayName || user?.email || 'U').charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <Textarea
                            value={commentText}
                            onChange={(e) => setCommentText(e.target.value)}
                            placeholder="Add a comment..."
                            className="text-sm"
                          />
                          <Button 
                            className="mt-2" 
                            size="sm"
                            onClick={addComment}
                            disabled={!commentText.trim()}
                          >
                            Add Comment
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                {/* Task Details */}
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">Details</h3>
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-1 text-sm">
                      <div className="text-muted-foreground">Status</div>
                      <div className="col-span-2 flex items-center gap-1">
                        {getStatusIcon(selectedTask.status)}
                        <span className="capitalize">{selectedTask.status.replace('-', ' ')}</span>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-1 text-sm">
                      <div className="text-muted-foreground">Priority</div>
                      <div className="col-span-2">
                        <Badge className={`text-xs ${getPriorityColor(selectedTask.priority)}`}>
                          {selectedTask.priority}
                        </Badge>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-1 text-sm">
                      <div className="text-muted-foreground">Due Date</div>
                      <div className="col-span-2">
                        {selectedTask.dueDate
                          ? format(new Date(selectedTask.dueDate.seconds * 1000), 'MMM dd, yyyy')
                          : 'No due date'}
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-1 text-sm">
                      <div className="text-muted-foreground">Created</div>
                      <div className="col-span-2">
                        {selectedTask.createdAt && 
                          format(new Date(selectedTask.createdAt.seconds * 1000), 'MMM dd, yyyy')}
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-1 text-sm">
                      <div className="text-muted-foreground">Created By</div>
                      <div className="col-span-2">
                        {selectedTask.createdBy || 'Unknown'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Labels */}
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">Labels</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedTask.labels.map((label, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs">
                        <Tag className="h-3 w-3 mr-1" />
                        {label}
                      </Badge>
                    ))}
                    {selectedTask.labels.length === 0 && (
                      <p className="text-sm text-muted-foreground">No labels</p>
                    )}
                  </div>
                </div>

                {/* Assigned To */}
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">Assigned To</h3>
                  <div className="space-y-2">
                    {selectedTask.assignedTo.map((memberId, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarFallback>{memberId.charAt(0).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <span className="text-sm">{memberId}</span>
                      </div>
                    ))}
                    {selectedTask.assignedTo.length === 0 && (
                      <p className="text-sm text-muted-foreground">Not assigned</p>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-4 border-t space-y-2">
                  <Select 
                    value={selectedTask.status}
                    onValueChange={(value) => updateTaskStatus(selectedTask.id, value as TeamTask['status'])}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Update Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="not-started">Not Started</SelectItem>
                      <SelectItem value="in-progress">In Progress</SelectItem>
                      <SelectItem value="blocked">Blocked</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <div className="flex gap-2">
                    <Button 
                      variant="outline"
                      size="sm" 
                      className="flex-1"
                      onClick={() => {
                        // Implement edit task
                      }}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                    <Button 
                      variant="destructive" 
                      size="sm" 
                      className="flex-1"
                      onClick={() => {
                        deleteTask(selectedTask.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
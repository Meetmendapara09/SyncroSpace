'use client';

import * as React from 'react';
import { useState, useEffect } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { 
  addDoc, 
  collection, 
  doc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  Timestamp, 
  getDoc,
  getDocs,
  serverTimestamp,
  arrayUnion,
  increment
} from 'firebase/firestore';
import { auth, db, rtdb } from '@/lib/firebase';
import { ref, set, onValue, push } from 'firebase/database';
import { cn } from '@/lib/utils';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  DialogTrigger
} from '@/components/ui/dialog';
import { 
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from '@/components/ui/use-toast';

import {
  Vote,
  PieChart,
  BarChart3,
  Plus,
  Trash2,
  Clock,
  CalendarDays,
  Check,
  MoreVertical,
  Edit,
  Copy,
  Share2,
  Eye,
  EyeOff,
  Users,
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  X,
  ClipboardCheck,
  MessageSquare
} from 'lucide-react';

// Poll and Survey Types
export type PollOption = {
  id: string;
  text: string;
  votes: number;
  voterIds: string[];
};

export type PollType = 'single' | 'multiple';
export type PollStatus = 'active' | 'closed' | 'scheduled';
export type PollVisibility = 'public' | 'anonymous';

export interface Poll {
  id: string;
  createdBy: string;
  creatorName: string;
  creatorAvatar?: string;
  question: string;
  description?: string;
  options: PollOption[];
  pollType: PollType;
  status: PollStatus;
  visibility: PollVisibility;
  createdAt: any;
  expiresAt?: any;
  updatedAt: any;
  totalVotes: number;
  allowComments: boolean;
  comments?: PollComment[];
  spaceId?: string;
  channelId?: string;
  allowAddOptions: boolean;
  hasVoted?: boolean; // Client-side property
}

export interface PollComment {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  text: string;
  timestamp: any;
}

// Create poll dialog component
export function CreatePollDialog({
  open,
  onOpenChange,
  spaceId,
  channelId,
  onPollCreated
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  spaceId?: string;
  channelId?: string;
  onPollCreated?: (pollId: string) => void;
}) {
  const [user] = useAuthState(auth);
  const [question, setQuestion] = useState('');
  const [description, setDescription] = useState('');
  const [options, setOptions] = useState<{ id: string; text: string }[]>([
    { id: '1', text: '' },
    { id: '2', text: '' }
  ]);
  const [pollType, setPollType] = useState<PollType>('single');
  const [visibility, setVisibility] = useState<PollVisibility>('public');
  const [allowComments, setAllowComments] = useState(true);
  const [allowAddOptions, setAllowAddOptions] = useState(false);
  const [expiry, setExpiry] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  
  // Add new option
  const addOption = () => {
    setOptions([
      ...options, 
      { id: String(options.length + 1), text: '' }
    ]);
  };
  
  // Remove an option
  const removeOption = (id: string) => {
    if (options.length <= 2) {
      return; // Keep at least 2 options
    }
    setOptions(options.filter(option => option.id !== id));
  };
  
  // Update option text
  const updateOption = (id: string, text: string) => {
    setOptions(options.map(option => 
      option.id === id ? { ...option, text } : option
    ));
  };
  
  // Create poll
  const handleCreatePoll = async () => {
    if (!user) return;
    
    // Validate inputs
    if (!question.trim()) {
      toast({
        title: "Error",
        description: "Please provide a question",
        variant: "destructive",
      });
      return;
    }
    
    // Ensure all options have text
    const validOptions = options.filter(option => option.text.trim());
    if (validOptions.length < 2) {
      toast({
        title: "Error",
        description: "Please provide at least 2 options",
        variant: "destructive",
      });
      return;
    }
    
    try {
      setLoading(true);
      
      // Create poll document
      const pollData: Omit<Poll, 'id'> = {
        createdBy: user.uid,
        creatorName: user.displayName || user.email?.split('@')[0] || 'User',
        creatorAvatar: user.photoURL || undefined,
        question: question.trim(),
        description: description.trim() || undefined,
        options: validOptions.map(opt => ({
          id: opt.id,
          text: opt.text.trim(),
          votes: 0,
          voterIds: [],
        })),
        pollType,
        status: 'active',
        visibility,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        totalVotes: 0,
        allowComments,
        allowAddOptions,
        ...(spaceId && { spaceId }),
        ...(channelId && { channelId }),
      };
      
      // Add expiry if set
      if (expiry) {
        const expiryDate = new Date(expiry);
        pollData.expiresAt = Timestamp.fromDate(expiryDate);
        
        // Schedule to automatically close the poll
        // This could be done with a Cloud Function in production
        const closeAfterMs = expiryDate.getTime() - Date.now();
        if (closeAfterMs > 0) {
          setTimeout(() => {
            // This is just a fallback - in a real app, use a cloud function
            // This won't work if the user closes their browser
          }, closeAfterMs);
        }
      }
      
      // Add to Firestore
      const pollRef = await addDoc(collection(db, 'polls'), pollData);
      
      // If in a channel, add a message about the poll
      if (spaceId && channelId) {
        const messagesRef = ref(rtdb, `spaces/${channelId}/messages`);
        const newMsgRef = push(messagesRef);
        
        await set(newMsgRef, {
          uid: user.uid,
          name: user.displayName || user.email?.split('@')[0] || 'User',
          avatar: user.photoURL || null,
          message: `Created a new poll: "${question.trim()}"`,
          type: 'poll',
          pollId: pollRef.id,
          timestamp: Date.now(),
          readBy: [user.uid],
        });
      }
      
      // Notify caller
      if (onPollCreated) {
        onPollCreated(pollRef.id);
      }
      
      // Reset form
      setQuestion('');
      setDescription('');
      setOptions([
        { id: '1', text: '' },
        { id: '2', text: '' }
      ]);
      setPollType('single');
      setVisibility('public');
      setAllowComments(true);
      setAllowAddOptions(false);
      setExpiry(null);
      
      // Close dialog
      onOpenChange(false);
      
      toast({
        title: "Poll created",
        description: "Your poll has been created successfully",
      });
    } catch (error) {
      console.error("Error creating poll:", error);
      toast({
        title: "Error",
        description: "Failed to create poll. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Vote className="h-5 w-5" />
            Create a Poll
          </DialogTitle>
          <DialogDescription>
            Create a poll to gather opinions or make decisions together
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="question">Question <span className="text-destructive">*</span></Label>
            <Input
              id="question"
              placeholder="What would you like to ask?"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description">Description <span className="text-muted-foreground text-sm">(Optional)</span></Label>
            <Textarea
              id="description"
              placeholder="Add context to your question"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="resize-none"
              rows={2}
            />
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between mb-1">
              <Label>Options <span className="text-destructive">*</span></Label>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={addOption}
                className="h-7"
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                Add Option
              </Button>
            </div>
            
            <div className="space-y-2">
              {options.map((option, index) => (
                <div key={option.id} className="flex items-center gap-2">
                  <Input
                    placeholder={`Option ${index + 1}`}
                    value={option.text}
                    onChange={(e) => updateOption(option.id, e.target.value)}
                  />
                  <Button 
                    variant="ghost" 
                    size="icon"
                    className="h-9 w-9"
                    onClick={() => removeOption(option.id)}
                    disabled={options.length <= 2}
                    title="Remove option"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>Poll Type</Label>
              <RadioGroup value={pollType} onValueChange={(value) => setPollType(value as PollType)} className="flex flex-col gap-2">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="single" id="single" />
                  <Label htmlFor="single" className="font-normal">Single choice</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="multiple" id="multiple" />
                  <Label htmlFor="multiple" className="font-normal">Multiple choices</Label>
                </div>
              </RadioGroup>
            </div>
            
            <div className="space-y-2">
              <Label>Results Visibility</Label>
              <RadioGroup value={visibility} onValueChange={(value) => setVisibility(value as PollVisibility)} className="flex flex-col gap-2">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="public" id="public" />
                  <Label htmlFor="public" className="font-normal">Public (show who voted)</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="anonymous" id="anonymous" />
                  <Label htmlFor="anonymous" className="font-normal">Anonymous</Label>
                </div>
              </RadioGroup>
            </div>
          </div>
          
          <div className="space-y-6">
            <div className="space-y-2">
              <Label>Expiry <span className="text-muted-foreground text-sm">(Optional)</span></Label>
              <Input 
                type="datetime-local" 
                value={expiry || ''}
                onChange={(e) => setExpiry(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                If set, the poll will automatically close at this time
              </p>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="allowComments" className="block mb-1">Allow comments</Label>
                  <p className="text-xs text-muted-foreground">
                    Let participants add comments to this poll
                  </p>
                </div>
                <Switch 
                  id="allowComments"
                  checked={allowComments}
                  onCheckedChange={setAllowComments}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="allowAddOptions" className="block mb-1">Allow adding options</Label>
                  <p className="text-xs text-muted-foreground">
                    Let participants add more options to the poll
                  </p>
                </div>
                <Switch 
                  id="allowAddOptions"
                  checked={allowAddOptions}
                  onCheckedChange={setAllowAddOptions}
                />
              </div>
            </div>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleCreatePoll} disabled={loading}>
            {loading ? (
              <>
                <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Creating...
              </>
            ) : (
              'Create Poll'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Poll card component for showing a poll
export function PollCard({ 
  poll,
  compact = false,
  inChat = false,
  onDelete,
  onClose,
}: { 
  poll: Poll;
  compact?: boolean;
  inChat?: boolean;
  onDelete?: (pollId: string) => void;
  onClose?: (pollId: string) => void;
}) {
  const [user] = useAuthState(auth);
  const [userVotes, setUserVotes] = useState<string[]>([]);
  const [comment, setComment] = useState('');
  const [showComments, setShowComments] = useState(false);
  const [newOption, setNewOption] = useState('');
  const [showAddOption, setShowAddOption] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [loading, setLoading] = useState(false);

  // Check if poll is expired
  const isExpired = poll.expiresAt && (
    poll.expiresAt.toDate ? 
    poll.expiresAt.toDate() < new Date() : 
    new Date(poll.expiresAt) < new Date()
  );
  
  // Format expiry date
  const formatExpiry = () => {
    if (!poll.expiresAt) return null;
    
    const date = poll.expiresAt.toDate ? poll.expiresAt.toDate() : new Date(poll.expiresAt);
    
    // Check if it's today
    const isToday = new Date().toDateString() === date.toDateString();
    
    if (isToday) {
      return `Today at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
    
    // Check if it's tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (tomorrow.toDateString() === date.toDateString()) {
      return `Tomorrow at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
    
    // Return formatted date
    return date.toLocaleDateString([], {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  // Initialize user votes
  useEffect(() => {
    if (!user) return;
    
    // Find which options the user voted for
    const votes: string[] = [];
    poll.options.forEach(option => {
      if (option.voterIds?.includes(user.uid)) {
        votes.push(option.id);
      }
    });
    
    setUserVotes(votes);
  }, [poll, user]);
  
  // Calculate percentages
  const getPercentage = (votes: number) => {
    return poll.totalVotes > 0 ? Math.round((votes / poll.totalVotes) * 100) : 0;
  };
  
  // Handle vote toggle
  const handleVoteToggle = async (optionId: string) => {
    if (!user || poll.status === 'closed' || isExpired) return;
    
    try {
      setLoading(true);
      
      // If single choice poll, clear previous votes first
      if (poll.pollType === 'single' && userVotes.length > 0) {
        // Get previous option
        const prevOptionId = userVotes[0];
        const prevOption = poll.options.find(opt => opt.id === prevOptionId);
        
        if (prevOption) {
          // Remove vote from previous option
          await updateDoc(doc(db, 'polls', poll.id), {
            [`options.${poll.options.indexOf(prevOption)}.votes`]: increment(-1),
            [`options.${poll.options.indexOf(prevOption)}.voterIds`]: 
              prevOption.voterIds.filter(id => id !== user.uid),
            totalVotes: poll.totalVotes > 0 ? increment(-1) : 0
          });
        }
      }
      
      // Find the option
      const option = poll.options.find(opt => opt.id === optionId);
      if (!option) return;
      
      const hasVoted = userVotes.includes(optionId);
      
      // Update vote count
      await updateDoc(doc(db, 'polls', poll.id), {
        [`options.${poll.options.indexOf(option)}.votes`]: 
          hasVoted ? increment(-1) : increment(1),
        [`options.${poll.options.indexOf(option)}.voterIds`]: 
          hasVoted 
            ? option.voterIds.filter(id => id !== user.uid)
            : [...option.voterIds, user.uid],
        totalVotes: hasVoted ? increment(-1) : increment(1),
        updatedAt: serverTimestamp()
      });
      
      // Update local state
      if (poll.pollType === 'single') {
        setUserVotes(hasVoted ? [] : [optionId]);
      } else {
        setUserVotes(prev => 
          hasVoted 
            ? prev.filter(id => id !== optionId) 
            : [...prev, optionId]
        );
      }
      
    } catch (error) {
      console.error("Error toggling vote:", error);
      toast({
        title: "Error",
        description: "Failed to register your vote. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Handle adding comment
  const handleAddComment = async () => {
    if (!user || !comment.trim()) return;
    
    try {
      setLoading(true);
      
      const newComment: PollComment = {
        id: Math.random().toString(36).substring(2, 15),
        userId: user.uid,
        userName: user.displayName || user.email?.split('@')[0] || 'User',
        userAvatar: user.photoURL || undefined,
        text: comment.trim(),
        timestamp: serverTimestamp(),
      };
      
      // Update poll with new comment
      await updateDoc(doc(db, 'polls', poll.id), {
        comments: arrayUnion(newComment),
        updatedAt: serverTimestamp()
      });
      
      setComment('');
      setShowComments(true);
    } catch (error) {
      console.error("Error adding comment:", error);
      toast({
        title: "Error",
        description: "Failed to add your comment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Handle adding a new option
  const handleAddOption = async () => {
    if (!user || !newOption.trim() || poll.status === 'closed' || isExpired) return;
    
    try {
      setLoading(true);
      
      // Create new option
      const newOptionObj: PollOption = {
        id: Math.random().toString(36).substring(2, 10),
        text: newOption.trim(),
        votes: 0,
        voterIds: [],
      };
      
      // Update poll with new option
      await updateDoc(doc(db, 'polls', poll.id), {
        options: arrayUnion(newOptionObj),
        updatedAt: serverTimestamp()
      });
      
      setNewOption('');
      setShowAddOption(false);
      
      toast({
        title: "Option added",
        description: "Your option has been added to the poll",
      });
    } catch (error) {
      console.error("Error adding option:", error);
      toast({
        title: "Error",
        description: "Failed to add your option. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Handle deleting the poll
  const handleDeletePoll = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      // Check if current user is the creator
      if (poll.createdBy !== user.uid) {
        toast({
          title: "Permission denied",
          description: "You can only delete polls you've created",
          variant: "destructive",
        });
        return;
      }
      
      // Delete the poll
      await deleteDoc(doc(db, 'polls', poll.id));
      
      toast({
        title: "Poll deleted",
        description: "The poll has been deleted successfully",
      });
      
      // Notify parent
      if (onDelete) {
        onDelete(poll.id);
      }
    } catch (error) {
      console.error("Error deleting poll:", error);
      toast({
        title: "Error",
        description: "Failed to delete the poll. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setConfirmDelete(false);
    }
  };
  
  // Handle closing the poll
  const handleClosePoll = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      // Check if current user is the creator
      if (poll.createdBy !== user.uid) {
        toast({
          title: "Permission denied",
          description: "You can only close polls you've created",
          variant: "destructive",
        });
        return;
      }
      
      // Close the poll
      await updateDoc(doc(db, 'polls', poll.id), {
        status: 'closed',
        updatedAt: serverTimestamp()
      });
      
      toast({
        title: "Poll closed",
        description: "The poll has been closed successfully",
      });
      
      // Notify parent
      if (onClose) {
        onClose(poll.id);
      }
    } catch (error) {
      console.error("Error closing poll:", error);
      toast({
        title: "Error",
        description: "Failed to close the poll. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Get poll status label and color
  const getPollStatusInfo = () => {
    if (poll.status === 'closed') {
      return {
        label: 'Closed',
        variant: 'outline' as const,
      };
    }
    
    if (isExpired) {
      return {
        label: 'Expired',
        variant: 'outline' as const,
      };
    }
    
    if (poll.expiresAt) {
      return {
        label: `Closes: ${formatExpiry()}`,
        variant: 'secondary' as const,
      };
    }
    
    return {
      label: 'Active',
      variant: 'default' as const,
    };
  };
  
  const statusInfo = getPollStatusInfo();
  const isActive = poll.status !== 'closed' && !isExpired;
  const hasComments = poll.comments && poll.comments.length > 0;
  const isCreator = user && user.uid === poll.createdBy;
  
  return (
    <Card className={cn("w-full", compact ? "shadow-none border-0" : "")}>
      <CardHeader className={compact ? "px-2 py-3" : undefined}>
        <div className="flex justify-between items-start">
          <div className="flex items-start gap-3">
            <Avatar className="h-8 w-8">
              <AvatarImage src={poll.creatorAvatar} />
              <AvatarFallback>{poll.creatorName?.charAt(0) || 'U'}</AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className={cn("text-base mb-0.5", compact && "text-sm")}>
                {poll.question}
              </CardTitle>
              <CardDescription className="flex items-center gap-2 text-xs">
                <span>by {poll.creatorName}</span>
                {!compact && (
                  <>
                    <span>•</span>
                    <span>
                      {poll.createdAt?.toDate
                        ? new Date(poll.createdAt.toDate()).toLocaleDateString()
                        : new Date(poll.createdAt).toLocaleDateString()}
                    </span>
                  </>
                )}
                {poll.totalVotes > 0 && (
                  <>
                    <span>•</span>
                    <span>{poll.totalVotes} vote{poll.totalVotes !== 1 ? 's' : ''}</span>
                  </>
                )}
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
            
            {!compact && isCreator && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {isActive && (
                    <DropdownMenuItem onClick={handleClosePoll}>
                      <Check className="h-4 w-4 mr-2" />
                      Close Poll
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={() => setConfirmDelete(true)}>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Poll
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
        
        {poll.description && !compact && (
          <CardDescription className="text-sm text-foreground/80 mt-2">
            {poll.description}
          </CardDescription>
        )}
      </CardHeader>
      
      <CardContent className={compact ? "px-2 pt-0" : undefined}>
        <div className="space-y-3">
          {poll.options.map((option) => {
            const percentage = getPercentage(option.votes);
            const isSelected = userVotes.includes(option.id);
            
            return (
              <div key={option.id} className="space-y-1">
                <button
                  className={cn(
                    "w-full text-left flex items-center gap-2 p-2 rounded-md relative",
                    isSelected ? "bg-primary/10 text-primary" : "hover:bg-muted",
                    !isActive && "pointer-events-none",
                  )}
                  onClick={() => handleVoteToggle(option.id)}
                  disabled={!isActive || loading}
                >
                  {poll.pollType === 'single' ? (
                    <RadioGroupItem 
                      checked={isSelected}
                      value={option.id}
                      id={`option-${option.id}`}
                      disabled={!isActive}
                    />
                  ) : (
                    <Checkbox 
                      checked={isSelected}
                      id={`option-${option.id}`}
                      disabled={!isActive}
                    />
                  )}
                  <Label 
                    htmlFor={`option-${option.id}`} 
                    className="flex-1 cursor-pointer font-normal"
                  >
                    {option.text}
                  </Label>
                  <span className="text-sm font-medium">
                    {percentage}%
                  </span>
                  
                  {poll.visibility === 'public' && option.votes > 0 && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex">
                            <Users className="h-4 w-4 text-muted-foreground" />
                            <span className="sr-only">
                              {option.votes} voter{option.votes !== 1 ? 's' : ''}
                            </span>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{option.votes} voter{option.votes !== 1 ? 's' : ''}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </button>
                
                <Progress
                  value={percentage}
                  className={cn(
                    "h-1.5 w-full bg-muted",
                    isSelected && "bg-primary/20"
                  )}
                  indicatorClassName={isSelected ? "bg-primary" : undefined}
                />
              </div>
            );
          })}
        </div>
        
        {/* Add option button - only shown if feature is enabled and poll is active */}
        {poll.allowAddOptions && isActive && !showAddOption && (
          <Button 
            variant="ghost" 
            size="sm" 
            className="mt-3 text-muted-foreground hover:text-foreground w-full justify-start"
            onClick={() => setShowAddOption(true)}
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            Add option
          </Button>
        )}
        
        {/* Add option form */}
        {showAddOption && (
          <div className="mt-3 space-y-2">
            <div className="flex gap-2">
              <Input 
                value={newOption}
                onChange={(e) => setNewOption(e.target.value)}
                placeholder="Enter new option"
              />
              <Button 
                size="sm" 
                onClick={handleAddOption} 
                disabled={!newOption.trim() || loading}
              >
                Add
              </Button>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setShowAddOption(false)}
              className="text-muted-foreground"
            >
              Cancel
            </Button>
          </div>
        )}
        
        {/* Comments section - only if enabled */}
        {poll.allowComments && !compact && (
          <div className="mt-6">
            {hasComments && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowComments(!showComments)}
                className="mb-3 text-muted-foreground"
              >
                <MessageSquare className="h-4 w-4 mr-1.5" />
                {poll.comments?.length} Comment{poll.comments?.length !== 1 ? 's' : ''}
                {showComments ? (
                  <ChevronUp className="h-4 w-4 ml-1" />
                ) : (
                  <ChevronDown className="h-4 w-4 ml-1" />
                )}
              </Button>
            )}
            
            {showComments && poll.comments && (
              <div className="space-y-3 max-h-60 overflow-y-auto mb-4 border-t pt-3">
                {poll.comments.map((comment) => (
                  <div key={comment.id} className="flex gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={comment.userAvatar} />
                      <AvatarFallback>{comment.userName?.charAt(0) || 'U'}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-baseline gap-2">
                        <p className="text-sm font-medium">{comment.userName}</p>
                        <span className="text-xs text-muted-foreground">
                          {comment.timestamp?.toDate
                            ? new Date(comment.timestamp.toDate()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                            : new Date(comment.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-sm">{comment.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {isActive && (
              <div className="flex gap-2 mt-3">
                <Input
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Add a comment..."
                  disabled={loading}
                />
                <Button 
                  onClick={handleAddComment} 
                  disabled={!comment.trim() || loading}
                >
                  Send
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
      
      {!compact && (
        <CardFooter className={cn("flex justify-between", compact ? "px-2 py-1" : undefined)}>
          <div className="flex items-center gap-3">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Vote className="h-3.5 w-3.5" />
                    <span>
                      {poll.pollType === 'single' ? 'Single choice' : 'Multiple choice'}
                    </span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>
                    {poll.pollType === 'single'
                      ? 'You can select only one option'
                      : 'You can select multiple options'}
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    {poll.visibility === 'public' ? (
                      <Eye className="h-3.5 w-3.5" />
                    ) : (
                      <EyeOff className="h-3.5 w-3.5" />
                    )}
                    <span>
                      {poll.visibility === 'public' ? 'Public votes' : 'Anonymous'}
                    </span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>
                    {poll.visibility === 'public'
                      ? 'Others can see who voted for each option'
                      : 'Votes are anonymous, only totals are visible'}
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          
          <div className="flex gap-2">
            {!inChat && isActive && (
              <Button variant="outline" size="sm" asChild>
                <a href={`?share=poll:${poll.id}`}>
                  <Share2 className="h-4 w-4 mr-1" />
                  Share
                </a>
              </Button>
            )}
          </div>
        </CardFooter>
      )}
      
      {/* Delete confirmation dialog */}
      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete poll</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this poll? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeletePoll} className="bg-destructive">
              {loading ? (
                <>
                  <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

// Poll List Component
export function PollsList({
  spaceId,
  channelId,
  showCreateButton = true,
}: {
  spaceId?: string;
  channelId?: string;
  showCreateButton?: boolean;
}) {
  const [user] = useAuthState(auth);
  const [polls, setPolls] = useState<Poll[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [activeTab, setActiveTab] = useState('active');

  // Fetch polls
  useEffect(() => {
    if (!user) return;
    
    setLoading(true);
    
    let pollsQuery;
    
    if (channelId) {
      // Polls for specific channel
      pollsQuery = query(
        collection(db, 'polls'),
        where('channelId', '==', channelId),
        orderBy('createdAt', 'desc')
      );
    } else if (spaceId) {
      // Polls for entire space
      pollsQuery = query(
        collection(db, 'polls'),
        where('spaceId', '==', spaceId),
        orderBy('createdAt', 'desc')
      );
    } else {
      // All polls (for testing)
      pollsQuery = query(
        collection(db, 'polls'),
        orderBy('createdAt', 'desc')
      );
    }
    
    const unsubscribe = onSnapshot(
      pollsQuery,
      (snapshot) => {
        const pollsData: Poll[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          pollsData.push({
            id: doc.id,
            ...data,
            // Add client-side property to track if user has voted
            hasVoted: data.options?.some((opt: PollOption) => 
              opt.voterIds?.includes(user.uid)
            ) || false,
          } as Poll);
        });
        
        setPolls(pollsData);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error("Error fetching polls:", err);
        setError("Failed to load polls. Please try again.");
        setLoading(false);
      }
    );
    
    return () => unsubscribe();
  }, [user, spaceId, channelId]);
  
  // Filter polls based on active tab
  const filteredPolls = polls.filter(poll => {
    const isExpired = poll.expiresAt && (
      poll.expiresAt.toDate ? 
      poll.expiresAt.toDate() < new Date() : 
      new Date(poll.expiresAt) < new Date()
    );
    
    switch (activeTab) {
      case 'active':
        return poll.status !== 'closed' && !isExpired;
      case 'closed':
        return poll.status === 'closed' || isExpired;
      case 'voted':
        return poll.hasVoted;
      case 'created':
        return poll.createdBy === user?.uid;
      default:
        return true;
    }
  });
  
  // Handle poll creation
  const handlePollCreated = (pollId: string) => {
    toast({
      title: "Poll created",
      description: "Your poll has been created successfully",
    });
  };
  
  // Handle poll deletion (just UI update, the actual deletion is in PollCard)
  const handleDeletePoll = (pollId: string) => {
    setPolls(prev => prev.filter(poll => poll.id !== pollId));
  };
  
  if (loading) {
    return (
      <div className="p-8 text-center">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full inline-block mb-4"></div>
        <p className="text-muted-foreground">Loading polls...</p>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="p-8 text-center text-destructive">
        <AlertCircle className="h-8 w-8 mx-auto mb-2" />
        <p>{error}</p>
        <Button 
          variant="outline" 
          onClick={() => window.location.reload()} 
          className="mt-4"
        >
          Try again
        </Button>
      </div>
    );
  }
  
  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <Vote className="h-5 w-5" />
          <h1 className="text-lg font-semibold">Polls</h1>
        </div>
        {showCreateButton && (
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Create Poll
          </Button>
        )}
      </div>
      
      <div className="border-b">
        <Tabs defaultValue="active" value={activeTab} onValueChange={setActiveTab}>
          <div className="px-4">
            <TabsList className="grid grid-cols-4">
              <TabsTrigger value="active">Active</TabsTrigger>
              <TabsTrigger value="closed">Closed</TabsTrigger>
              <TabsTrigger value="voted">Voted</TabsTrigger>
              <TabsTrigger value="created">Created</TabsTrigger>
            </TabsList>
          </div>
        </Tabs>
      </div>
      
      <div className="flex-1 overflow-y-auto">
        {filteredPolls.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-8 text-center">
            <Vote className="h-12 w-12 text-muted-foreground mb-3" />
            <h3 className="text-lg font-medium mb-1">No polls found</h3>
            <p className="text-sm text-muted-foreground mb-6">
              {activeTab === 'active' && "There are no active polls at the moment."}
              {activeTab === 'closed' && "There are no closed polls yet."}
              {activeTab === 'voted' && "You haven't voted on any polls yet."}
              {activeTab === 'created' && "You haven't created any polls yet."}
            </p>
            {activeTab === 'created' && (
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="h-4 w-4 mr-1" />
                Create your first poll
              </Button>
            )}
          </div>
        ) : (
          <div className="p-4 space-y-6">
            {filteredPolls.map((poll) => (
              <PollCard 
                key={poll.id} 
                poll={poll}
                onDelete={handleDeletePoll}
                onClose={(pollId) => {
                  // Find and update the poll in the state
                  setPolls(prev => prev.map(p => 
                    p.id === pollId ? { ...p, status: 'closed' } : p
                  ));
                }}
              />
            ))}
          </div>
        )}
      </div>
      
      <CreatePollDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        spaceId={spaceId}
        channelId={channelId}
        onPollCreated={handlePollCreated}
      />
    </div>
  );
}

// Main polls component to export
export function PollsAndSurveys() {
  return (
    <PollsList />
  );
}
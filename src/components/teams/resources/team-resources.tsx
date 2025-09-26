'use client';

import { useState, useEffect } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '@/lib/firebase';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  onSnapshot,
} from 'firebase/firestore';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import {
  Plus,
  Settings,
  Users,
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Edit,
  Trash2,
  UserPlus,
  UserMinus,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Package,
  Wrench,
  Computer,
  BookOpen,
  Coffee,
  Car,
  Building,
  Zap,
  DollarSign,
  Percent,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';

// Types and Interfaces
interface TeamResource {
  id: string;
  teamId: string;
  name: string;
  description: string;
  type: 'equipment' | 'software' | 'space' | 'budget' | 'other';
  category: string;
  quantity: number;
  available: number;
  unit: string;
  cost?: number;
  location?: string;
  assignedTo?: string[];
  maintenanceSchedule?: any;
  status: 'available' | 'in-use' | 'maintenance' | 'out-of-order';
  tags: string[];
  createdAt: any;
  updatedAt: any;
}

interface ResourceAllocation {
  id: string;
  resourceId: string;
  teamId: string;
  userId: string;
  quantity: number;
  startDate: any;
  endDate?: any;
  purpose: string;
  status: 'active' | 'completed' | 'cancelled';
  approvedBy?: string;
  approvedAt?: any;
  createdAt: any;
}

interface ResourceRequest {
  id: string;
  teamId: string;
  userId: string;
  resourceId: string;
  quantity: number;
  startDate: any;
  endDate?: any;
  purpose: string;
  urgency: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'approved' | 'denied' | 'cancelled';
  reviewedBy?: string;
  reviewedAt?: any;
  comments?: string;
  createdAt: any;
}

interface TeamResourcesProps {
  teamId: string;
}

const RESOURCE_TYPES = [
  { value: 'equipment', label: 'Equipment', icon: Wrench },
  { value: 'software', label: 'Software', icon: Computer },
  { value: 'space', label: 'Space', icon: Building },
  { value: 'budget', label: 'Budget', icon: DollarSign },
  { value: 'other', label: 'Other', icon: Package },
];

const RESOURCE_CATEGORIES = [
  'Office Supplies',
  'Technology',
  'Furniture',
  'Vehicles',
  'Facilities',
  'Software Licenses',
  'Training',
  'Marketing',
  'Travel',
  'Events',
  'Miscellaneous',
];

export function TeamResources({ teamId }: TeamResourcesProps) {
  const [user] = useAuthState(auth);
  const [resources, setResources] = useState<TeamResource[]>([]);
  const [allocations, setAllocations] = useState<ResourceAllocation[]>([]);
  const [requests, setRequests] = useState<ResourceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddResource, setShowAddResource] = useState(false);
  const [showRequestResource, setShowRequestResource] = useState(false);
  const [selectedResource, setSelectedResource] = useState<TeamResource | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<string>('member');

  // Add resource form state
  const [resourceForm, setResourceForm] = useState({
    name: '',
    description: '',
    type: 'equipment',
    category: '',
    quantity: 1,
    unit: 'unit',
    cost: '',
    location: '',
    tags: [] as string[],
  });

  // Request resource form state
  const [requestForm, setRequestForm] = useState({
    resourceId: '',
    quantity: 1,
    startDate: '',
    endDate: '',
    purpose: '',
    urgency: 'medium' as 'low' | 'medium' | 'high' | 'critical',
  });

  useEffect(() => {
    if (!user || !teamId) return;

    setLoading(true);

    // Load team resources
    const loadResources = () => {
      const resourcesQuery = query(
        collection(db, 'teamResources'),
        where('teamId', '==', teamId),
        orderBy('createdAt', 'desc')
      );

      return onSnapshot(resourcesQuery, (snapshot) => {
        const resourcesList = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as TeamResource[];

        setResources(resourcesList);
      });
    };

    // Load resource allocations
    const loadAllocations = () => {
      const allocationsQuery = query(
        collection(db, 'resourceAllocations'),
        where('teamId', '==', teamId),
        orderBy('createdAt', 'desc')
      );

      return onSnapshot(allocationsQuery, (snapshot) => {
        const allocationsList = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as ResourceAllocation[];

        setAllocations(allocationsList);
      });
    };

    // Load resource requests
    const loadRequests = () => {
      const requestsQuery = query(
        collection(db, 'resourceRequests'),
        where('teamId', '==', teamId),
        orderBy('createdAt', 'desc')
      );

      return onSnapshot(requestsQuery, (snapshot) => {
        const requestsList = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as ResourceRequest[];

        setRequests(requestsList);
        setLoading(false);
      });
    };

    // Get current user's role
    const getCurrentUserRole = async () => {
      const memberQuery = query(
        collection(db, 'teamMembers'),
        where('teamId', '==', teamId),
        where('userId', '==', user.uid)
      );
      const memberSnapshot = await getDocs(memberQuery);
      if (!memberSnapshot.empty) {
        const memberData = memberSnapshot.docs[0].data();
        setCurrentUserRole(memberData.role || 'member');
      }
    };

    const unsubscribeResources = loadResources();
    const unsubscribeAllocations = loadAllocations();
    const unsubscribeRequests = loadRequests();
    getCurrentUserRole();

    return () => {
      unsubscribeResources();
      unsubscribeAllocations();
      unsubscribeRequests();
    };
  }, [user, teamId]);

  // Add new resource
  const addResource = async () => {
    if (!canManageResources()) return;

    try {
      const resourceData = {
        teamId,
        name: resourceForm.name.trim(),
        description: resourceForm.description.trim(),
        type: resourceForm.type,
        category: resourceForm.category,
        quantity: resourceForm.quantity,
        available: resourceForm.quantity,
        unit: resourceForm.unit,
        cost: resourceForm.cost ? parseFloat(resourceForm.cost) : null,
        location: resourceForm.location.trim() || null,
        assignedTo: [],
        status: 'available',
        tags: resourceForm.tags,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      await addDoc(collection(db, 'teamResources'), resourceData);

      setShowAddResource(false);
      resetResourceForm();

      toast({
        title: "Resource added",
        description: `Resource "${resourceForm.name}" has been added.`,
      });

    } catch (error) {
      console.error('Error adding resource:', error);
      toast({
        title: "Error",
        description: "Failed to add resource.",
        variant: "destructive"
      });
    }
  };

  // Request resource
  const requestResource = async () => {
    if (!user) return;

    try {
      const requestData = {
        teamId,
        userId: user.uid,
        resourceId: requestForm.resourceId,
        quantity: requestForm.quantity,
        startDate: new Date(requestForm.startDate),
        endDate: requestForm.endDate ? new Date(requestForm.endDate) : null,
        purpose: requestForm.purpose.trim(),
        urgency: requestForm.urgency,
        status: 'pending',
        createdAt: serverTimestamp(),
      };

      await addDoc(collection(db, 'resourceRequests'), requestData);

      setShowRequestResource(false);
      resetRequestForm();

      toast({
        title: "Request submitted",
        description: "Your resource request has been submitted for approval.",
      });

    } catch (error) {
      console.error('Error requesting resource:', error);
      toast({
        title: "Error",
        description: "Failed to submit request.",
        variant: "destructive"
      });
    }
  };

  // Update resource allocation
  const updateAllocation = async (allocationId: string, status: 'active' | 'completed' | 'cancelled') => {
    if (!canManageResources()) return;

    try {
      await updateDoc(doc(db, 'resourceAllocations', allocationId), {
        status,
        updatedAt: serverTimestamp(),
      });

      toast({
        title: "Allocation updated",
        description: `Resource allocation has been ${status}.`,
      });

    } catch (error) {
      console.error('Error updating allocation:', error);
      toast({
        title: "Error",
        description: "Failed to update allocation.",
        variant: "destructive"
      });
    }
  };

  // Approve/deny request
  const processRequest = async (requestId: string, status: 'approved' | 'denied', comments?: string) => {
    if (!canManageResources() || !user) return;

    try {
      await updateDoc(doc(db, 'resourceRequests', requestId), {
        status,
        reviewedBy: user.uid,
        reviewedAt: serverTimestamp(),
        comments: comments || null,
      });

      // If approved, create allocation
      if (status === 'approved') {
        const request = requests.find(r => r.id === requestId);
        if (request) {
          const allocationData = {
            resourceId: request.resourceId,
            teamId,
            userId: request.userId,
            quantity: request.quantity,
            startDate: request.startDate,
            endDate: request.endDate,
            purpose: request.purpose,
            status: 'active',
            approvedBy: user.uid,
            approvedAt: serverTimestamp(),
            createdAt: serverTimestamp(),
          };

          await addDoc(collection(db, 'resourceAllocations'), allocationData);

          // Update resource availability
          const resource = resources.find(r => r.id === request.resourceId);
          if (resource) {
            await updateDoc(doc(db, 'teamResources', request.resourceId), {
              available: Math.max(0, resource.available - request.quantity),
              assignedTo: [...(resource.assignedTo || []), request.userId],
            });
          }
        }
      }

      toast({
        title: status === 'approved' ? "Request approved" : "Request denied",
        description: `Resource request has been ${status}.`,
      });

    } catch (error) {
      console.error('Error processing request:', error);
      toast({
        title: "Error",
        description: "Failed to process request.",
        variant: "destructive"
      });
    }
  };

  // Delete resource
  const deleteResource = async (resourceId: string) => {
    if (!canManageResources()) return;

    try {
      await deleteDoc(doc(db, 'teamResources', resourceId));

      toast({
        title: "Resource deleted",
        description: "Resource has been removed.",
      });

    } catch (error) {
      console.error('Error deleting resource:', error);
      toast({
        title: "Error",
        description: "Failed to delete resource.",
        variant: "destructive"
      });
    }
  };

  // Check if current user can manage resources
  const canManageResources = () => {
    return currentUserRole === 'admin' || currentUserRole === 'owner';
  };

  // Reset forms
  const resetResourceForm = () => {
    setResourceForm({
      name: '',
      description: '',
      type: 'equipment',
      category: '',
      quantity: 1,
      unit: 'unit',
      cost: '',
      location: '',
      tags: [],
    });
  };

  const resetRequestForm = () => {
    setRequestForm({
      resourceId: '',
      quantity: 1,
      startDate: '',
      endDate: '',
      purpose: '',
      urgency: 'medium',
    });
  };

  // Get resource type icon
  const getResourceTypeIcon = (type: string) => {
    switch (type) {
      case 'equipment':
        return <Wrench className="h-4 w-4" />;
      case 'software':
        return <Computer className="h-4 w-4" />;
      case 'space':
        return <Building className="h-4 w-4" />;
      case 'budget':
        return <DollarSign className="h-4 w-4" />;
      default:
        return <Package className="h-4 w-4" />;
    }
  };

  // Get status badge color
  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'available':
        return 'bg-green-100 text-green-800';
      case 'in-use':
        return 'bg-blue-100 text-blue-800';
      case 'maintenance':
        return 'bg-yellow-100 text-yellow-800';
      case 'out-of-order':
        return 'bg-red-100 text-red-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'denied':
        return 'bg-red-100 text-red-800';
      case 'active':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Get urgency badge color
  const getUrgencyBadgeColor = (urgency: string) => {
    switch (urgency) {
      case 'low':
        return 'bg-gray-100 text-gray-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'high':
        return 'bg-orange-100 text-orange-800';
      case 'critical':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Calculate resource utilization
  const getResourceUtilization = (resource: TeamResource) => {
    if (resource.quantity === 0) return 0;
    return ((resource.quantity - resource.available) / resource.quantity) * 100;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading team resources...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Team Resources</h2>
          <p className="text-muted-foreground">
            Manage and allocate team resources
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setShowRequestResource(true)}
          >
            <UserPlus className="h-4 w-4 mr-2" />
            Request Resource
          </Button>
          <Button
            onClick={() => setShowAddResource(true)}
            disabled={!canManageResources()}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Resource
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Package className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{resources.length}</p>
                <p className="text-sm text-muted-foreground">Total Resources</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{resources.filter(r => r.status === 'available').length}</p>
                <p className="text-sm text-muted-foreground">Available</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Clock className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{allocations.filter(a => a.status === 'active').length}</p>
                <p className="text-sm text-muted-foreground">Active Allocations</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{requests.filter(r => r.status === 'pending').length}</p>
                <p className="text-sm text-muted-foreground">Pending Requests</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Resources List */}
      <Tabs defaultValue="resources" className="w-full">
        <TabsList>
          <TabsTrigger value="resources">
            Resources ({resources.length})
          </TabsTrigger>
          <TabsTrigger value="allocations">
            Allocations ({allocations.filter(a => a.status === 'active').length})
          </TabsTrigger>
          <TabsTrigger value="requests">
            Requests ({requests.filter(r => r.status === 'pending').length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="resources" className="space-y-4">
          {resources.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {resources.map((resource) => (
                <Card key={resource.id} className="overflow-hidden">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {getResourceTypeIcon(resource.type)}
                        <CardTitle className="text-lg">{resource.name}</CardTitle>
                      </div>
                      <Badge className={getStatusBadgeColor(resource.status)}>
                        {resource.status}
                      </Badge>
                    </div>
                    <CardDescription className="text-sm">
                      {resource.description}
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    {/* Resource Details */}
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Available:</span>
                        <div className="font-medium">
                          {resource.available} / {resource.quantity} {resource.unit}
                        </div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Category:</span>
                        <div className="font-medium">{resource.category}</div>
                      </div>
                      {resource.cost && (
                        <div>
                          <span className="text-muted-foreground">Cost:</span>
                          <div className="font-medium">${resource.cost}</div>
                        </div>
                      )}
                      {resource.location && (
                        <div>
                          <span className="text-muted-foreground">Location:</span>
                          <div className="font-medium">{resource.location}</div>
                        </div>
                      )}
                    </div>

                    {/* Utilization Bar */}
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Utilization</span>
                        <span>{Math.round(getResourceUtilization(resource))}%</span>
                      </div>
                      <Progress value={getResourceUtilization(resource)} className="h-2" />
                    </div>

                    {/* Tags */}
                    {resource.tags && resource.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {resource.tags.map((tag, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex justify-between items-center pt-2 border-t">
                      <Button variant="outline" size="sm">
                        Request
                      </Button>
                      {canManageResources() && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <Settings className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit Resource
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => deleteResource(resource.id)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete Resource
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="bg-muted/30">
              <CardContent className="flex items-center justify-center flex-col py-12">
                <Package className="h-16 w-16 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No resources yet</h3>
                <p className="text-muted-foreground mb-4 text-center max-w-md">
                  Add resources to your team to start managing allocations and requests.
                </p>
                {canManageResources() && (
                  <Button onClick={() => setShowAddResource(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add First Resource
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="allocations" className="space-y-4">
          {allocations.filter(a => a.status === 'active').length > 0 ? (
            <div className="space-y-2">
              {allocations.filter(a => a.status === 'active').map((allocation) => {
                const resource = resources.find(r => r.id === allocation.resourceId);
                return (
                  <Card key={allocation.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="p-2 bg-blue-100 rounded-lg">
                            {resource ? getResourceTypeIcon(resource.type) : <Package className="h-4 w-4 text-blue-600" />}
                          </div>
                          <div>
                            <h3 className="font-medium">
                              {resource?.name || 'Unknown Resource'}
                            </h3>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <span>{allocation.quantity} {resource?.unit || 'units'}</span>
                              <span>•</span>
                              <span>Allocated {allocation.startDate && format(new Date(allocation.startDate.seconds * 1000), 'MMM dd')}</span>
                              {allocation.endDate && (
                                <>
                                  <span>-</span>
                                  <span>{format(new Date(allocation.endDate.seconds * 1000), 'MMM dd')}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Badge className={getStatusBadgeColor(allocation.status)}>
                            {allocation.status}
                          </Badge>
                          {canManageResources() && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <Settings className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => updateAllocation(allocation.id, 'completed')}>
                                  <CheckCircle className="h-4 w-4 mr-2" />
                                  Mark Complete
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-destructive"
                                  onClick={() => updateAllocation(allocation.id, 'cancelled')}
                                >
                                  <XCircle className="h-4 w-4 mr-2" />
                                  Cancel Allocation
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </div>
                      </div>

                      {allocation.purpose && (
                        <div className="mt-3 p-3 bg-muted/30 rounded-md">
                          <p className="text-sm">{allocation.purpose}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card className="bg-muted/30">
              <CardContent className="flex items-center justify-center flex-col py-12">
                <Users className="h-16 w-16 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No active allocations</h3>
                <p className="text-muted-foreground text-center max-w-md">
                  Resource allocations will appear here once they are approved and active.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="requests" className="space-y-4">
          {requests.filter(r => r.status === 'pending').length > 0 ? (
            <div className="space-y-2">
              {requests.filter(r => r.status === 'pending').map((request) => {
                const resource = resources.find(r => r.id === request.resourceId);
                return (
                  <Card key={request.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="p-2 bg-orange-100 rounded-lg">
                            {resource ? getResourceTypeIcon(resource.type) : <Package className="h-4 w-4 text-orange-600" />}
                          </div>
                          <div>
                            <h3 className="font-medium">
                              {resource?.name || 'Unknown Resource'}
                            </h3>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <span>{request.quantity} {resource?.unit || 'units'}</span>
                              <Badge className={getUrgencyBadgeColor(request.urgency)}>
                                {request.urgency}
                              </Badge>
                              <span>• Requested {request.createdAt && format(new Date(request.createdAt.seconds * 1000), 'MMM dd')}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Badge className={getStatusBadgeColor(request.status)}>
                            {request.status}
                          </Badge>
                          {canManageResources() && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <Settings className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => processRequest(request.id, 'approved')}>
                                  <CheckCircle className="h-4 w-4 mr-2" />
                                  Approve
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-destructive"
                                  onClick={() => processRequest(request.id, 'denied')}
                                >
                                  <XCircle className="h-4 w-4 mr-2" />
                                  Deny
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </div>
                      </div>

                      <div className="mt-3 p-3 bg-muted/30 rounded-md">
                        <p className="text-sm mb-2">{request.purpose}</p>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span>From: {request.startDate && format(new Date(request.startDate.seconds * 1000), 'MMM dd, yyyy')}</span>
                          {request.endDate && (
                            <span>To: {format(new Date(request.endDate.seconds * 1000), 'MMM dd, yyyy')}</span>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card className="bg-muted/30">
              <CardContent className="flex items-center justify-center flex-col py-12">
                <AlertTriangle className="h-16 w-16 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No pending requests</h3>
                <p className="text-muted-foreground text-center max-w-md">
                  Resource requests will appear here when team members submit them for approval.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Add Resource Dialog */}
      <Dialog open={showAddResource} onOpenChange={setShowAddResource}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Resource</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="resourceName">Resource Name</Label>
              <Input
                id="resourceName"
                value={resourceForm.name}
                onChange={(e) => setResourceForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Conference Room A"
              />
            </div>

            <div>
              <Label htmlFor="resourceDescription">Description</Label>
              <textarea
                id="resourceDescription"
                value={resourceForm.description}
                onChange={(e) => setResourceForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe this resource..."
                className="w-full min-h-[80px] px-3 py-2 text-sm border border-input bg-background rounded-md resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="resourceType">Type</Label>
                <Select
                  value={resourceForm.type}
                  onValueChange={(value) => setResourceForm(prev => ({ ...prev, type: value }))}
                >
                  <SelectTrigger id="resourceType">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {RESOURCE_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="resourceCategory">Category</Label>
                <Select
                  value={resourceForm.category}
                  onValueChange={(value) => setResourceForm(prev => ({ ...prev, category: value }))}
                >
                  <SelectTrigger id="resourceCategory">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {RESOURCE_CATEGORIES.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="resourceQuantity">Quantity</Label>
                <Input
                  id="resourceQuantity"
                  type="number"
                  min="1"
                  value={resourceForm.quantity}
                  onChange={(e) => setResourceForm(prev => ({ ...prev, quantity: parseInt(e.target.value) || 1 }))}
                />
              </div>

              <div>
                <Label htmlFor="resourceUnit">Unit</Label>
                <Input
                  id="resourceUnit"
                  value={resourceForm.unit}
                  onChange={(e) => setResourceForm(prev => ({ ...prev, unit: e.target.value }))}
                  placeholder="e.g., units, hours, seats"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="resourceCost">Cost (optional)</Label>
                <Input
                  id="resourceCost"
                  type="number"
                  step="0.01"
                  value={resourceForm.cost}
                  onChange={(e) => setResourceForm(prev => ({ ...prev, cost: e.target.value }))}
                  placeholder="0.00"
                />
              </div>

              <div>
                <Label htmlFor="resourceLocation">Location (optional)</Label>
                <Input
                  id="resourceLocation"
                  value={resourceForm.location}
                  onChange={(e) => setResourceForm(prev => ({ ...prev, location: e.target.value }))}
                  placeholder="e.g., Floor 3, Room 101"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => {
                setShowAddResource(false);
                resetResourceForm();
              }}>
                Cancel
              </Button>
              <Button
                onClick={addResource}
                disabled={!resourceForm.name.trim() || !resourceForm.category}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Resource
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Request Resource Dialog */}
      <Dialog open={showRequestResource} onOpenChange={setShowRequestResource}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Request Resource</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="requestResource">Resource</Label>
              <Select
                value={requestForm.resourceId}
                onValueChange={(value) => setRequestForm(prev => ({ ...prev, resourceId: value }))}
              >
                <SelectTrigger id="requestResource">
                  <SelectValue placeholder="Select a resource" />
                </SelectTrigger>
                <SelectContent>
                  {resources.filter(r => r.available > 0).map((resource) => (
                    <SelectItem key={resource.id} value={resource.id}>
                      {resource.name} ({resource.available} available)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="requestQuantity">Quantity</Label>
              <Input
                id="requestQuantity"
                type="number"
                min="1"
                value={requestForm.quantity}
                onChange={(e) => setRequestForm(prev => ({ ...prev, quantity: parseInt(e.target.value) || 1 }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="requestStartDate">Start Date</Label>
                <Input
                  id="requestStartDate"
                  type="date"
                  value={requestForm.startDate}
                  onChange={(e) => setRequestForm(prev => ({ ...prev, startDate: e.target.value }))}
                />
              </div>

              <div>
                <Label htmlFor="requestEndDate">End Date (optional)</Label>
                <Input
                  id="requestEndDate"
                  type="date"
                  value={requestForm.endDate}
                  onChange={(e) => setRequestForm(prev => ({ ...prev, endDate: e.target.value }))}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="requestPurpose">Purpose</Label>
              <textarea
                id="requestPurpose"
                value={requestForm.purpose}
                onChange={(e) => setRequestForm(prev => ({ ...prev, purpose: e.target.value }))}
                placeholder="Describe why you need this resource..."
                className="w-full min-h-[80px] px-3 py-2 text-sm border border-input bg-background rounded-md resize-none"
              />
            </div>

            <div>
              <Label htmlFor="requestUrgency">Urgency</Label>
              <Select
                value={requestForm.urgency}
                onValueChange={(value: 'low' | 'medium' | 'high' | 'critical') => setRequestForm(prev => ({ ...prev, urgency: value }))}
              >
                <SelectTrigger id="requestUrgency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => {
                setShowRequestResource(false);
                resetRequestForm();
              }}>
                Cancel
              </Button>
              <Button
                onClick={requestResource}
                disabled={!requestForm.resourceId || !requestForm.startDate || !requestForm.purpose.trim()}
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Submit Request
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
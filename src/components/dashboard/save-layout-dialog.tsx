'use client';

import * as React from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Save, Trash2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { db, auth } from '@/lib/firebase';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { useAuthState } from 'react-firebase-hooks/auth';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface SaveLayoutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentLayout: any;
  onLayoutSelected: (layout: any) => void;
}

// Schema for the form
const formSchema = z.object({
  layoutName: z.string().min(1, 'Layout name is required').max(50),
});

export function SaveLayoutDialog({
  open,
  onOpenChange,
  currentLayout,
  onLayoutSelected,
}: SaveLayoutDialogProps) {
  const [user] = useAuthState(auth);
  const { toast } = useToast();
  const [layouts, setLayouts] = React.useState<any[]>([]);
  const [isSaving, setIsSaving] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);

  // Form definition
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      layoutName: `Dashboard Layout - ${format(new Date(), 'MMM d, yyyy')}`,
    },
  });

  // Load saved layouts when dialog opens
  React.useEffect(() => {
    if (open && user) {
      loadSavedLayouts();
    }
  }, [open, user]);

  // Load saved layouts from Firestore
  const loadSavedLayouts = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const savedLayouts = userData.savedDashboardLayouts || [];
        setLayouts(savedLayouts);
      }
    } catch (error) {
      console.error('Error loading saved layouts:', error);
      toast({
        variant: 'destructive',
        title: 'Error loading layouts',
        description: 'Failed to load your saved dashboard layouts.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Save current layout with a name
  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!user) return;
    
    setIsSaving(true);
    try {
      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);
      
      const newLayout = {
        id: `layout_${Date.now()}`,
        name: values.layoutName,
        layout: currentLayout,
        createdAt: serverTimestamp(),
      };
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const savedLayouts = userData.savedDashboardLayouts || [];
        
        // Add the new layout
        await updateDoc(userDocRef, {
          savedDashboardLayouts: [...savedLayouts, newLayout],
          lastUpdated: serverTimestamp(),
        });
      } else {
        // Create user document if it doesn't exist
        await setDoc(userDocRef, {
          savedDashboardLayouts: [newLayout],
          lastUpdated: serverTimestamp(),
        });
      }
      
      // Reset form and refresh layouts
      form.reset();
      loadSavedLayouts();
      
      toast({
        title: 'Layout saved',
        description: `Your dashboard layout "${values.layoutName}" has been saved.`,
      });
    } catch (error) {
      console.error('Error saving layout:', error);
      toast({
        variant: 'destructive',
        title: 'Error saving layout',
        description: 'Failed to save your dashboard layout.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Apply a saved layout
  const applyLayout = (layout: any) => {
    onLayoutSelected(layout.layout);
    onOpenChange(false);
    
    toast({
      title: 'Layout applied',
      description: `The dashboard layout "${layout.name}" has been applied.`,
    });
  };

  // Delete a saved layout
  const deleteLayout = async (layoutId: string) => {
    if (!user) return;
    
    setIsDeleting(layoutId);
    try {
      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const savedLayouts = userData.savedDashboardLayouts || [];
        
        // Remove the layout with the specified ID
        const updatedLayouts = savedLayouts.filter((layout: any) => layout.id !== layoutId);
        
        await updateDoc(userDocRef, {
          savedDashboardLayouts: updatedLayouts,
          lastUpdated: serverTimestamp(),
        });
        
        // Refresh layouts
        setLayouts(updatedLayouts);
        
        toast({
          title: 'Layout deleted',
          description: 'The dashboard layout has been deleted.',
        });
      }
    } catch (error) {
      console.error('Error deleting layout:', error);
      toast({
        variant: 'destructive',
        title: 'Error deleting layout',
        description: 'Failed to delete the dashboard layout.',
      });
    } finally {
      setIsDeleting(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px] max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Dashboard Layouts</DialogTitle>
          <DialogDescription>
            Save your current dashboard layout or apply a previously saved one.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex flex-col space-y-6 py-4">
          {/* Save Current Layout Section */}
          <div>
            <h3 className="text-sm font-medium mb-3">Save Current Layout</h3>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="layoutName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Layout Name</FormLabel>
                      <FormControl>
                        <Input placeholder="My Dashboard Layout" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Save Current Layout
                    </>
                  )}
                </Button>
              </form>
            </Form>
          </div>
          
          {/* Saved Layouts Section */}
          <div>
            <h3 className="text-sm font-medium mb-3">Saved Layouts</h3>
            
            {isLoading ? (
              <div className="flex items-center justify-center p-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                <span className="ml-2 text-sm text-muted-foreground">Loading saved layouts...</span>
              </div>
            ) : layouts.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                No saved layouts. Save your current layout to see it here.
              </p>
            ) : (
              <ScrollArea className="max-h-[200px] pr-3">
                <div className="space-y-3">
                  {layouts.map((layout) => (
                    <Card key={layout.id} className="overflow-hidden">
                      <CardContent className="p-3 flex justify-between items-center">
                        <div className="overflow-hidden">
                          <h4 className="text-sm font-medium truncate">{layout.name}</h4>
                          <p className="text-xs text-muted-foreground">
                            {layout.createdAt?.toDate ? 
                              format(layout.createdAt.toDate(), 'MMM d, yyyy') : 
                              'Recently created'}
                          </p>
                        </div>
                        
                        <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => applyLayout(layout)}
                          >
                            Apply
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => deleteLayout(layout.id)}
                            disabled={isDeleting === layout.id}
                          >
                            {isDeleting === layout.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
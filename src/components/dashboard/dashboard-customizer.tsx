'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { PlusCircle, Save, Layout, Move, Grid, Check, X, Undo, Settings, Cog } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useDashboardPreferences } from '@/hooks/use-dashboard-preferences';
import { WidgetProps, Widget, WidgetSize } from './widget';
import { UpcomingTasksWidget } from './task-widgets';
import { CalendarEventsWidget } from './calendar-widget';
import { QuickStatsWidget } from './quick-stats-widget';
import { FavoritesWidget } from './favorites-widget';
import { AddWidgetDialog, WidgetTemplate } from './add-widget-dialog';
import { SaveLayoutDialog } from './save-layout-dialog';
import { DashboardSettingsDialog } from './dashboard-settings-dialog';

// Generate a random ID for widgets
function generateWidgetId() {
  return `widget_${Math.random().toString(36).substr(2, 9)}`;
}

interface DashboardCustomizerProps {
  defaultWidgets?: any[];
  onSave?: () => void;
  onCancel?: () => void;
}

export function DashboardCustomizer({
  defaultWidgets,
  onSave,
  onCancel
}: DashboardCustomizerProps) {
  const [user] = useAuthState(auth);
  const { toast } = useToast();
  const [isEditing, setIsEditing] = React.useState(false);
  const [isMoving, setIsMoving] = React.useState(false);
  const [widgets, setWidgets] = React.useState<any[]>([]);
  const [isAddWidgetOpen, setIsAddWidgetOpen] = React.useState(false);
  const [isSaveLayoutOpen, setIsSaveLayoutOpen] = React.useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(true);
  const [hasUnsavedChanges, setHasUnsavedChanges] = React.useState(false);
  const [originalWidgets, setOriginalWidgets] = React.useState<any[]>([]);
  const { preferences } = useDashboardPreferences();

  // Load user's widget preferences
  React.useEffect(() => {
    const loadWidgets = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }
      
      try {
        const userDocRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);
        
        if (userDoc.exists() && userDoc.data().dashboardWidgets) {
          // User has saved widgets
          const savedWidgets = userDoc.data().dashboardWidgets;
          setWidgets(savedWidgets);
          setOriginalWidgets([...savedWidgets]);
        } else {
          // Use default widgets for new users
          const defaultLayout = [
            {
              id: 'quick-stats',
              type: 'stats',
              title: 'Quick Stats',
              size: 'medium',
            },
            {
              id: 'upcoming-tasks',
              type: 'tasks',
              title: 'Upcoming Tasks',
              size: 'medium',
            },
            {
              id: 'favorites',
              type: 'favorites',
              title: 'My Favorites',
              size: 'medium',
            },
            {
              id: 'calendar-events',
              type: 'calendar',
              title: 'Calendar Events',
              size: 'large',
            },
          ];
          
          setWidgets(defaultLayout);
          setOriginalWidgets([...defaultLayout]);
        }
      } catch (error) {
        console.error('Error loading dashboard widgets:', error);
        toast({
          variant: 'destructive',
          title: 'Error loading widgets',
          description: 'Failed to load your dashboard widgets.',
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    loadWidgets();
  }, [user, toast]);

  // Check for unsaved changes
  React.useEffect(() => {
    if (isLoading) return;
    
    const hasChanges = JSON.stringify(widgets) !== JSON.stringify(originalWidgets);
    setHasUnsavedChanges(hasChanges);
  }, [widgets, originalWidgets, isLoading]);

  // Save widgets to user preferences
  const saveWidgets = async () => {
    if (!user) return;
    
    try {
      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);
      
      if (userDoc.exists()) {
        await updateDoc(userDocRef, {
          dashboardWidgets: widgets,
          lastUpdated: serverTimestamp(),
        });
      } else {
        await setDoc(userDocRef, {
          dashboardWidgets: widgets,
          lastUpdated: serverTimestamp(),
        });
      }
      
      setOriginalWidgets([...widgets]);
      setHasUnsavedChanges(false);
      
      toast({
        title: 'Dashboard updated',
        description: 'Your dashboard layout has been saved.',
      });
      
      if (onSave) onSave();
    } catch (error) {
      console.error('Error saving dashboard widgets:', error);
      toast({
        variant: 'destructive',
        title: 'Error saving widgets',
        description: 'Failed to save your dashboard layout.',
      });
    } finally {
      setIsEditing(false);
    }
  };

  // Reset widgets to original state
  const resetWidgets = () => {
    setWidgets([...originalWidgets]);
    setHasUnsavedChanges(false);
    setIsEditing(false);
  };

  // Handle adding a new widget
  const handleAddWidget = (widgetTemplate: WidgetTemplate) => {
    const newWidget = {
      id: generateWidgetId(),
      type: widgetTemplate.type,
      title: widgetTemplate.title,
      size: widgetTemplate.defaultSize,
    };
    
    setWidgets([...widgets, newWidget]);
    setHasUnsavedChanges(true);
  };

  // Handle removing a widget
  const handleRemoveWidget = (widgetId: string) => {
    setWidgets(widgets.filter(widget => widget.id !== widgetId));
    setHasUnsavedChanges(true);
  };

  // Handle changing widget size
  const handleSizeChange = (widgetId: string, size: string) => {
    setWidgets(widgets.map(widget => 
      widget.id === widgetId ? { ...widget, size } : widget
    ));
    setHasUnsavedChanges(true);
  };

  // Render a specific widget based on its type
  const renderWidget = (widget: any) => {
    switch(widget.type) {
      case 'tasks':
        return (
          <UpcomingTasksWidget
            key={widget.id}
            id={widget.id}
            title={widget.title}
            size={widget.size}
            isEditing={isEditing}
            isMoving={isMoving}
            onRemove={handleRemoveWidget}
            onSizeChange={handleSizeChange}
          />
        );
      case 'calendar':
        return (
          <CalendarEventsWidget
            key={widget.id}
            id={widget.id}
            title={widget.title}
            size={widget.size}
            isEditing={isEditing}
            isMoving={isMoving}
            onRemove={handleRemoveWidget}
            onSizeChange={handleSizeChange}
          />
        );
      case 'stats':
        return (
          <QuickStatsWidget
            key={widget.id}
            id={widget.id}
            title={widget.title}
            size={widget.size}
            isEditing={isEditing}
            isMoving={isMoving}
            onRemove={handleRemoveWidget}
            onSizeChange={handleSizeChange}
          />
        );
      case 'favorites':
        return (
          <FavoritesWidget
            key={widget.id}
            id={widget.id}
            title={widget.title}
            size={widget.size}
            isEditing={isEditing}
            isMoving={isMoving}
            onRemove={handleRemoveWidget}
            onSizeChange={handleSizeChange}
          />
        );
      default:
        // Fallback for unsupported widget types
        return (
          <Widget
            key={widget.id}
            id={widget.id}
            type={widget.type}
            title={widget.title}
            size={widget.size}
            isEditing={isEditing}
            isMoving={isMoving}
            onRemove={handleRemoveWidget}
            onSizeChange={handleSizeChange}
          >
            <div className="flex items-center justify-center h-full text-muted-foreground">
              Widget content for {widget.title}
            </div>
          </Widget>
        );
    }
  };

  // Apply a saved layout
  const handleApplySavedLayout = (layoutData: any) => {
    setWidgets([...layoutData]);
    setHasUnsavedChanges(true);
  };

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {isEditing ? 'Customize Dashboard' : 'Your Dashboard'}
          </h1>
          <p className="text-muted-foreground mt-1">
            {isEditing 
              ? 'Add, remove, or rearrange widgets to personalize your dashboard.' 
              : 'View your personalized dashboard with key metrics and information.'}
          </p>
        </div>
        
        <div className="flex gap-2">
          {isEditing ? (
            <>
              <Button 
                variant="outline" 
                onClick={() => setIsAddWidgetOpen(true)}
              >
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Widget
              </Button>
              
              <Button 
                variant="outline" 
                onClick={() => setIsSaveLayoutOpen(true)}
              >
                <Save className="mr-2 h-4 w-4" />
                Layouts
              </Button>
              
              <Button 
                variant="outline" 
                onClick={resetWidgets}
              >
                <Undo className="mr-2 h-4 w-4" />
                Discard
              </Button>
              
              <Button onClick={saveWidgets}>
                <Check className="mr-2 h-4 w-4" />
                Save
              </Button>
            </>
          ) : (
            <>
              <Button 
                variant="outline"
                onClick={() => setIsSettingsOpen(true)}
              >
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </Button>
              <Button 
                onClick={() => setIsEditing(true)}
              >
                <Layout className="mr-2 h-4 w-4" />
                Customize
              </Button>
            </>
          )}
        </div>
      </div>
      
      {/* Widgets grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-5 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-40 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {widgets.map(widget => {
            // Determine column span based on widget size
            const colSpanClasses = {
              'small': '',
              'medium': '',
              'large': 'md:col-span-2',
              'full': 'md:col-span-2 lg:col-span-3',
            };
            
            return (
              <div 
                key={widget.id} 
                className={cn(colSpanClasses[widget.size as keyof typeof colSpanClasses])}
              >
                {renderWidget(widget)}
              </div>
            );
          })}
        </div>
      )}
      
      {/* Add widget dialog */}
      <AddWidgetDialog 
        open={isAddWidgetOpen} 
        onOpenChange={setIsAddWidgetOpen} 
        onAddWidget={handleAddWidget} 
      />
      
      {/* Save layout dialog */}
      <SaveLayoutDialog
        open={isSaveLayoutOpen}
        onOpenChange={setIsSaveLayoutOpen}
        currentLayout={widgets}
        onLayoutSelected={handleApplySavedLayout}
      />
      
      {/* Settings dialog */}
      <DashboardSettingsDialog
        open={isSettingsOpen}
        onOpenChange={setIsSettingsOpen}
      />
    </div>
  );
}
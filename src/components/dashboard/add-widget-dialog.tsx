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
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  LayoutGrid, 
  BarChart, 
  Calendar, 
  Users, 
  MessageCircle, 
  CheckSquare, 
  Clock, 
  Star, 
  FileText, 
  TrendingUp,
  BookOpen,
  Bell,
  FileBarChart,
  Mail,
  LayoutDashboard,
  Video,
  Plus,
  Save
} from 'lucide-react';

export interface WidgetTemplate {
  id: string;
  type: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  defaultSize: 'small' | 'medium' | 'large' | 'full';
}

export interface AddWidgetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddWidget: (widget: WidgetTemplate) => void;
}

const AVAILABLE_WIDGETS: WidgetTemplate[] = [
  {
    id: 'upcoming-tasks',
    type: 'tasks',
    title: 'Upcoming Tasks',
    description: 'Shows your upcoming tasks and deadlines',
    icon: <CheckSquare className="h-5 w-5" />,
    defaultSize: 'medium'
  },
  {
    id: 'task-progress',
    type: 'tasks',
    title: 'Task Progress',
    description: 'View your task completion progress',
    icon: <TrendingUp className="h-5 w-5" />,
    defaultSize: 'medium'
  },
  {
    id: 'time-tracking',
    type: 'tasks',
    title: 'Time Tracking',
    description: 'Track time spent on different tasks',
    icon: <Clock className="h-5 w-5" />,
    defaultSize: 'medium'
  },
  {
    id: 'calendar-events',
    type: 'calendar',
    title: 'Calendar Events',
    description: 'View upcoming meetings and events',
    icon: <Calendar className="h-5 w-5" />,
    defaultSize: 'large'
  },
  {
    id: 'team-overview',
    type: 'team',
    title: 'Team Overview',
    description: 'Overview of your teams and recent activities',
    icon: <Users className="h-5 w-5" />,
    defaultSize: 'large'
  },
  {
    id: 'messages',
    type: 'chat',
    title: 'Recent Messages',
    description: 'Latest messages from your conversations',
    icon: <MessageCircle className="h-5 w-5" />,
    defaultSize: 'medium'
  },
  {
    id: 'quick-stats',
    type: 'analytics',
    title: 'Quick Stats',
    description: 'Summary of your key metrics',
    icon: <BarChart className="h-5 w-5" />,
    defaultSize: 'small'
  },
  {
    id: 'favorites',
    type: 'spaces',
    title: 'Favorite Spaces',
    description: 'Quick access to your favorite spaces',
    icon: <Star className="h-5 w-5" />,
    defaultSize: 'small'
  },
  {
    id: 'recent-documents',
    type: 'documents',
    title: 'Recent Documents',
    description: 'Recently accessed documents',
    icon: <FileText className="h-5 w-5" />,
    defaultSize: 'medium'
  },
  {
    id: 'learning-resources',
    type: 'learning',
    title: 'Learning Resources',
    description: 'Educational materials and courses',
    icon: <BookOpen className="h-5 w-5" />,
    defaultSize: 'medium'
  },
  {
    id: 'notifications',
    type: 'notifications',
    title: 'Notifications',
    description: 'Your latest notifications',
    icon: <Bell className="h-5 w-5" />,
    defaultSize: 'medium'
  },
  {
    id: 'performance-metrics',
    type: 'performance',
    title: 'Performance Metrics',
    description: 'View your performance indicators',
    icon: <FileBarChart className="h-5 w-5" />,
    defaultSize: 'large'
  },
  {
    id: 'inbox',
    type: 'mail',
    title: 'Inbox',
    description: 'Recent emails and messages',
    icon: <Mail className="h-5 w-5" />,
    defaultSize: 'medium'
  },
  {
    id: 'quick-actions',
    type: 'actions',
    title: 'Quick Actions',
    description: 'Shortcuts to common actions',
    icon: <LayoutDashboard className="h-5 w-5" />,
    defaultSize: 'small'
  },
  {
    id: 'upcoming-meetings',
    type: 'meetings',
    title: 'Upcoming Meetings',
    description: 'Your scheduled meetings',
    icon: <Video className="h-5 w-5" />,
    defaultSize: 'medium'
  },
];

export function AddWidgetDialog({ open, onOpenChange, onAddWidget }: AddWidgetDialogProps) {
  // Group widgets by type
  const widgetsByType = React.useMemo(() => {
    return AVAILABLE_WIDGETS.reduce<Record<string, WidgetTemplate[]>>((acc, widget) => {
      if (!acc[widget.type]) {
        acc[widget.type] = [];
      }
      acc[widget.type].push(widget);
      return acc;
    }, {});
  }, []);

  const typeLabels: Record<string, string> = {
    tasks: 'Task Management',
    calendar: 'Calendar',
    team: 'Team',
    chat: 'Communication',
    analytics: 'Analytics',
    spaces: 'Spaces',
    documents: 'Documents',
    learning: 'Learning',
    notifications: 'Notifications',
    performance: 'Performance',
    mail: 'Mail',
    actions: 'Actions',
    meetings: 'Meetings'
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Add Widgets to Dashboard</DialogTitle>
          <DialogDescription>
            Select widgets to add to your customized dashboard.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-6 py-4">
            {Object.entries(widgetsByType).map(([type, widgets]) => (
              <div key={type} className="space-y-3">
                <h3 className="text-sm font-medium text-muted-foreground">
                  {typeLabels[type] || type}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {widgets.map((widget) => (
                    <Card key={widget.id} className="cursor-pointer hover:bg-accent/10 transition-colors">
                      <CardHeader className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="p-2 rounded-md bg-primary/10 text-primary">
                              {widget.icon}
                            </div>
                            <CardTitle className="text-base">{widget.title}</CardTitle>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="rounded-full h-8 w-8 p-0 text-muted-foreground"
                            onClick={() => onAddWidget(widget)}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent className="px-4 pb-4 pt-0">
                        <p className="text-muted-foreground text-sm">{widget.description}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        <DialogFooter className="pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
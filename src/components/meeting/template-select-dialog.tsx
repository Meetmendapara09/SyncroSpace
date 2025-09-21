'use client';

import * as React from 'react';
import { 
  Card,
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Check, FileText, Presentation, Users, ListChecks, CalendarClock, Plus } from 'lucide-react';
import { MeetingTemplate } from '@/lib/meeting-templates';
import { MeetingTemplatesService } from '@/lib/meeting-notes-service';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '@/lib/firebase';

interface TemplateSelectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectTemplate: (templateId: string) => void;
}

export function TemplateSelectDialog({
  open,
  onOpenChange,
  onSelectTemplate
}: TemplateSelectDialogProps) {
  const [user] = useAuthState(auth);
  const [templates, setTemplates] = React.useState<MeetingTemplate[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [selectedTemplateId, setSelectedTemplateId] = React.useState<string | null>(null);
  const [activeTab, setActiveTab] = React.useState('standard');

  // Fetch templates when dialog opens
  React.useEffect(() => {
    async function fetchTemplates() {
      if (!user || !open) return;
      
      setLoading(true);
      try {
        // Ensure default templates exist
        await MeetingTemplatesService.ensureDefaultTemplates(user.uid);
        
        // Get all templates accessible to the user
        const userTemplates = await MeetingTemplatesService.getTemplates(user.uid);
        setTemplates(userTemplates);
      } catch (error) {
        console.error('Error loading templates:', error);
      } finally {
        setLoading(false);
      }
    }
    
    fetchTemplates();
  }, [user, open]);

  // Filter templates by type based on active tab
  const standardTemplates = templates.filter(template => template.isDefault || template.isPublic);
  const customTemplates = templates.filter(template => !template.isDefault && !template.isPublic);

  // Handle template selection
  const handleSelect = (templateId: string) => {
    setSelectedTemplateId(templateId);
  };

  // Confirm template selection
  const handleConfirm = () => {
    if (selectedTemplateId) {
      onSelectTemplate(selectedTemplateId);
      onOpenChange(false);
    }
  };

  // Render template cards
  const renderTemplateCards = (templatesList: MeetingTemplate[]) => {
    if (loading) {
      return Array(3).fill(0).map((_, index) => (
        <Card key={`loading-${index}`} className="cursor-pointer border-2 border-transparent">
          <CardHeader className="pb-2">
            <Skeleton className="h-4 w-3/4 mb-2" />
            <Skeleton className="h-3 w-1/2" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-20 w-full" />
          </CardContent>
        </Card>
      ));
    }

    if (templatesList.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center p-6 text-center text-muted-foreground">
          <FileText className="h-8 w-8 mb-2 opacity-50" />
          <p>No templates available</p>
        </div>
      );
    }

    return templatesList.map(template => (
      <Card 
        key={template.id}
        className={`cursor-pointer transition-all duration-200 border-2 ${
          selectedTemplateId === template.id 
            ? 'border-primary ring-1 ring-primary' 
            : 'border-transparent hover:border-primary/50'
        }`}
        onClick={() => handleSelect(template.id)}
      >
        <CardHeader className="pb-2">
          <div className="flex justify-between items-start">
            <CardTitle className="text-base">{template.name}</CardTitle>
            {selectedTemplateId === template.id && (
              <Check className="h-5 w-5 text-primary" />
            )}
          </div>
          <CardDescription>{template.description}</CardDescription>
        </CardHeader>
        <CardContent className="text-xs text-muted-foreground">
          {template.sections.map((section, i) => (
            <div key={section.id} className="flex items-center gap-1 mb-1">
              {i < 3 ? (
                <>
                  {section.type === 'agenda' && <CalendarClock className="h-3 w-3 opacity-70" />}
                  {section.type === 'participants' && <Users className="h-3 w-3 opacity-70" />}
                  {section.type === 'action-items' && <ListChecks className="h-3 w-3 opacity-70" />}
                  {section.type === 'notes' && <FileText className="h-3 w-3 opacity-70" />}
                  {section.type === 'decisions' && <Presentation className="h-3 w-3 opacity-70" />}
                  <span>{section.title}</span>
                </>
              ) : i === 3 ? (
                <span>...</span>
              ) : null}
            </div>
          ))}
        </CardContent>
      </Card>
    ));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle>Select Meeting Template</DialogTitle>
          <DialogDescription>
            Choose a template for your meeting notes
          </DialogDescription>
        </DialogHeader>
        
        <Tabs defaultValue="standard" onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-2 mb-4">
            <TabsTrigger value="standard">Standard Templates</TabsTrigger>
            <TabsTrigger value="custom">My Templates</TabsTrigger>
          </TabsList>
          
          <ScrollArea className="h-[400px]">
            <TabsContent value="standard" className="m-0">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {renderTemplateCards(standardTemplates)}
              </div>
            </TabsContent>
            
            <TabsContent value="custom" className="m-0">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card 
                  className="cursor-pointer border-2 border-dashed border-primary/30 hover:border-primary/70 transition-all duration-200"
                  onClick={() => {
                    // TODO: Open template creation dialog
                    console.log('Create new template');
                  }}
                >
                  <CardContent className="flex flex-col items-center justify-center h-full py-8">
                    <Plus className="h-8 w-8 mb-2 text-primary/70" />
                    <p className="text-center text-primary/70 font-medium">Create New Template</p>
                  </CardContent>
                </Card>
                {renderTemplateCards(customTemplates)}
              </div>
            </TabsContent>
          </ScrollArea>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={!selectedTemplateId}>
            Use Template
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
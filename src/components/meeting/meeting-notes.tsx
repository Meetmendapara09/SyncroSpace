'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { getInitials } from '@/lib/utils';
import { Calendar } from '@/components/ui/calendar';
import { CalendarClock, Calendar as CalendarIcon, Plus, Save, User, Edit2, Check, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { 
  MeetingNotes, 
  NotesSection, 
  ActionItem 
} from '@/lib/meeting-templates';
import { 
  MeetingNotesService, 
  ActionItemsService 
} from '@/lib/meeting-notes-service';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '@/lib/firebase';
import { cn } from '@/lib/utils';

interface MeetingNotesComponentProps {
  meetingId: string;
  notesId?: string;
  readOnly?: boolean;
  onSave?: () => void;
}

export function MeetingNotesComponent({
  meetingId,
  notesId,
  readOnly = false,
  onSave
}: MeetingNotesComponentProps) {
  const [user] = useAuthState(auth);
  const [notes, setNotes] = React.useState<MeetingNotes | null>(null);
  const [actionItems, setActionItems] = React.useState<ActionItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [editingSection, setEditingSection] = React.useState<string | null>(null);

  // Fetch notes and action items
  React.useEffect(() => {
    async function fetchData() {
      if (!user) return;
      
      setLoading(true);
      try {
        let notesData = null;
        
        if (notesId) {
          // TODO: Implement fetching by notesId
        } else {
          notesData = await MeetingNotesService.getNotesByMeeting(meetingId);
        }
        
        setNotes(notesData);
        
        if (notesData) {
          const actionItemsData = await ActionItemsService.getActionItemsByMeeting(meetingId);
          setActionItems(actionItemsData);
        }
      } catch (error) {
        console.error('Error loading meeting notes:', error);
      } finally {
        setLoading(false);
      }
    }
    
    fetchData();
  }, [user, meetingId, notesId]);

  // Handle section content changes
  const handleSectionChange = (sectionId: string, content: any) => {
    if (!notes) return;
    
    setNotes(prev => {
      if (!prev) return prev;
      
      return {
        ...prev,
        sections: prev.sections.map(section => 
          section.id === sectionId ? { ...section, content } : section
        )
      };
    });
  };

  // Save section changes
  const saveSection = async (sectionId: string) => {
    if (!notes || !user) return;
    
    const section = notes.sections.find(s => s.id === sectionId);
    if (!section) return;
    
    setSaving(true);
    try {
      await MeetingNotesService.updateSection(notes.id, sectionId, section.content, user.uid);
      setEditingSection(null);
      
      if (onSave) {
        onSave();
      }
    } catch (error) {
      console.error('Error saving section:', error);
    } finally {
      setSaving(false);
    }
  };

  // Render different section types
  const renderSectionContent = (section: NotesSection) => {
    const isEditing = editingSection === section.id && !readOnly;
    
    switch (section.type) {
      case 'text':
      case 'notes':
      case 'decisions':
        return (
          <div className="space-y-2">
            {isEditing ? (
              <Textarea
                value={section.content || ''}
                onChange={(e) => handleSectionChange(section.id, e.target.value)}
                placeholder={`Enter ${section.title.toLowerCase()} here...`}
                className="min-h-[150px]"
              />
            ) : (
              <div className="prose prose-sm max-w-none">
                {section.content ? (
                  <p className="whitespace-pre-wrap">{section.content}</p>
                ) : (
                  <p className="text-muted-foreground italic">No content added yet</p>
                )}
              </div>
            )}
          </div>
        );
        
      case 'participants':
        return (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {(section.content || []).map((participant: string, index: number) => (
                <div 
                  key={index} 
                  className="flex items-center bg-muted rounded-full pl-1 pr-2 py-1"
                >
                  <Avatar className="h-6 w-6 mr-2">
                    <AvatarFallback>{getInitials(participant)}</AvatarFallback>
                  </Avatar>
                  <span className="text-sm">{participant}</span>
                  {isEditing && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5 ml-1"
                      onClick={() => {
                        const newParticipants = [...(section.content || [])];
                        newParticipants.splice(index, 1);
                        handleSectionChange(section.id, newParticipants);
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              ))}
              
              {isEditing && (
                <AddParticipant
                  onAdd={(participant) => {
                    const current = section.content || [];
                    if (!current.includes(participant)) {
                      handleSectionChange(section.id, [...current, participant]);
                    }
                  }}
                />
              )}
              
              {!isEditing && (section.content || []).length === 0 && (
                <p className="text-muted-foreground italic">No participants recorded</p>
              )}
            </div>
          </div>
        );
        
      case 'agenda':
        return (
          <div className="space-y-2">
            {isEditing ? (
              <div className="space-y-2">
                {(section.content || []).map((item: any, index: number) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input
                      value={item.text}
                      onChange={(e) => {
                        const newAgenda = [...(section.content || [])];
                        newAgenda[index] = { ...newAgenda[index], text: e.target.value };
                        handleSectionChange(section.id, newAgenda);
                      }}
                      className="flex-1"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        const newAgenda = [...(section.content || [])];
                        newAgenda.splice(index, 1);
                        handleSectionChange(section.id, newAgenda);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={() => {
                    const newAgenda = [...(section.content || [])];
                    newAgenda.push({ text: '', completed: false });
                    handleSectionChange(section.id, newAgenda);
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Agenda Item
                </Button>
              </div>
            ) : (
              <div className="space-y-1">
                {(section.content || []).length > 0 ? (
                  (section.content || []).map((item: any, index: number) => (
                    <div key={index} className="flex items-center gap-2">
                      <div className={cn(
                        "w-1 h-1 rounded-full", 
                        item.completed ? "bg-green-500" : "bg-primary"
                      )} />
                      <span className={cn(
                        item.completed && "line-through text-muted-foreground"
                      )}>
                        {item.text}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-muted-foreground italic">No agenda items added</p>
                )}
              </div>
            )}
          </div>
        );
        
      case 'action-items':
        return (
          <ActionItemsSection
            sectionId={section.id}
            meetingId={meetingId}
            isEditing={isEditing}
            actionItems={actionItems}
            onAddItem={(item) => {
              // ActionItemsService.createActionItem will be called here
              console.log('Add action item:', item);
            }}
            onUpdateItem={(item) => {
              // ActionItemsService.updateActionItem will be called here
              console.log('Update action item:', item);
            }}
          />
        );
        
      default:
        return (
          <div className="text-muted-foreground italic">
            This section type is not supported yet
          </div>
        );
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <div className="animate-pulse">
            <div className="h-6 bg-muted rounded w-1/3 mb-2"></div>
            <div className="h-4 bg-muted rounded w-1/4"></div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse space-y-2">
              <div className="h-5 bg-muted rounded w-1/5"></div>
              <div className="h-32 bg-muted rounded w-full"></div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!notes) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <div className="text-center">
            <h3 className="text-lg font-medium mb-2">No Meeting Notes Found</h3>
            <p className="text-muted-foreground mb-6">
              There are no notes for this meeting yet.
            </p>
            
            {!readOnly && user && (
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Meeting Notes
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3 flex flex-row justify-between items-start">
          <div>
            <CardTitle>{notes.title}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Last updated {new Date(notes.updatedAt).toLocaleString()}
            </p>
          </div>
          
          {!readOnly && (
            <Button variant="outline" size="sm" onClick={() => console.log('Share notes')}>
              Share Notes
            </Button>
          )}
        </CardHeader>
      </Card>
      
      {notes.sections
        .sort((a, b) => a.order - b.order)
        .map((section) => (
          <Card key={section.id}>
            <CardHeader className="pb-3 flex flex-row justify-between items-center">
              <CardTitle className="text-base">{section.title}</CardTitle>
              
              {!readOnly && (
                editingSection === section.id ? (
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => setEditingSection(null)}
                    >
                      Cancel
                    </Button>
                    <Button 
                      size="sm"
                      onClick={() => saveSection(section.id)}
                      disabled={saving}
                    >
                      {saving ? 'Saving...' : 'Save'}
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditingSection(section.id)}
                  >
                    <Edit2 className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                )
              )}
            </CardHeader>
            <CardContent>
              {renderSectionContent(section)}
            </CardContent>
          </Card>
        ))}
    </div>
  );
}

// Additional components

function AddParticipant({ onAdd }: { onAdd: (email: string) => void }) {
  const [email, setEmail] = React.useState('');
  
  const handleAdd = () => {
    if (email.trim()) {
      onAdd(email.trim());
      setEmail('');
    }
  };
  
  return (
    <div className="flex items-center gap-2">
      <Input
        type="email"
        placeholder="Add participant email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="w-64"
      />
      <Button size="sm" onClick={handleAdd}>
        Add
      </Button>
    </div>
  );
}

function ActionItemsSection({
  sectionId,
  meetingId,
  isEditing,
  actionItems,
  onAddItem,
  onUpdateItem
}: {
  sectionId: string;
  meetingId: string;
  isEditing: boolean;
  actionItems: ActionItem[];
  onAddItem: (item: Partial<ActionItem>) => void;
  onUpdateItem: (item: Partial<ActionItem>) => void;
}) {
  const [newItem, setNewItem] = React.useState({
    title: '',
    assignee: '',
    dueDate: '',
    priority: 'medium' as 'low' | 'medium' | 'high'
  });
  const [date, setDate] = React.useState<Date | undefined>();
  
  if (actionItems.length === 0 && !isEditing) {
    return (
      <div className="text-center py-4">
        <p className="text-muted-foreground">No action items assigned yet</p>
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      {actionItems.map((item) => (
        <div
          key={item.id}
          className="flex items-start justify-between border-b pb-3 last:border-0 last:pb-0"
        >
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Badge variant={
                item.priority === 'high' ? 'destructive' : 
                item.priority === 'medium' ? 'default' : 
                'secondary'
              }>
                {item.priority}
              </Badge>
              <span className="font-medium">{item.title}</span>
            </div>
            {item.description && (
              <p className="text-sm text-muted-foreground">{item.description}</p>
            )}
            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
              {item.assignedTo.map((user, i) => (
                <div key={i} className="flex items-center">
                  <User className="h-3 w-3 mr-1" />
                  <span>{user}</span>
                </div>
              ))}
              {item.dueDate && (
                <div className="flex items-center">
                  <CalendarClock className="h-3 w-3 mr-1" />
                  <span>{new Date(item.dueDate).toLocaleDateString()}</span>
                </div>
              )}
            </div>
          </div>
          
          {isEditing && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onUpdateItem({
                  id: item.id,
                  status: item.status === 'completed' ? 'in-progress' : 'completed'
                })}
              >
                {item.status === 'completed' ? 'Reopen' : 'Complete'}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      ))}
      
      {isEditing && (
        <div className="border rounded-md p-4 mt-4">
          <h4 className="font-medium mb-3">Add New Action Item</h4>
          <div className="space-y-3">
            <div>
              <Input
                placeholder="Action item title"
                value={newItem.title}
                onChange={(e) => setNewItem({ ...newItem, title: e.target.value })}
                className="mb-2"
              />
              <Input
                placeholder="Assigned to (email)"
                value={newItem.assignee}
                onChange={(e) => setNewItem({ ...newItem, assignee: e.target.value })}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-[240px] justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, "PPP") : <span>Pick a due date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={setDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              
              <div className="flex items-center gap-2">
                <select
                  value={newItem.priority}
                  onChange={(e) => setNewItem({ 
                    ...newItem, 
                    priority: e.target.value as 'low' | 'medium' | 'high'
                  })}
                  className="border rounded p-2 text-sm"
                >
                  <option value="low">Low Priority</option>
                  <option value="medium">Medium Priority</option>
                  <option value="high">High Priority</option>
                </select>
                
                <Button 
                  onClick={() => {
                    if (!newItem.title || !newItem.assignee) return;
                    
                    onAddItem({
                      title: newItem.title,
                      assignedTo: [newItem.assignee],
                      dueDate: date ? date.toISOString() : undefined,
                      priority: newItem.priority,
                      meetingId,
                      sectionId
                    });
                    
                    // Reset form
                    setNewItem({
                      title: '',
                      assignee: '',
                      dueDate: '',
                      priority: 'medium'
                    });
                    setDate(undefined);
                  }}
                  disabled={!newItem.title || !newItem.assignee}
                >
                  Add
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
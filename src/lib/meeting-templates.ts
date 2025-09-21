import { v4 as uuidv4 } from 'uuid';

export interface MeetingTemplate {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  isDefault?: boolean;
  sections: TemplateSectionDefinition[];
  createdAt: string;
  createdBy: string;
  organizationId?: string;
  isPublic: boolean;
}

export interface TemplateSectionDefinition {
  id: string;
  title: string;
  description?: string;
  type: 'text' | 'agenda' | 'participants' | 'action-items' | 'decisions' | 'notes' | 'poll' | 'upload' | 'custom';
  required?: boolean;
  order: number;
  defaultContent?: string;
  placeholder?: string;
  config?: any; // Additional configuration specific to section type
}

// Interface for meeting notes document
export interface MeetingNotes {
  id: string;
  title: string;
  meetingId: string;
  spaceId?: string;
  templateId: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  status: 'draft' | 'published' | 'archived';
  sections: NotesSection[];
  sharedWith: string[]; // List of user IDs or emails
  tags?: string[];
}

// Interface for individual sections of meeting notes
export interface NotesSection {
  id: string;
  templateSectionId: string;
  title: string;
  type: string;
  content: any; // Varies based on section type
  updatedAt: string;
  updatedBy: string;
  order: number;
}

// Interface for action items from meeting
export interface ActionItem {
  id: string;
  title: string;
  description?: string;
  assignedTo: string[]; // User IDs
  dueDate?: string;
  status: 'pending' | 'in-progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high';
  meetingId: string;
  sectionId: string;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
}

// Factory function to create a new meeting template
export function createMeetingTemplate(
  name: string, 
  description: string, 
  createdBy: string, 
  isPublic: boolean = false,
  sections?: TemplateSectionDefinition[]
): MeetingTemplate {
  
  // Default sections if none provided
  const defaultSections: TemplateSectionDefinition[] = sections || [
    {
      id: uuidv4(),
      title: 'Agenda',
      description: 'Meeting agenda and topics to be discussed',
      type: 'agenda',
      required: true,
      order: 0,
      placeholder: 'Add agenda items for this meeting'
    },
    {
      id: uuidv4(),
      title: 'Participants',
      description: 'Meeting attendees',
      type: 'participants',
      required: true,
      order: 1,
      placeholder: 'Record who attended the meeting'
    },
    {
      id: uuidv4(),
      title: 'Discussion Notes',
      description: 'Notes from the discussion',
      type: 'notes',
      required: false,
      order: 2,
      placeholder: 'Record key discussion points'
    },
    {
      id: uuidv4(),
      title: 'Decisions Made',
      description: 'Key decisions from the meeting',
      type: 'decisions',
      required: false,
      order: 3,
      placeholder: 'Document important decisions'
    },
    {
      id: uuidv4(),
      title: 'Action Items',
      description: 'Tasks assigned during the meeting',
      type: 'action-items',
      required: true,
      order: 4,
      placeholder: 'Assign tasks with owners and deadlines'
    }
  ];
  
  return {
    id: uuidv4(),
    name,
    description,
    sections: defaultSections,
    createdAt: new Date().toISOString(),
    createdBy,
    isPublic,
    isDefault: false
  };
}

// Function to create empty meeting notes from a template
export function createMeetingNotes(
  title: string,
  meetingId: string,
  templateId: string,
  template: MeetingTemplate,
  createdBy: string,
  spaceId?: string
): MeetingNotes {
  
  // Create sections based on template
  const sections: NotesSection[] = template.sections.map(section => ({
    id: uuidv4(),
    templateSectionId: section.id,
    title: section.title,
    type: section.type,
    content: section.defaultContent || '',
    updatedAt: new Date().toISOString(),
    updatedBy: createdBy,
    order: section.order
  }));
  
  return {
    id: uuidv4(),
    title,
    meetingId,
    spaceId,
    templateId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy,
    status: 'draft',
    sections,
    sharedWith: []
  };
}

// Function to create a new action item
export function createActionItem(
  title: string,
  assignedTo: string[],
  meetingId: string,
  sectionId: string,
  createdBy: string,
  description?: string,
  dueDate?: string,
  priority: 'low' | 'medium' | 'high' = 'medium'
): ActionItem {
  return {
    id: uuidv4(),
    title,
    description,
    assignedTo,
    dueDate,
    status: 'pending',
    priority,
    meetingId,
    sectionId,
    createdAt: new Date().toISOString(),
    createdBy,
    updatedAt: new Date().toISOString()
  };
}
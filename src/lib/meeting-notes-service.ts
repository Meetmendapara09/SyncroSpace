import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  serverTimestamp, 
  arrayUnion, 
  arrayRemove,
  Timestamp,
  orderBy,
  limit
} from 'firebase/firestore';
import { db } from './firebase';
import { 
  MeetingTemplate, 
  MeetingNotes, 
  ActionItem, 
  createMeetingTemplate, 
  createMeetingNotes,
  createActionItem
} from './meeting-templates';
import { sendEmailNotification } from './email';

// Meeting templates service
export const MeetingTemplatesService = {
  // Get all templates accessible to a user (including defaults, personal and organization templates)
  async getTemplates(userId: string): Promise<MeetingTemplate[]> {
    try {
      // Query templates that are public OR created by the user
      const templatesQuery = query(
        collection(db, 'meetingTemplates'),
        where('isPublic', 'in', [true, userId])
      );
      const templatesSnapshot = await getDocs(templatesQuery);
      
      return templatesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as MeetingTemplate));
    } catch (error) {
      console.error('Error getting meeting templates:', error);
      throw error;
    }
  },
  
  // Get a single template by ID
  async getTemplate(templateId: string): Promise<MeetingTemplate | null> {
    try {
      const templateDoc = await getDoc(doc(db, 'meetingTemplates', templateId));
      
      if (!templateDoc.exists()) {
        return null;
      }
      
      return {
        id: templateDoc.id,
        ...templateDoc.data()
      } as MeetingTemplate;
    } catch (error) {
      console.error(`Error getting meeting template ${templateId}:`, error);
      throw error;
    }
  },
  
  // Create a new template
  async createTemplate(
    name: string, 
    description: string, 
    userId: string, 
    isPublic: boolean = false,
    sections?: any[]
  ): Promise<string> {
    try {
      const newTemplate = createMeetingTemplate(name, description, userId, isPublic, sections);
      
      await setDoc(doc(db, 'meetingTemplates', newTemplate.id), {
        ...newTemplate,
        createdAt: serverTimestamp()
      });
      
      return newTemplate.id;
    } catch (error) {
      console.error('Error creating meeting template:', error);
      throw error;
    }
  },
  
  // Update an existing template
  async updateTemplate(templateId: string, updates: Partial<MeetingTemplate>): Promise<void> {
    try {
      await updateDoc(doc(db, 'meetingTemplates', templateId), {
        ...updates,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error(`Error updating meeting template ${templateId}:`, error);
      throw error;
    }
  },
  
  // Delete a template
  async deleteTemplate(templateId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'meetingTemplates', templateId));
    } catch (error) {
      console.error(`Error deleting meeting template ${templateId}:`, error);
      throw error;
    }
  },
  
  // Ensure default templates exist in the database
  async ensureDefaultTemplates(userId: string): Promise<void> {
    try {
      const defaultTemplatesQuery = query(
        collection(db, 'meetingTemplates'),
        where('isDefault', '==', true)
      );
      const defaultTemplatesSnapshot = await getDocs(defaultTemplatesQuery);
      
      if (defaultTemplatesSnapshot.empty) {
        // Create default templates
        const standardMeetingTemplate = createMeetingTemplate(
          'Standard Meeting',
          'A general meeting template with agenda, notes, and action items',
          'system',
          true
        );
        standardMeetingTemplate.isDefault = true;
        
        // TODO: Add more default templates as needed
        
        await setDoc(doc(db, 'meetingTemplates', standardMeetingTemplate.id), {
          ...standardMeetingTemplate,
          createdAt: serverTimestamp()
        });
      }
    } catch (error) {
      console.error('Error ensuring default templates:', error);
      throw error;
    }
  }
};

// Meeting notes service
export const MeetingNotesService = {
  // Get meeting notes by meeting ID
  async getNotesByMeeting(meetingId: string): Promise<MeetingNotes | null> {
    try {
      const notesQuery = query(
        collection(db, 'meetingNotes'),
        where('meetingId', '==', meetingId),
        limit(1)
      );
      const notesSnapshot = await getDocs(notesQuery);
      
      if (notesSnapshot.empty) {
        return null;
      }
      
      return {
        id: notesSnapshot.docs[0].id,
        ...notesSnapshot.docs[0].data()
      } as MeetingNotes;
    } catch (error) {
      console.error(`Error getting meeting notes for meeting ${meetingId}:`, error);
      throw error;
    }
  },
  
  // Create new meeting notes
  async createNotes(
    title: string,
    meetingId: string,
    templateId: string,
    userId: string,
    spaceId?: string
  ): Promise<string> {
    try {
      // Get the template
      const template = await MeetingTemplatesService.getTemplate(templateId);
      
      if (!template) {
        throw new Error(`Template ${templateId} not found`);
      }
      
      // Create meeting notes
      const newNotes = createMeetingNotes(title, meetingId, templateId, template, userId, spaceId);
      
      await setDoc(doc(db, 'meetingNotes', newNotes.id), {
        ...newNotes,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      
      return newNotes.id;
    } catch (error) {
      console.error('Error creating meeting notes:', error);
      throw error;
    }
  },
  
  // Update meeting notes
  async updateNotes(notesId: string, updates: Partial<MeetingNotes>): Promise<void> {
    try {
      await updateDoc(doc(db, 'meetingNotes', notesId), {
        ...updates,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error(`Error updating meeting notes ${notesId}:`, error);
      throw error;
    }
  },
  
  // Update a specific section in the meeting notes
  async updateSection(notesId: string, sectionId: string, content: any, userId: string): Promise<void> {
    try {
      // Get the current notes
      const notesDoc = await getDoc(doc(db, 'meetingNotes', notesId));
      
      if (!notesDoc.exists()) {
        throw new Error(`Meeting notes ${notesId} not found`);
      }
      
      const notes = notesDoc.data() as MeetingNotes;
      const updatedSections = notes.sections.map(section => {
        if (section.id === sectionId) {
          return {
            ...section,
            content,
            updatedAt: new Date().toISOString(),
            updatedBy: userId
          };
        }
        return section;
      });
      
      await updateDoc(doc(db, 'meetingNotes', notesId), {
        sections: updatedSections,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error(`Error updating section ${sectionId} in meeting notes ${notesId}:`, error);
      throw error;
    }
  },
  
  // Share meeting notes with other users
  async shareNotes(notesId: string, userIds: string[]): Promise<void> {
    try {
      await updateDoc(doc(db, 'meetingNotes', notesId), {
        sharedWith: arrayUnion(...userIds),
        updatedAt: serverTimestamp()
      });
      
      // TODO: Send notifications to users
    } catch (error) {
      console.error(`Error sharing meeting notes ${notesId}:`, error);
      throw error;
    }
  },
  
  // Unshare meeting notes with users
  async unshareNotes(notesId: string, userIds: string[]): Promise<void> {
    try {
      await updateDoc(doc(db, 'meetingNotes', notesId), {
        sharedWith: arrayRemove(...userIds),
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error(`Error unsharing meeting notes ${notesId}:`, error);
      throw error;
    }
  }
};

// Action items service
export const ActionItemsService = {
  // Get action items by meeting ID
  async getActionItemsByMeeting(meetingId: string): Promise<ActionItem[]> {
    try {
      const actionItemsQuery = query(
        collection(db, 'actionItems'),
        where('meetingId', '==', meetingId),
        orderBy('createdAt', 'asc')
      );
      const actionItemsSnapshot = await getDocs(actionItemsQuery);
      
      return actionItemsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as ActionItem));
    } catch (error) {
      console.error(`Error getting action items for meeting ${meetingId}:`, error);
      throw error;
    }
  },
  
  // Get action items assigned to a specific user
  async getActionItemsForUser(userId: string, status?: string): Promise<ActionItem[]> {
    try {
      let actionItemsQuery;
      
      if (status) {
        actionItemsQuery = query(
          collection(db, 'actionItems'),
          where('assignedTo', 'array-contains', userId),
          where('status', '==', status),
          orderBy('dueDate', 'asc')
        );
      } else {
        actionItemsQuery = query(
          collection(db, 'actionItems'),
          where('assignedTo', 'array-contains', userId),
          orderBy('dueDate', 'asc')
        );
      }
      
      const actionItemsSnapshot = await getDocs(actionItemsQuery);
      
      return actionItemsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as ActionItem));
    } catch (error) {
      console.error(`Error getting action items for user ${userId}:`, error);
      throw error;
    }
  },
  
  // Create a new action item
  async createActionItem(
    title: string,
    assignedTo: string[],
    meetingId: string,
    sectionId: string,
    createdBy: string,
    description?: string,
    dueDate?: string,
    priority: 'low' | 'medium' | 'high' = 'medium'
  ): Promise<string> {
    try {
      const newActionItem = createActionItem(
        title, 
        assignedTo, 
        meetingId, 
        sectionId, 
        createdBy, 
        description, 
        dueDate, 
        priority
      );
      
      await setDoc(doc(db, 'actionItems', newActionItem.id), {
        ...newActionItem,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      
      // Send notifications to assigned users
      // TODO: Implement notification system
      
      return newActionItem.id;
    } catch (error) {
      console.error('Error creating action item:', error);
      throw error;
    }
  },
  
  // Update an action item
  async updateActionItem(actionItemId: string, updates: Partial<ActionItem>): Promise<void> {
    try {
      await updateDoc(doc(db, 'actionItems', actionItemId), {
        ...updates,
        updatedAt: serverTimestamp()
      });
      
      // If status was updated to completed, send notifications
      if (updates.status === 'completed') {
        // TODO: Implement notification system
      }
    } catch (error) {
      console.error(`Error updating action item ${actionItemId}:`, error);
      throw error;
    }
  },
  
  // Delete an action item
  async deleteActionItem(actionItemId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'actionItems', actionItemId));
    } catch (error) {
      console.error(`Error deleting action item ${actionItemId}:`, error);
      throw error;
    }
  },
  
  // Check for overdue action items and send reminders
  async checkOverdueActionItems(): Promise<void> {
    try {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      
      // Get action items that are due today or earlier and not completed
      const overdueQuery = query(
        collection(db, 'actionItems'),
        where('status', 'in', ['pending', 'in-progress']),
        where('dueDate', '<=', today)
      );
      
      const overdueSnapshot = await getDocs(overdueQuery);
      
      if (overdueSnapshot.empty) {
        return;
      }
      
      // Process overdue items
      const overdueItems = overdueSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as ActionItem));
      
      // Send reminders
      // TODO: Implement reminder email templates
      
      console.log(`Found ${overdueItems.length} overdue action items`);
    } catch (error) {
      console.error('Error checking overdue action items:', error);
      throw error;
    }
  }
};
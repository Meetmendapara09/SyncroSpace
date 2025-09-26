import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  limit,
  orderBy,
  startAfter,
  serverTimestamp,
  Timestamp,
  addDoc,
  runTransaction,
  writeBatch
} from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';
import { 
  Team, 
  TeamCreateInput, 
  TeamUpdateInput 
} from '../../models/team/Team';
import { 
  TeamRole, 
  TeamMember, 
  DEFAULT_TEAM_ROLES,
  CreateRoleInput,
  AddMemberInput
} from '../../models/team/TeamMember';
import { v4 as uuidv4 } from 'uuid';

/**
 * Team Service
 * Handles CRUD operations for teams and members
 */
class TeamService {
  /**
   * Create a new team
   * @param userId Creator's user ID
   * @param input Team creation input
   * @returns Created team
   */
  async createTeam(userId: string, input: TeamCreateInput): Promise<Team> {
    try {
      // Generate team ID
      const teamId = `team_${uuidv4()}`;
      const teamDocRef = doc(db, 'teams', teamId);
      
      const now = Timestamp.now();
      
      // Create team document
      const team: Team = {
        id: teamId,
        name: input.name,
        description: input.description,
        avatarUrl: input.avatarUrl,
        createdAt: now,
        createdBy: userId,
        updatedAt: now,
        isPrivate: input.isPrivate,
        organizationId: input.organizationId,
        settings: {
          allowMemberInvites: true,
          approvalRequired: true,
          defaultRoleId: '', // Will be set after creating roles
          calendarSettings: {
            defaultVisibility: 'members',
            allowExternalCalendarSync: true,
          },
          communicationSettings: {
            allowExternalMessages: false,
            notificationDefaults: {
              announcements: true,
              events: true,
              fileChanges: true,
              taskAssignments: true,
              taskUpdates: true,
              goalUpdates: true,
              resourceAllocation: true,
              membershipChanges: true,
            },
          },
          fileSettings: {
            storageQuota: 5 * 1024 * 1024 * 1024, // 5GB default quota
            allowedFileTypes: ['*'],
            maximumFileSize: 100 * 1024 * 1024, // 100MB default max file size
          },
          resourceSettings: {
            trackResourceUsage: true,
            resourceCategories: [],
          },
          ...input.settings,
        },
      };
      
      // Use a batch write to create the team, roles, and creator membership
      const batch = writeBatch(db);
      
      // Add team document to batch
      batch.set(teamDocRef, team);
      
      // Create default roles for the team
      const createdRoleIds: string[] = [];
      
      for (const roleTemplate of DEFAULT_TEAM_ROLES) {
        const roleId = `role_${uuidv4()}`;
        const roleDocRef = doc(db, 'teamRoles', roleId);
        
        const role: TeamRole = {
          id: roleId,
          teamId,
          name: roleTemplate.name,
          description: roleTemplate.description,
          createdAt: now,
          updatedAt: now,
          isDefault: roleTemplate.isDefault,
          isAdmin: roleTemplate.isAdmin,
          permissions: roleTemplate.permissions,
        };
        
        batch.set(roleDocRef, role);
        createdRoleIds.push(roleId);
        
        // Set the team's default role ID
        if (role.isDefault) {
          team.settings.defaultRoleId = roleId;
        }
        
        // Use the admin role for the creator
        if (role.isAdmin) {
          // Create membership for the creator
          const membershipId = `${teamId}_${userId}`;
          const memberDocRef = doc(db, 'teamMembers', membershipId);
          
          const member: TeamMember = {
            id: membershipId,
            teamId,
            userId,
            displayName: '', // Will be filled from user profile
            joinedAt: now,
            roleId,
            status: 'active',
            notificationSettings: {
              announcements: true,
              events: true,
              fileChanges: true,
              taskAssignments: true,
              taskUpdates: true,
              goalUpdates: true,
              resourceAllocation: true,
              membershipChanges: true,
              emailNotifications: true,
              pushNotifications: true,
            },
          };
          
          batch.set(memberDocRef, member);
        }
      }
      
      // Update team document with defaultRoleId
      batch.update(teamDocRef, { 
        'settings.defaultRoleId': team.settings.defaultRoleId 
      });
      
      // Commit the batch
      await batch.commit();
      
      return team;
    } catch (error) {
      console.error('Error creating team:', error);
      throw error;
    }
  }

  /**
   * Get a team by ID
   * @param teamId Team ID
   * @returns Team or null if not found
   */
  async getTeam(teamId: string): Promise<Team | null> {
    try {
      const teamDocRef = doc(db, 'teams', teamId);
      const teamDoc = await getDoc(teamDocRef);
      
      if (!teamDoc.exists()) {
        return null;
      }
      
      return teamDoc.data() as Team;
    } catch (error) {
      console.error('Error getting team:', error);
      throw error;
    }
  }

  /**
   * Update a team
   * @param teamId Team ID
   * @param input Team update input
   * @returns Updated team
   */
  async updateTeam(
    teamId: string,
    input: TeamUpdateInput
  ): Promise<Team> {
    try {
      const teamDocRef = doc(db, 'teams', teamId);
      const teamDoc = await getDoc(teamDocRef);
      
      if (!teamDoc.exists()) {
        throw new Error(`Team with ID ${teamId} not found`);
      }
      
      const team = teamDoc.data() as Team;
      
      // Prepare update data
      const updateData: Partial<Team> = {
        updatedAt: Timestamp.now(),
      };
      
      if (input.name !== undefined) updateData.name = input.name;
      if (input.description !== undefined) updateData.description = input.description;
      if (input.avatarUrl !== undefined) updateData.avatarUrl = input.avatarUrl;
      if (input.isPrivate !== undefined) updateData.isPrivate = input.isPrivate;
      
      // Update settings if provided
      if (input.settings) {
        // Merge settings
        updateData.settings = {
          ...team.settings,
          ...input.settings,
          // Merge nested settings if provided
          calendarSettings: input.settings.calendarSettings 
            ? { ...team.settings.calendarSettings, ...input.settings.calendarSettings } 
            : team.settings.calendarSettings,
          communicationSettings: input.settings.communicationSettings 
            ? { ...team.settings.communicationSettings, ...input.settings.communicationSettings } 
            : team.settings.communicationSettings,
          fileSettings: input.settings.fileSettings 
            ? { ...team.settings.fileSettings, ...input.settings.fileSettings } 
            : team.settings.fileSettings,
          resourceSettings: input.settings.resourceSettings 
            ? { ...team.settings.resourceSettings, ...input.settings.resourceSettings } 
            : team.settings.resourceSettings,
        };
      }
      
      // Update metadata if provided
      if (input.metadata) {
        updateData.metadata = {
          ...team.metadata,
          ...input.metadata,
        };
      }
      
      // Update team document
      await updateDoc(teamDocRef, updateData);
      
      // Return updated team
      return {
        ...team,
        ...updateData,
      } as Team;
    } catch (error) {
      console.error('Error updating team:', error);
      throw error;
    }
  }

  /**
   * Delete a team
   * @param teamId Team ID
   */
  async deleteTeam(teamId: string): Promise<void> {
    try {
      // Deleting a team is a complex operation that should clean up all related resources
      await runTransaction(db, async (transaction) => {
        // Get all team roles
        const rolesQuery = query(
          collection(db, 'teamRoles'),
          where('teamId', '==', teamId)
        );
        const roleSnapshot = await getDocs(rolesQuery);
        
        // Get all team members
        const membersQuery = query(
          collection(db, 'teamMembers'),
          where('teamId', '==', teamId)
        );
        const memberSnapshot = await getDocs(membersQuery);
        
        // Delete team document
        const teamDocRef = doc(db, 'teams', teamId);
        transaction.delete(teamDocRef);
        
        // Delete all roles
        roleSnapshot.forEach((roleDoc) => {
          transaction.delete(roleDoc.ref);
        });
        
        // Delete all members
        memberSnapshot.forEach((memberDoc) => {
          transaction.delete(memberDoc.ref);
        });
        
        // Note: In a real implementation, you would also delete or mark as deleted:
        // - Team channels and messages
        // - Team files and folders
        // - Team tasks and boards
        // - Team calendar events
        // - Team goals
        // - Team resources and allocations
        // - Team analytics
        // - Team onboarding processes
      });
    } catch (error) {
      console.error('Error deleting team:', error);
      throw error;
    }
  }

  /**
   * Get teams where user is a member
   * @param userId User ID
   * @param options Query options
   * @returns Array of teams
   */
  async getUserTeams(
    userId: string,
    options: {
      limit?: number;
      lastTeamId?: string;
      includeArchived?: boolean;
    } = {}
  ): Promise<Team[]> {
    try {
      // Get user's memberships
      const membershipQuery = query(
        collection(db, 'teamMembers'),
        where('userId', '==', userId),
        where('status', '==', 'active')
      );
      
      const membershipSnapshot = await getDocs(membershipQuery);
      
      if (membershipSnapshot.empty) {
        return [];
      }
      
      // Extract team IDs
      const teamIds = membershipSnapshot.docs.map(
        (doc) => (doc.data() as TeamMember).teamId
      );
      
      // Get teams in batches to avoid limitations
      const teams: Team[] = [];
      const batchSize = 10;
      
      for (let i = 0; i < teamIds.length; i += batchSize) {
        const batchIds = teamIds.slice(i, i + batchSize);
        
        let teamsQuery = query(
          collection(db, 'teams'),
          where('id', 'in', batchIds)
        );
        
        const teamsSnapshot = await getDocs(teamsQuery);
        
        teamsSnapshot.forEach((doc) => {
          teams.push(doc.data() as Team);
        });
      }
      
      // Apply sorting, pagination if needed
      const sortedTeams = teams
        .sort((a, b) => a.name.localeCompare(b.name))
        .slice(0, options.limit || teams.length);
      
      return sortedTeams;
    } catch (error) {
      console.error('Error getting user teams:', error);
      throw error;
    }
  }

  /**
   * Find teams by name or description
   * @param searchTerm Search term
   * @param options Query options
   * @returns Array of teams
   */
  async searchTeams(
    searchTerm: string,
    options: {
      limit?: number;
      offset?: number;
      organizationId?: string;
      includePrivate?: boolean;
    } = {}
  ): Promise<Team[]> {
    try {
      // Note: Firestore doesn't support full-text search
      // In a real implementation, you would use a service like Algolia or Elasticsearch
      // For this demo, we'll simulate a basic search by fetching teams and filtering
      
      let teamsQuery = query(
        collection(db, 'teams'),
        where('isPrivate', '==', false)
      );
      
      if (options.organizationId) {
        teamsQuery = query(
          collection(db, 'teams'),
          where('organizationId', '==', options.organizationId),
          where('isPrivate', '==', false)
        );
      }
      
      const teamsSnapshot = await getDocs(teamsQuery);
      
      if (teamsSnapshot.empty) {
        return [];
      }
      
      const searchTermLower = searchTerm.toLowerCase();
      
      // Filter teams by name or description
      const teams = teamsSnapshot.docs
        .map((doc) => doc.data() as Team)
        .filter((team) => 
          team.name.toLowerCase().includes(searchTermLower) ||
          team.description.toLowerCase().includes(searchTermLower)
        )
        .sort((a, b) => a.name.localeCompare(b.name))
        .slice(options.offset || 0, (options.offset || 0) + (options.limit || 10));
      
      return teams;
    } catch (error) {
      console.error('Error searching teams:', error);
      throw error;
    }
  }

  /**
   * Create a team role
   * @param teamId Team ID
   * @param input Role creation input
   * @returns Created role
   */
  async createRole(
    teamId: string,
    input: CreateRoleInput
  ): Promise<TeamRole> {
    try {
      const roleId = `role_${uuidv4()}`;
      const roleDocRef = doc(db, 'teamRoles', roleId);
      
      const now = Timestamp.now();
      
      const role: TeamRole = {
        id: roleId,
        teamId,
        name: input.name,
        description: input.description || '',
        createdAt: now,
        updatedAt: now,
        isDefault: input.isDefault || false,
        isAdmin: false, // Only one admin role per team
        permissions: {
          // Default permissions (deny-by-default)
          manageTeamSettings: false,
          manageTeamMembers: false,
          manageTeamRoles: false,
          viewResources: true,
          editResources: false,
          allocateResources: false,
          manageChannels: false,
          postAnnouncements: false,
          manageExternalAccess: false,
          viewCalendar: true,
          createEvents: false,
          editAllEvents: false,
          viewFiles: true,
          uploadFiles: false,
          editFiles: false,
          deleteFiles: false,
          viewTasks: true,
          createTasks: false,
          assignTasks: false,
          editAllTasks: false,
          viewGoals: true,
          createGoals: false,
          editGoals: false,
          viewAnalytics: false,
          exportAnalytics: false,
          
          // Apply custom permissions
          ...input.permissions,
        },
      };
      
      // Use a transaction to handle default role updates
      await runTransaction(db, async (transaction) => {
        // If this is a default role, update any existing default role
        if (role.isDefault) {
          const rolesQuery = query(
            collection(db, 'teamRoles'),
            where('teamId', '==', teamId),
            where('isDefault', '==', true)
          );
          
          const roleSnapshot = await getDocs(rolesQuery);
          
          roleSnapshot.forEach((doc) => {
            transaction.update(doc.ref, { isDefault: false });
          });
          
          // Update team default role ID
          const teamDocRef = doc(db, 'teams', teamId);
          transaction.update(teamDocRef, { 
            'settings.defaultRoleId': roleId,
            updatedAt: now
          });
        }
        
        // Create the new role
        transaction.set(roleDocRef, role);
      });
      
      return role;
    } catch (error) {
      console.error('Error creating role:', error);
      throw error;
    }
  }

  /**
   * Get all roles for a team
   * @param teamId Team ID
   * @returns Array of roles
   */
  async getTeamRoles(teamId: string): Promise<TeamRole[]> {
    try {
      const rolesQuery = query(
        collection(db, 'teamRoles'),
        where('teamId', '==', teamId)
      );
      
      const roleSnapshot = await getDocs(rolesQuery);
      
      if (roleSnapshot.empty) {
        return [];
      }
      
      return roleSnapshot.docs.map((doc) => doc.data() as TeamRole);
    } catch (error) {
      console.error('Error getting team roles:', error);
      throw error;
    }
  }

  /**
   * Update a team role
   * @param roleId Role ID
   * @param input Role update input
   * @returns Updated role
   */
  async updateRole(
    roleId: string,
    input: Partial<CreateRoleInput>
  ): Promise<TeamRole> {
    try {
      const roleDocRef = doc(db, 'teamRoles', roleId);
      const roleDoc = await getDoc(roleDocRef);
      
      if (!roleDoc.exists()) {
        throw new Error(`Role with ID ${roleId} not found`);
      }
      
      const role = roleDoc.data() as TeamRole;
      const now = Timestamp.now();
      
      // Prepare update data
      const updateData: Partial<TeamRole> = {
        updatedAt: now,
      };
      
      if (input.name !== undefined) updateData.name = input.name;
      if (input.description !== undefined) updateData.description = input.description;
      
      // Handle default role status
      if (input.isDefault !== undefined && input.isDefault !== role.isDefault) {
        updateData.isDefault = input.isDefault;
        
        // If making this role default, update team and other roles
        if (input.isDefault) {
          await runTransaction(db, async (transaction) => {
            // Update this role
            transaction.update(roleDocRef, updateData);
            
            // Update other default roles
            const rolesQuery = query(
              collection(db, 'teamRoles'),
              where('teamId', '==', role.teamId),
              where('isDefault', '==', true),
              where('id', '!=', roleId)
            );
            
            const roleSnapshot = await getDocs(rolesQuery);
            
            roleSnapshot.forEach((doc) => {
              transaction.update(doc.ref, { isDefault: false });
            });
            
            // Update team default role ID
            const teamDocRef = doc(db, 'teams', role.teamId);
            transaction.update(teamDocRef, { 
              'settings.defaultRoleId': roleId,
              updatedAt: now
            });
          });
          
          // Skip the regular update since we did it in transaction
          return {
            ...role,
            ...updateData,
            isDefault: true,
          } as TeamRole;
        }
      }
      
      // Update permissions if provided
      if (input.permissions) {
        updateData.permissions = {
          ...role.permissions,
          ...input.permissions,
        };
      }
      
      // Update role document (if not already updated in transaction)
      await updateDoc(roleDocRef, updateData);
      
      // Return updated role
      return {
        ...role,
        ...updateData,
      } as TeamRole;
    } catch (error) {
      console.error('Error updating role:', error);
      throw error;
    }
  }

  /**
   * Delete a team role
   * @param roleId Role ID
   */
  async deleteRole(roleId: string): Promise<void> {
    try {
      const roleDocRef = doc(db, 'teamRoles', roleId);
      const roleDoc = await getDoc(roleDocRef);
      
      if (!roleDoc.exists()) {
        throw new Error(`Role with ID ${roleId} not found`);
      }
      
      const role = roleDoc.data() as TeamRole;
      
      // Prevent deletion of the admin role
      if (role.isAdmin) {
        throw new Error('Cannot delete the admin role');
      }
      
      // Prevent deletion of the default role
      if (role.isDefault) {
        throw new Error('Cannot delete the default role');
      }
      
      // Check if there are members with this role
      const membersQuery = query(
        collection(db, 'teamMembers'),
        where('teamId', '==', role.teamId),
        where('roleId', '==', roleId),
        where('status', '==', 'active'),
        limit(1)
      );
      
      const memberSnapshot = await getDocs(membersQuery);
      
      if (!memberSnapshot.empty) {
        throw new Error('Cannot delete role with active members');
      }
      
      // Delete the role
      await deleteDoc(roleDocRef);
    } catch (error) {
      console.error('Error deleting role:', error);
      throw error;
    }
  }

  /**
   * Add a member to a team
   * @param teamId Team ID
   * @param input Member addition input
   * @returns Created member
   */
  async addMember(
    teamId: string,
    input: AddMemberInput
  ): Promise<TeamMember> {
    try {
      // Check if user exists
      const userDocRef = doc(db, 'users', input.userId);
      const userDoc = await getDoc(userDocRef);
      
      if (!userDoc.exists()) {
        throw new Error(`User with ID ${input.userId} not found`);
      }
      
      const userData = userDoc.data();
      
      // Check if role exists
      const roleDocRef = doc(db, 'teamRoles', input.roleId);
      const roleDoc = await getDoc(roleDocRef);
      
      if (!roleDoc.exists()) {
        throw new Error(`Role with ID ${input.roleId} not found`);
      }
      
      const role = roleDoc.data() as TeamRole;
      
      // Make sure role is for this team
      if (role.teamId !== teamId) {
        throw new Error(`Role with ID ${input.roleId} is not for team ${teamId}`);
      }
      
      // Check if user is already a member
      const membershipId = `${teamId}_${input.userId}`;
      const memberDocRef = doc(db, 'teamMembers', membershipId);
      const memberDoc = await getDoc(memberDocRef);
      
      if (memberDoc.exists()) {
        const member = memberDoc.data() as TeamMember;
        
        // If already active, just return the member
        if (member.status === 'active') {
          return member;
        }
        
        // If invited or pending, update to active
        const updateData = {
          status: 'active',
          roleId: input.roleId,
          joinedAt: Timestamp.now(),
        };
        
        await updateDoc(memberDocRef, updateData);
        
        return {
          ...member,
          ...updateData,
        } as TeamMember;
      }
      
      // Create new member
      const now = Timestamp.now();
      
      const member: TeamMember = {
        id: membershipId,
        teamId,
        userId: input.userId,
        displayName: input.displayName || userData.displayName,
        avatarUrl: userData.photoURL,
        joinedAt: now,
        roleId: input.roleId,
        status: 'active',
        notificationSettings: {
          announcements: true,
          events: true,
          fileChanges: true,
          taskAssignments: true,
          taskUpdates: true,
          goalUpdates: true,
          resourceAllocation: true,
          membershipChanges: true,
          emailNotifications: true,
          pushNotifications: true,
        },
        metadata: input.metadata,
      };
      
      await setDoc(memberDocRef, member);
      
      // Update user's teamIds array
      await updateDoc(userDocRef, {
        teamIds: [...(userData.teamIds || []), teamId]
      });
      
      return member;
    } catch (error) {
      console.error('Error adding member:', error);
      throw error;
    }
  }

  /**
   * Get all members of a team
   * @param teamId Team ID
   * @param options Query options
   * @returns Array of members
   */
  async getTeamMembers(
    teamId: string,
    options: {
      limit?: number;
      offset?: number;
      status?: 'active' | 'inactive' | 'invited' | 'pending_approval';
    } = {}
  ): Promise<TeamMember[]> {
    try {
      let membersQuery: any;
      
      if (options.status) {
        membersQuery = query(
          collection(db, 'teamMembers'),
          where('teamId', '==', teamId),
          where('status', '==', options.status),
          orderBy('displayName')
        );
      } else {
        membersQuery = query(
          collection(db, 'teamMembers'),
          where('teamId', '==', teamId),
          orderBy('displayName')
        );
      }
      
      const memberSnapshot = await getDocs(membersQuery);
      
      if (memberSnapshot.empty) {
        return [];
      }
      
      // Apply pagination if needed
      let members = memberSnapshot.docs.map((doc) => doc.data() as TeamMember);
      
      if (options.offset || options.limit) {
        const offset = options.offset || 0;
        const limit = options.limit || members.length;
        members = members.slice(offset, offset + limit);
      }
      
      return members;
    } catch (error) {
      console.error('Error getting team members:', error);
      throw error;
    }
  }

  /**
   * Update a team member
   * @param teamId Team ID
   * @param userId User ID
   * @param updates Member updates
   * @returns Updated member
   */
  async updateMember(
    teamId: string,
    userId: string,
    updates: {
      roleId?: string;
      displayName?: string;
      status?: 'active' | 'inactive';
      notificationSettings?: Partial<TeamMember['notificationSettings']>;
      metadata?: Record<string, any>;
    }
  ): Promise<TeamMember> {
    try {
      const membershipId = `${teamId}_${userId}`;
      const memberDocRef = doc(db, 'teamMembers', membershipId);
      const memberDoc = await getDoc(memberDocRef);
      
      if (!memberDoc.exists()) {
        throw new Error(`Member ${userId} not found in team ${teamId}`);
      }
      
      const member = memberDoc.data() as TeamMember;
      
      // Prepare update data
      const updateData: Partial<TeamMember> = {};
      
      // Validate role if provided
      if (updates.roleId) {
        const roleDocRef = doc(db, 'teamRoles', updates.roleId);
        const roleDoc = await getDoc(roleDocRef);
        
        if (!roleDoc.exists()) {
          throw new Error(`Role with ID ${updates.roleId} not found`);
        }
        
        const role = roleDoc.data() as TeamRole;
        
        if (role.teamId !== teamId) {
          throw new Error(`Role with ID ${updates.roleId} is not for team ${teamId}`);
        }
        
        updateData.roleId = updates.roleId;
      }
      
      if (updates.displayName !== undefined) updateData.displayName = updates.displayName;
      if (updates.status !== undefined) updateData.status = updates.status;
      
      // Update notification settings if provided
      if (updates.notificationSettings) {
        updateData.notificationSettings = {
          ...member.notificationSettings,
          ...updates.notificationSettings,
        };
      }
      
      // Update metadata if provided
      if (updates.metadata) {
        updateData.metadata = {
          ...member.metadata,
          ...updates.metadata,
        };
      }
      
      // Update member document
      await updateDoc(memberDocRef, updateData);
      
      // If status changed to inactive, update user's teamIds array
      if (updates.status === 'inactive' && member.status === 'active') {
        const userDocRef = doc(db, 'users', userId);
        const userDoc = await getDoc(userDocRef);
        
        if (userDoc.exists()) {
          const userData = userDoc.data();
          const teamIds = (userData.teamIds || []).filter((id: string) => id !== teamId);
          await updateDoc(userDocRef, { teamIds });
        }
      }
      
      // Return updated member
      return {
        ...member,
        ...updateData,
      } as TeamMember;
    } catch (error) {
      console.error('Error updating member:', error);
      throw error;
    }
  }

  /**
   * Remove a member from a team
   * @param teamId Team ID
   * @param userId User ID
   */
  async removeMember(teamId: string, userId: string): Promise<void> {
    try {
      const membershipId = `${teamId}_${userId}`;
      const memberDocRef = doc(db, 'teamMembers', membershipId);
      const memberDoc = await getDoc(memberDocRef);
      
      if (!memberDoc.exists()) {
        throw new Error(`Member ${userId} not found in team ${teamId}`);
      }
      
      const member = memberDoc.data() as TeamMember;
      
      // Don't allow removing the last admin
      if (member.status === 'active') {
        const roleDocRef = doc(db, 'teamRoles', member.roleId);
        const roleDoc = await getDoc(roleDocRef);
        
        if (roleDoc.exists()) {
          const role = roleDoc.data() as TeamRole;
          
          if (role.isAdmin) {
            // Check if this is the last admin
            const adminsQuery = query(
              collection(db, 'teamMembers'),
              where('teamId', '==', teamId),
              where('status', '==', 'active'),
              where('roleId', '==', member.roleId),
              limit(2)
            );
            
            const adminSnapshot = await getDocs(adminsQuery);
            
            if (adminSnapshot.size === 1) {
              throw new Error('Cannot remove the last admin from a team');
            }
          }
        }
      }
      
      // Set member to inactive instead of deleting
      await updateDoc(memberDocRef, {
        status: 'inactive',
      });
      
      // Remove team from user's teamIds array
      const userDocRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userDocRef);
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const teamIds = (userData.teamIds || []).filter((id: string) => id !== teamId);
        await updateDoc(userDocRef, { teamIds });
      }
    } catch (error) {
      console.error('Error removing member:', error);
      throw error;
    }
  }

  /**
   * Invite a user to a team
   * @param teamId Team ID
   * @param inviterUserId User ID of the inviter
   * @param email Email of the invitee
   * @param roleId Role ID for the invitee
   * @returns Created invitation
   */
  async inviteMember(
    teamId: string,
    inviterUserId: string,
    email: string,
    roleId: string
  ): Promise<TeamMember> {
    try {
      // Check if the role exists and is for this team
      const roleDocRef = doc(db, 'teamRoles', roleId);
      const roleDoc = await getDoc(roleDocRef);
      
      if (!roleDoc.exists()) {
        throw new Error(`Role with ID ${roleId} not found`);
      }
      
      const role = roleDoc.data() as TeamRole;
      
      if (role.teamId !== teamId) {
        throw new Error(`Role with ID ${roleId} is not for team ${teamId}`);
      }
      
      // Find user by email
      const usersQuery = query(
        collection(db, 'users'),
        where('email', '==', email),
        limit(1)
      );
      
      const userSnapshot = await getDocs(usersQuery);
      
      if (userSnapshot.empty) {
        throw new Error(`User with email ${email} not found`);
      }
      
      const userDoc = userSnapshot.docs[0];
      const userData = userDoc.data();
      
      // Check if already a member
      const membershipId = `${teamId}_${userDoc.id}`;
      const memberDocRef = doc(db, 'teamMembers', membershipId);
      const memberDoc = await getDoc(memberDocRef);
      
      if (memberDoc.exists()) {
        const existingMember = memberDoc.data() as TeamMember;
        
        if (existingMember.status === 'active') {
          throw new Error(`User with email ${email} is already a member of this team`);
        }
        
        if (existingMember.status === 'invited') {
          // Already invited, just return the existing invitation
          return existingMember;
        }
      }
      
      // Create or update member document with invited status
      const now = Timestamp.now();
      
      const member: TeamMember = {
        id: membershipId,
        teamId,
        userId: userDoc.id,
        displayName: userData.displayName,
        avatarUrl: userData.photoURL,
        joinedAt: now,
        roleId,
        status: 'invited',
        invitedBy: inviterUserId,
        notificationSettings: {
          announcements: true,
          events: true,
          fileChanges: true,
          taskAssignments: true,
          taskUpdates: true,
          goalUpdates: true,
          resourceAllocation: true,
          membershipChanges: true,
          emailNotifications: true,
          pushNotifications: true,
        },
      };
      
      await setDoc(memberDocRef, member);
      
      // In a real implementation, send an email notification here
      
      return member;
    } catch (error) {
      console.error('Error inviting member:', error);
      throw error;
    }
  }
}

export const teamService = new TeamService();
export default teamService;
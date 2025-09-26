import { 
  doc, 
  getDoc, 
  collection, 
  query, 
  where, 
  getDocs 
} from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';
import { TeamMember, TeamRole, TeamPermissions } from '../../models/team';

/**
 * Permission Service
 * Handles role-based access control for teams
 */
class PermissionService {
  /**
   * Check if user has specific permission in a team
   * @param userId User ID
   * @param teamId Team ID
   * @param permission Permission to check
   * @returns Whether user has the permission
   */
  async hasPermission(
    userId: string,
    teamId: string,
    permission: keyof TeamPermissions
  ): Promise<boolean> {
    try {
      // Get team member
      const memberQuery = query(
        collection(db, 'teamMembers'),
        where('teamId', '==', teamId),
        where('userId', '==', userId),
        where('status', '==', 'active')
      );
      
      const memberSnapshot = await getDocs(memberQuery);
      
      if (memberSnapshot.empty) {
        return false; // User is not a member of the team
      }
      
      const memberDoc = memberSnapshot.docs[0];
      const member = memberDoc.data() as TeamMember;
      
      // Get role
      const roleDoc = await getDoc(doc(db, 'teamRoles', member.roleId));
      
      if (!roleDoc.exists()) {
        return false; // Role doesn't exist
      }
      
      const role = roleDoc.data() as TeamRole;
      
      // Admin role has all permissions
      if (role.isAdmin) {
        return true;
      }
      
      // Check specific permission
      return role.permissions[permission] === true;
    } catch (error) {
      console.error(`Error checking permission ${permission}:`, error);
      return false;
    }
  }

  /**
   * Get user's permissions in a team
   * @param userId User ID
   * @param teamId Team ID
   * @returns User's permissions or null if not a member
   */
  async getUserPermissions(
    userId: string,
    teamId: string
  ): Promise<TeamPermissions | null> {
    try {
      // Get team member
      const memberQuery = query(
        collection(db, 'teamMembers'),
        where('teamId', '==', teamId),
        where('userId', '==', userId),
        where('status', '==', 'active')
      );
      
      const memberSnapshot = await getDocs(memberQuery);
      
      if (memberSnapshot.empty) {
        return null; // User is not a member of the team
      }
      
      const memberDoc = memberSnapshot.docs[0];
      const member = memberDoc.data() as TeamMember;
      
      // Get role
      const roleDoc = await getDoc(doc(db, 'teamRoles', member.roleId));
      
      if (!roleDoc.exists()) {
        return null; // Role doesn't exist
      }
      
      const role = roleDoc.data() as TeamRole;
      
      return role.permissions;
    } catch (error) {
      console.error('Error getting user permissions:', error);
      throw error;
    }
  }

  /**
   * Check if user is a team admin
   * @param userId User ID
   * @param teamId Team ID
   * @returns Whether user is a team admin
   */
  async isTeamAdmin(userId: string, teamId: string): Promise<boolean> {
    try {
      // Get team member
      const memberQuery = query(
        collection(db, 'teamMembers'),
        where('teamId', '==', teamId),
        where('userId', '==', userId),
        where('status', '==', 'active')
      );
      
      const memberSnapshot = await getDocs(memberQuery);
      
      if (memberSnapshot.empty) {
        return false; // User is not a member of the team
      }
      
      const memberDoc = memberSnapshot.docs[0];
      const member = memberDoc.data() as TeamMember;
      
      // Get role
      const roleDoc = await getDoc(doc(db, 'teamRoles', member.roleId));
      
      if (!roleDoc.exists()) {
        return false; // Role doesn't exist
      }
      
      const role = roleDoc.data() as TeamRole;
      
      return role.isAdmin;
    } catch (error) {
      console.error('Error checking admin status:', error);
      return false;
    }
  }

  /**
   * Check if a user can access a resource
   * @param userId User ID
   * @param resourceType Type of resource (e.g., 'file', 'task')
   * @param resourceId Resource ID
   * @param requiredPermission Permission required
   * @returns Whether user has access
   */
  async canAccessResource(
    userId: string,
    resourceType: string,
    resourceId: string,
    requiredPermission: string
  ): Promise<boolean> {
    try {
      // Get resource document to find its team
      const resourceDoc = await getDoc(doc(db, resourceType + 's', resourceId));
      
      if (!resourceDoc.exists()) {
        return false; // Resource doesn't exist
      }
      
      const resource = resourceDoc.data();
      const teamId = resource.teamId;
      
      // Map resource types to required permissions
      const permissionMap: Record<string, Record<string, keyof TeamPermissions>> = {
        file: {
          view: 'viewFiles',
          edit: 'editFiles',
          delete: 'deleteFiles',
        },
        task: {
          view: 'viewTasks',
          edit: 'editAllTasks',
          delete: 'editAllTasks',
        },
        event: {
          view: 'viewCalendar',
          edit: 'editAllEvents',
          delete: 'editAllEvents',
        },
        channel: {
          view: 'viewResources',
          edit: 'manageChannels',
          delete: 'manageChannels',
        },
        resource: {
          view: 'viewResources',
          edit: 'editResources',
          delete: 'editResources',
        },
      };
      
      // Get permission key
      const permissionKey = permissionMap[resourceType]?.[requiredPermission];
      
      if (!permissionKey) {
        return false; // Unknown resource type or permission
      }
      
      return this.hasPermission(userId, teamId, permissionKey);
    } catch (error) {
      console.error('Error checking resource access:', error);
      return false;
    }
  }

  /**
   * Get users with specific permission in a team
   * @param teamId Team ID
   * @param permission Permission to check
   * @returns Array of user IDs
   */
  async getUsersWithPermission(
    teamId: string,
    permission: keyof TeamPermissions
  ): Promise<string[]> {
    try {
      // Get all active team members
      const memberQuery = query(
        collection(db, 'teamMembers'),
        where('teamId', '==', teamId),
        where('status', '==', 'active')
      );
      
      const memberSnapshot = await getDocs(memberQuery);
      
      if (memberSnapshot.empty) {
        return []; // No team members
      }
      
      // Get all roles to check permissions
      const roleIds = Array.from(new Set(
        memberSnapshot.docs.map(doc => (doc.data() as TeamMember).roleId)
      ));
      
      const rolePermissions: Record<string, boolean> = {};
      
      // Check each role for the permission
      for (const roleId of roleIds) {
        const roleDoc = await getDoc(doc(db, 'teamRoles', roleId));
        
        if (roleDoc.exists()) {
          const role = roleDoc.data() as TeamRole;
          rolePermissions[roleId] = role.isAdmin || role.permissions[permission] === true;
        } else {
          rolePermissions[roleId] = false;
        }
      }
      
      // Filter members with the permission
      return memberSnapshot.docs
        .filter(doc => {
          const member = doc.data() as TeamMember;
          return rolePermissions[member.roleId];
        })
        .map(doc => (doc.data() as TeamMember).userId);
    } catch (error) {
      console.error(`Error getting users with permission ${permission}:`, error);
      throw error;
    }
  }
}

export const permissionService = new PermissionService();
export default permissionService;
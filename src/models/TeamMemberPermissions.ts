/**
 * Team Member Permissions Definition
 * Defines all available permissions for team members
 */
export interface TeamMemberPermissions {
  // Core Team Permissions
  manageTeam: boolean; // Can update team settings, invite members
  viewTeam: boolean; // Can view team details and members
  updateTeam: boolean; // Can update team info but not manage members
  
  // Member Permissions
  inviteMembers: boolean; // Can invite new members to the team
  removeMembers: boolean; // Can remove members from the team
  updateMemberRoles: boolean; // Can change roles and permissions of members
  
  // Task Permissions
  viewTasks: boolean; // Can view tasks assigned to the team
  createTasks: boolean; // Can create new tasks
  updateTasks: boolean; // Can update existing tasks
  deleteTasks: boolean; // Can delete tasks
  assignTasks: boolean; // Can assign tasks to members
  manageTasks: boolean; // Full control over tasks, including bulk operations
  
  // Comment Permissions
  addComments: boolean; // Can add comments to tasks
  editComments: boolean; // Can edit their own comments
  deleteComments: boolean; // Can delete any comments
  
  // Calendar/Events Permissions
  viewCalendar: boolean; // Can view team calendar
  createEvents: boolean; // Can create calendar events
  updateEvents: boolean; // Can update calendar events
  deleteEvents: boolean; // Can delete calendar events
  
  // File Management Permissions
  viewFiles: boolean; // Can view team files
  uploadFiles: boolean; // Can upload files
  deleteFiles: boolean; // Can delete files
  organizeFolders: boolean; // Can create/delete folders and organize files
  
  // Communications Permissions
  viewChannels: boolean; // Can view team communication channels
  createChannels: boolean; // Can create new channels
  postMessages: boolean; // Can post messages to channels
  deleteMessages: boolean; // Can delete messages in channels
  
  // Resource Permissions
  viewResources: boolean; // Can view team resources
  createResources: boolean; // Can create resources
  updateResources: boolean; // Can update resources
  deleteResources: boolean; // Can delete resources
  assignResources: boolean; // Can assign resources to members
  
  // Goal Permissions
  viewGoals: boolean; // Can view team goals
  createGoals: boolean; // Can create team goals
  updateGoals: boolean; // Can update team goals
  deleteGoals: boolean; // Can delete team goals
  
  // Analytics Permissions
  viewAnalytics: boolean; // Can view team analytics
  exportAnalytics: boolean; // Can export analytics data
  
  // Onboarding Permissions
  viewOnboarding: boolean; // Can view onboarding workflows
  manageOnboarding: boolean; // Can create/edit onboarding workflows and assign them
  
  // Admin Permissions (typically restricted to team admins/owners)
  manageSettings: boolean; // Can manage team settings
  manageIntegrations: boolean; // Can manage team integrations with external services
  managePermissions: boolean; // Can define and assign permission sets
  manageRoles: boolean; // Can create and assign roles
}

/**
 * Default permission sets for different roles
 */
export const defaultPermissions: Record<string, TeamMemberPermissions> = {
  owner: {
    // All permissions enabled for owner
    manageTeam: true,
    viewTeam: true,
    updateTeam: true,
    inviteMembers: true,
    removeMembers: true,
    updateMemberRoles: true,
    viewTasks: true,
    createTasks: true,
    updateTasks: true,
    deleteTasks: true,
    assignTasks: true,
    manageTasks: true,
    addComments: true,
    editComments: true,
    deleteComments: true,
    viewCalendar: true,
    createEvents: true,
    updateEvents: true,
    deleteEvents: true,
    viewFiles: true,
    uploadFiles: true,
    deleteFiles: true,
    organizeFolders: true,
    viewChannels: true,
    createChannels: true,
    postMessages: true,
    deleteMessages: true,
    viewResources: true,
    createResources: true,
    updateResources: true,
    deleteResources: true,
    assignResources: true,
    viewGoals: true,
    createGoals: true,
    updateGoals: true,
    deleteGoals: true,
    viewAnalytics: true,
    exportAnalytics: true,
    viewOnboarding: true,
    manageOnboarding: true,
    manageSettings: true,
    manageIntegrations: true,
    managePermissions: true,
    manageRoles: true
  },
  
  admin: {
    // Most permissions enabled for admin, except highest level team management
    manageTeam: false,
    viewTeam: true,
    updateTeam: true,
    inviteMembers: true,
    removeMembers: true,
    updateMemberRoles: true,
    viewTasks: true,
    createTasks: true,
    updateTasks: true,
    deleteTasks: true,
    assignTasks: true,
    manageTasks: true,
    addComments: true,
    editComments: true,
    deleteComments: true,
    viewCalendar: true,
    createEvents: true,
    updateEvents: true,
    deleteEvents: true,
    viewFiles: true,
    uploadFiles: true,
    deleteFiles: true,
    organizeFolders: true,
    viewChannels: true,
    createChannels: true,
    postMessages: true,
    deleteMessages: true,
    viewResources: true,
    createResources: true,
    updateResources: true,
    deleteResources: true,
    assignResources: true,
    viewGoals: true,
    createGoals: true,
    updateGoals: true,
    deleteGoals: true,
    viewAnalytics: true,
    exportAnalytics: true,
    viewOnboarding: true,
    manageOnboarding: true,
    manageSettings: true,
    manageIntegrations: true,
    managePermissions: false,
    manageRoles: false
  },
  
  manager: {
    // Task and resource management permissions, limited team management
    manageTeam: false,
    viewTeam: true,
    updateTeam: false,
    inviteMembers: true,
    removeMembers: false,
    updateMemberRoles: false,
    viewTasks: true,
    createTasks: true,
    updateTasks: true,
    deleteTasks: true,
    assignTasks: true,
    manageTasks: true,
    addComments: true,
    editComments: true,
    deleteComments: true,
    viewCalendar: true,
    createEvents: true,
    updateEvents: true,
    deleteEvents: true,
    viewFiles: true,
    uploadFiles: true,
    deleteFiles: true,
    organizeFolders: true,
    viewChannels: true,
    createChannels: true,
    postMessages: true,
    deleteMessages: false,
    viewResources: true,
    createResources: true,
    updateResources: true,
    deleteResources: true,
    assignResources: true,
    viewGoals: true,
    createGoals: true,
    updateGoals: true,
    deleteGoals: false,
    viewAnalytics: true,
    exportAnalytics: true,
    viewOnboarding: true,
    manageOnboarding: true,
    manageSettings: false,
    manageIntegrations: false,
    managePermissions: false,
    manageRoles: false
  },
  
  member: {
    // Standard member permissions
    manageTeam: false,
    viewTeam: true,
    updateTeam: false,
    inviteMembers: false,
    removeMembers: false,
    updateMemberRoles: false,
    viewTasks: true,
    createTasks: true,
    updateTasks: true,
    deleteTasks: false,
    assignTasks: false,
    manageTasks: false,
    addComments: true,
    editComments: true,
    deleteComments: false,
    viewCalendar: true,
    createEvents: true,
    updateEvents: true,
    deleteEvents: false,
    viewFiles: true,
    uploadFiles: true,
    deleteFiles: false,
    organizeFolders: false,
    viewChannels: true,
    createChannels: false,
    postMessages: true,
    deleteMessages: false,
    viewResources: true,
    createResources: false,
    updateResources: false,
    deleteResources: false,
    assignResources: false,
    viewGoals: true,
    createGoals: false,
    updateGoals: false,
    deleteGoals: false,
    viewAnalytics: false,
    exportAnalytics: false,
    viewOnboarding: true,
    manageOnboarding: false,
    manageSettings: false,
    manageIntegrations: false,
    managePermissions: false,
    manageRoles: false
  },
  
  guest: {
    // Limited view-only permissions
    manageTeam: false,
    viewTeam: true,
    updateTeam: false,
    inviteMembers: false,
    removeMembers: false,
    updateMemberRoles: false,
    viewTasks: true,
    createTasks: false,
    updateTasks: false,
    deleteTasks: false,
    assignTasks: false,
    manageTasks: false,
    addComments: true,
    editComments: true,
    deleteComments: false,
    viewCalendar: true,
    createEvents: false,
    updateEvents: false,
    deleteEvents: false,
    viewFiles: true,
    uploadFiles: false,
    deleteFiles: false,
    organizeFolders: false,
    viewChannels: true,
    createChannels: false,
    postMessages: true,
    deleteMessages: false,
    viewResources: true,
    createResources: false,
    updateResources: false,
    deleteResources: false,
    assignResources: false,
    viewGoals: true,
    createGoals: false,
    updateGoals: false,
    deleteGoals: false,
    viewAnalytics: false,
    exportAnalytics: false,
    viewOnboarding: false,
    manageOnboarding: false,
    manageSettings: false,
    manageIntegrations: false,
    managePermissions: false,
    manageRoles: false
  }
};

/**
 * Helper class to generate permissions for a specific role
 */
export class PermissionBuilder {
  private permissions: TeamMemberPermissions;
  
  constructor(baseRole: string = 'member') {
    // Start with default permissions for the base role
    this.permissions = { ...defaultPermissions[baseRole] };
  }
  
  /**
   * Add specific permissions
   */
  public add(...permissionKeys: (keyof TeamMemberPermissions)[]): PermissionBuilder {
    permissionKeys.forEach(key => {
      this.permissions[key] = true;
    });
    return this;
  }
  
  /**
   * Remove specific permissions
   */
  public remove(...permissionKeys: (keyof TeamMemberPermissions)[]): PermissionBuilder {
    permissionKeys.forEach(key => {
      this.permissions[key] = false;
    });
    return this;
  }
  
  /**
   * Add all permissions related to a specific feature area
   */
  public addFeature(feature: 'tasks' | 'files' | 'calendar' | 'communication' | 'resources' | 'goals' | 'analytics' | 'onboarding'): PermissionBuilder {
    switch (feature) {
      case 'tasks':
        this.add('viewTasks', 'createTasks', 'updateTasks', 'deleteTasks', 'assignTasks', 'manageTasks');
        break;
      case 'files':
        this.add('viewFiles', 'uploadFiles', 'deleteFiles', 'organizeFolders');
        break;
      case 'calendar':
        this.add('viewCalendar', 'createEvents', 'updateEvents', 'deleteEvents');
        break;
      case 'communication':
        this.add('viewChannels', 'createChannels', 'postMessages', 'deleteMessages');
        break;
      case 'resources':
        this.add('viewResources', 'createResources', 'updateResources', 'deleteResources', 'assignResources');
        break;
      case 'goals':
        this.add('viewGoals', 'createGoals', 'updateGoals', 'deleteGoals');
        break;
      case 'analytics':
        this.add('viewAnalytics', 'exportAnalytics');
        break;
      case 'onboarding':
        this.add('viewOnboarding', 'manageOnboarding');
        break;
    }
    return this;
  }
  
  /**
   * Build and return the final permissions object
   */
  public build(): TeamMemberPermissions {
    return { ...this.permissions };
  }
}
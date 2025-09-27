import { permissionService } from '../PermissionService';
import { getDocs, getDoc } from 'firebase/firestore';

// Mock Firebase
jest.mock('firebase/firestore', () => ({
  doc: jest.fn(),
  getDoc: jest.fn(),
  collection: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  getDocs: jest.fn(),
}));

jest.mock('../../firebase/firebaseConfig', () => ({
  db: jest.fn(),
}));

const mockGetDocs = getDocs as jest.MockedFunction<typeof getDocs>;
const mockGetDoc = getDoc as jest.MockedFunction<typeof getDoc>;

describe('PermissionService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('hasPermission', () => {
    test('should return false when user is not a team member', async () => {
      // Mock empty member query result
      mockGetDocs.mockResolvedValueOnce({
        empty: true,
        docs: [],
      } as any);

      const result = await permissionService.hasPermission('user-1', 'team-1', 'manageMembers');
      
      expect(result).toBe(false);
    });

    test('should return false when role does not exist', async () => {
      // Mock member exists but role doesn't
      mockGetDocs.mockResolvedValueOnce({
        empty: false,
        docs: [{
          data: () => ({ roleId: 'non-existent-role' }),
        }],
      } as any);

      mockGetDoc.mockResolvedValueOnce({
        exists: () => false,
      } as any);

      const result = await permissionService.hasPermission('user-1', 'team-1', 'manageMembers');
      
      expect(result).toBe(false);
    });

    test('should return true when user has permission', async () => {
      // Mock member exists
      mockGetDocs.mockResolvedValueOnce({
        empty: false,
        docs: [{
          data: () => ({ roleId: 'admin-role' }),
        }],
      } as any);

      // Mock role with permissions
      mockGetDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({
          permissions: {
            manageMembers: true,
          },
        }),
      } as any);

      const result = await permissionService.hasPermission('user-1', 'team-1', 'manageMembers');
      
      expect(result).toBe(true);
    });

    test('should return false when user lacks specific permission', async () => {
      // Mock member exists
      mockGetDocs.mockResolvedValueOnce({
        empty: false,
        docs: [{
          data: () => ({ roleId: 'viewer-role' }),
        }],
      } as any);

      // Mock role without permission
      mockGetDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({
          permissions: {
            manageMembers: false,
          },
        }),
      } as any);

      const result = await permissionService.hasPermission('user-1', 'team-1', 'manageMembers');
      
      expect(result).toBe(false);
    });

    test('should handle errors gracefully', async () => {
      mockGetDocs.mockRejectedValueOnce(new Error('Database error'));

      const result = await permissionService.hasPermission('user-1', 'team-1', 'manageMembers');
      
      expect(result).toBe(false);
    });
  });

  describe('getUserPermissions', () => {
    test('should return null when user is not a team member', async () => {
      mockGetDocs.mockResolvedValueOnce({
        empty: true,
        docs: [],
      } as any);

      const result = await permissionService.getUserPermissions('user-1', 'team-1');
      
      expect(result).toBeNull();
    });

    test('should return permissions when user is a team member', async () => {
      const mockPermissions = { manageMembers: true, createTasks: false };

      mockGetDocs.mockResolvedValueOnce({
        empty: false,
        docs: [{
          data: () => ({ roleId: 'admin-role' }),
        }],
      } as any);

      mockGetDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({
          permissions: mockPermissions,
        }),
      } as any);

      const result = await permissionService.getUserPermissions('user-1', 'team-1');
      
      expect(result).toEqual(mockPermissions);
    });
  });

  describe('canAccessResource', () => {
    test('should check resource access permissions', async () => {
      // Mock resource document
      mockGetDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({
          teamId: 'team-1',
        }),
      } as any);

      // Mock user with admin permissions
      mockGetDocs.mockResolvedValueOnce({
        empty: false,
        docs: [{
          data: () => ({ roleId: 'admin-role' }),
        }],
      } as any);

      mockGetDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({
          permissions: {
            viewFiles: true,
          },
        }),
      } as any);

      const result = await permissionService.canAccessResource(
        'user-1', 
        'file',
        'file-1',
        'view'
      );
      
      expect(result).toBe(true);
    });

    test('should return false when resource does not exist', async () => {
      mockGetDoc.mockResolvedValueOnce({
        exists: () => false,
      } as any);

      const result = await permissionService.canAccessResource(
        'user-1', 
        'file',
        'non-existent-file',
        'view'
      );
      
      expect(result).toBe(false);
    });
  });
});
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { SecureFileManager } from '@/components/files/secure-file-manager';

// Mock Firebase
jest.mock('@/lib/firebase', () => ({
  auth: {
    currentUser: { uid: 'test-user-id', displayName: 'Test User', email: 'test@example.com' }
  },
  db: {
    collection: jest.fn(),
    doc: jest.fn(),
    addDoc: jest.fn(),
    updateDoc: jest.fn(),
    deleteDoc: jest.fn(),
    query: jest.fn(),
    where: jest.fn(),
    orderBy: jest.fn(),
    onSnapshot: jest.fn()
  },
  storage: {
    ref: jest.fn(),
    uploadBytes: jest.fn(),
    getDownloadURL: jest.fn(),
    deleteObject: jest.fn(),
    getMetadata: jest.fn()
  }
}));

// Mock react-firebase-hooks
jest.mock('react-firebase-hooks/auth', () => ({
  useAuthState: () => [
    { uid: 'test-user-id', displayName: 'Test User', email: 'test@example.com' },
    false,
    undefined
  ]
}));

describe('SecureFileManager Component', () => {
  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
  });

  test('renders file manager with default tabs', async () => {
    render(<SecureFileManager teamId="test-team" />);
    
    // Check for main UI elements
    expect(screen.getByText('My Files')).toBeInTheDocument();
    expect(screen.getByText('Shared with Me')).toBeInTheDocument();
  });

  test('displays file upload dialog when upload button is clicked', async () => {
    render(<SecureFileManager teamId="test-team" />);
    
    // Find and click the upload button
    const uploadButton = screen.getByText('Upload');
    fireEvent.click(uploadButton);
    
    // Check if upload dialog appears
    await waitFor(() => {
      expect(screen.getByText('Upload Files')).toBeInTheDocument();
    });
  });

  test('displays create folder dialog when new folder button is clicked', async () => {
    render(<SecureFileManager teamId="test-team" />);
    
    // Find and click the new folder button
    const newFolderButton = screen.getByText('New Folder');
    fireEvent.click(newFolderButton);
    
    // Check if folder creation dialog appears
    await waitFor(() => {
      expect(screen.getByText('Create New Folder')).toBeInTheDocument();
    });
  });

  // Add more tests for other file management operations
});
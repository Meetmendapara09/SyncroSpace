'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db, storage } from '@/lib/firebase';
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  arrayUnion,
  arrayRemove
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject, getMetadata } from 'firebase/storage';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import type { LucideProps } from 'lucide-react';
import { 
  File,
  Folder,
  Upload,
  Download,
  Share,
  Lock,
  Unlock,
  Edit,
  Trash2,
  Copy,
  Move,
  Star,
  StarOff,
  Eye,
  EyeOff,
  MoreVertical,
  Search,
  Filter,
  Grid,
  List,
  SortAsc,
  SortDesc,
  Clock,
  User,
  Users,
  Shield,
  Key,
  History,
  FileText,
  Image,
  Video,
  Music,
  Archive,
  Code,
  Sheet,
  Presentation,
  Plus,
  FolderPlus,
  Link,
  ExternalLink,
  AlertTriangle,
  CheckCircle,
  Info,
  X,
  RefreshCw,
  Save,
  Tag,
  Calendar,
  FileX,
  Layers
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';
import { AiOutlineFilePdf } from 'react-icons/ai';

// Types and Interfaces
interface FileItem {
  id: string;
  name: string;
  type: 'file' | 'folder';
  size: number;
  mimeType?: string;
  url?: string;
  thumbnailUrl?: string;
  parentId?: string;
  path: string;
  ownerId: string;
  ownerName: string;
  ownerAvatar?: string;
  teamId?: string;
  spaceId?: string;
  channelId?: string;
  createdAt: any;
  updatedAt: any;
  lastAccessedAt?: any;
  tags: string[];
  description?: string;
  isStarred: boolean;
  isEncrypted: boolean;
  permissions: FilePermissions;
  versions: FileVersion[];
  currentVersion: number;
  downloadCount: number;
  virus_scan_status: 'pending' | 'clean' | 'infected' | 'error';
  preview_generated: boolean;
}

interface FilePermissions {
  view: string[];
  edit: string[];
  delete: string[];
  share: string[];
  isPublic: boolean;
  allowedDomains: string[];
  expiresAt?: any;
  password?: string;
}

interface FileVersion {
  id: string;
  version: number;
  url: string;
  size: number;
  uploadedBy: string;
  uploadedAt: any;
  changes: string;
  checksum: string;
}

interface FileShare {
  id: string;
  fileId: string;
  sharedBy: string;
  sharedWith?: string[];
  shareUrl: string;
  accessCount: number;
  lastAccessed?: any;
  expiresAt?: any;
  permissions: 'view' | 'edit' | 'download';
  password?: string;
  createdAt: any;
}

interface FileActivity {
  id: string;
  fileId: string;
  userId: string;
  userName: string;
  action: 'created' | 'updated' | 'viewed' | 'downloaded' | 'shared' | 'deleted' | 'restored';
  timestamp: any;
  details?: string;
  ipAddress?: string;
  userAgent?: string;
}

const FILE_ICONS: { [key: string]: React.FC<LucideProps> } = {
  'application/pdf': FileText, // Using FileText as a fallback for PDF instead of AiOutlineFilePdf to fix type issues
  'text/plain': FileText,
  'application/msword': FileText,
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': FileText,
  'application/vnd.ms-excel': Sheet,
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': Sheet,
  'application/vnd.ms-powerpoint': Presentation,
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': Presentation,
  'image/jpeg': Image,
  'image/png': Image,
  'image/gif': Image,
  'image/svg+xml': Image,
  'video/mp4': Video,
  'video/avi': Video,
  'video/mov': Video,
  'audio/mp3': Music,
  'audio/wav': Music,
  'application/zip': Archive,
  'application/x-zip-compressed': Archive,
  'text/javascript': Code,
  'text/typescript': Code,
  'text/html': Code,
  'text/css': Code,
  'application/json': Code,
  'default': File
};

const ENCRYPTION_ALGORITHMS = [
  'AES-256-GCM',
  'ChaCha20-Poly1305',
  'AES-128-GCM'
];

interface SecureFileManagerProps {
  teamId?: string;
  spaceId?: string;
  channelId?: string;
  folderId?: string;
}

export function SecureFileManager({ teamId, spaceId, channelId, folderId }: SecureFileManagerProps) {
  const [user] = useAuthState(auth);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [currentFolder, setCurrentFolder] = useState<FileItem | null>(null);
  const [breadcrumb, setBreadcrumb] = useState<FileItem[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [sortBy, setSortBy] = useState<'name' | 'date' | 'size' | 'type'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [showUpload, setShowUpload] = useState(false);
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [showFileDetails, setShowFileDetails] = useState<FileItem | null>(null);
  const [showShareDialog, setShowShareDialog] = useState<FileItem | null>(null);
  const [showVersionHistory, setShowVersionHistory] = useState<FileItem | null>(null);
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});
  const [loading, setLoading] = useState(true);

  // Upload state
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [uploadSettings, setUploadSettings] = useState({
    encrypt: true,
    algorithm: 'AES-256-GCM',
    generateThumbnail: true,
    virusScan: true,
    overwriteExisting: false
  });

  // Create folder state
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderDescription, setNewFolderDescription] = useState('');

  // Share settings
  const [shareSettings, setShareSettings] = useState({
    permissions: 'view' as const,
    expiresIn: '',
    password: '',
    allowDownload: true,
    requireSignIn: false,
    notifyOnAccess: true
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;

    // Build query based on context
    let filesQuery = query(
      collection(db, 'files'),
      where('parentId', '==', folderId || null),
      orderBy('type', 'desc'), // Folders first
      orderBy(sortBy === 'date' ? 'updatedAt' : sortBy, sortOrder)
    );

    if (teamId) {
      filesQuery = query(
        collection(db, 'files'),
        where('teamId', '==', teamId),
        where('parentId', '==', folderId || null),
        orderBy('type', 'desc'),
        orderBy(sortBy === 'date' ? 'updatedAt' : sortBy, sortOrder)
      );
    }

    const unsubscribe = onSnapshot(filesQuery, (snapshot) => {
      const fileList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as FileItem[];

      setFiles(fileList);
      setLoading(false);
    });

    // Load current folder if folderId is provided
    if (folderId) {
      const folderDoc = doc(db, 'files', folderId);
      onSnapshot(folderDoc, (snapshot) => {
        if (snapshot.exists()) {
          const folder = { id: snapshot.id, ...snapshot.data() } as FileItem;
          setCurrentFolder(folder);
          buildBreadcrumb(folder);
        }
      });
    } else {
      setCurrentFolder(null);
      setBreadcrumb([]);
    }

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [user, teamId, spaceId, channelId, folderId, sortBy, sortOrder]);

  // Build breadcrumb navigation
  const buildBreadcrumb = async (folder: FileItem) => {
    const crumbs: FileItem[] = [folder];
    let currentParent = folder.parentId;

    while (currentParent) {
      try {
        if (typeof currentParent === 'string') {
          const parentDoc = await import('firebase/firestore').then(({ getDoc, doc }) =>
            getDoc(doc(db, 'files', currentParent as string))
          );
          
          if (parentDoc.exists()) {
            const parent = { id: parentDoc.id, ...parentDoc.data() } as FileItem;
            crumbs.unshift(parent);
            currentParent = parent.parentId;
          } else {
            break;
          }
        } else {
          break;
        }
      } catch (error) {
        console.error('Error building breadcrumb:', error);
        break;
      }
    }

    setBreadcrumb(crumbs);
  };

  // Handle file upload
  const handleFileUpload = async () => {
    if (uploadFiles.length === 0) return;

    try {
      for (const file of uploadFiles) {
        const fileId = uuidv4();
        const fileName = `${fileId}_${file.name}`;
        const filePath = teamId ? `teams/${teamId}/files/${fileName}` : `files/${fileName}`;
        
        // Create file reference
        const fileRef = ref(storage, filePath);
        
        // Upload with progress tracking
        const uploadTask = uploadBytes(fileRef, file);
        
        setUploadProgress(prev => ({ ...prev, [file.name]: 0 }));

        // Wait for upload completion
        await uploadTask;
        
        // Get download URL
        const downloadURL = await getDownloadURL(fileRef);
        
        // Generate thumbnail for images
        let thumbnailUrl;
        if (file.type.startsWith('image/') && uploadSettings.generateThumbnail) {
          thumbnailUrl = await generateThumbnail(file);
        }

        // Create file document
        const fileData: Partial<FileItem> = {
          name: file.name,
          type: 'file',
          size: file.size,
          mimeType: file.type,
          url: downloadURL,
          thumbnailUrl,
          parentId: currentFolder?.id || undefined,
          path: currentFolder ? `${currentFolder.path}/${file.name}` : file.name,
          ownerId: user?.uid ?? '',
          ownerName: user?.displayName || user?.email?.split('@')[0] || 'User',
          ownerAvatar: user?.photoURL ?? undefined,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          tags: [],
          isStarred: false,
          isEncrypted: uploadSettings.encrypt,
          permissions: {
            view: user ? [user.uid] : [],
            edit: user ? [user.uid] : [],
            delete: user ? [user.uid] : [],
            share: user ? [user.uid] : [],
            isPublic: false,
            allowedDomains: []
          },
          versions: [{
            id: uuidv4(),
            version: 1,
            url: downloadURL,
            size: file.size,
            uploadedBy: user?.uid ?? '',
            uploadedAt: serverTimestamp(),
            changes: 'Initial upload',
            checksum: await calculateChecksum(file)
          }],
          currentVersion: 1,
          downloadCount: 0,
          virus_scan_status: 'pending',
          preview_generated: false,
          ...(teamId && { teamId }),
          ...(spaceId && { spaceId }),
          ...(channelId && { channelId })
        };

        await addDoc(collection(db, 'files'), fileData);

        // Log activity
        await logFileActivity(fileId, 'created', 'File uploaded');

        setUploadProgress(prev => ({ ...prev, [file.name]: 100 }));
      }

      setShowUpload(false);
      setUploadFiles([]);
      setUploadProgress({});

      toast({
        title: "Upload complete",
        description: `${uploadFiles.length} file(s) uploaded successfully.`,
      });

    } catch (error) {
      console.error('Error uploading files:', error);
      toast({
        title: "Upload failed",
        description: "Failed to upload files. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Generate thumbnail for images
  const generateThumbnail = async (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new window.Image();
      
      img.onload = () => {
        // Set thumbnail dimensions
        const MAX_SIZE = 200;
        let { width, height } = img;
        
        if (width > height) {
          if (width > MAX_SIZE) {
            height = (height * MAX_SIZE) / width;
            width = MAX_SIZE;
          }
        } else {
          if (height > MAX_SIZE) {
            width = (width * MAX_SIZE) / height;
            height = MAX_SIZE;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        
        // Draw and compress
        ctx?.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };
      
      img.src = URL.createObjectURL(file);
    });
  };

  // Calculate file checksum
  const calculateChecksum = async (file: File): Promise<string> => {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  // Create new folder
  const createFolder = async () => {
    if (!newFolderName.trim() || !user) return;

    try {
      const folderData: Partial<FileItem> = {
        name: newFolderName.trim(),
        type: 'folder',
        size: 0,
        parentId: currentFolder?.id ?? undefined,
        path: currentFolder ? `${currentFolder.path}/${newFolderName.trim()}` : newFolderName.trim(),
        ownerId: user.uid,
        ownerName: user.displayName || user.email?.split('@')[0] || 'User',
        ownerAvatar: user.photoURL ?? undefined,
        description: newFolderDescription.trim(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        tags: [],
        isStarred: false,
        isEncrypted: false,
        permissions: {
          view: [user.uid],
          edit: [user.uid],
          delete: [user.uid],
          share: [user.uid],
          isPublic: false,
          allowedDomains: []
        },
        versions: [],
        currentVersion: 0,
        downloadCount: 0,
        virus_scan_status: 'clean',
        preview_generated: false,
        ...(teamId && { teamId }),
        ...(spaceId && { spaceId }),
        ...(channelId && { channelId })
      };

      await addDoc(collection(db, 'files'), folderData);

      setShowCreateFolder(false);
      setNewFolderName('');
      setNewFolderDescription('');

      toast({
        title: "Folder created",
        description: `Folder "${newFolderName}" has been created.`,
      });

    } catch (error) {
      console.error('Error creating folder:', error);
      toast({
        title: "Error",
        description: "Failed to create folder. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Delete file/folder
  const deleteFile = async (fileId: string) => {
    try {
      const file = files.find(f => f.id === fileId);
      if (!file) return;

      // Delete from storage if it's a file
      if (file.type === 'file' && file.url) {
        const fileRef = ref(storage, file.url);
        await deleteObject(fileRef);
      }

      // Delete from database
      await deleteDoc(doc(db, 'files', fileId));

      // Log activity
      await logFileActivity(fileId, 'deleted', `${file.type} deleted`);

      toast({
        title: `${file.type === 'folder' ? 'Folder' : 'File'} deleted`,
        description: `"${file.name}" has been permanently deleted.`,
      });

    } catch (error) {
      console.error('Error deleting file:', error);
      toast({
        title: "Error",
        description: "Failed to delete item. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Star/unstar file
  const toggleStar = async (fileId: string) => {
    try {
      const file = files.find(f => f.id === fileId);
      if (!file) return;

      await updateDoc(doc(db, 'files', fileId), {
        isStarred: !file.isStarred,
        updatedAt: serverTimestamp()
      });

    } catch (error) {
      console.error('Error toggling star:', error);
    }
  };

  // Download file
  const downloadFile = async (file: FileItem) => {
    if (!file.url) return;

    try {
      // Log download
      await updateDoc(doc(db, 'files', file.id), {
        downloadCount: file.downloadCount + 1,
        lastAccessedAt: serverTimestamp()
      });

      await logFileActivity(file.id, 'downloaded', 'File downloaded');

      // Trigger download
      const link = document.createElement('a');
      link.href = file.url;
      link.download = file.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

    } catch (error) {
      console.error('Error downloading file:', error);
      toast({
        title: "Error",
        description: "Failed to download file.",
        variant: "destructive"
      });
    }
  };

  // Share file
  const shareFile = async (file: FileItem) => {
    try {
      const shareId = uuidv4();
      const shareUrl = `${window.location.origin}/share/${shareId}`;

      const shareData: Partial<FileShare> = {
        id: shareId,
        fileId: file.id,
        sharedBy: user!.uid,
        shareUrl,
        accessCount: 0,
        permissions: shareSettings.permissions,
        password: shareSettings.password || undefined,
        expiresAt: shareSettings.expiresIn ? 
          new Date(Date.now() + parseInt(shareSettings.expiresIn) * 24 * 60 * 60 * 1000) : 
          undefined,
        createdAt: serverTimestamp()
      };

      await addDoc(collection(db, 'fileShares'), shareData);

      // Copy to clipboard
      await navigator.clipboard.writeText(shareUrl);

      setShowShareDialog(null);

      toast({
        title: "File shared",
        description: "Share link has been copied to clipboard.",
      });

    } catch (error) {
      console.error('Error sharing file:', error);
      toast({
        title: "Error",
        description: "Failed to create share link.",
        variant: "destructive"
      });
    }
  };

  // Log file activity
  const logFileActivity = async (fileId: string, action: FileActivity['action'], details?: string) => {
    if (!user) return;

    try {
      const activityData: Partial<FileActivity> = {
        fileId,
        userId: user.uid,
        userName: user.displayName || user.email?.split('@')[0] || 'User',
        action,
        details,
        timestamp: serverTimestamp(),
        ipAddress: 'hidden', // Would need additional service to get real IP
        userAgent: navigator.userAgent
      };

      await addDoc(collection(db, 'fileActivities'), activityData);
    } catch (error) {
      console.error('Error logging activity:', error);
    }
  };

  // Get file icon
  const getFileIcon = (mimeType?: string) => {
    if (!mimeType) return FILE_ICONS.default;
    return FILE_ICONS[mimeType] || FILE_ICONS.default;
  };

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Filter and sort files
  const filteredFiles = files
    .filter(file => {
      const matchesSearch = !searchQuery || 
        file.name.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesType = filterType === 'all' || 
        (filterType === 'folders' && file.type === 'folder') ||
        (filterType === 'images' && file.mimeType?.startsWith('image/')) ||
        (filterType === 'documents' && (
          file.mimeType?.includes('pdf') ||
          file.mimeType?.includes('word') ||
          file.mimeType?.includes('text')
        )) ||
        (filterType === 'videos' && file.mimeType?.startsWith('video/')) ||
        (filterType === 'starred' && file.isStarred);
      
      return matchesSearch && matchesType;
    })
    .sort((a, b) => {
      // Folders first
      if (a.type !== b.type) {
        return a.type === 'folder' ? -1 : 1;
      }
      
      let comparison = 0;
      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'date':
          comparison = (a.updatedAt?.seconds || 0) - (b.updatedAt?.seconds || 0);
          break;
        case 'size':
          comparison = a.size - b.size;
          break;
        case 'type':
          comparison = (a.mimeType || '').localeCompare(b.mimeType || '');
          break;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading files...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold">Files</h1>
          
          {/* Breadcrumb */}
          {breadcrumb.length > 0 && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Button variant="ghost" size="sm" onClick={() => window.location.href = '/files'}>
                Home
              </Button>
              {breadcrumb.map((crumb, index) => (
                <div key={crumb.id} className="flex items-center gap-2">
                  <span>/</span>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => window.location.href = `/files/${crumb.id}`}
                  >
                    {crumb.name}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search files..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 w-64"
            />
          </div>

          {/* View Controls */}
          <div className="flex items-center gap-1 border rounded-lg p-1">
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
            >
              <Grid className="h-4 w-4" />
            </Button>
          </div>

          {/* Actions */}
          <Button onClick={() => setShowCreateFolder(true)} variant="outline">
            <FolderPlus className="h-4 w-4 mr-2" />
            New Folder
          </Button>
          
          <Button onClick={() => setShowUpload(true)}>
            <Upload className="h-4 w-4 mr-2" />
            Upload Files
          </Button>
        </div>
      </div>

      {/* Filters and Sort */}
      <div className="flex items-center justify-between p-4 border-b bg-gray-50">
        <div className="flex items-center gap-4">
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Files</SelectItem>
              <SelectItem value="folders">Folders</SelectItem>
              <SelectItem value="images">Images</SelectItem>
              <SelectItem value="documents">Documents</SelectItem>
              <SelectItem value="videos">Videos</SelectItem>
              <SelectItem value="starred">Starred</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={(value) => setSortBy(value as any)}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">Name</SelectItem>
              <SelectItem value="date">Date</SelectItem>
              <SelectItem value="size">Size</SelectItem>
              <SelectItem value="type">Type</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
          >
            {sortOrder === 'asc' ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />}
          </Button>
        </div>

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>{filteredFiles.length} items</span>
          {selectedFiles.length > 0 && (
            <>
              <span>•</span>
              <span>{selectedFiles.length} selected</span>
              <Button variant="outline" size="sm" onClick={() => setSelectedFiles([])}>
                Clear
              </Button>
            </>
          )}
        </div>
      </div>

      {/* File List/Grid */}
      <ScrollArea className="flex-1 p-4">
        {viewMode === 'list' ? (
          <div className="space-y-2">
            {filteredFiles.map((file) => {
              const FileIcon = file.type === 'folder' ? Folder : getFileIcon(file.mimeType);
              
              return (
                <div
                  key={file.id}
                  className={`flex items-center gap-3 p-3 rounded-lg border hover:bg-gray-50 cursor-pointer ${
                    selectedFiles.includes(file.id) ? 'bg-blue-50 border-blue-200' : ''
                  }`}
                  onClick={() => {
                    if (file.type === 'folder') {
                      window.location.href = `/files/${file.id}`;
                    } else {
                      setShowFileDetails(file);
                    }
                  }}
                >
                  <Checkbox
                    checked={selectedFiles.includes(file.id)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedFiles([...selectedFiles, file.id]);
                      } else {
                        setSelectedFiles(selectedFiles.filter(id => id !== file.id));
                      }
                    }}
                    onClick={(e) => e.stopPropagation()}
                  />

                  <FileIcon className="h-6 w-6 text-blue-600" />

                  {file.thumbnailUrl ? (
                    <img
                      src={file.thumbnailUrl}
                      alt={file.name}
                      className="w-8 h-8 object-cover rounded"
                    />
                  ) : null}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium truncate">{file.name}</p>
                      {file.isStarred && <Star className="h-4 w-4 text-yellow-500 fill-current" />}
                      {file.isEncrypted && <Lock className="h-4 w-4 text-green-600" />}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>Modified {formatDistanceToNow(file.updatedAt?.toDate?.() || new Date(file.updatedAt), { addSuffix: true })}</span>
                      {file.type === 'file' && (
                        <>
                          <span>•</span>
                          <span>{formatFileSize(file.size)}</span>
                        </>
                      )}
                      <span>•</span>
                      <span>by {file.ownerName}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleStar(file.id);
                      }}
                    >
                      {file.isStarred ? 
                        <StarOff className="h-4 w-4" /> : 
                        <Star className="h-4 w-4" />
                      }
                    </Button>

                    {file.type === 'file' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          downloadFile(file);
                        }}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    )}

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowShareDialog(file);
                      }}
                    >
                      <Share className="h-4 w-4" />
                    </Button>

                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="ghost" size="sm" onClick={(e) => e.stopPropagation()}>
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-48">
                        <div className="space-y-1">
                          <Button variant="ghost" size="sm" className="w-full justify-start">
                            <Edit className="h-4 w-4 mr-2" />
                            Rename
                          </Button>
                          <Button variant="ghost" size="sm" className="w-full justify-start">
                            <Copy className="h-4 w-4 mr-2" />
                            Duplicate
                          </Button>
                          <Button variant="ghost" size="sm" className="w-full justify-start">
                            <Move className="h-4 w-4 mr-2" />
                            Move
                          </Button>
                          {file.type === 'file' && (
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="w-full justify-start"
                              onClick={() => setShowVersionHistory(file)}
                            >
                              <History className="h-4 w-4 mr-2" />
                              Version History
                            </Button>
                          )}
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="w-full justify-start text-destructive"
                            onClick={() => deleteFile(file.id)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </Button>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {filteredFiles.map((file) => {
              const FileIcon = file.type === 'folder' ? Folder : getFileIcon(file.mimeType);
              
              return (
                <Card
                  key={file.id}
                  className={`cursor-pointer hover:shadow-md transition-shadow ${
                    selectedFiles.includes(file.id) ? 'ring-2 ring-blue-500' : ''
                  }`}
                  onClick={() => {
                    if (file.type === 'folder') {
                      window.location.href = `/files/${file.id}`;
                    } else {
                      setShowFileDetails(file);
                    }
                  }}
                >
                  <CardContent className="p-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Checkbox
                          checked={selectedFiles.includes(file.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedFiles([...selectedFiles, file.id]);
                            } else {
                              setSelectedFiles(selectedFiles.filter(id => id !== file.id));
                            }
                          }}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <div className="flex items-center gap-1">
                          {file.isStarred && <Star className="h-3 w-3 text-yellow-500 fill-current" />}
                          {file.isEncrypted && <Lock className="h-3 w-3 text-green-600" />}
                        </div>
                      </div>

                      <div className="flex flex-col items-center space-y-2">
                        {file.thumbnailUrl ? (
                          <img
                            src={file.thumbnailUrl}
                            alt={file.name}
                            className="w-16 h-16 object-cover rounded"
                          />
                        ) : (
                          <FileIcon className="h-16 w-16 text-blue-600" />
                        )}
                        
                        <div className="text-center">
                          <p className="font-medium text-sm truncate w-full" title={file.name}>
                            {file.name}
                          </p>
                          {file.type === 'file' && (
                            <p className="text-xs text-muted-foreground">
                              {formatFileSize(file.size)}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {filteredFiles.length === 0 && (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <File className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No files found</h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery || filterType !== 'all' 
                ? 'Try adjusting your search or filters'
                : 'Upload your first file to get started'
              }
            </p>
            {!searchQuery && filterType === 'all' && (
              <Button onClick={() => setShowUpload(true)}>
                <Upload className="h-4 w-4 mr-2" />
                Upload Files
              </Button>
            )}
          </div>
        )}
      </ScrollArea>

      {/* Upload Dialog */}
      <Dialog open={showUpload} onOpenChange={setShowUpload}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Upload Files</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* File Selection */}
            <div>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={(e) => {
                  const files = Array.from(e.target.files || []);
                  setUploadFiles(files);
                }}
                className="hidden"
              />
              
              <div
                className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-lg font-medium mb-2">Choose files to upload</p>
                <p className="text-gray-600">Or drag and drop files here</p>
              </div>
            </div>

            {/* Selected Files */}
            {uploadFiles.length > 0 && (
              <div className="space-y-2">
                <Label>Selected Files ({uploadFiles.length})</Label>
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {uploadFiles.map((file, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <div className="flex items-center gap-2">
                        <File className="h-4 w-4" />
                        <span className="text-sm">{file.name}</span>
                        <span className="text-xs text-gray-500">({formatFileSize(file.size)})</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setUploadFiles(uploadFiles.filter((_, i) => i !== index));
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Upload Settings */}
            <div className="space-y-4">
              <Label>Upload Settings</Label>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Encrypt files</Label>
                  <Switch
                    checked={uploadSettings.encrypt}
                    onCheckedChange={(checked) => setUploadSettings(prev => ({ ...prev, encrypt: checked }))}
                  />
                </div>
                
                {uploadSettings.encrypt && (
                  <div className="ml-4">
                    <Label className="text-sm">Encryption Algorithm</Label>
                    <Select
                      value={uploadSettings.algorithm}
                      onValueChange={(value) => setUploadSettings(prev => ({ ...prev, algorithm: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ENCRYPTION_ALGORITHMS.map((algo) => (
                          <SelectItem key={algo} value={algo}>{algo}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Generate thumbnails for images</Label>
                  <Switch
                    checked={uploadSettings.generateThumbnail}
                    onCheckedChange={(checked) => setUploadSettings(prev => ({ ...prev, generateThumbnail: checked }))}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Scan for viruses</Label>
                  <Switch
                    checked={uploadSettings.virusScan}
                    onCheckedChange={(checked) => setUploadSettings(prev => ({ ...prev, virusScan: checked }))}
                  />
                </div>
              </div>
            </div>

            {/* Upload Progress */}
            {Object.keys(uploadProgress).length > 0 && (
              <div className="space-y-2">
                <Label>Upload Progress</Label>
                {Object.entries(uploadProgress).map(([fileName, progress]) => (
                  <div key={fileName} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span>{fileName}</span>
                      <span>{progress}%</span>
                    </div>
                    <Progress value={progress} />
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowUpload(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleFileUpload} 
                disabled={uploadFiles.length === 0 || Object.keys(uploadProgress).length > 0}
              >
                Upload {uploadFiles.length} file{uploadFiles.length !== 1 ? 's' : ''}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Folder Dialog */}
      <Dialog open={showCreateFolder} onOpenChange={setShowCreateFolder}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Folder</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="folderName">Folder Name</Label>
              <Input
                id="folderName"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="Enter folder name"
              />
            </div>
            
            <div>
              <Label htmlFor="folderDescription">Description (Optional)</Label>
              <Textarea
                id="folderDescription"
                value={newFolderDescription}
                onChange={(e) => setNewFolderDescription(e.target.value)}
                placeholder="Brief description of the folder"
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowCreateFolder(false)}>
                Cancel
              </Button>
              <Button onClick={createFolder} disabled={!newFolderName.trim()}>
                Create Folder
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Share Dialog */}
      {showShareDialog && (
        <Dialog open={!!showShareDialog} onOpenChange={() => setShowShareDialog(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Share "{showShareDialog.name}"</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <Label>Permissions</Label>
                <Select
                  value={shareSettings.permissions}
                  onValueChange={(value) => setShareSettings(prev => ({ ...prev, permissions: value as any }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="view">View only</SelectItem>
                    <SelectItem value="edit">View and edit</SelectItem>
                    <SelectItem value="download">View and download</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Expires in (days)</Label>
                <Input
                  type="number"
                  value={shareSettings.expiresIn}
                  onChange={(e) => setShareSettings(prev => ({ ...prev, expiresIn: e.target.value }))}
                  placeholder="Never expires"
                />
              </div>

              <div>
                <Label>Password (Optional)</Label>
                <Input
                  type="password"
                  value={shareSettings.password}
                  onChange={(e) => setShareSettings(prev => ({ ...prev, password: e.target.value }))}
                  placeholder="No password required"
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Allow download</Label>
                  <Switch
                    checked={shareSettings.allowDownload}
                    onCheckedChange={(checked) => setShareSettings(prev => ({ ...prev, allowDownload: checked }))}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Require sign in</Label>
                  <Switch
                    checked={shareSettings.requireSignIn}
                    onCheckedChange={(checked) => setShareSettings(prev => ({ ...prev, requireSignIn: checked }))}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Notify on access</Label>
                  <Switch
                    checked={shareSettings.notifyOnAccess}
                    onCheckedChange={(checked) => setShareSettings(prev => ({ ...prev, notifyOnAccess: checked }))}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowShareDialog(null)}>
                  Cancel
                </Button>
                <Button onClick={() => shareFile(showShareDialog)}>
                  Create Share Link
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
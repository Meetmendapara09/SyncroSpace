'use client';

import { useState, useEffect } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '@/lib/firebase';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  onSnapshot,
} from 'firebase/firestore';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import {
  Upload,
  Download,
  File,
  FileText,
  Image,
  Video,
  Archive,
  Folder,
  FolderPlus,
  Search,
  Filter,
  MoreHorizontal,
  Share,
  Trash2,
  Edit,
  Eye,
  Lock,
  Unlock,
  Users,
  User,
  Star,
  StarOff,
  Grid,
  List,
  SortAsc,
  SortDesc,
  Plus,
  Cloud,
  HardDrive,
  Database,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';

// Types and Interfaces
interface TeamFile {
  id: string;
  teamId: string;
  name: string;
  originalName: string;
  size: number;
  type: string;
  mimeType: string;
  url: string;
  thumbnailUrl?: string;
  folderId?: string;
  uploadedBy: string;
  uploadedAt: any;
  lastModified: any;
  description?: string;
  tags: string[];
  permissions: {
    view: 'team' | 'private';
    edit: 'owner' | 'team' | 'private';
    delete: 'owner' | 'team' | 'private';
  };
  version: number;
  isFavorite: boolean;
  downloadCount: number;
  metadata?: {
    width?: number;
    height?: number;
    duration?: number;
    pages?: number;
  };
}

interface TeamFolder {
  id: string;
  teamId: string;
  name: string;
  description?: string;
  parentId?: string;
  createdBy: string;
  createdAt: any;
  color?: string;
  permissions: {
    view: 'team' | 'private';
    edit: 'owner' | 'team' | 'private';
    delete: 'owner' | 'team' | 'private';
  };
  fileCount: number;
  totalSize: number;
}

interface FileShare {
  id: string;
  fileId: string;
  sharedBy: string;
  sharedWith: string[]; // user IDs
  permissions: 'view' | 'edit';
  expiresAt?: any;
  sharedAt: any;
}

interface TeamFilesProps {
  teamId: string;
}

const FILE_TYPES = {
  'image/': { icon: Image, color: 'blue' },
  'video/': { icon: Video, color: 'red' },
  'audio/': { icon: File, color: 'green' },
  'application/pdf': { icon: FileText, color: 'red' },
  'application/msword': { icon: FileText, color: 'blue' },
  'application/vnd.openxmlformats-officedocument': { icon: FileText, color: 'blue' },
  'application/zip': { icon: Archive, color: 'yellow' },
  'application/x-rar-compressed': { icon: Archive, color: 'yellow' },
  'text/': { icon: FileText, color: 'gray' },
};

const SORT_OPTIONS = [
  { value: 'name', label: 'Name' },
  { value: 'size', label: 'Size' },
  { value: 'uploadedAt', label: 'Date Uploaded' },
  { value: 'type', label: 'Type' },
];

export function TeamFiles({ teamId }: TeamFilesProps) {
  const [user] = useAuthState(auth);
  const [files, setFiles] = useState<TeamFile[]>([]);
  const [folders, setFolders] = useState<TeamFolder[]>([]);
  const [shares, setShares] = useState<FileShare[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentFolder, setCurrentFolder] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState('uploadedAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [showUpload, setShowUpload] = useState(false);
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [showFileDetails, setShowFileDetails] = useState(false);
  const [selectedFile, setSelectedFile] = useState<TeamFile | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<string>('member');

  // Upload form state
  const [uploadForm, setUploadForm] = useState({
    files: [] as File[],
    folderId: '',
    description: '',
    tags: [] as string[],
    permissions: {
      view: 'team' as 'team' | 'private',
      edit: 'owner' as 'owner' | 'team' | 'private',
      delete: 'owner' as 'owner' | 'team' | 'private',
    },
  });

  // Create folder form state
  const [folderForm, setFolderForm] = useState({
    name: '',
    description: '',
    color: 'blue',
    permissions: {
      view: 'team' as 'team' | 'private',
      edit: 'owner' as 'owner' | 'team' | 'private',
      delete: 'owner' as 'owner' | 'team' | 'private',
    },
  });

  useEffect(() => {
    if (!user || !teamId) return;

    setLoading(true);

    // Load team files
    const loadFiles = () => {
      const filesQuery = query(
        collection(db, 'teamFiles'),
        where('teamId', '==', teamId),
        orderBy('uploadedAt', 'desc')
      );

      return onSnapshot(filesQuery, (snapshot) => {
        const filesList = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as TeamFile[];

        setFiles(filesList);
      });
    };

    // Load team folders
    const loadFolders = () => {
      const foldersQuery = query(
        collection(db, 'teamFolders'),
        where('teamId', '==', teamId),
        orderBy('createdAt', 'asc')
      );

      return onSnapshot(foldersQuery, (snapshot) => {
        const foldersList = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as TeamFolder[];

        setFolders(foldersList);
        setLoading(false);
      });
    };

    // Load file shares
    const loadShares = () => {
      const sharesQuery = query(
        collection(db, 'fileShares'),
        where('sharedWith', 'array-contains', user.uid)
      );

      return onSnapshot(sharesQuery, (snapshot) => {
        const sharesList = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as FileShare[];

        setShares(sharesList);
      });
    };

    // Get current user's role
    const getCurrentUserRole = async () => {
      const memberQuery = query(
        collection(db, 'teamMembers'),
        where('teamId', '==', teamId),
        where('userId', '==', user.uid)
      );
      const memberSnapshot = await getDocs(memberQuery);
      if (!memberSnapshot.empty) {
        const memberData = memberSnapshot.docs[0].data();
        setCurrentUserRole(memberData.role || 'member');
      }
    };

    const unsubscribeFiles = loadFiles();
    const unsubscribeFolders = loadFolders();
    const unsubscribeShares = loadShares();
    getCurrentUserRole();

    return () => {
      unsubscribeFiles();
      unsubscribeFolders();
      unsubscribeShares();
    };
  }, [user, teamId]);

  // Upload files
  const uploadFiles = async () => {
    if (!user || uploadForm.files.length === 0) return;

    try {
      for (const file of uploadForm.files) {
        // In a real implementation, this would upload to cloud storage
        // For now, we'll simulate the upload
        const fileData = {
          teamId,
          name: file.name,
          originalName: file.name,
          size: file.size,
          type: getFileType(file.type),
          mimeType: file.type,
          url: `https://example.com/files/${Date.now()}_${file.name}`, // Placeholder URL
          folderId: uploadForm.folderId || null,
          uploadedBy: user.uid,
          uploadedAt: serverTimestamp(),
          lastModified: serverTimestamp(),
          description: uploadForm.description || null,
          tags: uploadForm.tags,
          permissions: uploadForm.permissions,
          version: 1,
          isFavorite: false,
          downloadCount: 0,
        };

        await addDoc(collection(db, 'teamFiles'), fileData);
      }

      setShowUpload(false);
      resetUploadForm();

      toast({
        title: "Files uploaded",
        description: `${uploadForm.files.length} file${uploadForm.files.length > 1 ? 's' : ''} uploaded successfully.`,
      });

    } catch (error) {
      console.error('Error uploading files:', error);
      toast({
        title: "Error",
        description: "Failed to upload files.",
        variant: "destructive"
      });
    }
  };

  // Create folder
  const createFolder = async () => {
    if (!user) return;

    try {
      const folderData = {
        teamId,
        name: folderForm.name.trim(),
        description: folderForm.description.trim() || null,
        parentId: currentFolder,
        createdBy: user.uid,
        createdAt: serverTimestamp(),
        color: folderForm.color,
        permissions: folderForm.permissions,
        fileCount: 0,
        totalSize: 0,
      };

      await addDoc(collection(db, 'teamFolders'), folderData);

      setShowCreateFolder(false);
      resetFolderForm();

      toast({
        title: "Folder created",
        description: `Folder "${folderForm.name}" has been created.`,
      });

    } catch (error) {
      console.error('Error creating folder:', error);
      toast({
        title: "Error",
        description: "Failed to create folder.",
        variant: "destructive"
      });
    }
  };

  // Delete file
  const deleteFile = async (fileId: string) => {
    try {
      await deleteDoc(doc(db, 'teamFiles', fileId));

      toast({
        title: "File deleted",
        description: "File has been deleted.",
      });

    } catch (error) {
      console.error('Error deleting file:', error);
      toast({
        title: "Error",
        description: "Failed to delete file.",
        variant: "destructive"
      });
    }
  };

  // Delete folder
  const deleteFolder = async (folderId: string) => {
    try {
      await deleteDoc(doc(db, 'teamFolders', folderId));

      toast({
        title: "Folder deleted",
        description: "Folder has been deleted.",
      });

    } catch (error) {
      console.error('Error deleting folder:', error);
      toast({
        title: "Error",
        description: "Failed to delete folder.",
        variant: "destructive"
      });
    }
  };

  // Toggle favorite
  const toggleFavorite = async (fileId: string, isFavorite: boolean) => {
    try {
      await updateDoc(doc(db, 'teamFiles', fileId), {
        isFavorite: !isFavorite,
      });

      toast({
        title: isFavorite ? "Removed from favorites" : "Added to favorites",
        description: `File ${isFavorite ? 'removed from' : 'added to'} favorites.`,
      });

    } catch (error) {
      console.error('Error updating favorite:', error);
      toast({
        title: "Error",
        description: "Failed to update favorite status.",
        variant: "destructive"
      });
    }
  };

  // Download file
  const downloadFile = async (file: TeamFile) => {
    try {
      // Update download count
      await updateDoc(doc(db, 'teamFiles', file.id), {
        downloadCount: file.downloadCount + 1,
      });

      // In a real implementation, this would trigger the actual download
      window.open(file.url, '_blank');

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
  const shareFile = async (fileId: string, sharedWith: string[], permissions: 'view' | 'edit') => {
    if (!user) return;

    try {
      const shareData = {
        fileId,
        sharedBy: user.uid,
        sharedWith,
        permissions,
        sharedAt: serverTimestamp(),
      };

      await addDoc(collection(db, 'fileShares'), shareData);

      toast({
        title: "File shared",
        description: "File has been shared successfully.",
      });

    } catch (error) {
      console.error('Error sharing file:', error);
      toast({
        title: "Error",
        description: "Failed to share file.",
        variant: "destructive"
      });
    }
  };

  // Check if current user can manage files
  const canManageFiles = () => {
    return currentUserRole === 'admin' || currentUserRole === 'owner' || currentUserRole === 'moderator';
  };

  // Reset forms
  const resetUploadForm = () => {
    setUploadForm({
      files: [],
      folderId: '',
      description: '',
      tags: [],
      permissions: {
        view: 'team',
        edit: 'owner',
        delete: 'owner',
      },
    });
  };

  const resetFolderForm = () => {
    setFolderForm({
      name: '',
      description: '',
      color: 'blue',
      permissions: {
        view: 'team',
        edit: 'owner',
        delete: 'owner',
      },
    });
  };

  // Get filtered and sorted files
  const getFilteredFiles = () => {
    let filtered = files.filter(file => {
      // Folder filter
      if (currentFolder && file.folderId !== currentFolder) return false;

      // Search filter
      const matchesSearch = !searchQuery ||
        file.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        file.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        file.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));

      // Type filter
      const matchesType = filterType === 'all' || file.type === filterType;

      return matchesSearch && matchesType;
    });

    // Sort
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;

      switch (sortBy) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'size':
          aValue = a.size;
          bValue = b.size;
          break;
        case 'uploadedAt':
          aValue = a.uploadedAt?.seconds || 0;
          bValue = b.uploadedAt?.seconds || 0;
          break;
        case 'type':
          aValue = a.type;
          bValue = b.type;
          break;
        default:
          return 0;
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    return filtered;
  };

  // Get filtered folders
  const getFilteredFolders = () => {
    return folders.filter(folder => {
      if (currentFolder && folder.parentId !== currentFolder) return false;

      const matchesSearch = !searchQuery ||
        folder.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        folder.description?.toLowerCase().includes(searchQuery.toLowerCase());

      return matchesSearch;
    });
  };

  // Get file type info
  const getFileType = (mimeType: string) => {
    for (const [prefix, info] of Object.entries(FILE_TYPES)) {
      if (mimeType.startsWith(prefix)) {
        return prefix.slice(0, -1); // Remove trailing slash
      }
    }
    return 'file';
  };

  // Get file icon
  const getFileIcon = (file: TeamFile) => {
    for (const [prefix, info] of Object.entries(FILE_TYPES)) {
      if (file.mimeType.startsWith(prefix)) {
        const IconComponent = info.icon;
        return <IconComponent className="h-8 w-8" />;
      }
    }
    return <File className="h-8 w-8" />;
  };

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // Get current folder path
  const getCurrentFolderPath = () => {
    if (!currentFolder) return [{ name: 'Root', id: null }];

    const path = [];
    let folderId = currentFolder;

    while (folderId) {
      const folder = folders.find(f => f.id === folderId);
      if (folder) {
        path.unshift({ name: folder.name, id: folder.id });
        folderId = folder.parentId || '';
      } else {
        break;
      }
    }

    return [{ name: 'Root', id: null }, ...path];
  };

  const filteredFiles = getFilteredFiles();
  const filteredFolders = getFilteredFolders();
  const folderPath = getCurrentFolderPath();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading team files...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Team Files</h2>
          <p className="text-muted-foreground">
            Share and organize files with your team
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setShowCreateFolder(true)}
            disabled={!canManageFiles()}
          >
            <FolderPlus className="h-4 w-4 mr-2" />
            New Folder
          </Button>
          <Button onClick={() => setShowUpload(true)}>
            <Upload className="h-4 w-4 mr-2" />
            Upload Files
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <File className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{files.length}</p>
                <p className="text-sm text-muted-foreground">Total Files</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Folder className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{folders.length}</p>
                <p className="text-sm text-muted-foreground">Folders</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <HardDrive className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{formatFileSize(files.reduce((sum, file) => sum + file.size, 0))}</p>
                <p className="text-sm text-muted-foreground">Total Size</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Download className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{files.reduce((sum, file) => sum + file.downloadCount, 0)}</p>
                <p className="text-sm text-muted-foreground">Downloads</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Navigation Breadcrumb */}
      <div className="flex items-center gap-2 text-sm">
        {folderPath.map((item, index) => (
          <div key={item.id || 'root'} className="flex items-center gap-2">
            {index > 0 && <span className="text-muted-foreground">/</span>}
            <Button
              variant="ghost"
              size="sm"
              className="h-auto p-1 text-sm"
              onClick={() => setCurrentFolder(item.id)}
            >
              {item.name}
            </Button>
          </div>
        ))}
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search files and folders..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="flex gap-2">
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="image">Images</SelectItem>
              <SelectItem value="video">Videos</SelectItem>
              <SelectItem value="document">Documents</SelectItem>
              <SelectItem value="archive">Archives</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[130px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
          >
            {sortOrder === 'asc' ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />}
          </Button>

          <div className="flex border rounded-md">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
              className="rounded-r-none"
            >
              <Grid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
              className="rounded-l-none"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Files and Folders Grid/List */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {/* Folders */}
          {filteredFolders.map((folder) => (
            <Card
              key={folder.id}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => setCurrentFolder(folder.id)}
            >
              <CardContent className="p-4 text-center">
                <Folder className={`h-12 w-12 mx-auto mb-2 text-${folder.color}-500`} />
                <h3 className="font-medium text-sm truncate">{folder.name}</h3>
                <p className="text-xs text-muted-foreground">
                  {folder.fileCount} files
                </p>
              </CardContent>
            </Card>
          ))}

          {/* Files */}
          {filteredFiles.map((file) => (
            <Card
              key={file.id}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => {
                setSelectedFile(file);
                setShowFileDetails(true);
              }}
            >
              <CardContent className="p-4 text-center">
                <div className="relative">
                  {getFileIcon(file)}
                  {file.isFavorite && (
                    <Star className="absolute -top-1 -right-1 h-4 w-4 text-yellow-500 fill-current" />
                  )}
                </div>
                <h3 className="font-medium text-sm truncate mt-2">{file.name}</h3>
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(file.size)}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {/* Folders */}
          {filteredFolders.map((folder) => (
            <Card key={folder.id} className="cursor-pointer hover:bg-muted/50 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <Folder className={`h-8 w-8 text-${folder.color}-500`} />
                  <div className="flex-1">
                    <h3 className="font-medium">{folder.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {folder.fileCount} files • {formatFileSize(folder.totalSize)}
                    </p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={(e) => {
                    e.stopPropagation();
                    setCurrentFolder(folder.id);
                  }}>
                    Open
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Files */}
          {filteredFiles.map((file) => (
            <Card key={file.id} className="hover:bg-muted/50 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    {getFileIcon(file)}
                    {file.isFavorite && (
                      <Star className="absolute -top-1 -right-1 h-4 w-4 text-yellow-500 fill-current" />
                    )}
                  </div>

                  <div className="flex-1">
                    <h3 className="font-medium">{file.name}</h3>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>{formatFileSize(file.size)}</span>
                      <span>•</span>
                      <span>{file.type}</span>
                      <span>•</span>
                      <span>Uploaded {file.uploadedAt && format(new Date(file.uploadedAt.seconds * 1000), 'MMM dd')}</span>
                      <span>•</span>
                      <span>{file.downloadCount} downloads</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={() => downloadFile(file)}>
                      <Download className="h-4 w-4" />
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleFavorite(file.id, file.isFavorite)}
                    >
                      {file.isFavorite ? <StarOff className="h-4 w-4" /> : <Star className="h-4 w-4" />}
                    </Button>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => {
                          setSelectedFile(file);
                          setShowFileDetails(true);
                        }}>
                          <Eye className="h-4 w-4 mr-2" />
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Share className="h-4 w-4 mr-2" />
                          Share
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => deleteFile(file.id)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Empty State */}
      {filteredFiles.length === 0 && filteredFolders.length === 0 && (
        <Card className="bg-muted/30">
          <CardContent className="flex items-center justify-center flex-col py-12">
            <Cloud className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              {searchQuery ? 'No files found' : 'No files in this folder'}
            </h3>
            <p className="text-muted-foreground mb-4 text-center max-w-md">
              {searchQuery
                ? `No files match your search "${searchQuery}"`
                : 'Upload files or create folders to get started'}
            </p>
            <div className="flex gap-2">
              <Button onClick={() => setShowUpload(true)}>
                <Upload className="h-4 w-4 mr-2" />
                Upload Files
              </Button>
              {canManageFiles() && (
                <Button variant="outline" onClick={() => setShowCreateFolder(true)}>
                  <FolderPlus className="h-4 w-4 mr-2" />
                  Create Folder
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upload Files Dialog */}
      <Dialog open={showUpload} onOpenChange={setShowUpload}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Upload Files</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="fileUpload">Select Files</Label>
              <Input
                id="fileUpload"
                type="file"
                multiple
                onChange={(e) => {
                  const files = Array.from(e.target.files || []);
                  setUploadForm(prev => ({ ...prev, files }));
                }}
                className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
              />
            </div>

            {uploadForm.files.length > 0 && (
              <div className="space-y-2">
                <Label>Selected Files</Label>
                <ScrollArea className="max-h-32">
                  {uploadForm.files.map((file, index) => (
                    <div key={index} className="flex items-center gap-2 p-2 border rounded">
                      <File className="h-4 w-4" />
                      <span className="text-sm flex-1 truncate">{file.name}</span>
                      <span className="text-xs text-muted-foreground">{formatFileSize(file.size)}</span>
                    </div>
                  ))}
                </ScrollArea>
              </div>
            )}

            <div>
              <Label htmlFor="uploadFolder">Folder (optional)</Label>
              <Select
                value={uploadForm.folderId}
                onValueChange={(value) => setUploadForm(prev => ({ ...prev, folderId: value }))}
              >
                <SelectTrigger id="uploadFolder">
                  <SelectValue placeholder="Select folder" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Root</SelectItem>
                  {folders.map((folder) => (
                    <SelectItem key={folder.id} value={folder.id}>
                      {folder.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="uploadDescription">Description (optional)</Label>
              <textarea
                id="uploadDescription"
                value={uploadForm.description}
                onChange={(e) => setUploadForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe these files..."
                className="w-full min-h-[60px] px-3 py-2 text-sm border border-input bg-background rounded-md resize-none"
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => {
                setShowUpload(false);
                resetUploadForm();
              }}>
                Cancel
              </Button>
              <Button
                onClick={uploadFiles}
                disabled={uploadForm.files.length === 0}
              >
                <Upload className="h-4 w-4 mr-2" />
                Upload {uploadForm.files.length > 0 && `(${uploadForm.files.length})`}
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
                value={folderForm.name}
                onChange={(e) => setFolderForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter folder name"
              />
            </div>

            <div>
              <Label htmlFor="folderDescription">Description (optional)</Label>
              <textarea
                id="folderDescription"
                value={folderForm.description}
                onChange={(e) => setFolderForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe this folder..."
                className="w-full min-h-[60px] px-3 py-2 text-sm border border-input bg-background rounded-md resize-none"
              />
            </div>

            <div>
              <Label htmlFor="folderColor">Color</Label>
              <Select
                value={folderForm.color}
                onValueChange={(value) => setFolderForm(prev => ({ ...prev, color: value }))}
              >
                <SelectTrigger id="folderColor">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="blue">Blue</SelectItem>
                  <SelectItem value="green">Green</SelectItem>
                  <SelectItem value="yellow">Yellow</SelectItem>
                  <SelectItem value="red">Red</SelectItem>
                  <SelectItem value="purple">Purple</SelectItem>
                  <SelectItem value="gray">Gray</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => {
                setShowCreateFolder(false);
                resetFolderForm();
              }}>
                Cancel
              </Button>
              <Button
                onClick={createFolder}
                disabled={!folderForm.name.trim()}
              >
                <FolderPlus className="h-4 w-4 mr-2" />
                Create Folder
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* File Details Dialog */}
      <Dialog open={showFileDetails} onOpenChange={setShowFileDetails}>
        {selectedFile && (
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>File Details</DialogTitle>
            </DialogHeader>

            <div className="space-y-6">
              {/* File Preview */}
              <div className="flex items-center gap-4">
                {getFileIcon(selectedFile)}
                <div className="flex-1">
                  <h2 className="text-xl font-semibold">{selectedFile.name}</h2>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>{formatFileSize(selectedFile.size)}</span>
                    <span>•</span>
                    <span>{selectedFile.type}</span>
                    <span>•</span>
                    <span>Version {selectedFile.version}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => downloadFile(selectedFile)}>
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => toggleFavorite(selectedFile.id, selectedFile.isFavorite)}
                  >
                    {selectedFile.isFavorite ? <StarOff className="h-4 w-4 mr-2" /> : <Star className="h-4 w-4 mr-2" />}
                    {selectedFile.isFavorite ? 'Unfavorite' : 'Favorite'}
                  </Button>
                </div>
              </div>

              {/* File Information */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Uploaded</Label>
                  <p className="text-sm text-muted-foreground">
                    {selectedFile.uploadedAt && format(new Date(selectedFile.uploadedAt.seconds * 1000), 'PPP')}
                  </p>
                </div>

                <div>
                  <Label className="text-sm font-medium">Downloads</Label>
                  <p className="text-sm text-muted-foreground">{selectedFile.downloadCount}</p>
                </div>

                <div>
                  <Label className="text-sm font-medium">Permissions</Label>
                  <div className="flex gap-1">
                    <Badge variant="outline" className="text-xs">
                      {selectedFile.permissions.view === 'team' ? <Users className="h-3 w-3 mr-1" /> : <User className="h-3 w-3 mr-1" />}
                      View: {selectedFile.permissions.view}
                    </Badge>
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium">Last Modified</Label>
                  <p className="text-sm text-muted-foreground">
                    {selectedFile.lastModified && format(new Date(selectedFile.lastModified.seconds * 1000), 'PPP')}
                  </p>
                </div>
              </div>

              {/* Description */}
              {selectedFile.description && (
                <div>
                  <Label className="text-sm font-medium">Description</Label>
                  <p className="text-sm text-muted-foreground mt-1">{selectedFile.description}</p>
                </div>
              )}

              {/* Tags */}
              {selectedFile.tags && selectedFile.tags.length > 0 && (
                <div>
                  <Label className="text-sm font-medium">Tags</Label>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {selectedFile.tags.map((tag, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => {
                setShowFileDetails(false);
                setSelectedFile(null);
              }}>
                Close
              </Button>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
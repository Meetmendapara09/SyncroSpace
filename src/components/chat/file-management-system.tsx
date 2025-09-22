'use client';

import * as React from 'react';
import { useState, useEffect } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { 
  getStorage, 
  ref, 
  listAll, 
  getMetadata, 
  getDownloadURL, 
  deleteObject,
  uploadBytesResumable 
} from 'firebase/storage';
import { 
  doc, 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  getDocs, 
  updateDoc, 
  deleteDoc 
} from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { uploadFile } from '@/lib/firebase-upload';

import {
  Search,
  Filter,
  Folder,
  FolderPlus,
  FileText,
  FilePlus2,
  Image,
  FileImage,
  FileAudio,
  FileVideo,
  FilePlus,
  FileArchive,
  FileSpreadsheet,
  FileCode,
  FileX,
  MoreHorizontal,
  Download,
  Trash2,
  Share2,
  Star,
  StarOff,
  ChevronRight,
  Eye,
  ArrowUpDown,
  UploadCloud,
  X
} from 'lucide-react';

// Types for file management
interface FileItem {
  id: string;
  name: string;
  type: string;
  size: number;
  createdAt: Date;
  createdBy: string;
  createdByName: string;
  createdByAvatar?: string;
  downloadUrl: string;
  thumbnailUrl?: string;
  path: string;
  tags: string[];
  starred: boolean;
  category: string;
  inSpace?: string;
  spaceId?: string;
  sharedWith: string[];
}

interface FileUploadProgress {
  id: string;
  name: string;
  progress: number;
  error?: string;
}

const FILE_CATEGORIES = [
  { value: 'all', label: 'All Files' },
  { value: 'images', label: 'Images' },
  { value: 'documents', label: 'Documents' },
  { value: 'audio', label: 'Audio' },
  { value: 'video', label: 'Video' },
  { value: 'archives', label: 'Archives' },
  { value: 'code', label: 'Code Files' },
  { value: 'other', label: 'Other' },
  { value: 'starred', label: 'Starred' },
  { value: 'shared', label: 'Shared with Me' },
  { value: 'recent', label: 'Recently Accessed' },
];

const FILE_SORT_OPTIONS = [
  { value: 'name_asc', label: 'Name (A-Z)' },
  { value: 'name_desc', label: 'Name (Z-A)' },
  { value: 'date_desc', label: 'Newest First' },
  { value: 'date_asc', label: 'Oldest First' },
  { value: 'size_desc', label: 'Largest First' },
  { value: 'size_asc', label: 'Smallest First' },
];

const getFileCategory = (fileType: string) => {
  if (fileType.startsWith('image/')) return 'images';
  if (fileType.startsWith('audio/')) return 'audio';
  if (fileType.startsWith('video/')) return 'video';
  if (fileType.match(/pdf|doc|docx|txt|rtf|odt|pages/i)) return 'documents';
  if (fileType.match(/zip|rar|tar|gz|7z/i)) return 'archives';
  if (fileType.match(/js|ts|jsx|tsx|py|java|c|cpp|cs|go|php|rb|swift|html|css|json|xml/i)) return 'code';
  return 'other';
};

const getFileIcon = (fileType: string) => {
  if (fileType.startsWith('image/')) return <FileImage className="h-6 w-6 text-blue-500" />;
  if (fileType.startsWith('audio/')) return <FileAudio className="h-6 w-6 text-green-500" />;
  if (fileType.startsWith('video/')) return <FileVideo className="h-6 w-6 text-pink-500" />;
  if (fileType.match(/pdf|doc|docx|txt|rtf|odt|pages/i)) return <FileText className="h-6 w-6 text-orange-500" />;
  if (fileType.match(/zip|rar|tar|gz|7z/i)) return <FileArchive className="h-6 w-6 text-yellow-500" />;
  if (fileType.match(/xlsx|csv|xls|numbers|ods/i)) return <FileSpreadsheet className="h-6 w-6 text-emerald-500" />;
  if (fileType.match(/js|ts|jsx|tsx|py|java|c|cpp|cs|go|php|rb|swift|html|css|json|xml/i)) return <FileCode className="h-6 w-6 text-purple-500" />;
  return <FileText className="h-6 w-6 text-slate-500" />;
};

const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return bytes + ' B';
  else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  else if (bytes < 1073741824) return (bytes / 1048576).toFixed(1) + ' MB';
  else return (bytes / 1073741824).toFixed(2) + ' GB';
};

const FilePreview = ({ file, onClose }: { file: FileItem; onClose: () => void }) => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  
  useEffect(() => {
    const fetchPreviewUrl = async () => {
      try {
        const url = file.downloadUrl;
        setPreviewUrl(url);
      } catch (error) {
        console.error('Error fetching preview URL:', error);
      }
    };
    
    fetchPreviewUrl();
  }, [file]);

  const isImage = file.type.startsWith('image/');
  const isVideo = file.type.startsWith('video/');
  const isAudio = file.type.startsWith('audio/');
  const isPdf = file.type === 'application/pdf';
  const isText = file.type.match(/text\/|json|xml|javascript|css|html/i);
  
  return (
    <div className="relative flex flex-col h-full w-full">
      <div className="flex justify-between items-center p-3 border-b">
        <div className="flex items-center gap-2">
          {getFileIcon(file.type)}
          <span className="font-medium">{file.name}</span>
          <Badge variant="outline" className="ml-2">{formatFileSize(file.size)}</Badge>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-5 w-5" />
        </Button>
      </div>
      
      <div className="flex-1 flex items-center justify-center bg-slate-50 dark:bg-slate-900 overflow-hidden p-4">
        {previewUrl ? (
          <>
            {isImage && (
              <img 
                src={previewUrl} 
                alt={file.name} 
                className="max-h-full max-w-full object-contain"
              />
            )}
            {isVideo && (
              <video 
                src={previewUrl} 
                controls 
                className="max-h-full max-w-full" 
              />
            )}
            {isAudio && (
              <div className="text-center">
                <audio src={previewUrl} controls className="w-full max-w-md" />
                <div className="mt-2 text-sm text-muted-foreground">Audio: {file.name}</div>
              </div>
            )}
            {isPdf && (
              <iframe 
                src={`${previewUrl}#view=FitH`} 
                className="w-full h-full border-0" 
                title={file.name}
              />
            )}
            {isText && (
              <div className="w-full h-full">
                <iframe 
                  src={previewUrl} 
                  className="w-full h-full border-0" 
                  title={file.name}
                />
              </div>
            )}
            {!isImage && !isVideo && !isAudio && !isPdf && !isText && (
              <div className="text-center p-8">
                <div className="mb-4">
                  {getFileIcon(file.type)}
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  Preview not available for this file type
                </p>
                <Button asChild>
                  <a href={previewUrl} download={file.name} target="_blank" rel="noopener noreferrer">
                    <Download className="h-4 w-4 mr-2" />
                    Download File
                  </a>
                </Button>
              </div>
            )}
          </>
        ) : (
          <div className="text-center">
            <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full inline-block mb-4"></div>
            <p className="text-sm text-muted-foreground">Loading preview...</p>
          </div>
        )}
      </div>
      
      <div className="flex justify-between items-center p-3 border-t">
        <div className="flex items-center gap-2">
          <Avatar className="h-6 w-6">
            <AvatarImage src={file.createdByAvatar} />
            <AvatarFallback>{file.createdByName?.charAt(0) || 'U'}</AvatarFallback>
          </Avatar>
          <span className="text-sm text-muted-foreground">
            Uploaded by {file.createdByName}
          </span>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild>
            <a href={previewUrl || ''} download={file.name} target="_blank" rel="noopener noreferrer">
              <Download className="h-4 w-4 mr-1" />
              Download
            </a>
          </Button>
          <Button variant="outline" size="sm">
            <Share2 className="h-4 w-4 mr-1" />
            Share
          </Button>
        </div>
      </div>
    </div>
  );
};

// Main component
export function FileManagementSystem({ spaceId }: { spaceId?: string }) {
  const [user] = useAuthState(auth);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [filteredFiles, setFilteredFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [sortOption, setSortOption] = useState('date_desc');
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<FileUploadProgress[]>([]);
  const [previewFile, setPreviewFile] = useState<FileItem | null>(null);
  
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  
  // Fetch files from Firestore
  useEffect(() => {
    if (!user) return;
    
    const fetchFiles = async () => {
      try {
        setLoading(true);
        
        // Create query based on context (space or user files)
        let filesQuery;
        
        if (spaceId) {
          // Files in this space
          filesQuery = query(
            collection(db, 'files'),
            where('spaceId', '==', spaceId),
            orderBy('createdAt', 'desc')
          );
        } else {
          // User's personal files or files shared with them
          filesQuery = query(
            collection(db, 'files'),
            where('createdBy', '==', user.uid),
            orderBy('createdAt', 'desc')
          );
        }
        
        const filesSnapshot = await getDocs(filesQuery);
        const filesData = filesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as unknown as FileItem));
        
        // If space context, also get files shared with this space
        if (spaceId) {
          const sharedFilesQuery = query(
            collection(db, 'files'),
            where('sharedWith', 'array-contains', spaceId)
          );
          
          const sharedSnapshot = await getDocs(sharedFilesQuery);
          const sharedFilesData = sharedSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          } as unknown as FileItem));
          
          // Combine files
          filesData.push(...sharedFilesData);
        }
        
        // Sort by date
        filesData.sort((a, b) => {
          const dateA = a.createdAt instanceof Date ? a.createdAt : new Date(a.createdAt);
          const dateB = b.createdAt instanceof Date ? b.createdAt : new Date(b.createdAt);
          return dateB.getTime() - dateA.getTime();
        });
        
        setFiles(filesData);
        setFilteredFiles(filesData);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching files:', err);
        setError(`Failed to load files: ${err instanceof Error ? err.message : 'Unknown error'}`);
        setLoading(false);
      }
    };
    
    fetchFiles();
  }, [user, spaceId]);
  
  // Filter and sort files when criteria change
  useEffect(() => {
    if (!files.length) return;
    
    let result = [...files];
    
    // Apply category filter
    if (category !== 'all') {
      if (category === 'starred') {
        result = result.filter(file => file.starred);
      } else if (category === 'shared') {
        result = result.filter(file => file.sharedWith && file.sharedWith.length > 0);
      } else if (category === 'recent') {
        // Get files from last 7 days
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        
        result = result.filter(file => {
          const fileDate = file.createdAt instanceof Date ? file.createdAt : new Date(file.createdAt);
          return fileDate >= sevenDaysAgo;
        });
      } else {
        // Filter by file type category
        result = result.filter(file => getFileCategory(file.type) === category);
      }
    }
    
    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(file => 
        file.name.toLowerCase().includes(query) || 
        file.tags?.some(tag => tag.toLowerCase().includes(query))
      );
    }
    
    // Apply sorting
    switch (sortOption) {
      case 'name_asc':
        result.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'name_desc':
        result.sort((a, b) => b.name.localeCompare(a.name));
        break;
      case 'date_desc':
        result.sort((a, b) => {
          const dateA = a.createdAt instanceof Date ? a.createdAt : new Date(a.createdAt);
          const dateB = b.createdAt instanceof Date ? b.createdAt : new Date(b.createdAt);
          return dateB.getTime() - dateA.getTime();
        });
        break;
      case 'date_asc':
        result.sort((a, b) => {
          const dateA = a.createdAt instanceof Date ? a.createdAt : new Date(a.createdAt);
          const dateB = b.createdAt instanceof Date ? b.createdAt : new Date(b.createdAt);
          return dateA.getTime() - dateB.getTime();
        });
        break;
      case 'size_desc':
        result.sort((a, b) => b.size - a.size);
        break;
      case 'size_asc':
        result.sort((a, b) => a.size - b.size);
        break;
    }
    
    setFilteredFiles(result);
  }, [files, category, searchQuery, sortOption]);
  
  // Handle file selection
  const toggleFileSelection = (fileId: string) => {
    setSelectedFiles(prev => {
      if (prev.includes(fileId)) {
        return prev.filter(id => id !== fileId);
      } else {
        return [...prev, fileId];
      }
    });
  };
  
  const selectAllFiles = () => {
    if (selectedFiles.length === filteredFiles.length) {
      setSelectedFiles([]);
    } else {
      setSelectedFiles(filteredFiles.map(file => file.id));
    }
  };
  
  // Handle file upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !user) return;
    
    const filesToUpload = Array.from(e.target.files);
    setUploading(true);
    
    // Create progress trackers for each file
    const progressTrackers = filesToUpload.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      name: file.name,
      progress: 0,
    }));
    
    setUploadProgress(progressTrackers);
    
    // Upload each file
    for (let i = 0; i < filesToUpload.length; i++) {
      const file = filesToUpload[i];
      const tracker = progressTrackers[i];
      
      try {
        // Upload to Firebase Storage
        const downloadUrl = await uploadFile(file, spaceId ? `spaces/${spaceId}/files` : `users/${user.uid}/files`, (progress) => {
          // Update progress tracker
          setUploadProgress(prev => 
            prev.map(item => 
              item.id === tracker.id ? { ...item, progress } : item
            )
          );
        });
        
        // Create file metadata in Firestore
        const fileData = {
          name: file.name,
          type: file.type,
          size: file.size,
          createdAt: new Date(),
          createdBy: user.uid,
          createdByName: user.displayName || user.email?.split('@')[0] || 'User',
          createdByAvatar: user.photoURL || '',
          downloadUrl,
          path: spaceId ? `spaces/${spaceId}/files/${file.name}` : `users/${user.uid}/files/${file.name}`,
          tags: [],
          starred: false,
          category: getFileCategory(file.type),
          ...(spaceId && { 
            spaceId, 
            inSpace: spaceId,
          }),
          sharedWith: [],
        };
        
        // Generate thumbnail URL if it's an image
        if (file.type.startsWith('image/')) {
          fileData.thumbnailUrl = downloadUrl;
        }
        
        const docRef = await addDoc(collection(db, 'files'), fileData);
        
        // Update files list with the new file
        setFiles(prev => [{
          id: docRef.id,
          ...fileData,
        } as unknown as FileItem, ...prev]);
      } catch (err) {
        console.error(`Error uploading ${file.name}:`, err);
        
        // Update progress tracker with error
        setUploadProgress(prev => 
          prev.map(item => 
            item.id === tracker.id 
              ? { ...item, progress: 0, error: err instanceof Error ? err.message : 'Upload failed' } 
              : item
          )
        );
      }
    }
    
    setUploading(false);
    // Clear input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };
  
  // Handle file star toggle
  const toggleFileStar = async (fileId: string, isStarred: boolean) => {
    try {
      await updateDoc(doc(db, 'files', fileId), {
        starred: !isStarred,
      });
      
      // Update local state
      setFiles(prev => 
        prev.map(file => 
          file.id === fileId ? { ...file, starred: !isStarred } : file
        )
      );
    } catch (err) {
      console.error('Error updating file star:', err);
    }
  };
  
  // Handle file delete
  const deleteFiles = async (fileIds: string[]) => {
    try {
      const storage = getStorage();
      
      // Delete each file
      for (const fileId of fileIds) {
        const file = files.find(f => f.id === fileId);
        if (!file) continue;
        
        // Delete from Storage
        try {
          const fileRef = ref(storage, file.path);
          await deleteObject(fileRef);
        } catch (err) {
          console.error(`Error deleting file from storage: ${file.name}`, err);
        }
        
        // Delete from Firestore
        await deleteDoc(doc(db, 'files', fileId));
      }
      
      // Update local state
      setFiles(prev => prev.filter(file => !fileIds.includes(file.id)));
      setSelectedFiles([]);
    } catch (err) {
      console.error('Error deleting files:', err);
    }
  };
  
  return (
    <div className="flex flex-col h-full">
      {/* Header bar with search and filters */}
      <div className="flex items-center gap-3 p-4 border-b">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search files..."
            className="pl-9 w-full"
          />
        </div>
        
        <Select value={sortOption} onValueChange={setSortOption}>
          <SelectTrigger className="w-[180px]">
            <div className="flex items-center gap-2">
              <ArrowUpDown className="h-4 w-4" />
              <span>Sort</span>
            </div>
          </SelectTrigger>
          <SelectContent>
            {FILE_SORT_OPTIONS.map(option => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        <input
          type="file"
          ref={fileInputRef}
          multiple
          className="hidden"
          onChange={handleFileUpload}
        />
        
        <Button onClick={() => fileInputRef.current?.click()}>
          <UploadCloud className="h-4 w-4 mr-2" />
          Upload
        </Button>
      </div>
      
      {/* Content area with categories and file list */}
      <div className="flex flex-1 min-h-0">
        {/* Categories sidebar */}
        <div className="w-56 border-r p-3">
          <h3 className="text-sm font-medium mb-3">Categories</h3>
          <div className="space-y-1">
            {FILE_CATEGORIES.map((cat) => (
              <button
                key={cat.value}
                className={cn(
                  "flex items-center gap-2 w-full text-left px-3 py-2 text-sm rounded-md",
                  category === cat.value
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted"
                )}
                onClick={() => setCategory(cat.value)}
              >
                {cat.value === 'all' && <FileText className="h-4 w-4" />}
                {cat.value === 'images' && <FileImage className="h-4 w-4" />}
                {cat.value === 'documents' && <FileText className="h-4 w-4" />}
                {cat.value === 'audio' && <FileAudio className="h-4 w-4" />}
                {cat.value === 'video' && <FileVideo className="h-4 w-4" />}
                {cat.value === 'archives' && <FileArchive className="h-4 w-4" />}
                {cat.value === 'code' && <FileCode className="h-4 w-4" />}
                {cat.value === 'other' && <FileX className="h-4 w-4" />}
                {cat.value === 'starred' && <Star className="h-4 w-4" />}
                {cat.value === 'shared' && <Share2 className="h-4 w-4" />}
                {cat.value === 'recent' && <Clock className="h-4 w-4" />}
                {cat.label}
              </button>
            ))}
          </div>
        </div>
        
        {/* File list */}
        <div className="flex-1 overflow-hidden">
          <div className="p-4 border-b flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Checkbox 
                checked={selectedFiles.length > 0 && selectedFiles.length === filteredFiles.length}
                indeterminate={selectedFiles.length > 0 && selectedFiles.length < filteredFiles.length}
                onCheckedChange={selectAllFiles}
              />
              <Label>
                {selectedFiles.length > 0 
                  ? `${selectedFiles.length} selected` 
                  : 'Select all'}
              </Label>
            </div>
            
            {selectedFiles.length > 0 && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => deleteFiles(selectedFiles)}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Delete
                </Button>
              </div>
            )}
          </div>
          
          <ScrollArea className="h-[calc(100%-3rem)]">
            {loading ? (
              <div className="p-8 text-center">
                <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full inline-block mb-4"></div>
                <p className="text-sm text-muted-foreground">Loading files...</p>
              </div>
            ) : error ? (
              <div className="p-8 text-center text-destructive">
                <p>{error}</p>
                <Button variant="outline" className="mt-4" onClick={() => setError(null)}>
                  Try Again
                </Button>
              </div>
            ) : filteredFiles.length === 0 ? (
              <div className="p-8 text-center">
                <FileX className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-lg font-medium mb-2">No files found</p>
                <p className="text-sm text-muted-foreground mb-6">
                  {searchQuery 
                    ? `No files match "${searchQuery}"` 
                    : category !== 'all' 
                      ? `No files in this category` 
                      : 'Upload some files to get started'}
                </p>
                <Button onClick={() => fileInputRef.current?.click()}>
                  <UploadCloud className="h-4 w-4 mr-2" />
                  Upload Files
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-4">
                {filteredFiles.map((file) => (
                  <Card key={file.id} className="overflow-hidden hover:shadow-md transition-shadow">
                    <div 
                      className="relative h-32 bg-slate-100 dark:bg-slate-800 flex items-center justify-center overflow-hidden cursor-pointer"
                      onClick={() => setPreviewFile(file)}
                    >
                      {file.type.startsWith('image/') && file.thumbnailUrl ? (
                        <img 
                          src={file.thumbnailUrl} 
                          alt={file.name} 
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="text-center">
                          {getFileIcon(file.type)}
                        </div>
                      )}
                      
                      <div className="absolute top-2 left-2">
                        <Checkbox
                          checked={selectedFiles.includes(file.id)}
                          onCheckedChange={() => toggleFileSelection(file.id)}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                      
                      <button 
                        className="absolute top-2 right-2 text-foreground/80 hover:text-primary"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFileStar(file.id, file.starred);
                        }}
                      >
                        {file.starred ? (
                          <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                        ) : (
                          <StarOff className="h-5 w-5" />
                        )}
                      </button>
                      
                      <div 
                        className="absolute inset-0 bg-black/0 hover:bg-black/20 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
                        onClick={() => setPreviewFile(file)}
                      >
                        <Button variant="secondary" size="sm" className="gap-1">
                          <Eye className="h-4 w-4" />
                          Preview
                        </Button>
                      </div>
                    </div>
                    
                    <CardContent className="p-3">
                      <div className="flex justify-between items-start gap-2 mb-1">
                        <h3 className="font-medium text-sm truncate">{file.name}</h3>
                      </div>
                      <div className="flex justify-between items-center">
                        <div className="text-xs text-muted-foreground">
                          {formatFileSize(file.size)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(file.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    </CardContent>
                    
                    <CardFooter className="p-2 pt-0 flex justify-end">
                      <div className="flex gap-1">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                                <a href={file.downloadUrl} download={file.name} target="_blank" rel="noopener noreferrer">
                                  <Download className="h-4 w-4" />
                                </a>
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Download</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7">
                                <Share2 className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Share</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-7 w-7"
                                onClick={() => deleteFiles([file.id])}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Delete</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      </div>
      
      {/* Upload progress */}
      {uploading && uploadProgress.length > 0 && (
        <div className="border-t p-3 space-y-2 bg-slate-50 dark:bg-slate-900">
          <h4 className="text-sm font-medium">Uploading {uploadProgress.length} files</h4>
          <div className="space-y-2">
            {uploadProgress.map(item => (
              <div key={item.id} className="flex flex-col gap-1">
                <div className="flex justify-between items-center text-sm">
                  <span className="truncate">{item.name}</span>
                  <span>{item.progress}%</span>
                </div>
                <Progress value={item.progress} className="h-1" />
                {item.error && (
                  <p className="text-xs text-destructive">{item.error}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* File preview dialog */}
      <Dialog open={!!previewFile} onOpenChange={(open) => !open && setPreviewFile(null)}>
        <DialogContent className="max-w-5xl h-[80vh] p-0">
          {previewFile && <FilePreview file={previewFile} onClose={() => setPreviewFile(null)} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
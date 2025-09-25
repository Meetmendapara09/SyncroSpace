'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
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
  onSnapshot,
  serverTimestamp,
  arrayUnion,
  arrayRemove
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { Slider } from '@/components/ui/slider';
import { 
  Palette,
  Square,
  Circle,
  Triangle,
  ArrowRight,
  Type,
  StickyNote,
  Image,
  MousePointer,
  Hand,
  Pen,
  Eraser,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  RotateCw,
  Copy,
  Trash2,
  Download,
  Upload,
  Share,
  Users,
  Lock,
  Unlock,
  Grid,
  Eye,
  EyeOff,
  Save,
  Undo,
  Redo,
  Play,
  Pause,
  Timer,
  MessageSquare,
  Video,
  Mic,
  Settings,
  Search,
  Filter,
  Layout,
  Plus,
  Star,
  Heart,
  ThumbsUp,
  X
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { v4 as uuidv4 } from 'uuid';

// Types and Interfaces
interface WhiteboardElement {
  id: string;
  type: 'sticky-note' | 'text' | 'shape' | 'line' | 'arrow' | 'image' | 'frame' | 'connector';
  x: number;
  y: number;
  width: number;
  height: number;
  content?: string;
  color: string;
  backgroundColor?: string;
  strokeWidth: number;
  opacity: number;
  rotation: number;
  locked: boolean;
  createdBy: string;
  createdAt: any;
  updatedAt: any;
  properties: any;
  layer: number;
  visible: boolean;
  reactions: ElementReaction[];
  comments: ElementComment[];
}

interface ElementReaction {
  id: string;
  type: 'like' | 'love' | 'star' | 'idea';
  userId: string;
  timestamp: any;
}

interface ElementComment {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  content: string;
  timestamp: any;
  resolved: boolean;
}

interface WhiteboardCursor {
  userId: string;
  userName: string;
  userAvatar?: string;
  x: number;
  y: number;
  color: string;
  lastUpdate: number;
}

interface WhiteboardTemplate {
  id: string;
  name: string;
  description: string;
  thumbnail: string;
  category: string;
  elements: WhiteboardElement[];
  isPublic: boolean;
  createdBy: string;
  usageCount: number;
}

interface Whiteboard {
  id: string;
  name: string;
  description?: string;
  thumbnail?: string;
  teamId?: string;
  spaceId?: string;
  createdBy: string;
  createdAt: any;
  updatedAt: any;
  collaborators: string[];
  elements: WhiteboardElement[];
  permissions: {
    view: string[];
    edit: string[];
    comment: string[];
  };
  settings: {
    gridEnabled: boolean;
    snapToGrid: boolean;
    showCursors: boolean;
    allowComments: boolean;
    allowReactions: boolean;
    versionHistory: boolean;
  };
  isPublic: boolean;
  tags: string[];
}

const COLORS = [
  '#000000', '#FFFFFF', '#FF0000', '#00FF00', '#0000FF',
  '#FFFF00', '#FF00FF', '#00FFFF', '#FFA500', '#800080',
  '#FFC0CB', '#A52A2A', '#808080', '#000080', '#008000'
];

const SHAPES = [
  { type: 'rectangle', icon: Square, name: 'Rectangle' },
  { type: 'circle', icon: Circle, name: 'Circle' },
  { type: 'triangle', icon: Triangle, name: 'Triangle' },
  { type: 'arrow', icon: ArrowRight, name: 'Arrow' }
];

const STICKY_NOTE_COLORS = [
  '#FFEB3B', '#FF9800', '#F44336', '#E91E63', 
  '#9C27B0', '#3F51B5', '#2196F3', '#00BCD4',
  '#009688', '#4CAF50', '#8BC34A', '#CDDC39'
];

interface EnhancedWhiteboardProps {
  boardId: string;
  teamId?: string;
  spaceId?: string;
  isReadOnly?: boolean;
}

export function EnhancedWhiteboard({ boardId, teamId, spaceId, isReadOnly = false }: EnhancedWhiteboardProps) {
  const [user] = useAuthState(auth);
  const [board, setBoard] = useState<Whiteboard | null>(null);
  const [elements, setElements] = useState<WhiteboardElement[]>([]);
  const [selectedTool, setSelectedTool] = useState<string>('select');
  const [selectedElement, setSelectedElement] = useState<string | null>(null);
  const [cursors, setCursors] = useState<WhiteboardCursor[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  interface StrokePoint {
    x: number;
    y: number;
  }

  interface Stroke {
    id: string;
    type: 'line';
    points: StrokePoint[];
    color: string;
    strokeWidth: number;
    opacity: number;
  }

  const [currentStroke, setCurrentStroke] = useState<Stroke | null>(null);
  const [zoom, setZoom] = useState(100);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [showTemplates, setShowTemplates] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [showLayers, setShowLayers] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [templates, setTemplates] = useState<WhiteboardTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  // Drawing state
  const [strokeColor, setStrokeColor] = useState('#000000');
  const [backgroundColor, setBackgroundColor] = useState('#FFFFFF');
  const [strokeWidth, setStrokeWidth] = useState(2);
  const [opacity, setOpacity] = useState(100);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!boardId) return;

    // Load whiteboard data
    const boardDoc = doc(db, 'whiteboards', boardId);
    const unsubscribeBoard = onSnapshot(boardDoc, (snapshot) => {
      if (snapshot.exists()) {
        const boardData = { id: snapshot.id, ...snapshot.data() } as Whiteboard;
        setBoard(boardData);
        setElements(boardData.elements || []);
      }
      setLoading(false);
    });

    // Load cursors (real-time collaboration)
    const cursorsQuery = query(
      collection(db, 'whiteboards', boardId, 'cursors'),
      where('lastUpdate', '>', Date.now() - 30000) // Active in last 30 seconds
    );
    const unsubscribeCursors = onSnapshot(cursorsQuery, (snapshot) => {
      const cursorList = snapshot.docs
        .map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            userId: data.userId,
            userName: data.userName,
            userAvatar: data.userAvatar,
            x: data.x,
            y: data.y,
            color: data.color,
            lastUpdate: data.lastUpdate
          } as WhiteboardCursor;
        })
        .filter(cursor => cursor.userId !== user?.uid);
      setCursors(cursorList);
    });

    // Load templates
    const templatesQuery = query(collection(db, 'whiteboardTemplates'));
    const unsubscribeTemplates = onSnapshot(templatesQuery, (snapshot) => {
      const templateList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as WhiteboardTemplate[];
      setTemplates(templateList);
    });

    return () => {
      unsubscribeBoard();
      unsubscribeCursors();
      unsubscribeTemplates();
    };
  }, [boardId, user]);

  // Handle mouse/touch events
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (isReadOnly) return;

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = (e.clientX - rect.left - panOffset.x) / (zoom / 100);
    const y = (e.clientY - rect.top - panOffset.y) / (zoom / 100);

    setIsDrawing(true);

    if (selectedTool === 'pen') {
      setCurrentStroke({
        id: uuidv4(),
        type: 'line',
        points: [{ x, y }],
        color: strokeColor,
        strokeWidth,
        opacity: opacity / 100
      });
    } else if (selectedTool === 'sticky-note') {
      createStickyNote(x, y);
    } else if (SHAPES.some(shape => shape.type === selectedTool)) {
      createShape(selectedTool, x, y);
    }
  }, [selectedTool, strokeColor, strokeWidth, opacity, zoom, panOffset, isReadOnly]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = (e.clientX - rect.left - panOffset.x) / (zoom / 100);
    const y = (e.clientY - rect.top - panOffset.y) / (zoom / 100);

    // Update cursor position for real-time collaboration
    if (user && !isReadOnly) {
      updateCursor(x, y);
    }

    if (isDrawing && currentStroke && selectedTool === 'pen') {
      setCurrentStroke(prev => {
        if (!prev) return null;
        return {
          ...prev,
          points: [...prev.points, { x, y }]
        };
      });
    }
  }, [isDrawing, currentStroke, selectedTool, zoom, panOffset, user, isReadOnly]);

  const handlePointerUp = useCallback(() => {
    if (isDrawing && currentStroke && selectedTool === 'pen') {
      addElement({
        id: currentStroke.id,
        type: 'line',
        x: Math.min(...currentStroke.points.map((p: StrokePoint) => p.x)),
        y: Math.min(...currentStroke.points.map((p: StrokePoint) => p.y)),
        width: Math.max(...currentStroke.points.map((p: StrokePoint) => p.x)) - Math.min(...currentStroke.points.map((p: StrokePoint) => p.x)),
        height: Math.max(...currentStroke.points.map((p: StrokePoint) => p.y)) - Math.min(...currentStroke.points.map((p: StrokePoint) => p.y)),
        color: currentStroke.color,
        backgroundColor: 'transparent',
        strokeWidth: currentStroke.strokeWidth,
        opacity: currentStroke.opacity,
        rotation: 0,
        locked: false,
        createdBy: user?.uid || '',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        properties: { points: currentStroke.points },
        layer: 0,
        visible: true,
        reactions: [],
        comments: []
      });
    }
    
    setIsDrawing(false);
    setCurrentStroke(null);
  }, [isDrawing, currentStroke, selectedTool, user]);

  // Create sticky note
  const createStickyNote = async (x: number, y: number) => {
    const stickyNote: WhiteboardElement = {
      id: uuidv4(),
      type: 'sticky-note',
      x,
      y,
      width: 200,
      height: 200,
      content: 'New sticky note',
      color: '#000000',
      backgroundColor: STICKY_NOTE_COLORS[Math.floor(Math.random() * STICKY_NOTE_COLORS.length)],
      strokeWidth: 0,
      opacity: 1,
      rotation: 0,
      locked: false,
      createdBy: user?.uid || '',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      properties: { fontSize: 16, fontFamily: 'Arial' },
      layer: 0,
      visible: true,
      reactions: [],
      comments: []
    };

    await addElement(stickyNote);
  };

  // Create shape
  const createShape = async (shapeType: string, x: number, y: number) => {
    const shape: WhiteboardElement = {
      id: uuidv4(),
      type: 'shape',
      x,
      y,
      width: 100,
      height: 100,
      color: strokeColor,
      backgroundColor: backgroundColor,
      strokeWidth,
      opacity: opacity / 100,
      rotation: 0,
      locked: false,
      createdBy: user?.uid || '',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      properties: { shapeType },
      layer: 0,
      visible: true,
      reactions: [],
      comments: []
    };

    await addElement(shape);
  };

  // Add element to board
  const addElement = async (element: WhiteboardElement) => {
    if (!board) return;

    try {
      const updatedElements = [...elements, element];
      
      await updateDoc(doc(db, 'whiteboards', boardId), {
        elements: updatedElements,
        updatedAt: serverTimestamp()
      });

      toast({
        title: "Element added",
        description: "Element has been added to the whiteboard.",
      });

    } catch (error) {
      console.error('Error adding element:', error);
      toast({
        title: "Error",
        description: "Failed to add element to whiteboard.",
        variant: "destructive"
      });
    }
  };

  // Update cursor position
  const updateCursor = async (x: number, y: number) => {
    if (!user) return;

    try {
      const cursorData = {
        userId: user.uid,
        userName: user.displayName || user.email?.split('@')[0] || 'User',
        userAvatar: user.photoURL,
        x,
        y,
        color: `hsl(${Math.floor(Math.random() * 360)}, 70%, 50%)`,
        lastUpdate: Date.now()
      };

      await updateDoc(doc(db, 'whiteboards', boardId, 'cursors', user.uid), cursorData);
    } catch (error) {
      console.error('Error updating cursor:', error);
    }
  };

  // Delete element
  const deleteElement = async (elementId: string) => {
    if (!board) return;

    try {
      const updatedElements = elements.filter(el => el.id !== elementId);
      
      await updateDoc(doc(db, 'whiteboards', boardId), {
        elements: updatedElements,
        updatedAt: serverTimestamp()
      });

      setSelectedElement(null);

      toast({
        title: "Element deleted",
        description: "Element has been removed from the whiteboard.",
      });

    } catch (error) {
      console.error('Error deleting element:', error);
      toast({
        title: "Error",
        description: "Failed to delete element.",
        variant: "destructive"
      });
    }
  };

  // Add reaction to element
  const addReaction = async (elementId: string, reactionType: 'like' | 'love' | 'star' | 'idea') => {
    if (!user) return;

    try {
      const element = elements.find(el => el.id === elementId);
      if (!element) return;

      const existingReaction = element.reactions.find(r => r.userId === user.uid);
      let updatedReactions;

      if (existingReaction) {
        if (existingReaction.type === reactionType) {
          // Remove reaction
          updatedReactions = element.reactions.filter(r => r.userId !== user.uid);
        } else {
          // Update reaction type
          updatedReactions = element.reactions.map(r =>
            r.userId === user.uid ? { ...r, type: reactionType } : r
          );
        }
      } else {
        // Add new reaction
        updatedReactions = [...element.reactions, {
          id: uuidv4(),
          type: reactionType,
          userId: user.uid,
          timestamp: serverTimestamp()
        }];
      }

      const updatedElements = elements.map(el =>
        el.id === elementId ? { ...el, reactions: updatedReactions } : el
      );

      await updateDoc(doc(db, 'whiteboards', boardId), {
        elements: updatedElements,
        updatedAt: serverTimestamp()
      });

    } catch (error) {
      console.error('Error adding reaction:', error);
    }
  };

  // Add comment to element
  const addComment = async (elementId: string, content: string) => {
    if (!user || !content.trim()) return;

    try {
      const element = elements.find(el => el.id === elementId);
      if (!element) return;

      const newComment: ElementComment = {
        id: uuidv4(),
        userId: user.uid,
        userName: user.displayName || user.email?.split('@')[0] || 'User',
        userAvatar: user.photoURL || undefined,
        content: content.trim(),
        timestamp: serverTimestamp(),
        resolved: false
      };

      const updatedComments = [...element.comments, newComment];
      const updatedElements = elements.map(el =>
        el.id === elementId ? { ...el, comments: updatedComments } : el
      );

      await updateDoc(doc(db, 'whiteboards', boardId), {
        elements: updatedElements,
        updatedAt: serverTimestamp()
      });

    } catch (error) {
      console.error('Error adding comment:', error);
    }
  };

  // Export whiteboard
  const exportWhiteboard = async (format: 'png' | 'svg' | 'pdf') => {
    if (!canvasRef.current) return;

    try {
      const canvas = canvasRef.current;
      const link = document.createElement('a');
      
      if (format === 'png') {
        link.href = canvas.toDataURL('image/png');
        link.download = `${board?.name || 'whiteboard'}.png`;
      }
      
      link.click();

      toast({
        title: "Export successful",
        description: `Whiteboard exported as ${format.toUpperCase()}.`,
      });

    } catch (error) {
      console.error('Error exporting whiteboard:', error);
      toast({
        title: "Export failed",
        description: "Failed to export whiteboard.",
        variant: "destructive"
      });
    }
  };

  // Apply template
  const applyTemplate = async (template: WhiteboardTemplate) => {
    if (!board) return;

    try {
      const templateElements = template.elements.map(el => ({
        ...el,
        id: uuidv4(),
        createdBy: user?.uid || '',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      }));

      await updateDoc(doc(db, 'whiteboards', boardId), {
        elements: templateElements,
        updatedAt: serverTimestamp()
      });

      setShowTemplates(false);

      // Update template usage count
      await updateDoc(doc(db, 'whiteboardTemplates', template.id), {
        usageCount: (template.usageCount || 0) + 1
      });

      toast({
        title: "Template applied",
        description: `Template "${template.name}" has been applied to the whiteboard.`,
      });

    } catch (error) {
      console.error('Error applying template:', error);
      toast({
        title: "Error",
        description: "Failed to apply template.",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading whiteboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-2 bg-white border-b shadow-sm">
        <div className="flex items-center gap-2">
          {/* Tool Selection */}
          <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-lg">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={selectedTool === 'select' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setSelectedTool('select')}
                  >
                    <MousePointer className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Select</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={selectedTool === 'hand' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setSelectedTool('hand')}
                  >
                    <Hand className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Pan</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={selectedTool === 'pen' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setSelectedTool('pen')}
                  >
                    <Pen className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Draw</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={selectedTool === 'sticky-note' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setSelectedTool('sticky-note')}
                  >
                    <StickyNote className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Sticky Note</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={selectedTool === 'text' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setSelectedTool('text')}
                  >
                    <Type className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Text</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* Shapes */}
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={SHAPES.some(shape => shape.type === selectedTool) ? 'default' : 'ghost'}
                  size="sm"
                >
                  <Square className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-2">
                <div className="grid grid-cols-2 gap-1">
                  {SHAPES.map((shape) => (
                    <Button
                      key={shape.type}
                      variant={selectedTool === shape.type ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setSelectedTool(shape.type)}
                      className="w-full"
                    >
                      <shape.icon className="h-4 w-4 mr-2" />
                      {shape.name}
                    </Button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          </div>

          {/* Color and Style Controls */}
          <div className="flex items-center gap-2 ml-4">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="w-8 h-8 p-0">
                  <div
                    className="w-4 h-4 rounded"
                    style={{ backgroundColor: strokeColor }}
                  />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-2">
                <div className="grid grid-cols-5 gap-1">
                  {COLORS.map((color) => (
                    <Button
                      key={color}
                      variant="ghost"
                      size="sm"
                      className="w-8 h-8 p-0"
                      onClick={() => setStrokeColor(color)}
                    >
                      <div
                        className="w-4 h-4 rounded border"
                        style={{ backgroundColor: color }}
                      />
                    </Button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>

            <div className="flex items-center gap-2">
              <Label className="text-xs">Width:</Label>
              <Slider
                value={[strokeWidth]}
                onValueChange={(value) => setStrokeWidth(value[0])}
                max={20}
                min={1}
                step={1}
                className="w-20"
              />
            </div>

            <div className="flex items-center gap-2">
              <Label className="text-xs">Opacity:</Label>
              <Slider
                value={[opacity]}
                onValueChange={(value) => setOpacity(value[0])}
                max={100}
                min={10}
                step={10}
                className="w-20"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Zoom Controls */}
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setZoom(Math.max(25, zoom - 25))}
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="text-sm w-16 text-center">{zoom}%</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setZoom(Math.min(400, zoom + 25))}
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
          </div>

          {/* Action Buttons */}
          <Button variant="outline" size="sm" onClick={() => setShowTemplates(true)}>
            <Layout className="h-4 w-4 mr-1" />
            Templates
          </Button>

          <Button variant="outline" size="sm" onClick={() => setShowComments(!showComments)}>
            <MessageSquare className="h-4 w-4 mr-1" />
            Comments
          </Button>

          <Button variant="outline" size="sm" onClick={() => exportWhiteboard('png')}>
            <Download className="h-4 w-4 mr-1" />
            Export
          </Button>

          <Button variant="outline" size="sm" onClick={() => setShowSettings(true)}>
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Main Canvas Area */}
      <div className="flex flex-1 overflow-hidden">
        <div
          ref={containerRef}
          className="flex-1 relative overflow-hidden"
          style={{ cursor: selectedTool === 'hand' ? 'grab' : 'crosshair' }}
        >
          <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full"
            style={{
              transform: `scale(${zoom / 100}) translate(${panOffset.x}px, ${panOffset.y}px)`
            }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
          />

          {/* Real-time cursors */}
          {cursors.map((cursor) => (
            <div
              key={cursor.userId}
              className="absolute pointer-events-none z-50"
              style={{
                left: cursor.x * (zoom / 100) + panOffset.x,
                top: cursor.y * (zoom / 100) + panOffset.y,
                transform: 'translate(-50%, -50%)'
              }}
            >
              <div
                className="w-4 h-4 rounded-full border-2 border-white"
                style={{ backgroundColor: cursor.color }}
              />
              <div className="mt-1 px-2 py-1 bg-black text-white text-xs rounded whitespace-nowrap">
                {cursor.userName}
              </div>
            </div>
          ))}

          {/* Element overlays for reactions and comments */}
          {elements.map((element) => (
            <div
              key={element.id}
              className="absolute"
              style={{
                left: element.x * (zoom / 100) + panOffset.x,
                top: element.y * (zoom / 100) + panOffset.y,
                width: element.width * (zoom / 100),
                height: element.height * (zoom / 100)
              }}
            >
              {/* Reactions */}
              {element.reactions.length > 0 && (
                <div className="absolute -top-8 left-0 flex gap-1">
                  {element.reactions.map((reaction) => (
                    <Badge key={reaction.id} variant="secondary" className="text-xs">
                      {reaction.type === 'like' && '👍'}
                      {reaction.type === 'love' && '❤️'}
                      {reaction.type === 'star' && '⭐'}
                      {reaction.type === 'idea' && '💡'}
                    </Badge>
                  ))}
                </div>
              )}

              {/* Comments indicator */}
              {element.comments.length > 0 && (
                <div className="absolute -top-8 right-0">
                  <Badge variant="outline" className="text-xs">
                    <MessageSquare className="h-3 w-3 mr-1" />
                    {element.comments.length}
                  </Badge>
                </div>
              )}

              {/* Element actions (visible on hover) */}
              {selectedElement === element.id && (
                <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 flex gap-1 bg-white rounded-lg shadow-lg p-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => addReaction(element.id, 'like')}
                  >
                    <ThumbsUp className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => addReaction(element.id, 'love')}
                  >
                    <Heart className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => addReaction(element.id, 'star')}
                  >
                    <Star className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteElement(element.id)}
                    className="text-destructive"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Comments Panel */}
        {showComments && (
          <div className="w-80 bg-white border-l p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Comments</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowComments(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <ScrollArea className="h-96">
              <div className="space-y-4">
                {elements
                  .filter(el => el.comments.length > 0)
                  .map((element) => (
                    <Card key={element.id}>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">
                          {element.type} element
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {element.comments.map((comment) => (
                          <div key={comment.id} className="flex gap-2">
                            <Avatar className="h-6 w-6">
                              <AvatarImage src={comment.userAvatar} />
                              <AvatarFallback>{comment.userName.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-sm font-medium">{comment.userName}</span>
                                <span className="text-xs text-muted-foreground">
                                  {comment.timestamp?.toDate?.()?.toLocaleDateString()}
                                </span>
                              </div>
                              <p className="text-sm">{comment.content}</p>
                            </div>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  ))}
              </div>
            </ScrollArea>
          </div>
        )}
      </div>

      {/* Templates Dialog */}
      <Dialog open={showTemplates} onOpenChange={setShowTemplates}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Whiteboard Templates</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-96 overflow-y-auto">
            {templates.map((template) => (
              <Card key={template.id} className="cursor-pointer hover:shadow-lg transition-shadow">
                <CardContent className="p-4" onClick={() => applyTemplate(template)}>
                  <div className="aspect-video bg-gray-100 rounded-lg mb-3">
                    {template.thumbnail && (
                      <img
                        src={template.thumbnail}
                        alt={template.name}
                        className="w-full h-full object-cover rounded-lg"
                      />
                    )}
                  </div>
                  <h3 className="font-semibold mb-1">{template.name}</h3>
                  <p className="text-sm text-muted-foreground mb-2">{template.description}</p>
                  <div className="flex items-center justify-between">
                    <Badge variant="outline">{template.category}</Badge>
                    <span className="text-xs text-muted-foreground">
                      Used {template.usageCount || 0} times
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
'use client';

import * as React from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Button } from '@/components/ui/button';

type Tool = 'pen' | 'highlighter' | 'eraser' | 'line' | 'rect' | 'circle' | 'text';

type Point = { x: number; y: number };

type Stroke = {
  id: string;
  tool: Tool;
  color: string;
  size: number;
  alpha?: number;
  points?: Point[]; // for pen/highlighter/eraser/line
  bbox?: { x: number; y: number; w: number; h: number }; // for rect/circle
  text?: string; // for text
  position?: { x: number; y: number }; // for text
};

export function DrawingCanvas({ boardPath }: { boardPath: string }) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [strokes, setStrokes] = React.useState<Stroke[]>([]);
  const [undoStack, setUndoStack] = React.useState<Stroke[][]>([]);
  const [redoStack, setRedoStack] = React.useState<Stroke[][]>([]);
  const [tool, setTool] = React.useState<Tool>('pen');
  const [color, setColor] = React.useState<string>('#1e1e1e');
  const [size, setSize] = React.useState<number>(3);
  const [isDrawing, setIsDrawing] = React.useState(false);
  const [startPt, setStartPt] = React.useState<Point | null>(null);
  const [zoom, setZoom] = React.useState(1);
  const [pan, setPan] = React.useState<Point>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = React.useState(false);

  const boardRef = React.useMemo(() => doc(db, boardPath), [boardPath]);

  // Load board
  React.useEffect(() => {
    const unsub = onSnapshot(boardRef, snap => {
      const data = snap.data() as any;
      if (data?.strokes) setStrokes(data.strokes);
    });
    return () => unsub();
  }, [boardRef]);

  // Save board debounced
  const save = React.useRef<any>();
  React.useEffect(() => {
    clearTimeout(save.current);
    save.current = setTimeout(() => {
      setDoc(boardRef, { strokes }, { merge: true });
    }, 300);
  }, [strokes, boardRef]);

  const getPos = (e: React.MouseEvent | React.TouchEvent): Point => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    const x = (clientX - rect.left - pan.x) / zoom;
    const y = (clientY - rect.top - pan.y) / zoom;
    return { x, y };
  };

  const pushHistory = (next: Stroke[]) => {
    setUndoStack(prev => [...prev, strokes]);
    setRedoStack([]);
    setStrokes(next);
  };

  const handlePointerDown = (e: any) => {
    if (e.button === 1 || (tool === 'text' && e.type === 'mousedown' && e.detail === 2)) return; // ignore middle
    if (e.button === 1) return;
    if (tool === 'pen' || tool === 'highlighter' || tool === 'eraser' || tool === 'line') {
      const p = getPos(e);
      const stroke: Stroke = {
        id: crypto.randomUUID(),
        tool,
        color,
        size,
        alpha: tool === 'highlighter' ? 0.3 : 1,
        points: [p],
      };
      setIsDrawing(true);
      setStartPt(p);
      setStrokes(prev => [...prev, stroke]);
    } else if (tool === 'rect' || tool === 'circle') {
      const p = getPos(e);
      const stroke: Stroke = { id: crypto.randomUUID(), tool, color, size, bbox: { x: p.x, y: p.y, w: 0, h: 0 } };
      setIsDrawing(true);
      setStartPt(p);
      setStrokes(prev => [...prev, stroke]);
    } else if (tool === 'text') {
      const p = getPos(e);
      const text = prompt('Enter text');
      if (!text) return;
      pushHistory([...strokes, { id: crypto.randomUUID(), tool: 'text', color, size, text, position: p }]);
    }
  };

  const handlePointerMove = (e: any) => {
    if (!isDrawing) return;
    const p = getPos(e);
    setStrokes(prev => {
      const next = [...prev];
      const current = next[next.length - 1];
      if (!current) return prev;
      if (current.points) {
        current.points = [...current.points, p];
      } else if (current.bbox && startPt) {
        current.bbox = { x: startPt.x, y: startPt.y, w: p.x - startPt.x, h: p.y - startPt.y };
      }
      return next;
    });
  };

  const handlePointerUp = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    setStartPt(null);
    // push to history for undo
    setUndoStack(prev => [...prev, strokes]);
  };

  const redraw = React.useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, rect.width, rect.height);
    ctx.save();
    ctx.translate(pan.x, pan.y);
    ctx.scale(zoom, zoom);
    strokes.forEach(s => {
      ctx.globalAlpha = s.alpha ?? 1;
      ctx.strokeStyle = s.tool === 'eraser' ? '#ffffff' : s.color;
      ctx.fillStyle = s.color;
      ctx.lineWidth = s.size;
      ctx.lineCap = 'round';
      if (s.points && (s.tool === 'pen' || s.tool === 'highlighter' || s.tool === 'eraser' || s.tool === 'line')) {
        ctx.beginPath();
        s.points.forEach((pt, i) => {
          if (i === 0) ctx.moveTo(pt.x, pt.y); else ctx.lineTo(pt.x, pt.y);
        });
        ctx.stroke();
      } else if (s.bbox && s.tool === 'rect') {
        ctx.strokeRect(s.bbox.x, s.bbox.y, s.bbox.w, s.bbox.h);
      } else if (s.bbox && s.tool === 'circle') {
        ctx.beginPath();
        const r = Math.hypot(s.bbox.w, s.bbox.h);
        ctx.arc(s.bbox.x, s.bbox.y, r, 0, Math.PI * 2);
        ctx.stroke();
      } else if (s.tool === 'text' && s.text && s.position) {
        ctx.globalAlpha = 1;
        ctx.font = `${Math.max(12, s.size * 6)}px Inter, Arial`;
        ctx.fillText(s.text, s.position.x, s.position.y);
      }
      ctx.globalAlpha = 1;
    });
    ctx.restore();
  }, [strokes, pan, zoom]);

  React.useEffect(() => {
    redraw();
  }, [redraw]);

  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey) {
      e.preventDefault();
      const factor = e.deltaY < 0 ? 1.1 : 0.9;
      setZoom(z => Math.min(4, Math.max(0.25, z * factor)));
    } else if (e.shiftKey) {
      setPan(p => ({ x: p.x - e.deltaY, y: p.y }));
    } else {
      setPan(p => ({ x: p.x, y: p.y - e.deltaY }));
    }
  };

  const undo = () => {
    if (strokes.length === 0) return;
    setRedoStack(prev => [...prev, strokes]);
    setStrokes(prev => prev.slice(0, -1));
  };
  const redo = () => {
    if (redoStack.length === 0) return;
    const last = redoStack[redoStack.length - 1];
    setRedoStack(prev => prev.slice(0, -1));
    setStrokes(last);
  };
  const clearAll = () => setStrokes([]);

  return (
    <div className="h-full w-full flex flex-col" ref={containerRef}>
      <div className="flex items-center gap-2 p-2 border-b bg-muted/40">
        <select aria-label="Tool" value={tool} onChange={(e) => setTool(e.target.value as Tool)} className="border rounded px-2 py-1">
          <option value="pen">Pen</option>
          <option value="highlighter">Highlighter</option>
          <option value="eraser">Eraser</option>
          <option value="line">Line</option>
          <option value="rect">Rectangle</option>
          <option value="circle">Circle</option>
          <option value="text">Text</option>
        </select>
        <input aria-label="Color" title="Color" type="color" value={color} onChange={(e) => setColor(e.target.value)} />
        <input aria-label="Size" title="Size" type="range" min={1} max={24} value={size} onChange={(e) => setSize(parseInt(e.target.value))} />
        <Button size="sm" variant="outline" onClick={undo}>Undo</Button>
        <Button size="sm" variant="outline" onClick={redo}>Redo</Button>
        <Button size="sm" variant="destructive" onClick={clearAll}>Clear</Button>
        <span className="ml-auto text-xs text-muted-foreground">Zoom: {(zoom*100).toFixed(0)}%</span>
      </div>
      <div className="relative flex-1">
        <canvas
          ref={canvasRef}
          className="h-full w-full bg-white cursor-crosshair"
          onMouseDown={handlePointerDown}
          onMouseMove={handlePointerMove}
          onMouseUp={handlePointerUp}
          onMouseLeave={handlePointerUp}
          onTouchStart={handlePointerDown}
          onTouchMove={handlePointerMove}
          onTouchEnd={handlePointerUp}
          onWheel={handleWheel}
        />
      </div>
    </div>
  );
}



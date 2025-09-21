'use client';

import * as React from 'react';
import { CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DragHandleDots2Icon } from '@radix-ui/react-icons';
import { Plus, Move, X, Settings2, Edit2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from '@/lib/utils';

export type WidgetSize = 'small' | 'medium' | 'large' | 'full';

export interface WidgetProps {
  id: string;
  type: string;
  title: string;
  size: WidgetSize;
  isEditing: boolean;
  isMoving: boolean;
  onRemove: (id: string) => void;
  onEdit?: (id: string) => void;
  onSizeChange?: (id: string, size: WidgetSize) => void;
  children?: React.ReactNode;
}

export function Widget({ 
  id,
  type,
  title,
  size,
  isEditing,
  isMoving,
  onRemove,
  onEdit,
  onSizeChange,
  children 
}: WidgetProps) {
  return (
    <div 
      className={cn(
        "rounded-xl border bg-card text-card-foreground shadow-sm",
        "transition-all duration-200 flex flex-col h-full",
        isEditing && "border-dashed border-2 border-primary/50 animate-pulse",
        isMoving && "cursor-move opacity-75 scale-95 border-dashed border-2 border-primary"
      )}
      data-widget-id={id}
      data-widget-type={type}
      data-widget-size={size}
    >
      <div className="p-4 flex justify-between items-center border-b">
        <div className="flex items-center gap-2">
          {isMoving && (
            <DragHandleDots2Icon className="h-5 w-5 text-muted-foreground cursor-move" />
          )}
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
        </div>
        
        {isEditing && (
          <div className="flex items-center gap-2">
            {onSizeChange && (
              <DropdownMenu>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                          <span className="sr-only">Change size</span>
                          <Settings2 className="h-3.5 w-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Resize widget</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onSizeChange(id, 'small')}>
                    Small
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onSizeChange(id, 'medium')}>
                    Medium
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onSizeChange(id, 'large')}>
                    Large
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onSizeChange(id, 'full')}>
                    Full Width
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            
            {onEdit && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => onEdit(id)}>
                      <span className="sr-only">Edit widget</span>
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Edit widget</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-7 w-7 p-0 text-destructive hover:text-destructive/80" 
                    onClick={() => onRemove(id)}
                  >
                    <span className="sr-only">Remove widget</span>
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Remove widget</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        )}
      </div>
      <div className="p-4 flex-1 overflow-auto">
        {children}
      </div>
    </div>
  );
}
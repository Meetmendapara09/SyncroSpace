'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  placeholder?: string;
  className?: string;
}

export function MarkdownEditor({
  value,
  onChange,
  rows = 15,
  placeholder = 'Write using Markdown...',
  className = '',
}: MarkdownEditorProps) {
  const [activeTab, setActiveTab] = useState<string>('edit');

  return (
    <div className={`border rounded-md ${className}`}>
      <Tabs defaultValue="edit" value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="flex items-center justify-between px-4 py-2 border-b">
          <TabsList>
            <TabsTrigger value="edit">Edit</TabsTrigger>
            <TabsTrigger value="preview">Preview</TabsTrigger>
          </TabsList>
          <div className="text-xs text-muted-foreground">
            Supports <a href="https://www.markdownguide.org/cheat-sheet/" target="_blank" rel="noreferrer" className="text-primary underline">Markdown</a>
          </div>
        </div>
        <TabsContent value="edit" className="p-0">
          <Textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            rows={rows}
            className="border-0 rounded-none resize-none"
          />
        </TabsContent>
        <TabsContent value="preview" className="p-4">
          {value ? (
            <div className="prose dark:prose-invert prose-headings:text-primary prose-headings:font-bold prose-strong:font-bold max-w-none">
              <ReactMarkdown 
                remarkPlugins={[remarkGfm]} 
                rehypePlugins={[rehypeRaw]}
                components={{
                  h1: ({node, ...props}) => <h1 className="text-3xl font-bold mt-6 mb-4 text-primary" {...props} />,
                  h2: ({node, ...props}) => <h2 className="text-2xl font-semibold mt-5 mb-3 text-primary/90" {...props} />,
                  h3: ({node, ...props}) => <h3 className="text-xl font-medium mt-4 mb-2 text-primary/80" {...props} />,
                  strong: ({node, ...props}) => <strong className="font-bold" {...props} />,
                  a: ({node, href, ...props}) => <a href={href} className="text-primary underline hover:text-primary/80" {...props} />,
                }}
              >
                {value}
              </ReactMarkdown>
            </div>
          ) : (
            <p className="text-muted-foreground italic">Nothing to preview.</p>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
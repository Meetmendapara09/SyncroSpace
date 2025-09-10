
import { ConversationSidebar } from '@/components/chat/conversation-sidebar';

export default function ChatLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="grid h-[calc(100vh-theme(spacing.14))] grid-cols-1 md:grid-cols-[300px_1fr]">
      <ConversationSidebar />
      <div className="flex flex-col">
        {children}
      </div>
    </div>
  );
}

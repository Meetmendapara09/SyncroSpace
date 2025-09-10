
import { MessageSquareText } from 'lucide-react';

export default function ChatPage() {
  return (
      <div className="flex-1 flex flex-col items-center justify-center text-center h-full border-l">
        <MessageSquareText className="h-16 w-16 text-muted-foreground" />
        <h3 className="mt-4 text-xl font-medium">Select a Conversation</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Choose a person from the sidebar to start chatting.
        </p>
      </div>
  );
}

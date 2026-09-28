import { ChatComposer } from "./components/chat-composer";
import { ChatHeader } from "./components/chat-header";
import { ChatWelcome } from "./components/chat-welcome";

/** The AI assistant panel. Layout only for now — nothing is sent anywhere. */
export function ChatPanel() {
  return (
    <aside className="flex min-h-0 flex-col border-l bg-background">
      <ChatHeader />
      <div className="flex-1 overflow-y-auto p-4">
        <ChatWelcome />
      </div>
      <ChatComposer />
    </aside>
  );
}

import { Outlet, useParams, useLocation } from "react-router-dom";
import { ChatsSidebar } from "../components/chat/ChatsSidebar";
import { MessageCircle } from "lucide-react";

export function ChatLayout() {
  const { chatId } = useParams();
  const location = useLocation();
  const isChatOpen = !!chatId || location.pathname.includes('/chat/');

  return (
    <div className="h-[calc(100vh-64px)] flex bg-background overflow-hidden">
      {/* Sidebar - Hidden on mobile when chat is open */}
      <div className={`w-full md:w-80 lg:w-96 flex-shrink-0 border-r border-white/10 ${
        isChatOpen ? "hidden md:flex" : "flex"
      }`}>
        <ChatsSidebar currentChatId={chatId} />
      </div>

      {/* Main Content Area */}
      <div className={`flex-1 flex flex-col min-w-0 bg-background/95 ${
        !isChatOpen ? "hidden md:flex" : "flex"
      }`}>
        {chatId ? (
          <Outlet />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-muted-foreground">
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
              <MessageCircle className="w-8 h-8 opacity-50" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Vælg en samtale</h3>
            <p className="max-w-sm">
              Vælg en samtale fra listen til venstre for at se beskeder og chatte med købere eller sælgere.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

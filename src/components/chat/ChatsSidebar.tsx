import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, MessageCircle, Search, Trash2 } from "lucide-react";
import { supabase } from "../../lib/supabase";

interface Chat {
  id: string;
  buyer_id: string;
  seller_id: string;
  item_id: string;
  item_type: "product" | "room";
  created_at: string;
  updated_at: string;
  deleted_by_buyer: boolean;
  deleted_by_seller: boolean;
}

interface ChatWithDetails extends Chat {
  other_user_id: string;
  other_user_username: string | null;
  other_user_avatar_url: string | null;
  item_title: string;
  last_message?: string;
  last_message_time?: string;
  unread_count: number;
}

interface ChatsSidebarProps {
  currentChatId?: string;
  onChatSelect?: () => void; // For mobile to close sidebar
}

export function ChatsSidebar({ currentChatId, onChatSelect }: ChatsSidebarProps) {
  const navigate = useNavigate();
  const [chats, setChats] = useState<ChatWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    checkUser();
  }, []);

  useEffect(() => {
    if (currentUserId) {
      fetchChats();
      subscribeToChats();
    }
  }, [currentUserId]);

  // Ensure chats are refreshed when navigating into a specific chat
  useEffect(() => {
    if (currentUserId && currentChatId) {
      fetchChats();
    }
  }, [currentUserId, currentChatId]);

  // Listen for local events from ChatPage:
  // - "chat:messagesRead" to clear unread count immediately
  // - "chat:createdOrRestored" to refetch list when a chat is created/restored
  useEffect(() => {
    const handleMessagesRead = (event: Event) => {
      const customEvent = event as CustomEvent<{ chatId: string }>;
      const chatId = customEvent.detail?.chatId;
      if (!chatId) return;

      setChats((prev) =>
        prev.map((chat) =>
          chat.id === chatId ? { ...chat, unread_count: 0 } : chat
        )
      );
    };

    const handleChatCreatedOrRestored = () => {
      fetchChats();
    };

    window.addEventListener("chat:messagesRead", handleMessagesRead as EventListener);
    window.addEventListener(
      "chat:createdOrRestored",
      handleChatCreatedOrRestored as EventListener
    );
    return () => {
      window.removeEventListener(
        "chat:messagesRead",
        handleMessagesRead as EventListener
      );
      window.removeEventListener(
        "chat:createdOrRestored",
        handleChatCreatedOrRestored as EventListener
      );
    };
  }, []);

  const checkUser = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    setCurrentUserId(user?.id || null);
  };

  const fetchChats = async () => {
    if (!currentUserId) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("chats")
        .select("*")
        .or(`buyer_id.eq.${currentUserId},seller_id.eq.${currentUserId}`)
        .order("updated_at", { ascending: false });

      if (error) throw error;

      // Filter out deleted chats
      const activeChats = (data || []).filter((chat: Chat) => {
        if (chat.buyer_id === currentUserId) return !chat.deleted_by_buyer;
        if (chat.seller_id === currentUserId) return !chat.deleted_by_seller;
        return true;
      });

      // Fetch details for each chat
      const chatsWithDetails: ChatWithDetails[] = await Promise.all(
        activeChats.map(async (chat: Chat) => {
          const otherUserId =
            chat.buyer_id === currentUserId ? chat.seller_id : chat.buyer_id;

          // Fetch other user's username and avatar
          let otherUsername: string | null = null;
          let otherAvatarUrl: string | null = null;
          try {
            const { data: usernameData } = await supabase.rpc(
              "get_user_username",
              {
                user_uuid: otherUserId,
              }
            );
            otherUsername = usernameData?.username || null;
            otherAvatarUrl = usernameData?.avatar_url || null;
          } catch {
            // Error fetching username - continue silently
          }

          // Fetch item title
          let itemTitle = "";
          if (chat.item_type === "product") {
            const { data: productData } = await supabase
              .from("products")
              .select("brand, model, type")
              .eq("id", chat.item_id)
              .maybeSingle();

            if (productData) {
              itemTitle =
                productData.brand && productData.model
                  ? `${productData.brand} ${productData.model}`
                  : productData.brand || productData.model || productData.type;
            }
          } else {
            const { data: roomData } = await supabase
              .from("rehearsal_rooms")
              .select("name, type")
              .eq("id", chat.item_id)
              .maybeSingle();

            if (roomData) {
              itemTitle = roomData.name || roomData.type;
            }
          }

          // Fetch last message and unread count
          const { data: messagesData } = await supabase
            .from("messages")
            .select("*")
            .eq("chat_id", chat.id)
            .order("created_at", { ascending: false })
            .limit(1);

          const lastMessage = messagesData?.[0];
          let unreadCount = 0;

          if (lastMessage) {
            const { count } = await supabase
              .from("messages")
              .select("*", { count: "exact", head: true })
              .eq("chat_id", chat.id)
              .eq("read", false)
              .neq("sender_id", currentUserId);

            unreadCount = count || 0;
          }

          return {
            ...chat,
            other_user_id: otherUserId,
            other_user_username: otherUsername,
            other_user_avatar_url: otherAvatarUrl,
            item_title: itemTitle,
            last_message: lastMessage?.content,
            last_message_time: lastMessage?.created_at,
            unread_count: unreadCount,
          };
        })
      );

      setChats(chatsWithDetails);
    } catch {
      // Error fetching chats - handled silently
    } finally {
      setLoading(false);
    }
  };

  const subscribeToChats = () => {
    if (!currentUserId) return;

    const channel = supabase
      .channel("chats_list")
      // Listen for any changes to chats where the user is buyer
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "chats",
          filter: `buyer_id=eq.${currentUserId}`,
        },
        () => {
          fetchChats();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "chats",
          filter: `seller_id=eq.${currentUserId}`,
        },
        () => {
          fetchChats();
        }
      )
      // Listen for new messages and read-status updates so unread counts stay in sync
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "messages",
        },
        () => {
          fetchChats();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const deleteChat = async (e: React.MouseEvent | React.TouchEvent, chat: ChatWithDetails) => {
    e.stopPropagation(); // Prevent navigation
    e.preventDefault();
    if (!confirm("Er du sikker på, at du vil slette denne samtale?")) return;

    try {
      const updateData =
        chat.buyer_id === currentUserId
          ? { deleted_by_buyer: true }
          : { deleted_by_seller: true };

      const { error } = await supabase
        .from("chats")
        .update(updateData)
        .eq("id", chat.id);

      if (error) throw error;

      // Optimistic update
      setChats((prev) => prev.filter((c) => c.id !== chat.id));
      
      // If currently viewing this chat, navigate away
      if (currentChatId === chat.id) {
        navigate("/chat");
      }
    } catch {
      alert("Kunne ikke slette samtale.");
    }
  };

  const formatTime = (dateString?: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      const diffInMinutes = Math.floor(
        (now.getTime() - date.getTime()) / (1000 * 60)
      );
      return diffInMinutes < 1 ? "Lige nu" : `${diffInMinutes}m`;
    }
    if (diffInHours < 24) {
      return date.toLocaleTimeString("da-DK", { hour: "2-digit", minute: "2-digit" });
    }
    if (diffInHours < 168) {
      return date.toLocaleDateString("da-DK", { weekday: "short" });
    }
    return date.toLocaleDateString("da-DK", { day: "numeric", month: "short" });
  };

  const filteredChats = chats.filter((chat) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      chat.other_user_username?.toLowerCase().includes(searchLower) ||
      chat.item_title?.toLowerCase().includes(searchLower) ||
      chat.last_message?.toLowerCase().includes(searchLower)
    );
  });

  if (!currentUserId) return null;

  return (
    <div className="flex flex-col h-full w-full bg-background/50 backdrop-blur-sm">
      <div className="p-4 border-b border-white/10">
        <h2 className="text-xl font-bold text-white mb-4">Indbakke</h2>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Søg i samtaler..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-secondary/40 border border-white/10 rounded-lg text-sm text-white placeholder:text-muted-foreground focus:outline-none focus:border-neon-blue/50 transition-colors"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-neon-blue" />
          </div>
        ) : filteredChats.length === 0 ? (
          <div className="text-center py-8 px-4">
            <MessageCircle className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-50" />
            <p className="text-muted-foreground text-sm">Ingen samtaler fundet</p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {filteredChats.map((chat) => (
              <div
                key={chat.id}
                className={`group relative w-full text-left p-4 hover:bg-white/5 transition-colors cursor-pointer ${
                  currentChatId === chat.id ? "bg-white/5 border-l-2 border-neon-blue" : "border-l-2 border-transparent"
                }`}
                onClick={() => {
                  navigate(`/chat/${chat.id}`);
                  onChatSelect?.();
                }}
              >
                <div className="flex gap-3">
                  {/* Avatar */}
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-neon-blue/20 border border-neon-blue/30 flex items-center justify-center text-neon-blue text-sm font-semibold overflow-hidden">
                    {chat.other_user_avatar_url ? (
                      <img 
                        src={chat.other_user_avatar_url} 
                        alt={chat.other_user_username || "User"}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      (chat.other_user_username || "B")[0].toUpperCase()
                    )}
                  </div>
                  
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-1">
                      <span className={`text-sm font-medium truncate pr-2 ${
                        chat.unread_count > 0 ? "text-white" : "text-white/90"
                      }`}>
                        {chat.other_user_username || "Bruger"}
                      </span>
                  {chat.last_message_time && (
                        <span className={`text-xs whitespace-nowrap ${
                          chat.unread_count > 0 ? "text-neon-blue font-medium" : "text-muted-foreground"
                        }`}>
                          {formatTime(chat.last_message_time)}
                        </span>
                      )}
                    </div>
                    
                    <div className="text-xs text-muted-foreground mb-1 truncate">
                      {chat.item_title}
                    </div>

                    <div className="flex justify-between items-center gap-2">
                      <p className={`text-sm truncate ${
                        chat.unread_count > 0 ? "text-white font-medium" : "text-muted-foreground"
                      }`}>
                        {chat.last_message || "Ingen beskeder"}
                      </p>
                      {chat.unread_count > 0 && (
                        <span className="flex-shrink-0 min-w-[40px] h-[18px] px-2 rounded-full bg-neon-blue text-white text-[10px] font-bold flex items-center justify-center">
                          {chat.unread_count}{" "}
                          {chat.unread_count === 1 ? "ulæst" : "ulæste"}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Delete Button - Always visible on mobile, hover on desktop */}
                <button
                  onClick={(e) => deleteChat(e, chat)}
                  onTouchEnd={(e) => deleteChat(e, chat)}
                  className="absolute right-2 bottom-2 p-2 rounded-full bg-background/80 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all"
                  title="Slet samtale"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

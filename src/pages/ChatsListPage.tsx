import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, MessageCircle } from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "../lib/supabase";

interface Chat {
  id: string;
  buyer_id: string;
  seller_id: string;
  item_id: string;
  item_type: "product" | "room";
  created_at: string;
  updated_at: string;
}

interface ChatWithDetails extends Chat {
  other_user_id: string;
  other_user_username: string | null;
  item_title: string;
  last_message?: string;
  last_message_time?: string;
  unread_count: number;
}

export function ChatsListPage() {
  const navigate = useNavigate();
  const [chats, setChats] = useState<ChatWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    checkUser();
  }, []);

  useEffect(() => {
    if (currentUserId) {
      fetchChats();
      subscribeToChats();
    }
  }, [currentUserId]);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
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

      // Fetch details for each chat
      const chatsWithDetails: ChatWithDetails[] = await Promise.all(
        (data || []).map(async (chat) => {
          const otherUserId = chat.buyer_id === currentUserId ? chat.seller_id : chat.buyer_id;

          // Fetch other user's username
          let otherUsername: string | null = null;
          try {
            const { data: usernameData } = await supabase.rpc("get_user_username", {
              user_uuid: otherUserId,
            });
            otherUsername = usernameData?.username || null;
          } catch (err) {
            console.error("Error fetching username:", err);
          }

          // Fetch item title
          let itemTitle = "";
          if (chat.item_type === "product") {
            const { data: productData } = await supabase
              .from("products")
              .select("brand, model, type")
              .eq("id", chat.item_id)
              .single();

            if (productData) {
              itemTitle = productData.brand && productData.model
                ? `${productData.brand} ${productData.model}`
                : productData.brand || productData.model || productData.type;
            }
          } else {
            const { data: roomData } = await supabase
              .from("rehearsal_rooms")
              .select("name, type")
              .eq("id", chat.item_id)
              .single();

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
            item_title: itemTitle,
            last_message: lastMessage?.content,
            last_message_time: lastMessage?.created_at,
            unread_count: unreadCount,
          };
        })
      );

      setChats(chatsWithDetails);
    } catch (err: any) {
      console.error("Error fetching chats:", err);
    } finally {
      setLoading(false);
    }
  };

  const subscribeToChats = () => {
    if (!currentUserId) return;

    const channel = supabase
      .channel("chats_list")
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
      .on(
        "postgres_changes",
        {
          event: "INSERT",
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

  const formatTime = (dateString?: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
      return diffInMinutes < 1 ? "Lige nu" : `${diffInMinutes} min siden`;
    }
    if (diffInHours < 24) {
      return `${Math.floor(diffInHours)} timer siden`;
    }
    if (diffInHours < 168) {
      return `${Math.floor(diffInHours / 24)} dage siden`;
    }
    return date.toLocaleDateString("da-DK", { day: "numeric", month: "short" });
  };

  if (!currentUserId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Log ind for at se dine beskeder</p>
          <button
            onClick={() => navigate("/login")}
            className="px-4 py-2 rounded-lg bg-neon-blue/20 border border-neon-blue/50 text-neon-blue hover:bg-neon-blue/30 transition-colors"
          >
            Log ind
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Beskeder</h1>
        <p className="text-muted-foreground">Chat med sælgere om produkter og øvelokaler</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-neon-blue" />
        </div>
      ) : chats.length === 0 ? (
        <div className="text-center py-20">
          <MessageCircle className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
          <p className="text-muted-foreground text-lg">Ingen beskeder endnu</p>
          <p className="text-muted-foreground text-sm mt-2">
            Klik på "Skriv til sælger" på en produkt- eller øvelokale-side for at starte en chat
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {chats.map((chat) => (
            <motion.button
              key={chat.id}
              onClick={() => navigate(`/chat/${chat.id}`)}
              className="w-full text-left p-4 rounded-xl border border-white/10 bg-secondary/40 hover:bg-secondary/60 transition-colors"
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
            >
              <div className="flex items-start gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-white font-semibold truncate">
                      {chat.other_user_username || "Bruger"}
                    </h3>
                    {chat.unread_count > 0 && (
                      <span className="flex-shrink-0 px-2 py-0.5 rounded-full bg-neon-blue text-white text-xs font-semibold">
                        {chat.unread_count}
                      </span>
                    )}
                  </div>
                  <p className="text-muted-foreground text-sm truncate mb-1">
                    {chat.item_title}
                  </p>
                  {chat.last_message && (
                    <p className="text-white/70 text-sm truncate">
                      {chat.last_message}
                    </p>
                  )}
                </div>
                {chat.last_message_time && (
                  <div className="flex-shrink-0 text-xs text-muted-foreground">
                    {formatTime(chat.last_message_time)}
                  </div>
                )}
              </div>
            </motion.button>
          ))}
        </div>
      )}
    </div>
  );
}


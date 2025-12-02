import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Send, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "../lib/supabase";
import { Button } from "../components/ui/Button";

interface Message {
  id: string;
  chat_id: string;
  sender_id: string;
  content: string;
  read: boolean;
  created_at: string;
  sender_username?: string;
  isOptimistic?: boolean;
}

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
  current_user_username: string | null;
}

export function ChatPage() {
  const { chatId } = useParams<{ chatId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [chat, setChat] = useState<ChatWithDetails | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Get item info from URL params if creating new chat
  const itemId = searchParams.get("itemId");
  const itemType = searchParams.get("itemType") as "product" | "room" | null;
  const sellerId = searchParams.get("sellerId");

  useEffect(() => {
    checkUser();
  }, []);

  useEffect(() => {
    if (!currentUserId) return;

    if (chatId) {
      fetchChat();
    } else if (itemId && itemType && sellerId) {
      createOrGetChat();
    }
  }, [chatId, itemId, itemType, sellerId, currentUserId]);

  useEffect(() => {
    if (chat?.id) {
      fetchMessages();
      subscribeToMessages();
    }
  }, [chat?.id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const checkUser = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    setCurrentUserId(user?.id || null);
  };

  const createOrGetChat = async () => {
    if (!itemId || !itemType || !sellerId || !currentUserId) return;

    try {
      setLoading(true);

      // Check if chat already exists
      const { data: existingChat, error: checkError } = await supabase
        .from("chats")
        .select("*")
        .eq("buyer_id", currentUserId)
        .eq("seller_id", sellerId)
        .eq("item_id", itemId)
        .eq("item_type", itemType)
        .maybeSingle();

      if (checkError && checkError.code !== "PGRST116") throw checkError;

      let chatIdToUse: string;

      if (existingChat) {
        chatIdToUse = existingChat.id;
      } else {
        // Create new chat
        const { data: newChat, error: createError } = await supabase
          .from("chats")
          .insert({
            buyer_id: currentUserId,
            seller_id: sellerId,
            item_id: itemId,
            item_type: itemType,
          })
          .select()
          .single();

        if (createError) throw createError;
        chatIdToUse = newChat.id;
      }

      // Navigate to chat page
      navigate(`/chat/${chatIdToUse}`, { replace: true });
    } catch (err: any) {
      console.error("Error creating/getting chat:", err);
      alert("Kunne ikke oprette chat. Prøv igen.");
    } finally {
      setLoading(false);
    }
  };

  const fetchChat = async () => {
    if (!chatId || !currentUserId) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("chats")
        .select("*")
        .eq("id", chatId)
        .single();

      if (error) throw error;

      // Determine other user
      const otherUserId =
        data.buyer_id === currentUserId ? data.seller_id : data.buyer_id;

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

      // Fetch current user's username
      let currentUsername: string | null = null;
      try {
        const { data: usernameData } = await supabase.rpc("get_user_username", {
          user_uuid: currentUserId,
        });
        currentUsername = usernameData?.username || null;
      } catch (err) {
        console.error("Error fetching current username:", err);
      }

      // Fetch item title
      let itemTitle = "";
      if (data.item_type === "product") {
        const { data: productData } = await supabase
          .from("products")
          .select("brand, model, type")
          .eq("id", data.item_id)
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
          .eq("id", data.item_id)
          .maybeSingle();

        if (roomData) {
          itemTitle = roomData.name || roomData.type;
        }
      }

      setChat({
        ...data,
        other_user_id: otherUserId,
        other_user_username: otherUsername,
        item_title: itemTitle,
        current_user_username: currentUsername,
      });
    } catch (err: any) {
      console.error("Error fetching chat:", err);
      alert("Kunne ikke hente chat.");
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async () => {
    if (!chat?.id) return;

    try {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("chat_id", chat.id)
        .order("created_at", { ascending: true });

      if (error) throw error;

      // Add usernames to messages
      const messagesWithUsernames = await Promise.all(
        (data || []).map(async (message) => {
          let senderUsername: string | null = null;
          try {
            const { data: usernameData } = await supabase.rpc(
              "get_user_username",
              {
                user_uuid: message.sender_id,
              }
            );
            senderUsername = usernameData?.username || null;
          } catch (err) {
            console.error("Error fetching sender username:", err);
          }
          return {
            ...message,
            sender_username: senderUsername || undefined,
          };
        })
      );

      setMessages(messagesWithUsernames);

      // Mark messages as read
      if (currentUserId) {
        await supabase
          .from("messages")
          .update({ read: true })
          .eq("chat_id", chat.id)
          .neq("sender_id", currentUserId)
          .eq("read", false);
      }
    } catch (err) {
      console.error("Error fetching messages:", err);
    }
  };

  const subscribeToMessages = () => {
    if (!chat?.id) return;

    const channel = supabase
      .channel(`chat:${chat.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `chat_id=eq.${chat.id}`,
        },
        async (payload) => {
          const newMessage = payload.new as Message;

          // Fetch username for new message
          let senderUsername: string | null = null;
          try {
            const { data: usernameData } = await supabase.rpc(
              "get_user_username",
              {
                user_uuid: newMessage.sender_id,
              }
            );
            senderUsername = usernameData?.username || null;
          } catch (err) {
            console.error("Error fetching sender username:", err);
          }

          setMessages((prev) => {
            // Don't add if it's already there (optimistic update)
            if (
              prev.some(
                (m) =>
                  m.id === newMessage.id ||
                  (m.isOptimistic &&
                    m.content === newMessage.content &&
                    m.sender_id === newMessage.sender_id)
              )
            ) {
              return prev.map((m) =>
                m.isOptimistic &&
                m.content === newMessage.content &&
                m.sender_id === newMessage.sender_id
                  ? {
                      ...newMessage,
                      sender_username: senderUsername || undefined,
                    }
                  : m
              );
            }
            return [
              ...prev,
              { ...newMessage, sender_username: senderUsername || undefined },
            ];
          });

          // Mark as read if it's not from current user
          if (currentUserId && payload.new.sender_id !== currentUserId) {
            supabase
              .from("messages")
              .update({ read: true })
              .eq("id", payload.new.id);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !chat?.id || !currentUserId || sending) return;

    const messageContent = newMessage.trim();
    const tempId = `temp-${Date.now()}`;

    // Optimistic update - show message immediately
    const optimisticMessage: Message = {
      id: tempId,
      chat_id: chat.id,
      sender_id: currentUserId,
      content: messageContent,
      read: false,
      created_at: new Date().toISOString(),
      sender_username: chat.current_user_username || undefined,
      isOptimistic: true,
    };

    setMessages((prev) => [...prev, optimisticMessage]);
    setNewMessage("");
    setSending(true);
    scrollToBottom();

    try {
      const { data, error } = await supabase
        .from("messages")
        .insert({
          chat_id: chat.id,
          sender_id: currentUserId,
          content: messageContent,
        })
        .select()
        .single();

      if (error) throw error;

      // Replace optimistic message with real one
      setMessages((prev) =>
        prev.map((m) =>
          m.id === tempId
            ? {
                ...data,
                sender_username: chat.current_user_username || undefined,
              }
            : m
        )
      );
    } catch (err: any) {
      console.error("Error sending message:", err);
      // Remove optimistic message on error
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setNewMessage(messageContent); // Restore message on error
      alert("Kunne ikke sende besked. Prøv igen.");
    } finally {
      setSending(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString("da-DK", {
        hour: "2-digit",
        minute: "2-digit",
      });
    }
    return date.toLocaleDateString("da-DK", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-neon-blue" />
      </div>
    );
  }

  if (!chat) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Chat ikke fundet</p>
          <Button onClick={() => navigate(-1)}>Tilbage</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b border-white/10 bg-background/80 backdrop-blur-md">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(-1)}
              className="p-2 rounded-lg hover:bg-white/5 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-semibold text-white truncate">
                {chat.other_user_username || "Bruger"}
              </h1>
              <p className="text-sm text-muted-foreground truncate">
                {chat.item_title}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto bg-background"
      >
        <div className="container mx-auto px-4 py-4 max-w-3xl">
          <div className="space-y-1">
            {messages.map((message, index) => {
              const isOwn = message.sender_id === currentUserId;
              const prevMessage = index > 0 ? messages[index - 1] : null;
              const showAvatar =
                !prevMessage || prevMessage.sender_id !== message.sender_id;
              const showUsername = !isOwn && showAvatar;

              return (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className={`flex items-end gap-2 ${
                    isOwn ? "justify-end" : "justify-start"
                  } ${showAvatar ? "mt-4" : "mt-1"}`}
                >
                  {!isOwn && (
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-neon-blue/20 border border-neon-blue/30 flex items-center justify-center text-neon-blue text-xs font-semibold">
                      {(message.sender_username || "U")[0].toUpperCase()}
                    </div>
                  )}
                  <div
                    className={`flex flex-col ${
                      isOwn ? "items-end" : "items-start"
                    } max-w-[70%]`}
                  >
                    {showUsername && (
                      <span className="text-xs text-muted-foreground mb-1 px-2">
                        {message.sender_username || "Bruger"}
                      </span>
                    )}
                    <div
                      className={`rounded-2xl px-4 py-2.5 ${
                        isOwn
                          ? "bg-neon-blue text-white rounded-br-sm"
                          : "bg-secondary/60 text-white border border-white/10 rounded-bl-sm"
                      } ${message.isOptimistic ? "opacity-70" : ""}`}
                    >
                      <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">
                        {message.content}
                      </p>
                      <p
                        className={`text-xs mt-1.5 ${
                          isOwn ? "text-blue-100/80" : "text-muted-foreground"
                        }`}
                      >
                        {formatTime(message.created_at)}
                      </p>
                    </div>
                  </div>
                  {isOwn && (
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-neon-blue/20 border border-neon-blue/30 flex items-center justify-center text-neon-blue text-xs font-semibold">
                      {(chat.current_user_username || "J")[0].toUpperCase()}
                    </div>
                  )}
                </motion.div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        </div>
      </div>

      {/* Message Input */}
      <div className="sticky bottom-0 border-t border-white/10 bg-background/95 backdrop-blur-md">
        <div className="container mx-auto px-4 py-3 max-w-3xl">
          <form onSubmit={sendMessage} className="flex items-end gap-2">
            <div className="flex-1 rounded-2xl bg-secondary/60 border border-white/10 focus-within:border-neon-blue/50 transition-colors">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Skriv en besked..."
                className="w-full px-4 py-3 bg-transparent text-white placeholder:text-muted-foreground focus:outline-none"
                disabled={sending}
              />
            </div>
            <button
              type="submit"
              disabled={!newMessage.trim() || sending}
              className="flex-shrink-0 w-10 h-10 rounded-full bg-neon-blue hover:bg-neon-blue/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center text-white"
            >
              {sending ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect, useRef } from "react";
import { Bell, Check } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { motion, AnimatePresence } from "framer-motion";

interface Notification {
  id: string;
  type: string;
  item_id: string;
  item_type: "product" | "room" | "chat";
  favoriter_id: string | null;
  chat_id?: string | null;
  read: boolean;
  created_at: string;
}

interface NotificationWithDetails extends Notification {
  favoriter_username?: string;
  product_brand?: string | null;
  product_model?: string | null;
  room_name?: string | null;
}

export function NotificationBell({ userId }: { userId: string | null }) {
  const [notifications, setNotifications] = useState<NotificationWithDetails[]>(
    []
  );
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!userId) return;

    fetchNotifications();

    // Subscribe to new notifications
    const channel = supabase
      .channel("notifications")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          fetchNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isOpen &&
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const fetchNotifications = async () => {
    if (!userId) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;

      // Fetch additional details for each notification
      const notificationsWithDetails: NotificationWithDetails[] =
        await Promise.all(
          (data || []).map(async (notification) => {
            const details: NotificationWithDetails = { ...notification };

            // Fetch favoriter username using RPC function (only if favoriter_id exists)
            if (notification.favoriter_id) {
              try {
                const { data: usernameData, error: usernameError } =
                  await supabase.rpc("get_user_username", {
                    user_uuid: notification.favoriter_id,
                  });

                if (!usernameError && usernameData) {
                  details.favoriter_username = usernameData.username || "Nogen";
                } else {
                  details.favoriter_username = "Nogen";
                }
              } catch (err) {
                console.error("Error fetching username:", err);
                details.favoriter_username = "Nogen";
              }
            }

            // Fetch product or room details (only if product still exists)
            // Handle both regular product notifications and product_sold notifications
            if (
              notification.item_type === "product" ||
              notification.type === "product_sold"
            ) {
              try {
                const { data: productData, error: productError } =
                  await supabase
                    .from("products")
                    .select("brand, model")
                    .eq("id", notification.item_id)
                    .maybeSingle();

                if (!productError && productData) {
                  details.product_brand = productData.brand;
                  details.product_model = productData.model;
                }
              } catch (err) {
                // Product might be deleted (sold), that's okay
                console.error("Error fetching product details:", err);
              }
            } else {
              try {
                const { data: roomData, error: roomError } = await supabase
                  .from("rehearsal_rooms")
                  .select("name")
                  .eq("id", notification.item_id)
                  .maybeSingle();

                if (!roomError && roomData) {
                  details.room_name = roomData.name;
                }
              } catch (err) {
                console.error("Error fetching room details:", err);
              }
            }

            return details;
          })
        );

      setNotifications(notificationsWithDetails);
      setUnreadCount(
        notificationsWithDetails.filter((n) => !n.read).length || 0
      );
    } catch (err) {
      console.error("Error fetching notifications:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!userId || unreadCount === 0) return;

    try {
      const { error } = await supabase
        .from("notifications")
        .update({ read: true })
        .eq("user_id", userId)
        .eq("read", false);

      if (!error) {
        // Update all notifications to read
        setNotifications((prev) =>
          prev.map((n) => ({ ...n, read: true }))
        );
        setUnreadCount(0);
      }
    } catch (err) {
      console.error("Error marking all notifications as read:", err);
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    // Mark as read
    if (!notification.read) {
      const { error } = await supabase
        .from("notifications")
        .update({ read: true })
        .eq("id", notification.id);

      if (!error) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === notification.id ? { ...n, read: true } : n))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    }

    // Navigate to detail page or chat (only if product/room/chat still exists)
    setIsOpen(false);
    if (notification.type === "new_message" && notification.chat_id) {
      // Navigate to chat
      navigate(`/chat/${notification.chat_id}`);
    } else if (notification.type === "product_sold") {
      // For sold products, check if product still exists before navigating
      try {
        const { data: productData, error } = await supabase
          .from("products")
          .select("id")
          .eq("id", notification.item_id)
          .maybeSingle();

        if (error || !productData) {
          // Product has been deleted, show message
          alert(
            "Denne annonce er blevet slettet efter at være markeret som solgt."
          );
          return;
        }
        // Product still exists (marked as sold but not deleted yet), navigate to it
        navigate(`/product/${notification.item_id}`);
      } catch (err) {
        console.error("Error checking product:", err);
        alert("Denne annonce findes ikke længere.");
      }
    } else if (notification.item_type === "product") {
      try {
        const { data: productData, error } = await supabase
          .from("products")
          .select("id")
          .eq("id", notification.item_id)
          .maybeSingle();

        if (error) {
          console.error("Error checking product existence:", error);
        }

        if (!productData) {
          window.alert("Denne annonce findes ikke længere.");
          return;
        }

        navigate(`/product/${notification.item_id}`);
      } catch (err) {
        console.error("Error handling product notification click:", err);
        window.alert("Kunne ikke åbne annoncen. Prøv igen senere.");
      }
    } else {
      try {
        const { data: roomData, error } = await supabase
          .from("rehearsal_rooms")
          .select("id")
          .eq("id", notification.item_id)
          .maybeSingle();

        if (error) {
          console.error("Error checking room existence:", error);
        }

        if (!roomData) {
          window.alert("Dette øvelokale findes ikke længere.");
          return;
        }

        navigate(`/room/${notification.item_id}`);
      } catch (err) {
        console.error("Error handling room notification click:", err);
        window.alert("Kunne ikke åbne øvelokalet. Prøv igen senere.");
      }
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return "Lige nu";
    if (diffInSeconds < 3600)
      return `${Math.floor(diffInSeconds / 60)} min siden`;
    if (diffInSeconds < 86400)
      return `${Math.floor(diffInSeconds / 3600)} timer siden`;
    if (diffInSeconds < 604800)
      return `${Math.floor(diffInSeconds / 86400)} dage siden`;
    return date.toLocaleDateString("da-DK");
  };

  if (!userId) return null;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative inline-flex h-9 w-9 items-center justify-center rounded-full bg-secondary/60 border border-white/10 text-sm font-medium text-white hover:bg-secondary/80 transition-colors"
        aria-label="Notifikationer"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-semibold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute right-0 top-11 w-80 rounded-xl border border-white/10 bg-background/95 shadow-xl backdrop-blur-sm z-50 max-h-96 overflow-hidden flex flex-col"
          >
            <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">
                Notifikationer
              </h3>
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  className="text-xs text-neon-blue hover:text-neon-blue/80 transition-colors flex items-center gap-1"
                >
                  <Check className="w-3 h-3" />
                  <span>Marker alle som læst</span>
                </button>
              )}
            </div>
            <div className="overflow-y-auto flex-1">
              {loading ? (
                <div className="p-4 text-center text-muted-foreground text-sm">
                  Indlæser...
                </div>
              ) : notifications.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground text-sm">
                  Ingen notifikationer
                </div>
              ) : (
                <div className="divide-y divide-white/5">
                  {notifications.map((notification) => (
                    <button
                      key={notification.id}
                      onClick={() => handleNotificationClick(notification)}
                      className={`w-full text-left px-4 py-3 hover:bg-white/5 transition-colors ${
                        !notification.read ? "bg-blue-500/10" : ""
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-white">
                            {notification.type === "product_sold" ? (
                              <>
                                {notification.product_brand &&
                                notification.product_model
                                  ? `${notification.product_brand} ${notification.product_model}`
                                  : notification.product_brand ||
                                    notification.product_model ||
                                    "Produkt"}{" "}
                                er blevet solgt
                              </>
                            ) : notification.type === "new_message" ? (
                              <>
                                {notification.favoriter_username || "Nogen"} har sendt dig en besked
                              </>
                            ) : (
                              <>
                                {notification.favoriter_username || "Nogen"} har
                                favoriseret{" "}
                                {notification.item_type === "product" ? (
                                  <>
                                    {notification.product_brand &&
                                    notification.product_model
                                      ? `${notification.product_brand} ${notification.product_model}`
                                      : notification.product_brand ||
                                        notification.product_model ||
                                        "produkt"}
                                  </>
                                ) : (
                                  <>{notification.room_name || "øvelokale"}</>
                                )}
                              </>
                            )}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatTimeAgo(notification.created_at)}
                          </p>
                        </div>
                        {!notification.read && (
                          <div className="h-2 w-2 rounded-full bg-blue-500 flex-shrink-0 mt-1.5" />
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

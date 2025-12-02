import { useState, useEffect } from "react";
import { Heart } from "lucide-react";
import { supabase } from "../lib/supabase";
import { motion } from "framer-motion";

interface FavoriteButtonProps {
  itemId: string;
  itemType: "product" | "room";
  currentUserId: string | null;
  className?: string;
}

export function FavoriteButton({ itemId, itemType, currentUserId, className = "" }: FavoriteButtonProps) {
  const [isFavorited, setIsFavorited] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [isOwner, setIsOwner] = useState(false);

  useEffect(() => {
    fetchFavoriteStatus();
    checkOwnership();
  }, [itemId, currentUserId]);

  const checkOwnership = async () => {
    if (!currentUserId) return;

    const table = itemType === "product" ? "products" : "rehearsal_rooms";
    const { data } = await supabase
      .from(table)
      .select("user_id")
      .eq("id", itemId)
      .single();

    if (data && data.user_id === currentUserId) {
      setIsOwner(true);
    }
  };

  const fetchFavoriteStatus = async () => {
    try {
      // Get total count
      const { count, error: countError } = await supabase
        .from("favorites")
        .select("*", { count: "exact", head: true })
        .eq(itemType === "product" ? "product_id" : "room_id", itemId);

      if (!countError) {
        setLikesCount(count || 0);
      }

      // Check if user favorited it
      if (currentUserId) {
        const { data, error } = await supabase
          .from("favorites")
          .select("id")
          .eq("user_id", currentUserId)
          .eq(itemType === "product" ? "product_id" : "room_id", itemId)
          .maybeSingle();

        if (!error) {
          setIsFavorited(!!data);
        }
      }
    } catch (err) {
      console.error("Error fetching favorite status:", err);
      // Set defaults on error
      setLikesCount(0);
      setIsFavorited(false);
    }
  };

  const toggleFavorite = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click
    e.preventDefault(); // Prevent default behavior
    
    // Strict check - must be logged in
    if (!currentUserId) {
      return;
    }
    
    if (loading) return;
    if (isOwner) return; // Cannot favorite own item

    setLoading(true);

    // Optimistic update
    const previousState = isFavorited;
    const previousCount = likesCount;
    setIsFavorited(!isFavorited);
    setLikesCount(isFavorited ? likesCount - 1 : likesCount + 1);

    try {
      if (previousState) {
        // Remove favorite
        const { error } = await supabase
          .from("favorites")
          .delete()
          .eq("user_id", currentUserId)
          .eq(itemType === "product" ? "product_id" : "room_id", itemId);

        if (error) throw error;
      } else {
        // Add favorite
        const { error } = await supabase
          .from("favorites")
          .insert({
            user_id: currentUserId,
            [itemType === "product" ? "product_id" : "room_id"]: itemId,
          });

        if (error) throw error;
      }
    } catch (error) {
      console.error("Error toggling favorite:", error);
      // Revert optimistic update
      setIsFavorited(previousState);
      setLikesCount(previousCount);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={toggleFavorite}
      disabled={loading || !currentUserId || isOwner}
      className={`flex items-center gap-1 text-xs transition-colors ${className} ${
        isFavorited ? "text-red-500" : "text-muted-foreground hover:text-red-400"
      } ${!currentUserId || isOwner ? "opacity-50 cursor-not-allowed" : ""} ${
        !currentUserId ? "pointer-events-none" : ""
      }`}
      title={isOwner ? "Du kan ikke like dit eget opslag" : !currentUserId ? "Log ind for at like" : ""}
      aria-disabled={!currentUserId || isOwner}
    >
      <motion.div whileTap={{ scale: 0.8 }}>
        <Heart className={`w-4 h-4 ${isFavorited ? "fill-current" : ""}`} />
      </motion.div>
      <span>{likesCount}</span>
    </button>
  );
}

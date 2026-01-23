import { useState, useEffect, useRef } from "react";
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
  const [isInCooldown, setIsInCooldown] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const cooldownTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const COOLDOWN_MS = 2000; // 2 second cooldown between clicks

  useEffect(() => {
    fetchFavoriteStatus();
    checkOwnership();
    
    // Cleanup cooldown timeout and interval on unmount
    return () => {
      if (cooldownTimeoutRef.current) {
        clearTimeout(cooldownTimeoutRef.current);
      }
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
    };
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
    } catch {
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
    
    if (isOwner) return; // Cannot favorite own item
    
    // Check if we're favoriting (not unfavoriting)
    const willBeFavoriting = !isFavorited;
    
    // Prevent spam clicking when favoriting - check cooldown and loading state
    // No cooldown check when unfavoriting
    if (willBeFavoriting && (isInCooldown || loading)) {
      return; // Ignore click if within cooldown period or already loading
    }
    
    if (loading) return; // Always prevent if already loading

    setLoading(true);

    // Optimistic update
    const previousState = isFavorited;
    const previousCount = likesCount;
    const isUnfavoriting = previousState; // If currently favorited, we're unfavoriting
    
    setIsFavorited(!isFavorited);
    setLikesCount(isFavorited ? likesCount - 1 : likesCount + 1);

    // Only apply cooldown when favoriting (not when unfavoriting)
    if (!isUnfavoriting) {
      // Set cooldown to prevent rapid clicking when favoriting
      setIsInCooldown(true);
      setCooldownSeconds(2); // Start with 2 seconds
      
      // Clear any existing timeout and interval
      if (cooldownTimeoutRef.current) {
        clearTimeout(cooldownTimeoutRef.current);
      }
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
      
      // Update countdown every second
      countdownIntervalRef.current = setInterval(() => {
        setCooldownSeconds((prev) => {
          if (prev <= 1) {
            if (countdownIntervalRef.current) {
              clearInterval(countdownIntervalRef.current);
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      
      // Set timeout to clear cooldown
      cooldownTimeoutRef.current = setTimeout(() => {
        setIsInCooldown(false);
        setCooldownSeconds(0);
        if (countdownIntervalRef.current) {
          clearInterval(countdownIntervalRef.current);
        }
      }, COOLDOWN_MS);
    }

    try {
      if (previousState) {
        // Remove favorite - no cooldown for this action
        const { error } = await supabase
          .from("favorites")
          .delete()
          .eq("user_id", currentUserId)
          .eq(itemType === "product" ? "product_id" : "room_id", itemId);

        if (error) throw error;
      } else {
        // Add favorite - cooldown is already set above
        const { error } = await supabase
          .from("favorites")
          .insert({
            user_id: currentUserId,
            [itemType === "product" ? "product_id" : "room_id"]: itemId,
          });

        if (error) throw error;
      }
    } catch {
      // Revert optimistic update
      setIsFavorited(previousState);
      setLikesCount(previousCount);
      // Clear cooldown if there was an error
      if (!isUnfavoriting) {
        setIsInCooldown(false);
        setCooldownSeconds(0);
        if (cooldownTimeoutRef.current) {
          clearTimeout(cooldownTimeoutRef.current);
        }
        if (countdownIntervalRef.current) {
          clearInterval(countdownIntervalRef.current);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  // Check if button should be disabled (loading, cooldown, or other conditions)
  const isDisabled = loading || !currentUserId || isOwner;

  return (
    <button
      onClick={toggleFavorite}
      disabled={isDisabled || isInCooldown}
      className={`flex items-center gap-1 text-xs transition-colors relative ${className} ${
        isFavorited ? "text-red-500" : "text-muted-foreground hover:text-red-400"
      } ${isDisabled || isInCooldown ? "opacity-60 cursor-not-allowed" : ""} ${
        !currentUserId ? "pointer-events-none" : ""
      } ${isInCooldown ? "bg-gray-100 dark:bg-gray-800 rounded px-2 py-1" : ""}`}
      title={
        isOwner 
          ? "Du kan ikke like dit eget opslag" 
          : !currentUserId 
          ? "Log ind for at like" 
          : isInCooldown
          ? `Vent ${cooldownSeconds} sekund${cooldownSeconds !== 1 ? 'er' : ''}...`
          : ""
      }
      aria-disabled={isDisabled || isInCooldown}
    >
      <motion.div whileTap={{ scale: isInCooldown ? 1 : 0.8 }}>
        <Heart className={`w-4 h-4 ${isFavorited ? "fill-current" : ""} ${isInCooldown ? "opacity-50" : ""}`} />
      </motion.div>
      {isInCooldown ? (
        <span className="text-gray-500 dark:text-gray-400 font-medium">
          {cooldownSeconds}s
        </span>
      ) : (
        <span>{likesCount}</span>
      )}
    </button>
  );
}

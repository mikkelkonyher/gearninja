import { useEffect, useState } from "react";
import { Star } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";

interface UsernameWithRatingProps {
  userId: string;
  className?: string;
  showRating?: boolean; // Allow hiding rating if needed
}

export function UsernameWithRating({ 
  userId, 
  className = "",
  showRating = true 
}: UsernameWithRatingProps) {
  const [username, setUsername] = useState<string | null>(null);
  const [averageRating, setAverageRating] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsernameAndRating();
  }, [userId]);

  const fetchUsernameAndRating = async () => {
    try {
      setLoading(true);

      // Fetch username
      const { data: userData, error: userError } = await supabase.rpc(
        "get_user_username",
        { user_uuid: userId }
      );

      if (!userError && userData) {
        const fetchedUsername =
          userData.username || userData.email?.split("@")[0] || "Bruger";
        setUsername(fetchedUsername);
      } else {
        setUsername("Bruger");
      }

      // Fetch average rating if showRating is true
      if (showRating) {
        const { data: reviewsData, error: reviewsError } = await supabase
          .from("reviews")
          .select("rating")
          .eq("reviewee_id", userId);

        if (!reviewsError && reviewsData && reviewsData.length > 0) {
          const sum = reviewsData.reduce((acc, review) => acc + review.rating, 0);
          const average = sum / reviewsData.length;
          setAverageRating(average);
        } else {
          setAverageRating(null);
        }
      }
    } catch {
      setUsername("Bruger");
      setAverageRating(null);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <span className={className}>
        <span className="text-muted-foreground">...</span>
      </span>
    );
  }

  const isInline = className.includes("inline");
  const containerClassName = isInline 
    ? `inline-flex items-center gap-2 ${className.replace("inline", "").trim()}` 
    : `flex items-center gap-2 ${className}`;

  if (isInline) {
    return (
      <Link 
        to={`/user/${userId}`} 
        className={`${containerClassName} hover:opacity-80 transition-opacity`}
        onClick={(e) => e.stopPropagation()}
      >
        <span>{username || "Bruger"}</span>
        {showRating && (
          <>
            {averageRating !== null ? (
              <span className="inline-flex items-center gap-1 ml-1">
                <span className="flex gap-0.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`w-3 h-3 ${
                        star <= Math.round(averageRating)
                          ? "fill-yellow-500 text-yellow-500"
                          : "text-muted-foreground/20"
                      }`}
                    />
                  ))}
                </span>
                <span className="text-xs font-medium">
                  {averageRating.toFixed(1)}
                </span>
              </span>
            ) : (
              <span className="text-xs text-muted-foreground ml-1">
                (Ingen anmeldelser endnu)
              </span>
            )}
          </>
        )}
      </Link>
    );
  }

  return (
    <div className={containerClassName}>
      <Link 
        to={`/user/${userId}`} 
        className="text-white hover:text-neon-blue transition-colors hover:underline"
        onClick={(e) => e.stopPropagation()}
      >
        {username || "Bruger"}
      </Link>
      {showRating && (
        <>
          {averageRating !== null ? (
            <div className="flex items-center gap-1">
              <div className="flex gap-0.5">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`w-3.5 h-3.5 ${
                      star <= Math.round(averageRating)
                        ? "fill-yellow-500 text-yellow-500"
                        : "text-muted-foreground/20"
                    }`}
                  />
                ))}
              </div>
              <span className="text-white text-sm font-medium">
                {averageRating.toFixed(1)}
              </span>
            </div>
          ) : (
            <span className="text-xs text-muted-foreground">(Ingen anmeldelser endnu)</span>
          )}
        </>
      )}
    </div>
  );
}


import { useEffect, useState } from "react";
import { Star, User } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabase";

interface Review {
  id: string;
  rating: number;
  content: string;
  created_at: string;
  reviewer_id: string;
  reviewer: {
    username: string;
    avatar_url: string | null;
  };
}

interface ReviewsListProps {
  saleId: string;
  refreshTrigger?: number;
}

export function ReviewsList({ saleId, refreshTrigger }: ReviewsListProps) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [canView, setCanView] = useState(false);

  useEffect(() => {
    fetchReviews();
  }, [saleId, refreshTrigger]);

  const fetchReviews = async () => {
    try {
      setLoading(true);
      
      // Check if both parties have reviewed
      const { count, error: countError } = await supabase
        .from("reviews")
        .select("*", { count: "exact", head: true })
        .eq("sale_id", saleId);

      if (countError) throw countError;

      // Only show reviews if both parties have reviewed (count >= 2)
      // OR if the current user has reviewed, they can see their own? 
      // Requirement: "Reviews only become visible when both parties have created their review."
      
      if ((count || 0) < 2) {
        setCanView(false);
        return;
      }

      setCanView(true);

      const { data, error } = await supabase
        .from("reviews")
        .select(`
          id,
          rating,
          content,
          created_at,
          reviewer_id
        `)
        .eq("sale_id", saleId);

      if (error) throw error;

      // Fetch reviewer details manually since we can't easily join with auth.users
      const reviewsWithDetails = await Promise.all(
        (data || []).map(async (review) => {
          const { data: userData } = await supabase.rpc("get_user_username", {
            user_uuid: review.reviewer_id,
          });

          return {
            ...review,
            reviewer: {
              username: userData?.username || "Bruger",
              avatar_url: userData?.avatar_url || null,
            },
          };
        })
      );

      setReviews(reviewsWithDetails);
    } catch (err) {
      console.error("Error fetching reviews:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return null;

  if (!canView) {
    return (
      <div className="p-4 rounded-lg bg-secondary/20 border border-white/10 text-center text-muted-foreground text-sm">
        Anmeldelser bliver synlige når både køber og sælger har afgivet deres bedømmelse.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-white">Anmeldelser af handlen</h3>
      <div className="grid gap-4">
        {reviews.map((review) => (
          <div
            key={review.id}
            className="p-4 rounded-lg bg-secondary/20 border border-white/10"
          >
            <div className="flex items-center justify-between mb-2">
              <Link 
                to={`/user/${review.reviewer_id}`}
                className="flex items-center gap-2 hover:opacity-80 transition-opacity"
              >
                <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center overflow-hidden">
                  {review.reviewer.avatar_url ? (
                    <img
                      src={review.reviewer.avatar_url}
                      alt={review.reviewer.username}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="w-4 h-4 text-muted-foreground" />
                  )}
                </div>
                <span className="font-medium text-white hover:text-neon-blue transition-colors">
                  {review.reviewer.username}
                </span>
              </Link>
              <div className="flex gap-0.5">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`w-4 h-4 ${
                      i < review.rating
                        ? "fill-yellow-500 text-yellow-500"
                        : "text-muted-foreground/20"
                    }`}
                  />
                ))}
              </div>
            </div>
            {review.content && (
              <p className="text-muted-foreground text-sm">{review.content}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

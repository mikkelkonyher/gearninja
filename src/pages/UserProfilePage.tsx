import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Star, Package, UserX } from "lucide-react";
import { supabase } from "../lib/supabase";
import { Loader2 } from "lucide-react";

interface Review {
  id: string;
  rating: number;
  content: string;
  created_at: string;
  reviewer_id: string;
  sale_id: string;
}

interface SoldProduct {
  id: string;
  brand: string | null;
  model: string | null;
  type: string;
  price: number | null;
  image_urls: string[];
  sold_at: string;
}

interface ActiveProduct {
  id: string;
  brand: string | null;
  model: string | null;
  type: string;
  price: number | null;
  image_urls: string[];
  created_at: string;
}

interface UserProfile {
  id: string;
  username: string;
  created_at?: string;
  avatar_url?: string | null;
}

export function UserProfilePage() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [soldProducts, setSoldProducts] = useState<SoldProduct[]>([]);
  const [activeProducts, setActiveProducts] = useState<ActiveProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reviewerNames, setReviewerNames] = useState<Record<string, string>>({});

  useEffect(() => {
    if (userId) {
      fetchProfileData();
    }
  }, [userId]);

  const fetchProfileData = async () => {
    try {
      setLoading(true);
      if (!userId) throw new Error("Ingen bruger ID");

      // 1. Fetch User Details (Username)
      const { data: userData, error: userError } = await supabase.rpc(
        "get_user_username",
        { user_uuid: userId }
      );

      if (userError) throw userError;

      setProfile({
        id: userId,
        username: userData?.username || userData?.email?.split("@")[0] || "Ukendt Bruger",
        avatar_url: userData?.avatar_url || null,
      });

      // 2. Fetch Reviews (using RPC to enforce double-blind rule)
      // Only shows reviews where BOTH parties have submitted a review
      const { data: reviewsData, error: reviewsError } = await supabase.rpc(
        "get_valid_public_reviews",
        { target_user_id: userId }
      );

      if (reviewsError) throw reviewsError;
      setReviews(reviewsData || []);

      // Fetch reviewer names
      if (reviewsData && reviewsData.length > 0) {
        const names: Record<string, string> = {};
        for (const review of reviewsData) {
          if (!names[review.reviewer_id]) {
            const { data: reviewerData } = await supabase.rpc("get_user_username", { 
              user_uuid: review.reviewer_id 
            });
            names[review.reviewer_id] = reviewerData?.username || "Slettet bruger";
          }
        }
        setReviewerNames(names);
      }

      // 3. Fetch Sold Products (using RPC to bypass soft-delete logic)
      const { data: productsData, error: productsError } = await supabase.rpc(
        "get_user_sold_products",
        { target_user_id: userId }
      );

      if (productsError) throw productsError;
      setSoldProducts(productsData || []);

      // 4. Fetch Active Products (products for sale)
      const { data: activeData, error: activeError } = await supabase
        .from("products")
        .select("id, brand, model, type, price, image_urls, created_at")
        .eq("user_id", userId)
        .eq("sold", false)
        .order("created_at", { ascending: false });

      if (activeError) throw activeError;
      setActiveProducts(activeData || []);

    } catch {
      setError("Kunne ikke hente brugerprofil");
    } finally {
      setLoading(false);
    }
  };

  const getAverageRating = () => {
    if (reviews.length === 0) return null;
    const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
    return (sum / reviews.length).toFixed(1);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("da-DK", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-neon-blue" />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-[80vh] py-8 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-red-400 mb-4">{error || "Profil ikke fundet"}</p>
          <button
            onClick={() => navigate(-1)}
            className="text-neon-blue hover:underline"
          >
            Gå tilbage
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[80vh] py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-neon-blue transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm">Tilbage</span>
        </button>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Sidebar / Profile Info */}
          <div className="md:col-span-1 space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-6 rounded-xl border border-white/10 bg-secondary/30 backdrop-blur-sm text-center"
            >
              <div className="w-24 h-24 mx-auto bg-gradient-to-br from-neon-blue/20 to-purple-500/20 rounded-full flex items-center justify-center border-2 border-neon-blue/30 mb-4 overflow-hidden">
                {profile.avatar_url ? (
                  <img 
                    src={profile.avatar_url} 
                    alt={profile.username}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-3xl font-bold text-white">
                    {profile.username.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <h1 className="text-2xl font-bold text-white mb-2">{profile.username}</h1>
              
              <div className="flex items-center justify-center gap-2 mb-4">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`w-5 h-5 ${
                      reviews.length > 0 && star <= Math.round(Number(getAverageRating()))
                        ? "fill-yellow-500 text-yellow-500"
                        : "text-muted-foreground/20"
                    }`}
                  />
                ))}
              </div>
              
              <div className="text-sm text-muted-foreground">
                <p>{reviews.length} anmeldelser</p>
                <p>{activeProducts.length} aktive annoncer</p>
                <p>{soldProducts.length} solgte varer</p>
              </div>
            </motion.div>
          </div>

          {/* Main Content */}
          <div className="md:col-span-2 space-y-8">
            
            {/* Reviews Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <Star className="w-5 h-5 text-yellow-500" />
                Anmeldelser
              </h2>
              
              {reviews.length === 0 ? (
                <div className="p-8 rounded-xl border border-white/10 bg-secondary/20 text-center text-muted-foreground">
                  Ingen anmeldelser endnu
                </div>
              ) : (
                <div className="space-y-4">
                  {reviews.map((review) => (
                    <div key={review.id} className="p-4 rounded-xl border border-white/5 bg-secondary/20">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-semibold text-white text-sm">
                            {reviewerNames[review.reviewer_id] === "Slettet bruger" ? (
                                <span className="flex items-center gap-1 text-muted-foreground italic">
                                    <UserX className="w-3 h-3" /> Slettet bruger
                                </span>
                            ) : (
                                reviewerNames[review.reviewer_id] || "Henter..."
                            )}
                          </p>
                          <p className="text-xs text-muted-foreground">{formatDate(review.created_at)}</p>
                        </div>
                        <div className="flex gap-0.5">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={`w-3 h-3 ${
                                star <= review.rating
                                  ? "fill-yellow-500 text-yellow-500"
                                  : "text-muted-foreground/20"
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                      {review.content && (
                        <p className="text-sm text-gray-300 italic">"{review.content}"</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </motion.div>

            {/* Active Products Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <Package className="w-5 h-5 text-green-500" />
                Aktive annoncer
              </h2>

              {activeProducts.length === 0 ? (
                <div className="p-8 rounded-xl border border-white/10 bg-secondary/20 text-center text-muted-foreground">
                  Ingen aktive annoncer
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {activeProducts.map((product) => (
                    <div 
                      key={product.id} 
                      onClick={() => navigate(`/product/${product.id}`)}
                      className="group flex gap-3 p-3 rounded-xl border border-white/5 bg-secondary/20 hover:bg-secondary/30 hover:border-neon-blue/30 transition-colors cursor-pointer"
                    >
                      <div className="w-16 h-16 rounded-lg bg-slate-700 flex-shrink-0 overflow-hidden">
                        {product.image_urls && product.image_urls[0] ? (
                          <img 
                            src={product.image_urls[0]} 
                            alt={product.model || product.type} 
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                            <Package className="w-6 h-6" />
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col justify-center min-w-0">
                        <h3 className="font-medium text-white truncate text-sm group-hover:text-neon-blue transition-colors">
                          {product.brand && product.model 
                            ? `${product.brand} ${product.model}`
                            : product.type}
                        </h3>
                        {product.price && (
                          <p className="text-sm font-semibold text-neon-blue">
                            {product.price.toLocaleString("da-DK")} kr.
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>

            {/* Sold Products Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <Package className="w-5 h-5 text-muted-foreground" />
                Tidligere salg
              </h2>

              {soldProducts.length === 0 ? (
                <div className="p-8 rounded-xl border border-white/10 bg-secondary/20 text-center text-muted-foreground">
                  Ingen solgte varer endnu
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {soldProducts.map((product) => (
                    <div key={product.id} className="group flex gap-3 p-3 rounded-xl border border-white/5 bg-secondary/20 hover:bg-secondary/30 transition-colors">
                      <div className="w-16 h-16 rounded-lg bg-slate-700 flex-shrink-0 overflow-hidden">
                        {product.image_urls && product.image_urls[0] ? (
                          <img 
                            src={product.image_urls[0]} 
                            alt={product.model || product.type} 
                            className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                            <Package className="w-6 h-6" />
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col justify-center min-w-0">
                        <h3 className="font-medium text-white truncate text-sm">
                          {product.brand && product.model 
                            ? `${product.brand} ${product.model}`
                            : product.type}
                        </h3>
                        <p className="text-xs text-muted-foreground">
                          Solgt {formatDate(product.sold_at)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>

          </div>
        </div>
      </div>
    </div>
  );
}

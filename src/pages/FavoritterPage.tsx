import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, Heart } from "lucide-react";
import { supabase } from "../lib/supabase";
import { FavoriteButton } from "../components/FavoriteButton";

interface Product {
  id: string;
  type: string;
  brand: string | null;
  model: string | null;
  description: string | null;
  price: number | null;
  location: string | null;
  condition: string | null;
  year: number | null;
  image_urls: string[];
  created_at: string;
  category: string;
}

interface Room {
  id: string;
  type: string;
  name: string | null;
  description: string | null;
  price: number | null;
  location: string | null;
  address: string | null;
  room_size: number | null;
  image_urls: string[];
  created_at: string;
  payment_type: string;
}

interface FavoriteItem {
  id: string;
  product: Product | null;
  room: Room | null;
}

export function FavoritterPage() {
  const navigate = useNavigate();
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    checkUser();
  }, []);

  useEffect(() => {
    if (currentUserId) {
      fetchFavorites();
    }
  }, [currentUserId]);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/login");
      return;
    }
    setCurrentUserId(user.id);
  };

  const fetchFavorites = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("favorites")
        .select(`
          id,
          product:products (*),
          room:rehearsal_rooms (*)
        `)
        .eq("user_id", currentUserId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      setFavorites(data || []);
    } catch (error) {
      console.error("Error fetching favorites:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price: number | null, paymentType?: string) => {
    if (!price) return "Pris på anmodning";
    const formatted = `${price.toLocaleString("da-DK")} kr.`;
    return paymentType ? `${formatted} / ${paymentType}` : formatted;
  };

  return (
    <div className="min-h-[80vh] py-8 px-4">
      <div className="container mx-auto max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <button
            onClick={() => navigate("/profile")}
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-neon-blue transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">Tilbage til profil</span>
          </button>
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-3">
              Mine Favoritter
            </h1>
            <p className="text-lg text-muted-foreground">
              {favorites.length > 0
                ? `${favorites.length} favoritter gemt`
                : "Du har ingen favoritter endnu"}
            </p>
          </div>
        </motion.div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-neon-blue" />
          </div>
        ) : favorites.length === 0 ? (
          <div className="text-center py-20">
            <Heart className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground text-lg mb-4">
              Du har ikke gemt nogen favoritter endnu
            </p>
            <button
              onClick={() => navigate("/")}
              className="px-6 py-3 rounded-lg bg-neon-blue text-white font-semibold hover:bg-neon-blue/90 transition-colors"
            >
              Udforsk annoncer
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {favorites.map((fav, index) => {
              const item = fav.product || fav.room;
              if (!item) return null;
              
              const isProduct = !!fav.product;
              const type = isProduct ? "product" : "room";
              const link = isProduct ? `/product/${item.id}` : `/room/${item.id}`;

              return (
                <motion.div
                  key={fav.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  whileHover={{ y: -4 }}
                  onClick={() => navigate(link)}
                  className="rounded-xl border border-white/10 bg-secondary/40 overflow-hidden flex flex-col group cursor-pointer"
                >
                  {/* Image */}
                  <div className="relative aspect-square overflow-hidden bg-slate-700">
                    {item.image_urls && item.image_urls.length > 0 ? (
                      <img
                        src={item.image_urls[0]}
                        alt={
                          isProduct
                            ? (item as Product).brand && (item as Product).model
                              ? `${(item as Product).brand} ${(item as Product).model}`
                              : item.type
                            : (item as Room).name || item.type
                        }
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                        Intet billede
                      </div>
                    )}
                    
                    {/* Type Badge */}
                    <div className="absolute top-2 left-2 px-2 py-1 bg-background/80 backdrop-blur-sm text-white text-xs font-semibold rounded capitalize">
                      {item.type}
                    </div>

                    {/* Favorite Button */}
                    <div className="absolute top-2 right-2 z-10">
                      <FavoriteButton 
                        itemId={item.id} 
                        itemType={type} 
                        currentUserId={currentUserId}
                        className="bg-black/50 backdrop-blur-sm p-1.5 rounded-full hover:bg-black/70"
                      />
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-4 flex flex-col gap-2 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-sm font-semibold text-white line-clamp-2 flex-1">
                        {isProduct
                          ? (item as Product).brand && (item as Product).model
                            ? `${(item as Product).brand} ${(item as Product).model}`
                            : item.type
                          : (item as Room).name || item.type}
                      </h3>
                    </div>

                    <div className="mt-auto pt-2 flex items-center justify-between">
                      <span className="text-sm font-bold text-neon-blue">
                        {formatPrice(item.price, (item as Room).payment_type)}
                      </span>
                      {item.location && (
                        <span className="text-xs text-muted-foreground">
                          {item.location}
                        </span>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}


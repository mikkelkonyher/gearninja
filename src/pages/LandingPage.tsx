import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Search, Loader2 } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "../components/ui/Button";
import { supabase } from "../lib/supabase";
import { FavoriteButton } from "../components/FavoriteButton";

interface Product {
  id: string;
  brand: string | null;
  model: string | null;
  location: string | null;
  price: number | null;
  image_urls: string[];
  type?: string;
  sold?: boolean;
  sold_at?: string;
}

interface RehearsalRoom {
  id: string;
  name: string | null;
  address: string | null;
  location: string | null;
  description: string | null;
  payment_type: string | null;
  price: number | null;
  room_size: number | null;
  type: string;
  image_urls: string[];
  created_at: string;
}

interface ProductWithFavorites extends Product {
  favoriteCount: number;
}

export function LandingPage() {
  const navigate = useNavigate();
  const [newestProducts, setNewestProducts] = useState<Product[]>([]);
  const [popularProducts, setPopularProducts] = useState<
    ProductWithFavorites[]
  >([]);
  const [rehearsalRooms, setRehearsalRooms] = useState<RehearsalRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [popularLoading, setPopularLoading] = useState(true);
  const [roomsLoading, setRoomsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    fetchNewestProducts();
    fetchPopularProducts();
    fetchRehearsalRooms();
    checkUser();
  }, []);

  const checkUser = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    setCurrentUserId(user?.id || null);
  };

  const fetchNewestProducts = async () => {
    try {
      // Note: Add .or("sold.is.null,sold.eq.false") after running the SQL script to filter out sold products
      const { data, error } = await supabase
        .from("products")
        .select("id, brand, model, location, price, image_urls")
        .order("created_at", { ascending: false })
        .limit(15);

      if (error) throw error;

      setNewestProducts(data || []);
    } catch (err) {
      console.error("Error fetching newest products:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPopularProducts = async () => {
    try {
      // Fetch a larger set of products to find the most favorited ones
      // Note: Add .or("sold.is.null,sold.eq.false") after running the SQL script to filter out sold products
      const { data: products, error: productsError } = await supabase
        .from("products")
        .select("id, brand, model, location, price, image_urls, type")
        .order("created_at", { ascending: false })
        .limit(100);

      if (productsError) throw productsError;

      if (!products || products.length === 0) {
        setPopularProducts([]);
        setPopularLoading(false);
        return;
      }

      // Get all favorites for these products
      const productIds = products.map((p) => p.id);
      const { data: favorites, error: favoritesError } = await supabase
        .from("favorites")
        .select("product_id")
        .in("product_id", productIds);

      if (favoritesError) throw favoritesError;

      // Count favorites per product
      const favoriteCounts: Record<string, number> = {};
      favorites?.forEach((fav) => {
        if (fav.product_id) {
          favoriteCounts[fav.product_id] =
            (favoriteCounts[fav.product_id] || 0) + 1;
        }
      });

      // Add favorite count to each product and sort
      const productsWithFavorites: ProductWithFavorites[] = products
        .map((product) => ({
          ...product,
          favoriteCount: favoriteCounts[product.id] || 0,
        }))
        .sort((a, b) => b.favoriteCount - a.favoriteCount)
        .slice(0, 15);

      setPopularProducts(productsWithFavorites);
    } catch (err) {
      console.error("Error fetching popular products:", err);
      setPopularProducts([]);
    } finally {
      setPopularLoading(false);
    }
  };

  const fetchRehearsalRooms = async () => {
    try {
      const { data, error } = await supabase
        .from("rehearsal_rooms")
        .select(
          "id, name, address, location, description, payment_type, price, room_size, type, image_urls, created_at"
        )
        .or("rented_out.is.null,rented_out.eq.false") // Filter out rented rooms
        .order("created_at", { ascending: false })
        .limit(15);

      if (error) throw error;

      setRehearsalRooms(data || []);
    } catch (err) {
      console.error("Error fetching rehearsal rooms:", err);
    } finally {
      setRoomsLoading(false);
    }
  };

  const formatPrice = (price: number | null) => {
    if (!price) return "Pris på anmodning";
    return `${price.toLocaleString("da-DK")} kr.`;
  };

  const getProductTitle = (product: Product) => {
    if (product.brand && product.model) {
      return `${product.brand} ${product.model}`;
    }
    return product.brand || product.model || "Produkt";
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };
  return (
    <div className="flex flex-col gap-20 pb-20">
      {/* Hero Section */}
      <section className="relative pt-16 pb-20 md:pt-20 md:pb-24 overflow-hidden">
        <div className="container mx-auto px-4 relative z-10 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="space-y-6"
          >
            {/* Landing search */}
            <form onSubmit={handleSearch} className="max-w-3xl mx-auto">
              <div className="relative group">
                <Search className="w-6 h-6 text-muted-foreground absolute left-5 top-1/2 -translate-y-1/2 group-hover:text-neon-blue transition-colors pointer-events-none" />
                <input
                  type="text"
                  placeholder="Søg efter musikudstyr..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-14 pr-5 py-4 md:py-5 rounded-full bg-gradient-to-r from-slate-950/90 via-slate-900/90 to-slate-950/90 border border-white/20 text-base md:text-lg text-foreground placeholder:text-muted-foreground/70 shadow-[0_18px_45px_rgba(0,0,0,0.8)] focus:outline-none focus:ring-2 focus:ring-neon-blue focus:border-neon-blue transition-all"
                />
              </div>
            </form>

            <h1 className="text-5xl md:text-7xl font-bold tracking-tight">
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-white via-blue-100 to-gray-400">
                Køb. Sælg. Connect.
              </span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Fra musikere, til musikere – uden støj.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/register">
                <Button
                  variant="neon"
                  size="lg"
                  className="w-full sm:w-auto group"
                >
                  Kom i gang
                  <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <Link to="/create">
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full sm:w-auto"
                >
                  Opret annonce
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>

        {/* Background Elements */}
        <div className="absolute inset-0 z-0">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-500/5 rounded-full blur-[100px] animate-pulse" />
        </div>
      </section>

      {/* Carousels */}
      <section className="container mx-auto px-4 space-y-12">
        {/* Popular musicgear */}
        <div className="space-y-6">
          <div className="flex flex-col items-center gap-1">
            <h2 className="text-xl font-semibold text-white text-center">
              Populært gear
            </h2>
          </div>
          {popularLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-neon-blue" />
            </div>
          ) : (
            <div className="flex gap-4 overflow-x-auto pb-4 flex-nowrap scroll-smooth snap-x snap-mandatory scroll-px-4">
              {popularProducts.length === 0 ? (
                <div className="w-full text-center py-12 text-muted-foreground">
                  Ingen produkter endnu
                </div>
              ) : (
                popularProducts.map((product) => (
                  <motion.div
                    key={product.id}
                    whileHover={{ y: -2 }}
                    onClick={() => navigate(`/product/${product.id}`)}
                    className="min-w-[220px] max-w-[220px] md:min-w-[230px] md:max-w-[230px] lg:min-w-[240px] lg:max-w-[240px] rounded-xl border border-white/10 bg-secondary/40 p-4 flex-shrink-0 flex flex-col gap-2 snap-start cursor-pointer group"
                  >
                    <div className="h-32 w-full rounded-lg bg-cover bg-center bg-slate-700 mb-3 overflow-hidden relative">
                      {product.image_urls && product.image_urls.length > 0 ? (
                        <>
                          <img
                            src={product.image_urls[0]}
                            alt={getProductTitle(product)}
                            className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 ${
                              product.sold ? "opacity-50" : ""
                            }`}
                          />
                        </>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
                          Intet billede
                        </div>
                      )}

                      {/* Sold Badge */}
                      {product.sold && (
                        <div className="absolute top-2 left-2 px-2 py-1 bg-red-500/95 backdrop-blur-sm text-white text-xs font-bold rounded-lg border border-white/50 z-20">
                          SOLGT
                        </div>
                      )}

                      {/* Favorite Button */}
                      <div className="absolute top-2 right-2 z-10">
                        <FavoriteButton
                          itemId={product.id}
                          itemType="product"
                          currentUserId={currentUserId}
                          className="bg-black/50 backdrop-blur-sm p-1.5 rounded-full hover:bg-black/70"
                        />
                      </div>
                    </div>
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-sm font-semibold text-white line-clamp-2 flex-1">
                        {getProductTitle(product)}
                      </h3>
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <span>♥</span>
                        <span>{product.favoriteCount}</span>
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-1">
                      {product.type && `${product.type} · `}
                      {product.location && `${product.location} · `}
                      {formatPrice(product.price)}
                    </p>
                  </motion.div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Newest uploads */}
        <div className="space-y-6">
          <div className="flex flex-col items-center gap-1">
            <h2 className="text-xl font-semibold text-white text-center">
              Nyeste uploads
            </h2>
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-neon-blue" />
            </div>
          ) : (
            <div className="flex gap-4 overflow-x-auto pb-4 flex-nowrap scroll-smooth snap-x snap-mandatory scroll-px-4">
              {newestProducts.length === 0 ? (
                <div className="w-full text-center py-12 text-muted-foreground">
                  Ingen produkter endnu
                </div>
              ) : (
                newestProducts.map((product) => (
                  <motion.div
                    key={product.id}
                    whileHover={{ y: -2 }}
                    onClick={() => navigate(`/product/${product.id}`)}
                    className="min-w-[220px] max-w-[220px] md:min-w-[230px] md:max-w-[230px] lg:min-w-[240px] lg:max-w-[240px] rounded-xl border border-white/10 bg-secondary/40 p-4 flex-shrink-0 flex flex-col gap-2 snap-start cursor-pointer group"
                  >
                    <div className="h-32 w-full rounded-lg bg-cover bg-center bg-slate-700 mb-3 overflow-hidden relative">
                      {product.image_urls && product.image_urls.length > 0 ? (
                        <>
                          <img
                            src={product.image_urls[0]}
                            alt={getProductTitle(product)}
                            className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 ${
                              product.sold ? "opacity-50" : ""
                            }`}
                          />
                        </>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
                          Intet billede
                        </div>
                      )}

                      {/* Sold Badge */}
                      {product.sold && (
                        <div className="absolute top-2 left-2 px-2 py-1 bg-red-500/95 backdrop-blur-sm text-white text-xs font-bold rounded-lg border border-white/50 z-20">
                          SOLGT
                        </div>
                      )}

                      {/* Favorite Button */}
                      <div className="absolute top-2 right-2 z-10">
                        <FavoriteButton
                          itemId={product.id}
                          itemType="product"
                          currentUserId={currentUserId}
                          className="bg-black/50 backdrop-blur-sm p-1.5 rounded-full hover:bg-black/70"
                        />
                      </div>
                    </div>
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-sm font-semibold text-white line-clamp-2 flex-1">
                        {getProductTitle(product)}
                      </h3>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-1">
                      {product.location && `${product.location} · `}
                      {formatPrice(product.price)}
                    </p>
                  </motion.div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Newest rehearsalroom/studio uploads */}
        <div className="space-y-6">
          <div className="flex flex-col items-center gap-1">
            <h2 className="text-xl font-semibold text-white text-center">
              Nye øvelokaler &amp; studier
            </h2>
          </div>
          {roomsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-neon-blue" />
            </div>
          ) : (
            <div className="flex gap-4 overflow-x-auto pb-4 flex-nowrap scroll-smooth snap-x snap-mandatory scroll-px-4">
              {rehearsalRooms.length === 0 ? (
                <div className="w-full text-center py-12 text-muted-foreground">
                  Ingen øvelokaler endnu
                </div>
              ) : (
                rehearsalRooms.map((room) => (
                  <motion.div
                    key={room.id}
                    whileHover={{ y: -2 }}
                    onClick={() => navigate(`/room/${room.id}`)}
                    className="min-w-[220px] max-w-[220px] md:min-w-[230px] md:max-w-[230px] lg:min-w-[240px] lg:max-w-[240px] rounded-xl border border-white/10 bg-secondary/40 p-4 flex-shrink-0 flex flex-col gap-2 snap-start cursor-pointer group"
                  >
                    <div className="h-32 w-full rounded-lg bg-cover bg-center bg-slate-700 mb-3 overflow-hidden relative">
                      {room.image_urls && room.image_urls.length > 0 ? (
                        <img
                          src={room.image_urls[0]}
                          alt={room.name || room.type}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
                          Intet billede
                        </div>
                      )}

                      {/* Favorite Button */}
                      <div className="absolute top-2 right-2 z-10">
                        <FavoriteButton
                          itemId={room.id}
                          itemType="room"
                          currentUserId={currentUserId}
                          className="bg-black/50 backdrop-blur-sm p-1.5 rounded-full hover:bg-black/70"
                        />
                      </div>
                    </div>
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-sm font-semibold text-white line-clamp-2 flex-1">
                        {room.name || room.type}
                      </h3>
                    </div>
                    {room.location && (
                      <p className="text-xs text-muted-foreground line-clamp-1">
                        {room.location}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground capitalize">
                      {room.type}
                    </p>
                  </motion.div>
                ))
              )}
            </div>
          )}
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-blue-900/20 to-purple-900/20 border border-white/10 p-12 text-center">
          <div className="relative z-10">
            <h2 className="text-3xl md:text-4xl font-bold mb-6 text-white">
              Klar til at tage din musik til næste niveau?
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
              Opret en gratis profil i dag og bliv en del af Danmarks hurtigst
              voksende musikfællesskab.
            </p>
            <Link to="/register">
              <Button variant="neon" size="lg">
                Opret gratis profil
              </Button>
            </Link>
          </div>
          <div className="absolute inset-0 bg-grid-white/[0.02]" />
        </div>
      </section>
    </div>
  );
}

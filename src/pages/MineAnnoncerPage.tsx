import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Loader2, ChevronLeft, ChevronRight, Package, Trash2, Edit, ArrowLeft, Heart } from "lucide-react";
import { supabase } from "../lib/supabase";

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

type AnnouncementItem = (Product & { itemType: 'product' }) | (RehearsalRoom & { itemType: 'room' });

export function MineAnnoncerPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<AnnouncementItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [user, setUser] = useState<any>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [favoriteCounts, setFavoriteCounts] = useState<{ [key: string]: number }>({});
  const itemsPerPage = 12;

  useEffect(() => {
    checkUser();
  }, []);

  useEffect(() => {
    if (user) {
      fetchAllItems();
    }
  }, [currentPage, user]);

  const checkUser = async () => {
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) {
        navigate("/login", {
          state: { message: "Du skal være logget ind for at se dine annoncer" },
        });
        return;
      }
      setUser(currentUser);
    } catch (err: any) {
      setError(err.message || "Kunne ikke hente brugerinformation");
      setLoading(false);
    }
  };

  const fetchAllItems = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Fetch products
      const { data: productsData, error: productsError, count: productsCount } = await supabase
        .from("products")
        .select("*", { count: "exact" })
        .eq("user_id", user.id);

      if (productsError) throw productsError;

      // Fetch rehearsal rooms
      const { data: roomsData, error: roomsError, count: roomsCount } = await supabase
        .from("rehearsal_rooms")
        .select("*", { count: "exact" })
        .eq("user_id", user.id);

      if (roomsError) throw roomsError;

      // Combine and sort by created_at
      const productsWithType: AnnouncementItem[] = (productsData || []).map(p => ({ ...p, itemType: 'product' as const }));
      const roomsWithType: AnnouncementItem[] = (roomsData || []).map(r => ({ ...r, itemType: 'room' as const }));
      
      const allItems = [...productsWithType, ...roomsWithType].sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      // Paginate
      const from = (currentPage - 1) * itemsPerPage;
      const to = from + itemsPerPage;
      const paginatedItems = allItems.slice(from, to);

      setItems(paginatedItems);
      setTotalCount((productsCount || 0) + (roomsCount || 0));
      
      // Fetch favorite counts for all items
      await fetchFavoriteCounts(paginatedItems);
    } catch (err: any) {
      setError(err.message || "Kunne ikke hente annoncer");
    } finally {
      setLoading(false);
    }
  };

  const fetchFavoriteCounts = async (itemsList: AnnouncementItem[]) => {
    const counts: { [key: string]: number } = {};
    
    for (const item of itemsList) {
      try {
        const { count, error } = await supabase
          .from("favorites")
          .select("*", { count: "exact", head: true })
          .eq(item.itemType === 'product' ? 'product_id' : 'room_id', item.id);
        
        if (!error) {
          counts[item.id] = count || 0;
        }
      } catch (err) {
        console.error(`Error fetching favorite count for ${item.id}:`, err);
        counts[item.id] = 0;
      }
    }
    
    setFavoriteCounts(counts);
  };

  const handleDelete = async (itemId: string, itemType: 'product' | 'room') => {
    if (!confirm("Er du sikker på, at du vil slette denne annonce?")) {
      return;
    }

    try {
      setDeletingId(itemId);

      // Delete images from storage
      const item = items.find((i) => i.id === itemId);
      if (item?.image_urls && item.image_urls.length > 0) {
        const imagePaths: string[] = [];
        
        for (const imageUrl of item.image_urls) {
          try {
            // Extract path from URL - handle different URL formats
            let path: string | null = null;
            
            // Try to extract path after /gearninjaImages/
            const gearninjaImagesIndex = imageUrl.indexOf("/gearninjaImages/");
            if (gearninjaImagesIndex !== -1) {
              path = imageUrl.substring(gearninjaImagesIndex + "/gearninjaImages/".length);
              // Remove query parameters if any
              const queryIndex = path.indexOf("?");
              if (queryIndex !== -1) {
                path = path.substring(0, queryIndex);
              }
            }
            
            if (path) {
              imagePaths.push(path);
            }
          } catch (err) {
            console.error("Error extracting image path:", err, imageUrl);
          }
        }

        // Delete all images at once if we have paths
        if (imagePaths.length > 0) {
          const { error: storageError } = await supabase.storage
            .from("gearninjaImages")
            .remove(imagePaths);
          
          if (storageError) {
            console.error("Error deleting images from storage:", storageError);
            // Continue with deletion even if image deletion fails
          }
        }
      }

      // Delete from appropriate table
      const tableName = itemType === 'product' ? 'products' : 'rehearsal_rooms';
      const { error: deleteError } = await supabase
        .from(tableName)
        .delete()
        .eq("id", itemId)
        .eq("user_id", user.id);

      if (deleteError) throw deleteError;

      // Refresh items list
      await fetchAllItems();
    } catch (err: any) {
      setError(err.message || "Kunne ikke slette annonce");
    } finally {
      setDeletingId(null);
    }
  };

  const handleEdit = async (itemId: string, itemType: 'product' | 'room') => {
    const item = items.find((i) => i.id === itemId);
    if (!item) return;

    if (itemType === 'room') {
      // Navigate to create rehearsal room page with edit data
      navigate("/create/oevelokaler", { state: { editRoom: item } });
    } else {
      // Navigate to the appropriate create page based on category
      const product = item as Product & { itemType: 'product' };
      const categoryMap: { [key: string]: string } = {
        trommer: "/create/trommer",
        guitar: "/create/guitar",
        bas: "/create/bas",
        keyboards: "/create/keyboards",
        blaes: "/create/blaes",
        studieudstyr: "/create/studieudstyr",
        strygere: "/create/strygere",
      };

      const editPath = categoryMap[product.category];
      if (editPath) {
        navigate(editPath, { state: { editProduct: product } });
      }
    }
  };

  const formatPrice = (price: number | null, paymentType?: string | null) => {
    if (!price) return "Pris på anmodning";
    const formattedPrice = `${price.toLocaleString("da-DK")} kr.`;
    if (paymentType) {
      return `${formattedPrice} ${paymentType}`;
    }
    return formattedPrice;
  };

  const totalPages = Math.ceil(totalCount / itemsPerPage);

  if (!user) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-neon-blue" />
      </div>
    );
  }

  return (
    <div className="min-h-[80vh] py-8 px-4">
      <div className="container mx-auto max-w-7xl">
        {/* Header */}
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
              Mine annoncer
            </h1>
            <p className="text-lg text-muted-foreground">
              {totalCount > 0
                ? `${totalCount} ${totalCount === 1 ? "annonce" : "annoncer"} oprettet`
                : "Ingen annoncer endnu"}
            </p>
          </div>
        </motion.div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-neon-blue" />
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Items Grid */}
        {!loading && !error && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {items.length === 0 ? (
              <div className="col-span-full text-center py-20">
                <Package className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground text-lg mb-4">
                  Du har ikke oprettet nogen annoncer endnu.
                </p>
                <button
                  onClick={() => navigate("/create")}
                  className="px-6 py-3 rounded-lg bg-neon-blue text-white font-semibold hover:bg-neon-blue/90 transition-colors"
                >
                  Opret din første annonce
                </button>
              </div>
            ) : (
              items.map((item, index) => {
                const isProduct = item.itemType === 'product';
                const product = isProduct ? item as Product & { itemType: 'product' } : null;
                const room = !isProduct ? item as RehearsalRoom & { itemType: 'room' } : null;

                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                    whileHover={{ y: -4 }}
                    className="rounded-xl border border-white/10 bg-secondary/40 overflow-hidden flex flex-col group relative"
                  >
                    {/* Action Buttons */}
                    <div className="absolute top-2 right-2 z-10 flex gap-2">
                      <button
                        onClick={() => handleEdit(item.id, item.itemType)}
                        className="p-2 rounded-lg bg-blue-500/80 hover:bg-blue-500 text-white backdrop-blur-sm transition-colors"
                        title="Rediger"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(item.id, item.itemType)}
                        disabled={deletingId === item.id}
                        className="p-2 rounded-lg bg-red-500/80 hover:bg-red-500 text-white backdrop-blur-sm transition-colors disabled:opacity-50"
                        title="Slet"
                      >
                        {deletingId === item.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                    </div>

                    {/* Image */}
                    <div
                      onClick={() => navigate(isProduct ? `/product/${item.id}` : `/room/${item.id}`)}
                      className="relative aspect-square overflow-hidden bg-slate-700 cursor-pointer"
                    >
                      {item.image_urls && item.image_urls.length > 0 ? (
                        <img
                          src={item.image_urls[0]}
                          alt={isProduct && product 
                            ? (product.brand && product.model ? `${product.brand} ${product.model}` : product.type)
                            : (room?.name || room?.type || 'Lokale')}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                          Intet billede
                        </div>
                      )}
                      {isProduct && product?.condition && (
                        <div className="absolute top-2 left-2 px-2 py-1 bg-background/80 backdrop-blur-sm text-white text-xs font-semibold rounded">
                          {product.condition}
                        </div>
                      )}
                      <div className="absolute bottom-2 left-2 px-2 py-1 bg-background/80 backdrop-blur-sm text-white text-xs font-semibold rounded capitalize">
                        {isProduct && product ? product.category : (room?.type || 'Lokale')}
                      </div>
                      
                      {/* Favorite Count */}
                      <div className="absolute bottom-2 right-2 px-2 py-1 bg-background/80 backdrop-blur-sm text-white text-xs font-semibold rounded flex items-center gap-1">
                        <Heart className="w-3 h-3 fill-red-500 text-red-500" />
                        <span>{favoriteCounts[item.id] || 0}</span>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-4 flex flex-col gap-2 flex-1">
                      <div
                        onClick={() => navigate(isProduct ? `/product/${item.id}` : `/room/${item.id}`)}
                        className="flex items-start justify-between gap-2 cursor-pointer"
                      >
                        <h3 className="text-sm font-semibold text-white line-clamp-2 flex-1">
                          {isProduct && product
                            ? (product.brand && product.model
                                ? `${product.brand} ${product.model}`
                                : product.type)
                            : (room?.name || room?.type || 'Lokale')}
                        </h3>
                      </div>

                      {isProduct ? null : room?.address && (
                        <p className="text-xs text-muted-foreground line-clamp-1">
                          {room.address}
                        </p>
                      )}

                      {isProduct ? null : room?.room_size && (
                        <p className="text-xs text-muted-foreground">
                          {room.room_size} m²
                        </p>
                      )}

                      <div className="mt-auto pt-2 flex items-center justify-between">
                        <span className="text-sm font-bold text-neon-blue">
                          {isProduct && product
                            ? formatPrice(product.price)
                            : formatPrice(room?.price || null, room?.payment_type || null)}
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
              })
            )}
          </div>
        )}

        {/* Pagination */}
        {!loading && !error && totalPages > 1 && (
          <div className="mt-8 flex items-center justify-center gap-4">
            <button
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="p-2 rounded-lg border border-white/10 bg-secondary/40 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-secondary/60 transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`px-4 py-2 rounded-lg border transition-colors ${
                    currentPage === page
                      ? "bg-neon-blue border-neon-blue text-white"
                      : "border-white/10 bg-secondary/40 hover:bg-secondary/60 text-white"
                  }`}
                >
                  {page}
                </button>
              ))}
            </div>
            <button
              onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="p-2 rounded-lg border border-white/10 bg-secondary/40 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-secondary/60 transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}


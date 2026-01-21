import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  X,
  Loader2,
  Maximize2,
  Heart,
  Star,
  CheckCircle2,
} from "lucide-react";
import { supabase } from "../lib/supabase";
import { FavoriteButton } from "../components/FavoriteButton";
import { ReviewModal } from "../components/reviews/ReviewModal";
import { ReviewsList } from "../components/reviews/ReviewsList";
import { UsernameWithRating } from "../components/UsernameWithRating";

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
  user_id: string;
  sold?: boolean;
  sold_at?: string;
  is_soft_deleted?: boolean;
}



interface Sale {
  id: string;
  status: "pending" | "completed" | "cancelled";
  buyer_id: string;
  seller_id: string;
  completed_at?: string;
}

export function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [lightboxImageIndex, setLightboxImageIndex] = useState(0);
  const [favoriteCount, setFavoriteCount] = useState<number>(0);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  
  // Sales & Reviews State
  const [sale, setSale] = useState<Sale | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [processingSale, setProcessingSale] = useState(false);
  const [userReview, setUserReview] = useState<any>(null);
  const [reviewsRefreshTrigger, setReviewsRefreshTrigger] = useState(0);

  useEffect(() => {
    // Scroll to top when navigating to detail page
    window.scrollTo(0, 0);
    checkUser();
    if (id) {
      fetchProduct(id);
    }
  }, [id]);

  // Fetch user's review when sale and currentUserId are both available
  useEffect(() => {
    if (sale?.status === 'completed' && currentUserId) {
      fetchUserReview(sale.id);
    }
  }, [sale, currentUserId]);

  const checkUser = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    setCurrentUserId(user?.id || null);
  };

  const fetchProduct = async (productId: string) => {
    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from("products")
        .select("*")
        .eq("id", productId)
        .single();

      if (fetchError) throw fetchError;

      setProduct(data);


      // Fetch favorite count
      await fetchFavoriteCount(productId);

      // Fetch sale status if sold
      if (data.sold) {
        await fetchSaleStatus(productId);
      }
    } catch (err: any) {
      setError(err.message || "Kunne ikke hente produkt");
    } finally {
      setLoading(false);
    }
  };

  const fetchFavoriteCount = async (productId: string) => {
    try {
      const { count, error } = await supabase
        .from("favorites")
        .select("*", { count: "exact", head: true })
        .eq("product_id", productId);

      if (!error) {
        setFavoriteCount(count || 0);
      }
    } catch (err) {
      console.error("Error fetching favorite count:", err);
      setFavoriteCount(0);
    }
  };


  const fetchSaleStatus = async (productId: string) => {
    try {
      const { data, error } = await supabase
        .from("sales")
        .select("*")
        .eq("product_id", productId)
        .single();

      if (!error && data) {
        setSale(data);
      }
    } catch (err) {
      console.error("Error fetching sale status:", err);
    }
  };

  const fetchUserReview = async (saleId: string) => {
    try {
      const { data, error } = await supabase
        .from("reviews")
        .select("*")
        .eq("sale_id", saleId)
        .eq("reviewer_id", currentUserId)
        .maybeSingle();

      if (!error && data) {
        setUserReview(data);
      }
    } catch (err) {
      console.error("Error fetching user review:", err);
    }
  };



  const handleConfirmSale = async () => {
    if (!sale) return;

    try {
      setProcessingSale(true);
      const { data, error } = await supabase.rpc("confirm_sale", {
        p_sale_id: sale.id,
      });

      if (error) throw error;

      if (data.success) {
        // Fetch updated sale to get completed_at timestamp
        const { data: updatedSale, error: fetchError } = await supabase
          .from("sales")
          .select("*")
          .eq("id", sale.id)
          .single();

        if (!fetchError && updatedSale) {
          setSale(updatedSale);
        } else {
          // Fallback: set completed_at manually if fetch fails
          setSale({ ...sale, status: "completed", completed_at: new Date().toISOString() });
        }
      } else {
        throw new Error(data.error || "Der skete en fejl");
      }
    } catch (err: any) {
      console.error("Error confirming sale:", err);
      alert("Fejl ved bekræftelse af salg: " + err.message);
    } finally {
      setProcessingSale(false);
    }
  };

  const handleDeclineSale = async () => {
    if (!sale) return;

    const confirmed = window.confirm(
      "Er du sikker på, at du vil afvise dette køb? Sælger vil kunne vælge en anden køber."
    );

    if (!confirmed) return;

    try {
      setProcessingSale(true);
      const { data, error } = await supabase.rpc("decline_sale", {
        p_sale_id: sale.id,
      });

      if (error) throw error;

      if (data.success) {
        // Refresh the product to show it's no longer sold
        if (id) {
          await fetchProduct(id);
        }
        setSale(null);
      } else {
        throw new Error(data.error || "Der skete en fejl");
      }
    } catch (err: any) {
      console.error("Error declining sale:", err);
      alert("Fejl ved afvisning af salg: " + err.message);
    } finally {
      setProcessingSale(false);
    }
  };

  const nextImage = () => {
    if (!product || !product.image_urls) return;
    setCurrentImageIndex((prev) =>
      prev < product.image_urls.length - 1 ? prev + 1 : 0
    );
  };

  const prevImage = () => {
    if (!product || !product.image_urls) return;
    setCurrentImageIndex((prev) =>
      prev > 0 ? prev - 1 : product.image_urls.length - 1
    );
  };

  const openLightbox = (index: number) => {
    setLightboxImageIndex(index);
    setIsLightboxOpen(true);
  };

  const closeLightbox = () => {
    setIsLightboxOpen(false);
  };

  const nextLightboxImage = () => {
    if (!product || !product.image_urls) return;
    setLightboxImageIndex((prev) =>
      prev < product.image_urls.length - 1 ? prev + 1 : 0
    );
  };

  const prevLightboxImage = () => {
    if (!product || !product.image_urls) return;
    setLightboxImageIndex((prev) =>
      prev > 0 ? prev - 1 : product.image_urls.length - 1
    );
  };

  const formatPrice = (price: number | null) => {
    if (!price) return "Pris på anmodning";
    return `${price.toLocaleString("da-DK")} kr.`;
  };

  const canStillReview = () => {
    // If sale is not completed, can't review
    if (sale?.status !== "completed") return false;
    
    // If completed_at is not set yet, allow review (just completed)
    if (!sale?.completed_at) return true;
    
    // Check if 14 days have passed
    const completedAt = new Date(sale.completed_at);
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
    return completedAt >= fourteenDaysAgo;
  };

  if (loading) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-neon-blue" />
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-[80vh] py-8 px-4">
        <div className="max-w-3xl mx-auto">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-neon-blue transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">Tilbage</span>
          </button>
          <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400">
            {error || "Produkt ikke fundet"}
          </div>
        </div>
      </div>
    );
  }

  const hasMultipleImages = product.image_urls && product.image_urls.length > 1;

  return (
    <>
      <div className="min-h-[80vh] py-8 px-4">
        <div className="max-w-6xl mx-auto">
          {/* Back Button */}
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-neon-blue transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">Tilbage</span>
          </button>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Image Section */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
              className="relative"
            >
              {product.image_urls && product.image_urls.length > 0 ? (
                <div className="relative aspect-square rounded-xl overflow-hidden bg-slate-700 border border-white/10">
                  <AnimatePresence mode="wait">
                    <motion.img
                      key={currentImageIndex}
                      src={product.image_urls[currentImageIndex]}
                      alt={
                        product.brand && product.model
                          ? `${product.brand} ${product.model}`
                          : product.type
                      }
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="w-full h-full object-cover cursor-pointer"
                      onClick={() => openLightbox(currentImageIndex)}
                    />
                  </AnimatePresence>

                  {/* Arrow Controls */}
                  {hasMultipleImages && (
                    <>
                      <button
                        onClick={prevImage}
                        className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-background/80 backdrop-blur-sm hover:bg-background transition-colors text-white"
                        aria-label="Forrige billede"
                      >
                        <ChevronLeft className="w-6 h-6" />
                      </button>
                      <button
                        onClick={nextImage}
                        className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-background/80 backdrop-blur-sm hover:bg-background transition-colors text-white"
                        aria-label="Næste billede"
                      >
                        <ChevronRight className="w-6 h-6" />
                      </button>
                    </>
                  )}

                  {/* Image Counter */}
                  {hasMultipleImages && (
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-background/80 backdrop-blur-sm text-white text-sm">
                      {currentImageIndex + 1} / {product.image_urls.length}
                    </div>
                  )}

                  {/* Enlarge Icon */}
                  <button
                    onClick={() => openLightbox(currentImageIndex)}
                    className="absolute top-4 right-4 p-2 rounded-full bg-background/80 backdrop-blur-sm hover:bg-background transition-colors text-white"
                    aria-label="Forstør billede"
                  >
                    <Maximize2 className="w-5 h-5" />
                  </button>
                </div>
              ) : (
                <div className="aspect-square rounded-xl bg-slate-700 border border-white/10 flex items-center justify-center text-muted-foreground">
                  Intet billede
                </div>
              )}

              {/* Thumbnail Navigation */}
              {hasMultipleImages && (
                <div className="flex gap-2 mt-4 overflow-x-auto pb-2">
                  {product.image_urls.map((url, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentImageIndex(index)}
                      className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-all ${
                        currentImageIndex === index
                          ? "border-neon-blue"
                          : "border-white/10 opacity-60 hover:opacity-100"
                      }`}
                    >
                      <img
                        src={url}
                        alt={`Thumbnail ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </motion.div>

            {/* Product Details */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
              className="space-y-6"
            >
              {/* Header Section */}
              <div className="pb-6 border-b border-white/10">
                <div className="flex items-center gap-3 mb-3">
                  <h1 className="text-3xl md:text-4xl font-bold text-white">
                    {product.brand && product.model
                      ? `${product.brand} ${product.model}`
                      : product.type}
                  </h1>
                  {product.sold && (
                    <div className="flex flex-col gap-1">
                      <span className="px-3 py-1 rounded-full bg-red-500/20 border border-red-500/50 text-red-400 text-sm font-semibold text-center">
                        SOLGT
                      </span>
                      {product.sold_at && (
                        <span className="text-xs text-muted-foreground">
                          Slettes automatisk om {Math.max(0, 3 - Math.floor((new Date().getTime() - new Date(product.sold_at).getTime()) / (1000 * 60 * 60 * 24)))} dage
                        </span>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-between gap-4 mb-4">
                  <p className="text-2xl font-bold text-white">
                    {formatPrice(product.price)}
                  </p>
                  <FavoriteButton
                    itemId={product.id}
                    itemType="product"
                    currentUserId={currentUserId}
                    className="text-base"
                  />
                </div>
                {/* Contact Seller Button */}
                {currentUserId && currentUserId !== product.user_id && (
                  <button
                    onClick={() =>
                      navigate(
                        `/chat?itemId=${product.id}&itemType=product&sellerId=${product.user_id}`
                      )
                    }
                    className="w-full px-4 py-3 rounded-lg bg-transparent border border-neon-blue text-neon-blue shadow-[0_0_10px_#00f3ff] hover:bg-neon-blue/10 hover:shadow-[0_0_20px_#00f3ff] transition-all duration-300 font-medium"
                  >
                    Skriv til sælger
                  </button>
                )}



                {/* Confirm Purchase (Buyer) */}
                {product.sold && sale?.status === "pending" && currentUserId === sale.buyer_id && (
                  <div className="mt-4 p-6 rounded-xl bg-gradient-to-r from-neon-blue/20 to-blue-500/20 border-2 border-neon-blue/50 shadow-lg">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 rounded-full bg-neon-blue/30 flex items-center justify-center">
                        <CheckCircle2 className="w-6 h-6 text-neon-blue" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-white">Bekræft køb</h3>
                        <p className="text-sm text-muted-foreground">Sælger har valgt dig som køber</p>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={handleDeclineSale}
                        disabled={processingSale}
                        className="flex-1 px-6 py-4 rounded-lg bg-secondary/50 border border-white/20 text-white font-medium hover:bg-secondary/70 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Afvis
                      </button>
                      <button
                        onClick={handleConfirmSale}
                        disabled={processingSale}
                        className="flex-1 px-6 py-4 rounded-lg bg-[#00FFFF] text-black font-bold text-lg hover:bg-[#00FFFF]/80 transition-all hover:scale-105 shadow-[0_0_20px_rgba(0,255,255,0.5)] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:shadow-none"
                      >
                        {processingSale && <Loader2 className="w-5 h-5 animate-spin" />}
                        Bekræft køb
                      </button>
                    </div>
                  </div>
                )}

                {/* Review Section (Both) */}
                {sale?.status === "completed" && (currentUserId === sale.buyer_id || currentUserId === sale.seller_id) && (
                  <div className="mt-4 space-y-4">
                    <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/30">
                      <p className="text-green-400 font-medium mb-3">
                        {userReview ? "Handlen er gennemført! Du har skrevet en anmeldelse." : "Handlen er gennemført!"}
                      </p>
                      {userReview ? (
                        <div className="p-4 rounded-lg bg-secondary/50 border border-white/10">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-sm font-medium text-green-400">✓ Anmeldelse skrevet</span>
                            <div className="flex gap-1">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <Star
                                  key={star}
                                  className={`w-4 h-4 ${
                                    star <= userReview.rating
                                      ? "fill-yellow-500 text-yellow-500"
                                      : "text-muted-foreground"
                                  }`}
                                />
                              ))}
                            </div>
                          </div>
                          {userReview.content && (
                            <p className="text-white text-sm mt-2">{userReview.content}</p>
                          )}
                        </div>
                      ) : canStillReview() ? (
                        <button
                          onClick={() => setShowReviewModal(true)}
                          className="w-full px-4 py-2 rounded-lg bg-green-500/20 text-green-400 border border-green-500/50 hover:bg-green-500/30 transition-colors"
                        >
                          Skriv anmeldelse
                        </button>
                      ) : (
                        <div className="p-4 rounded-lg bg-secondary/50 border border-white/10 text-center text-muted-foreground text-sm">
                          Tiden til at anmelde er udløbet (14 dage)
                        </div>
                      )}
                    </div>
                    
                    <ReviewsList saleId={sale.id} refreshTrigger={reviewsRefreshTrigger} />
                  </div>
                )}
              </div>

              {/* Product Information Cards */}
              <div className="space-y-4">
                {/* Basic Info Card */}
                <div className="p-5 rounded-xl border border-white/10 bg-secondary/20 backdrop-blur-sm">
                  <h2 className="text-lg font-semibold text-white mb-4 pb-2 border-b border-white/10">
                    Produktinformation
                  </h2>
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">
                        Type
                      </h3>
                      <p className="text-white text-base">{product.type}</p>
                    </div>

                    {product.brand && (
                      <div className="pt-3 border-t border-white/5">
                        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">
                          Mærke
                        </h3>
                        <p className="text-white text-base">{product.brand}</p>
                      </div>
                    )}

                    {product.model && (
                      <div className="pt-3 border-t border-white/5">
                        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">
                          Model
                        </h3>
                        <p className="text-white text-base">{product.model}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Description Card */}
                {product.description && (
                  <div className="p-5 rounded-xl border border-white/10 bg-secondary/20 backdrop-blur-sm">
                    <h2 className="text-lg font-semibold text-white mb-4 pb-2 border-b border-white/10">
                      Beskrivelse
                    </h2>
                    <p className="text-white whitespace-pre-wrap leading-relaxed">
                      {product.description}
                    </p>
                  </div>
                )}

                {/* Details Card */}
                <div className="p-5 rounded-xl border border-white/10 bg-secondary/20 backdrop-blur-sm">
                  <h2 className="text-lg font-semibold text-white mb-4 pb-2 border-b border-white/10">
                    Detaljer
                  </h2>
                  <div className="space-y-4">
                    {product.condition && (
                      <div>
                        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">
                          Stand
                        </h3>
                        <p className="text-white text-base">
                          {product.condition}
                        </p>
                      </div>
                    )}

                    {product.year && (
                      <div
                        className={
                          product.condition
                            ? "pt-3 border-t border-white/5"
                            : ""
                        }
                      >
                        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">
                          Produktionsår
                        </h3>
                        <p className="text-white text-base">{product.year}</p>
                      </div>
                    )}

                    {product.location && (
                      <div
                        className={
                          product.condition || product.year
                            ? "pt-3 border-t border-white/5"
                            : ""
                        }
                      >
                        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">
                          Lokation
                        </h3>
                        <p className="text-white text-base">
                          {product.location}
                        </p>
                      </div>
                    )}

                    {product.user_id && (
                      <div className="pt-3 border-t border-white/5">
                        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">
                          Sælger
                        </h3>
                        <UsernameWithRating userId={product.user_id} className="text-base" />
                      </div>
                    )}

                    {/* Favorite Count */}
                    <div className="pt-3 border-t border-white/5">
                      <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">
                        Favoritter
                      </h3>
                      <div className="flex items-center gap-2">
                        <Heart className="w-4 h-4 fill-red-500 text-red-500" />
                        <p className="text-white text-base">
                          {favoriteCount}{" "}
                          {favoriteCount === 1 ? "person" : "personer"} har gemt
                          dette
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Lightbox Modal */}
      <AnimatePresence>
        {isLightboxOpen && product.image_urls && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4"
            onClick={closeLightbox}
            style={{ paddingTop: '8rem', paddingBottom: '2rem' }}
          >
            <button
              onClick={closeLightbox}
              className="absolute top-6 right-6 p-3 rounded-full bg-white/10 hover:bg-white/20 transition-colors text-white z-10 backdrop-blur-sm"
              aria-label="Luk"
            >
              <X className="w-6 h-6" />
            </button>

            {hasMultipleImages && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    prevLightboxImage();
                  }}
                  className="absolute left-6 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 hover:bg-white/20 transition-colors text-white z-10 backdrop-blur-sm"
                  aria-label="Forrige billede"
                >
                  <ChevronLeft className="w-8 h-8" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    nextLightboxImage();
                  }}
                  className="absolute right-6 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 hover:bg-white/20 transition-colors text-white z-10 backdrop-blur-sm"
                  aria-label="Næste billede"
                >
                  <ChevronRight className="w-8 h-8" />
                </button>
              </>
            )}

            <motion.img
              key={lightboxImageIndex}
              src={product.image_urls[lightboxImageIndex]}
              alt={`Billede ${lightboxImageIndex + 1}`}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="max-w-full max-h-full w-auto h-auto object-contain"
              onClick={(e) => e.stopPropagation()}
            />

            {hasMultipleImages && (
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm text-white text-sm">
                {lightboxImageIndex + 1} / {product.image_urls.length}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>


      {/* Review Modal */}
      {sale && (
        <ReviewModal
          isOpen={showReviewModal}
          onClose={() => setShowReviewModal(false)}
          saleId={sale.id}
          onReviewSubmitted={() => {
            // Refresh user's review
            if (sale) {
              fetchUserReview(sale.id);
            }
            // Trigger reviews list refresh to check if both parties have reviewed
            setReviewsRefreshTrigger(prev => prev + 1);
          }}
        />
      )}
    </>
  );
}

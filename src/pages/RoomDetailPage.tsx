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
  MapPin,
  Square,
  Clock,
  Heart,
} from "lucide-react";
import { supabase } from "../lib/supabase";
import { FavoriteButton } from "../components/FavoriteButton";
import { UsernameWithRating } from "../components/UsernameWithRating";

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
  user_id: string;
  rented_out?: boolean;
  rented_out_at?: string;
}

export function RoomDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [room, setRoom] = useState<RehearsalRoom | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [lightboxImageIndex, setLightboxImageIndex] = useState(0);
  const [favoriteCount, setFavoriteCount] = useState<number>(0);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    // Scroll to top when navigating to detail page
    window.scrollTo(0, 0);
    checkUser();
    if (id) {
      fetchRoom(id);
    }
  }, [id]);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUserId(user?.id || null);
  };

  const fetchRoom = async (roomId: string) => {
    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from("rehearsal_rooms")
        .select("*")
        .eq("id", roomId)
        .single();

      if (fetchError) throw fetchError;

      setRoom(data);

      
      // Fetch favorite count
      await fetchFavoriteCount(roomId);
    } catch (err: any) {
      setError(err.message || "Kunne ikke hente lokale");
    } finally {
      setLoading(false);
    }
  };

  const fetchFavoriteCount = async (roomId: string) => {
    try {
      const { count, error } = await supabase
        .from("favorites")
        .select("*", { count: "exact", head: true })
        .eq('room_id', roomId);
      
      if (!error) {
        setFavoriteCount(count || 0);
      }
    } catch (err) {
      console.error('Error fetching favorite count:', err);
      setFavoriteCount(0);
    }
  };


  const nextImage = () => {
    if (!room || !room.image_urls) return;
    setCurrentImageIndex((prev) =>
      prev < room.image_urls.length - 1 ? prev + 1 : 0
    );
  };

  const prevImage = () => {
    if (!room || !room.image_urls) return;
    setCurrentImageIndex((prev) =>
      prev > 0 ? prev - 1 : room.image_urls.length - 1
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
    if (!room || !room.image_urls) return;
    setLightboxImageIndex((prev) =>
      prev < room.image_urls.length - 1 ? prev + 1 : 0
    );
  };

  const prevLightboxImage = () => {
    if (!room || !room.image_urls) return;
    setLightboxImageIndex((prev) =>
      prev > 0 ? prev - 1 : room.image_urls.length - 1
    );
  };

  const formatPrice = (price: number | null, paymentType: string | null) => {
    if (!price) return "Pris på anmodning";
    const formattedPrice = `${price.toLocaleString("da-DK")} kr.`;
    if (paymentType) {
      return `${formattedPrice} ${paymentType}`;
    }
    return formattedPrice;
  };

  if (loading) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-neon-blue" />
      </div>
    );
  }

  if (error || !room) {
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
            {error || "Lokale ikke fundet"}
          </div>
        </div>
      </div>
    );
  }

  const hasMultipleImages = room.image_urls && room.image_urls.length > 1;

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
              {room.image_urls && room.image_urls.length > 0 ? (
                <div className="relative aspect-square rounded-xl overflow-hidden bg-slate-700 border border-white/10">
                  <AnimatePresence mode="wait">
                    <motion.img
                      key={currentImageIndex}
                      src={room.image_urls[currentImageIndex]}
                      alt={room.name || room.type}
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
                      {currentImageIndex + 1} / {room.image_urls.length}
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
                  {room.image_urls.map((url, index) => (
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

              {/* Room Details */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
              className="space-y-6"
            >
              {/* Header Section */}
              <div className="pb-6 border-b border-white/10">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="flex-1">
                    <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
                      {room.name || room.type}
                    </h1>
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="inline-block px-3 py-1 rounded-lg bg-neon-blue/20 border border-neon-blue/30 text-neon-blue text-sm font-semibold capitalize">
                        {room.type}
                      </div>
                      {room.rented_out && (
                        <div className="inline-block px-3 py-1 rounded-lg bg-orange-500/90 border border-orange-400 text-white text-sm font-semibold">
                          LEJET UD
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-4 mb-4">
                  <div className="text-2xl font-bold text-white">
                    {formatPrice(room.price, room.payment_type)}
                  </div>
                  <FavoriteButton
                    itemId={room.id}
                    itemType="room"
                    currentUserId={currentUserId}
                    className="text-base"
                  />
                </div>
                {/* Contact Landlord Button */}
                {currentUserId && currentUserId !== room.user_id && (
                  <button
                    onClick={() =>
                      navigate(
                        `/chat?itemId=${room.id}&itemType=room&sellerId=${room.user_id}`
                      )
                    }
                    className="w-full px-4 py-3 rounded-lg bg-neon-blue/20 border border-neon-blue/50 text-neon-blue hover:bg-neon-blue/30 transition-colors font-medium"
                  >
                    Skriv til udlejer
                  </button>
                )}
              </div>

              {/* Details Cards */}
              <div className="space-y-4">
                {room.location && (
                  <div className="p-4 rounded-xl border border-white/10 bg-secondary/40">
                    <div className="flex items-center gap-3 mb-2">
                      <MapPin className="w-5 h-5 text-neon-blue" />
                      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                        Lokation
                      </h3>
                    </div>
                    <p className="text-white">{room.location}</p>
                  </div>
                )}

                {room.address && (
                  <div className="p-4 rounded-xl border border-white/10 bg-secondary/40">
                    <div className="flex items-center gap-3 mb-2">
                      <MapPin className="w-5 h-5 text-neon-blue" />
                      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                        Adresse
                      </h3>
                    </div>
                    <p className="text-white">{room.address}</p>
                  </div>
                )}

                {room.room_size && (
                  <div className="p-4 rounded-xl border border-white/10 bg-secondary/40">
                    <div className="flex items-center gap-3 mb-2">
                      <Square className="w-5 h-5 text-neon-blue" />
                      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                        Størrelse
                      </h3>
                    </div>
                    <p className="text-white">{room.room_size} m²</p>
                  </div>
                )}

                {room.payment_type && (
                  <div className="p-4 rounded-xl border border-white/10 bg-secondary/40">
                    <div className="flex items-center gap-3 mb-2">
                      <Clock className="w-5 h-5 text-neon-blue" />
                      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                        Betalingstype
                      </h3>
                    </div>
                    <p className="text-white capitalize">{room.payment_type}</p>
                  </div>
                )}

                {room.description && (
                  <div className="p-4 rounded-xl border border-white/10 bg-secondary/40">
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                      Beskrivelse
                    </h3>
                    <p className="text-white whitespace-pre-wrap leading-relaxed">
                      {room.description}
                    </p>
                  </div>
                )}

                {room.user_id && (
                  <div className="p-4 rounded-xl border border-white/10 bg-secondary/40">
                    <div className="flex items-center gap-3 mb-2">
                      <MapPin className="w-5 h-5 text-neon-blue" />
                      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                        Udlejer
                      </h3>
                    </div>
                    <UsernameWithRating userId={room.user_id} className="mb-3" />
                  </div>
                )}
                
                {/* Favorite Count */}
                <div className="p-4 rounded-xl border border-white/10 bg-secondary/40">
                  <div className="flex items-center gap-3 mb-2">
                    <Heart className="w-5 h-5 text-red-500 fill-red-500" />
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                      Favoritter
                    </h3>
                  </div>
                  <p className="text-white">{favoriteCount} {favoriteCount === 1 ? 'person' : 'personer'} har gemt dette</p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Lightbox Modal */}
      <AnimatePresence>
        {isLightboxOpen && room.image_urls && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4"
            onClick={closeLightbox}
          >
            <button
              onClick={closeLightbox}
              className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
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
                  className="absolute left-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                  aria-label="Forrige billede"
                >
                  <ChevronLeft className="w-8 h-8" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    nextLightboxImage();
                  }}
                  className="absolute right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                  aria-label="Næste billede"
                >
                  <ChevronRight className="w-8 h-8" />
                </button>
              </>
            )}

            <motion.img
              key={lightboxImageIndex}
              src={room.image_urls[lightboxImageIndex]}
              alt={room.name || room.type}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="max-w-full max-h-full object-contain"
              onClick={(e) => e.stopPropagation()}
            />

            {hasMultipleImages && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm text-white text-sm">
                {lightboxImageIndex + 1} / {room.image_urls.length}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}


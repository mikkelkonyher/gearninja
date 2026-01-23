import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Star, Loader2 } from "lucide-react";
import { supabase } from "../../lib/supabase";

interface ReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  saleId: string;
  onReviewSubmitted: () => void;
}

export function ReviewModal({
  isOpen,
  onClose,
  saleId,
  onReviewSubmitted,
}: ReviewModalProps) {
  const [rating, setRating] = useState(0);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) {
      setError("Vælg venligst en bedømmelse");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) throw new Error("Du skal være logget ind");

      const { error: functionError } = await supabase.functions.invoke(
        "create-review",
        {
          body: {
            sale_id: saleId,
            rating,
            content: content || null,
          },
        }
      );

      if (functionError) throw functionError;

      onReviewSubmitted();
      onClose();
    } catch (err: any) {
      // Try to parse error message if it's a JSON string from edge function
      let errorMessage = "Der skete en fejl";
      if (err.message) {
        try {
          const errorObj = JSON.parse(err.message);
          errorMessage = errorObj.error || errorMessage;
        } catch {
          errorMessage = err.message;
        }
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="w-full max-w-md bg-[#1A1D24] border border-white/10 rounded-xl shadow-2xl overflow-hidden"
          >
            <div className="p-6 border-b border-white/10 flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">Skriv anmeldelse</h2>
              <button
                onClick={onClose}
                className="p-2 rounded-full hover:bg-white/5 text-muted-foreground hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {error && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">
                  Bedømmelse
                </label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      className="focus:outline-none transition-transform hover:scale-110"
                    >
                      <Star
                        className={`w-8 h-8 ${
                          star <= rating
                            ? "fill-yellow-500 text-yellow-500"
                            : "text-muted-foreground"
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">
                  Kommentar
                </label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  maxLength={1000}
                  placeholder="Skriv din oplevelse af handlen..."
                  className="w-full h-32 px-4 py-3 rounded-lg bg-secondary/50 border border-white/10 text-white placeholder:text-muted-foreground focus:outline-none focus:border-neon-blue resize-none"
                />
                <p className="text-xs text-muted-foreground">
                  {content.length}/1000 tegn
                </p>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-lg text-muted-foreground hover:text-white hover:bg-white/5 transition-colors"
                >
                  Annuller
                </button>
                <button
                  type="submit"
                  disabled={loading || rating === 0}
                  className="px-6 py-3 rounded-lg bg-[#00FFFF] text-black font-bold hover:bg-[#00FFFF]/80 transition-all hover:scale-105 shadow-[0_0_20px_rgba(0,255,255,0.5)] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:shadow-none flex items-center gap-2"
                >
                  {loading && <Loader2 className="w-5 h-5 animate-spin" />}
                  Indsend
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

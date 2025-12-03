import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, User, Loader2 } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { UsernameWithRating } from "../UsernameWithRating";

interface Buyer {
  user_id: string;
  username: string;
  avatar_url: string | null;
}

interface BuyerSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  productId: string;
  onSaleCreated: () => void;
}

export function BuyerSelectionModal({
  isOpen,
  onClose,
  productId,
  onSaleCreated,
}: BuyerSelectionModalProps) {
  const [potentialBuyers, setPotentialBuyers] = useState<Buyer[]>([]);
  const [selectedBuyerId, setSelectedBuyerId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && productId) {
      fetchPotentialBuyers();
    }
  }, [isOpen, productId]);

  const fetchPotentialBuyers = async () => {
    try {
      setLoading(true);
      setError(null);
      const { data, error } = await supabase.rpc("get_product_buyers", {
        p_product_id: productId,
      });

      if (error) throw error;

      setPotentialBuyers(data || []);
    } catch (err: any) {
      console.error("Error fetching buyers:", err);
      setError("Kunne ikke hente købere: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmSale = async () => {
    if (!selectedBuyerId || !productId) return;

    try {
      setProcessing(true);
      const { data, error } = await supabase.rpc("create_sale_request", {
        p_product_id: productId,
        p_buyer_id: selectedBuyerId,
      });

      if (error) throw error;

      if (data.success) {
        onSaleCreated();
        onClose();
      } else {
        throw new Error(data.error || "Der skete en fejl");
      }
    } catch (err: any) {
      console.error("Error creating sale:", err);
      alert("Fejl ved oprettelse af salg: " + err.message);
    } finally {
      setProcessing(false);
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
              <h2 className="text-xl font-bold text-white">Vælg køber</h2>
              <button
                onClick={onClose}
                className="p-2 rounded-full hover:bg-white/5 text-muted-foreground hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6">
              <p className="text-muted-foreground mb-4">
                Vælg hvem du har solgt varen til. Listen viser brugere du har skrevet med angående denne vare.
              </p>

              {loading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin text-neon-blue" />
                </div>
              ) : error ? (
                <div className="text-red-400 text-center py-4">{error}</div>
              ) : potentialBuyers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Ingen samtaler fundet for denne vare.
                </div>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto mb-6">
                  {potentialBuyers.map((buyer) => (
                    <button
                      key={buyer.user_id}
                      onClick={() => setSelectedBuyerId(buyer.user_id)}
                      className={`w-full p-3 rounded-lg flex items-center gap-3 transition-colors ${
                        selectedBuyerId === buyer.user_id
                          ? "bg-neon-blue/20 border border-neon-blue"
                          : "bg-secondary/30 border border-white/5 hover:bg-secondary/50"
                      }`}
                    >
                      <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center overflow-hidden">
                        {buyer.avatar_url ? (
                          <img
                            src={buyer.avatar_url}
                            alt={buyer.username}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <User className="w-5 h-5 text-muted-foreground" />
                        )}
                      </div>
                      <UsernameWithRating userId={buyer.user_id} className="font-medium" />
                      {selectedBuyerId === buyer.user_id && (
                        <div className="ml-auto w-3 h-3 rounded-full bg-neon-blue shadow-[0_0_10px_rgba(0,255,255,0.5)]" />
                      )}
                    </button>
                  ))}
                </div>
              )}

              <div className="flex justify-end gap-3">
                <button
                  onClick={onClose}
                  className="px-4 py-2 rounded-lg text-muted-foreground hover:text-white hover:bg-white/5 transition-colors"
                >
                  Annuller
                </button>
                <button
                  onClick={handleConfirmSale}
                  disabled={!selectedBuyerId || processing}
                  className="px-6 py-3 rounded-lg bg-[#00FFFF] text-black font-bold hover:bg-[#00FFFF]/80 transition-all hover:scale-105 shadow-[0_0_20px_rgba(0,255,255,0.5)] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:shadow-none flex items-center gap-2"
                >
                  {processing && <Loader2 className="w-5 h-5 animate-spin" />}
                  Bekræft salg
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Loader2, Package, Heart, Settings, ArrowRight, ShoppingBag, Store, User } from "lucide-react";
import { supabase } from "../lib/supabase";

export function ProfilePage() {
  const navigate = useNavigate();
  const [totalCount, setTotalCount] = useState(0);
  const [purchasesCount, setPurchasesCount] = useState(0);
  const [salesCount, setSalesCount] = useState(0);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    checkUser();
  }, []);

  useEffect(() => {
    if (user) {
      fetchProducts();
      fetchTransactionCounts();
    }
  }, [user]);

  const checkUser = async () => {
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) {
        navigate("/login", {
          state: { message: "Du skal være logget ind for at se din profil" },
        });
        return;
      }
      setUser(currentUser);
    } catch (err: any) {
      console.error("Error checking user:", err);
      navigate("/login", {
        state: { message: "Kunne ikke hente brugerinformation" },
      });
    }
  };

  const fetchProducts = async () => {
    if (!user) return;

    try {
      // Get count for products
      const { count: productsCount, error: productsError } = await supabase
        .from("products")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id);

      if (productsError) throw productsError;

      // Get count for rehearsal rooms
      const { count: roomsCount, error: roomsError } = await supabase
        .from("rehearsal_rooms")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id);

      if (roomsError) throw roomsError;

      // Combine counts
      setTotalCount((productsCount || 0) + (roomsCount || 0));
    } catch (err: any) {
      console.error("Error fetching announcement count:", err);
    }
  };

  const fetchTransactionCounts = async () => {
    if (!user) return;

    try {
      // Get count for purchases (where user is buyer)
      const { count: buyerCount, error: buyerError } = await supabase
        .from("sales")
        .select("*", { count: "exact", head: true })
        .eq("buyer_id", user.id)
        .eq("status", "completed");

      if (buyerError) throw buyerError;
      setPurchasesCount(buyerCount || 0);

      // Get count for sales (where user is seller)
      const { count: sellerCount, error: sellerError } = await supabase
        .from("sales")
        .select("*", { count: "exact", head: true })
        .eq("seller_id", user.id)
        .eq("status", "completed");

      if (sellerError) throw sellerError;
      setSalesCount(sellerCount || 0);
    } catch (err: any) {
      console.error("Error fetching transaction counts:", err);
    }
  };

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
          <div className="text-center mb-8">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-3">
              Min Profil
            </h1>
          </div>

          {/* Profile Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {/* Min offentlige profil Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.05 }}
              onClick={() => navigate(`/user/${user.id}`)}
              className="rounded-xl border border-white/10 bg-secondary/40 p-6 cursor-pointer hover:bg-secondary/60 transition-all duration-200 hover:border-neon-blue/50 group"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 rounded-lg bg-cyan-500/20 border border-cyan-500/30">
                  <User className="w-6 h-6 text-cyan-500" />
                </div>
                <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-neon-blue group-hover:translate-x-1 transition-all" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">
                Min offentlige profil
              </h3>
              <p className="text-sm text-muted-foreground">
                Se din profil som andre ser den - med anmeldelser og aktive annoncer
              </p>
            </motion.div>

            {/* Mine Annoncer Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              onClick={() => navigate("/mine-annoncer")}
              className="rounded-xl border border-white/10 bg-secondary/40 p-6 cursor-pointer hover:bg-secondary/60 transition-all duration-200 hover:border-neon-blue/50 group"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 rounded-lg bg-neon-blue/20 border border-neon-blue/30">
                  <Package className="w-6 h-6 text-neon-blue" />
                </div>
                <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-neon-blue group-hover:translate-x-1 transition-all" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">
                Mine annoncer
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Se alle dine annoncer, og få et overblik over dine statistikker
              </p>
              {totalCount > 0 && (
                <div className="text-lg font-bold text-neon-blue">
                  {totalCount} {totalCount === 1 ? "annonce" : "annoncer"}
                </div>
              )}
            </motion.div>

            {/* Mine køb Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.15 }}
              onClick={() => navigate("/mine-koeb")}
              className="rounded-xl border border-white/10 bg-secondary/40 p-6 cursor-pointer hover:bg-secondary/60 transition-all duration-200 hover:border-neon-blue/50 group"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 rounded-lg bg-green-500/20 border border-green-500/30">
                  <ShoppingBag className="w-6 h-6 text-green-500" />
                </div>
                <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-neon-blue group-hover:translate-x-1 transition-all" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">
                Mine køb
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Se produkter du har købt og skriv anmeldelser
              </p>
              {purchasesCount > 0 && (
                <div className="text-lg font-bold text-green-500">
                  {purchasesCount} {purchasesCount === 1 ? "køb" : "køb"}
                </div>
              )}
            </motion.div>

            {/* Mine salg Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.18 }}
              onClick={() => navigate("/mine-salg")}
              className="rounded-xl border border-white/10 bg-secondary/40 p-6 cursor-pointer hover:bg-secondary/60 transition-all duration-200 hover:border-neon-blue/50 group"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 rounded-lg bg-purple-500/20 border border-purple-500/30">
                  <Store className="w-6 h-6 text-purple-500" />
                </div>
                <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-neon-blue group-hover:translate-x-1 transition-all" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">
                Mine salg
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Se produkter du har solgt og skriv anmeldelser
              </p>
              {salesCount > 0 && (
                <div className="text-lg font-bold text-purple-500">
                  {salesCount} {salesCount === 1 ? "salg" : "salg"}
                </div>
              )}
            </motion.div>

            {/* Favoritter Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              onClick={() => navigate("/favoritter")}
              className="rounded-xl border border-white/10 bg-secondary/40 p-6 cursor-pointer hover:bg-secondary/60 transition-all duration-200 hover:border-neon-blue/50 group"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 rounded-lg bg-pink-500/20 border border-pink-500/30">
                  <Heart className="w-6 h-6 text-pink-500" />
                </div>
                <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-neon-blue group-hover:translate-x-1 transition-all" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">
                Favoritter
              </h3>
              <p className="text-sm text-muted-foreground">
                Se alle dine gemte favoritter
              </p>
            </motion.div>

            {/* Indstillinger Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              onClick={() => navigate("/indstillinger")}
              className="rounded-xl border border-white/10 bg-secondary/40 p-6 cursor-pointer hover:bg-secondary/60 transition-all duration-200 hover:border-neon-blue/50 group"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 rounded-lg bg-gray-500/20 border border-gray-500/30">
                  <Settings className="w-6 h-6 text-gray-400" />
                </div>
                <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-neon-blue group-hover:translate-x-1 transition-all" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">
                Indstillinger
              </h3>
              <p className="text-sm text-muted-foreground">
                Administrer din konto og indstillinger
              </p>
            </motion.div>
          </div>

        </motion.div>
      </div>
    </div>
  );
}


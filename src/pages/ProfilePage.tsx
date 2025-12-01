import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Loader2, Package, Heart, Users, Settings, ArrowRight } from "lucide-react";
import { supabase } from "../lib/supabase";

export function ProfilePage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    checkUser();
  }, []);

  useEffect(() => {
    if (user) {
      fetchProducts();
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
      setLoading(false);
    } catch (err: any) {
      setError(err.message || "Kunne ikke hente brugerinformation");
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    if (!user) return;

    try {
      setLoading(true);
      // Just get count for display
      const { count, error: fetchError } = await supabase
        .from("products")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id);

      if (fetchError) throw fetchError;

      setTotalCount(count || 0);
    } catch (err: any) {
      console.error("Error fetching product count:", err);
    } finally {
      setLoading(false);
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


import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useLocation, useNavigate } from "react-router-dom";
import { Loader2, Plus } from "lucide-react";
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
}

export function TrommerPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from("products")
        .select("*")
        .eq("category", "trommer")
        .order("created_at", { ascending: false });

      if (fetchError) throw fetchError;

      setProducts(data || []);
    } catch (err: any) {
      setError(err.message || "Kunne ikke hente produkter");
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price: number | null) => {
    if (!price) return "Pris på anmodning";
    return `${price.toLocaleString("da-DK")} kr.`;
  };

  return (
    <div className="min-h-[80vh] py-8 px-4">
      <div className="container mx-auto max-w-7xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8 text-center"
        >
          <div className="flex items-center justify-center gap-3 mb-3">
            <h1 className="text-4xl md:text-5xl font-bold text-white">
              Trommer
            </h1>
            <button
              onClick={() => navigate("/create/trommer")}
              className="p-2 rounded-full bg-neon-blue/20 hover:bg-neon-blue/30 border border-neon-blue/50 hover:border-neon-blue transition-colors text-neon-blue"
              aria-label="Opret trommer annonce"
            >
              <Plus className="w-6 h-6" />
            </button>
          </div>
          <p className="text-lg text-muted-foreground">
            {products.length > 0
              ? `${products.length} annoncer fundet`
              : "Ingen annoncer endnu"}
          </p>
          {location.state?.message && (
            <div className="mt-4 p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 text-sm mx-auto max-w-md">
              {location.state.message}
            </div>
          )}
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

        {/* Products Grid */}
        {!loading && !error && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {products.length === 0 ? (
              <div className="col-span-full text-center py-20">
                <p className="text-muted-foreground text-lg">
                  Ingen trommer annoncer endnu. Vær den første til at oprette en!
                </p>
              </div>
            ) : (
              products.map((product, index) => (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  whileHover={{ y: -4 }}
                  onClick={() => navigate(`/product/${product.id}`)}
                  className="rounded-xl border border-white/10 bg-secondary/40 overflow-hidden flex flex-col group cursor-pointer"
                >
                  {/* Image */}
                  <div className="relative aspect-square overflow-hidden bg-slate-700">
                    {product.image_urls && product.image_urls.length > 0 ? (
                      <img
                        src={product.image_urls[0]}
                        alt={product.brand && product.model ? `${product.brand} ${product.model}` : product.type}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                        Intet billede
                      </div>
                    )}
                    {product.condition && (
                      <div className="absolute top-2 right-2 px-2 py-1 bg-background/80 backdrop-blur-sm text-white text-xs font-semibold rounded">
                        {product.condition}
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="p-4 flex flex-col gap-2 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-sm font-semibold text-white line-clamp-2 flex-1">
                        {product.brand && product.model
                          ? `${product.brand} ${product.model}`
                          : product.type}
                      </h3>
                    </div>

                    <div className="mt-auto pt-2 flex items-center justify-between">
                      <span className="text-sm font-bold text-neon-blue">
                        {formatPrice(product.price)}
                      </span>
                      {product.location && (
                        <span className="text-xs text-muted-foreground">
                          {product.location}
                        </span>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}


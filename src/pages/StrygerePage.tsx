import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useLocation, useNavigate } from "react-router-dom";
import { Loader2, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { supabase } from "../lib/supabase";
import { FavoriteButton } from "../components/FavoriteButton";
import { ProductFiltersComponent } from "../components/ProductFilters";
import type { ProductFilters } from "../components/ProductFilters";

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
  sold?: boolean;
  sold_at?: string;
}

export function StrygerePage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [filters, setFilters] = useState<ProductFilters>({
    type: null,
    brand: null,
    minPrice: null,
    maxPrice: null,
    location: null,
    minYear: null,
    maxYear: null,
  });
  const itemsPerPage = 12;

  useEffect(() => {
    checkUser();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
    fetchProducts();
  }, [filters]);

  useEffect(() => {
    fetchProducts();
  }, [currentPage]);

  const checkUser = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    setCurrentUserId(user?.id || null);
  };

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const from = (currentPage - 1) * itemsPerPage;
      const to = from + itemsPerPage - 1;

      let queryBuilder = supabase
        .from("products")
        .select("*", { count: "exact" })
        .eq("category", "strygere");

      // Apply filters
      if (filters.type) {
        queryBuilder = queryBuilder.eq("type", filters.type);
      }
      if (filters.brand) {
        queryBuilder = queryBuilder.eq("brand", filters.brand);
      }
      if (filters.location) {
        queryBuilder = queryBuilder.eq("location", filters.location);
      }
      if (filters.minPrice !== null) {
        queryBuilder = queryBuilder.gte("price", filters.minPrice);
      }
      if (filters.maxPrice !== null) {
        queryBuilder = queryBuilder.lte("price", filters.maxPrice);
      }
      if (filters.minYear !== null) {
        queryBuilder = queryBuilder.gte("year", filters.minYear);
      }
      if (filters.maxYear !== null) {
        queryBuilder = queryBuilder.lte("year", filters.maxYear);
      }

      const {
        data,
        error: fetchError,
        count,
      } = await queryBuilder
        .order("created_at", { ascending: false })
        .range(from, to);

      if (fetchError) throw fetchError;

      setProducts(data || []);
      setTotalCount(count || 0);
    } catch (err: any) {
      setError(err.message || "Kunne ikke hente produkter");
    } finally {
      setLoading(false);
    }
  };

  const totalPages = Math.ceil(totalCount / itemsPerPage);

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
              Strygere
            </h1>
            <button
              onClick={() => navigate("/create/strygere")}
              className="p-2 rounded-full bg-neon-blue/20 hover:bg-neon-blue/30 border border-neon-blue/50 hover:border-neon-blue transition-colors text-neon-blue"
              aria-label="Opret strygere annonce"
            >
              <Plus className="w-6 h-6" />
            </button>
          </div>
          <p className="text-lg text-muted-foreground">
            {totalCount > 0
              ? `${totalCount} annoncer fundet`
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

        {/* Filters */}
        <ProductFiltersComponent
          filters={filters}
          onFiltersChange={setFilters}
          category="strygere"
        />

        {/* Products Grid */}
        {!loading && !error && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {products.length === 0 ? (
              <div className="col-span-full text-center py-20">
                <p className="text-muted-foreground text-lg">
                  Ingen strygere annoncer endnu. Vær den første til at oprette
                  en!
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
                      <>
                        <img
                          src={product.image_urls[0]}
                          alt={
                            product.brand && product.model
                              ? `${product.brand} ${product.model}`
                              : product.type
                          }
                          className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 ${
                            product.sold ? "opacity-50" : ""
                          }`}
                        />
                      </>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                        Intet billede
                      </div>
                    )}

                    {/* Sold Badge */}
                    {product.sold && (
                      <div className="absolute top-2 left-2 px-3 py-1.5 bg-red-500/95 backdrop-blur-sm text-white text-sm font-bold rounded-lg border-2 border-white/50 z-20">
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
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                (page) => (
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
                )
              )}
            </div>
            <button
              onClick={() =>
                setCurrentPage((prev) => Math.min(totalPages, prev + 1))
              }
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

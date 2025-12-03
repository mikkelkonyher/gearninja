import { useEffect, useState } from "react";
import { Filter } from "lucide-react";
import { supabase } from "../lib/supabase";

export type ProductFilters = {
  type: string | null;
  brand: string | null;
  minPrice: number | null;
  maxPrice: number | null;
  location: string | null;
  minYear: number | null;
  maxYear: number | null;
};

// Generate years from current year back to 1950
const currentYear = new Date().getFullYear();
const years = Array.from({ length: currentYear - 1949 }, (_, i) => currentYear - i);

// Fixed price intervals
const priceIntervals = [
  0,
  500,
  1000,
  2000,
  5000,
  10000,
  20000,
  50000,
  100000,
  200000,
  500000,
];

interface ProductFiltersProps {
  filters: ProductFilters;
  onFiltersChange: (filters: ProductFilters) => void;
  category?: string | null; // Optional category to filter by
  products?: Array<{ type: string | null; brand: string | null; location: string | null }>; // Optional products to extract filter options from
}

export function ProductFiltersComponent({
  filters,
  onFiltersChange,
  category,
  products,
}: ProductFiltersProps) {
  const [availableTypes, setAvailableTypes] = useState<string[]>([]);
  const [availableBrands, setAvailableBrands] = useState<string[]>([]);
  const [availableLocations, setAvailableLocations] = useState<string[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [loadingOptions, setLoadingOptions] = useState(true);

  useEffect(() => {
    if (products) {
      // Extract filter options from provided products
      extractFilterOptionsFromProducts(products);
    } else {
      fetchFilterOptions();
    }
  }, [category, products]);

  const extractFilterOptionsFromProducts = (
    productsToExtract: Array<{ type: string | null; brand: string | null; location: string | null }>
  ) => {
    setLoadingOptions(true);
    const types = new Set<string>();
    const brands = new Set<string>();
    const locations = new Set<string>();

    productsToExtract.forEach((product) => {
      if (product.type) types.add(product.type);
      if (product.brand) brands.add(product.brand);
      if (product.location) locations.add(product.location);
    });

    setAvailableTypes(Array.from(types).sort());
    setAvailableBrands(Array.from(brands).sort());
    setAvailableLocations(Array.from(locations).sort());
    setLoadingOptions(false);
  };

  const fetchFilterOptions = async () => {
    try {
      setLoadingOptions(true);
      let query = supabase.from("products").select("type, brand, location");

      if (category) {
        query = query.eq("category", category);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Extract unique values
      const types = new Set<string>();
      const brands = new Set<string>();
      const locations = new Set<string>();

      (data || []).forEach((product) => {
        if (product.type) types.add(product.type);
        if (product.brand) brands.add(product.brand);
        if (product.location) locations.add(product.location);
      });

      setAvailableTypes(Array.from(types).sort());
      setAvailableBrands(Array.from(brands).sort());
      setAvailableLocations(Array.from(locations).sort());
    } catch (err) {
      console.error("Error fetching filter options:", err);
    } finally {
      setLoadingOptions(false);
    }
  };

  const updateFilter = <K extends keyof ProductFilters>(
    key: K,
    value: ProductFilters[K]
  ) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const clearFilters = () => {
    onFiltersChange({
      type: null,
      brand: null,
      minPrice: null,
      maxPrice: null,
      location: null,
      minYear: null,
      maxYear: null,
    });
  };

  const hasActiveFilters = Object.values(filters).some(
    (value) => value !== null && value !== ""
  );

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary/40 border border-white/10 hover:bg-secondary/60 transition-colors text-white"
        >
          <Filter className="w-4 h-4" />
          <span>Filtre</span>
          {hasActiveFilters && (
            <span className="ml-2 px-2 py-0.5 rounded-full bg-neon-blue text-white text-xs font-semibold">
              {Object.values(filters).filter((v) => v !== null && v !== "")
                .length}
            </span>
          )}
        </button>
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="text-sm text-muted-foreground hover:text-neon-blue transition-colors"
          >
            Ryd filtre
          </button>
        )}
      </div>

      {isExpanded && (
        <div className="p-4 rounded-xl border border-white/10 bg-secondary/20 backdrop-blur-sm">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Type Filter */}
            <div>
              <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                Type
              </label>
              <select
                value={filters.type || ""}
                onChange={(e) =>
                  updateFilter("type", e.target.value || null)
                }
                className="w-full px-3 py-2 rounded-lg bg-secondary/60 border border-white/10 text-white text-sm focus:outline-none focus:border-neon-blue/50 transition-colors"
                disabled={loadingOptions}
              >
                <option value="">Alle typer</option>
                {availableTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            {/* Brand Filter */}
            <div>
              <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                Mærke
              </label>
              <select
                value={filters.brand || ""}
                onChange={(e) =>
                  updateFilter("brand", e.target.value || null)
                }
                className="w-full px-3 py-2 rounded-lg bg-secondary/60 border border-white/10 text-white text-sm focus:outline-none focus:border-neon-blue/50 transition-colors"
                disabled={loadingOptions}
              >
                <option value="">Alle mærker</option>
                {availableBrands.map((brand) => (
                  <option key={brand} value={brand}>
                    {brand}
                  </option>
                ))}
              </select>
            </div>

            {/* Min Price */}
            <div>
              <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                Min. pris (kr.)
              </label>
              <select
                value={filters.minPrice || ""}
                onChange={(e) =>
                  updateFilter(
                    "minPrice",
                    e.target.value ? Number(e.target.value) : null
                  )
                }
                className="w-full px-3 py-2 rounded-lg bg-secondary/60 border border-white/10 text-white text-sm focus:outline-none focus:border-neon-blue/50 transition-colors"
              >
                <option value="">Ingen grænse</option>
                {priceIntervals.map((price) => (
                  <option key={price} value={price}>
                    {price.toLocaleString("da-DK")} kr.
                  </option>
                ))}
              </select>
            </div>

            {/* Max Price */}
            <div>
              <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                Max. pris (kr.)
              </label>
              <select
                value={filters.maxPrice || ""}
                onChange={(e) =>
                  updateFilter(
                    "maxPrice",
                    e.target.value ? Number(e.target.value) : null
                  )
                }
                className="w-full px-3 py-2 rounded-lg bg-secondary/60 border border-white/10 text-white text-sm focus:outline-none focus:border-neon-blue/50 transition-colors"
              >
                <option value="">Ingen grænse</option>
                {priceIntervals.map((price) => (
                  <option key={price} value={price}>
                    {price.toLocaleString("da-DK")} kr.
                  </option>
                ))}
              </select>
            </div>

            {/* Location Filter */}
            <div>
              <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                Lokation
              </label>
              <select
                value={filters.location || ""}
                onChange={(e) =>
                  updateFilter("location", e.target.value || null)
                }
                className="w-full px-3 py-2 rounded-lg bg-secondary/60 border border-white/10 text-white text-sm focus:outline-none focus:border-neon-blue/50 transition-colors"
                disabled={loadingOptions}
              >
                <option value="">Alle lokationer</option>
                {availableLocations.map((location) => (
                  <option key={location} value={location}>
                    {location}
                  </option>
                ))}
              </select>
            </div>

            {/* Min Year */}
            <div>
              <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                Min. produktionsår
              </label>
              <select
                value={filters.minYear || ""}
                onChange={(e) =>
                  updateFilter(
                    "minYear",
                    e.target.value ? Number(e.target.value) : null
                  )
                }
                className="w-full px-3 py-2 rounded-lg bg-secondary/60 border border-white/10 text-white text-sm focus:outline-none focus:border-neon-blue/50 transition-colors"
              >
                <option value="">Ingen grænse</option>
                {years.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>

            {/* Max Year */}
            <div>
              <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                Max. produktionsår
              </label>
              <select
                value={filters.maxYear || ""}
                onChange={(e) =>
                  updateFilter(
                    "maxYear",
                    e.target.value ? Number(e.target.value) : null
                  )
                }
                className="w-full px-3 py-2 rounded-lg bg-secondary/60 border border-white/10 text-white text-sm focus:outline-none focus:border-neon-blue/50 transition-colors"
              >
                <option value="">Ingen grænse</option>
                {years.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


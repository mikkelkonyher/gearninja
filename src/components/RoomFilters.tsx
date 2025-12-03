import { useEffect, useState } from "react";
import { Filter } from "lucide-react";
import { supabase } from "../lib/supabase";

export type RoomFilters = {
  type: string | null;
  minPrice: number | null;
  maxPrice: number | null;
  location: string | null;
  paymentType: string | null;
};

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

interface RoomFiltersProps {
  filters: RoomFilters;
  onFiltersChange: (filters: RoomFilters) => void;
}

export function RoomFiltersComponent({
  filters,
  onFiltersChange,
}: RoomFiltersProps) {
  const [availableTypes, setAvailableTypes] = useState<string[]>([]);
  const [availableLocations, setAvailableLocations] = useState<string[]>([]);
  const [availablePaymentTypes, setAvailablePaymentTypes] = useState<string[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [loadingOptions, setLoadingOptions] = useState(true);

  useEffect(() => {
    fetchFilterOptions();
  }, []);

  const fetchFilterOptions = async () => {
    try {
      setLoadingOptions(true);
      const { data, error } = await supabase
        .from("rehearsal_rooms")
        .select("type, location, payment_type");

      if (error) throw error;

      // Extract unique values
      const types = new Set<string>();
      const locations = new Set<string>();
      const paymentTypes = new Set<string>();

      (data || []).forEach((room) => {
        if (room.type) types.add(room.type);
        if (room.location) locations.add(room.location);
        if (room.payment_type) paymentTypes.add(room.payment_type);
      });

      setAvailableTypes(Array.from(types).sort());
      setAvailableLocations(Array.from(locations).sort());
      setAvailablePaymentTypes(Array.from(paymentTypes).sort());
    } catch (err) {
      console.error("Error fetching filter options:", err);
    } finally {
      setLoadingOptions(false);
    }
  };

  const updateFilter = <K extends keyof RoomFilters>(
    key: K,
    value: RoomFilters[K]
  ) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const clearFilters = () => {
    onFiltersChange({
      type: null,
      minPrice: null,
      maxPrice: null,
      location: null,
      paymentType: null,
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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

            {/* Payment Type Filter */}
            <div>
              <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                Betalingstype
              </label>
              <select
                value={filters.paymentType || ""}
                onChange={(e) =>
                  updateFilter("paymentType", e.target.value || null)
                }
                className="w-full px-3 py-2 rounded-lg bg-secondary/60 border border-white/10 text-white text-sm focus:outline-none focus:border-neon-blue/50 transition-colors"
                disabled={loadingOptions}
              >
                <option value="">Alle betalingstyper</option>
                {availablePaymentTypes.map((paymentType) => (
                  <option key={paymentType} value={paymentType}>
                    {paymentType}
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


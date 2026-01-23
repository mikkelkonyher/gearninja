import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Loader2, ArrowLeft, Package, Star, Clock, CheckCircle2 } from "lucide-react";
import { supabase } from "../lib/supabase";

interface Purchase {
  id: string;
  product_id: string;
  status: "pending" | "completed" | "cancelled";
  completed_at: string | null;
  product: {
    id: string;
    brand: string | null;
    model: string | null;
    type: string;
    price: number | null;
    image_urls: string[];
  } | null;
  seller_username: string;
  has_reviewed: boolean;
  can_review: boolean;
}

export function MineKoebPage() {
  const navigate = useNavigate();
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    checkUser();
  }, []);

  useEffect(() => {
    if (user) {
      fetchPurchases();
    }
  }, [user]);

  const checkUser = async () => {
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) {
        navigate("/login", {
          state: { message: "Du skal være logget ind for at se dine køb" },
        });
        return;
      }
      setUser(currentUser);
    } catch {
      navigate("/login");
    }
  };

  const fetchPurchases = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Fetch sales where user is buyer (exclude cancelled sales)
      const { data: salesData, error: salesError } = await supabase
        .from("sales")
        .select("id, product_id, status, completed_at, seller_id")
        .eq("buyer_id", user.id)
        .neq("status", "cancelled")
        .order("completed_at", { ascending: false, nullsFirst: false });

      if (salesError) throw salesError;

      // Fetch product details and review status for each sale
      const purchasesWithDetails: Purchase[] = await Promise.all(
        (salesData || []).map(async (sale) => {
          // Get product using RPC to include soft-deleted products
          const { data: productRaw } = await supabase
            .rpc("get_product_for_transaction", { p_product_id: sale.product_id })
            .single();
          
          const productData = productRaw as {
            id: string;
            brand: string | null;
            model: string | null;
            type: string;
            price: number | null;
            image_urls: string[];
          } | null;

          // Get seller username
          const { data: sellerData } = await supabase.rpc("get_user_username", {
            user_uuid: sale.seller_id,
          });

          // Check if user has reviewed this sale
          const { data: reviewData } = await supabase
            .from("reviews")
            .select("id")
            .eq("sale_id", sale.id)
            .eq("reviewer_id", user.id)
            .maybeSingle();

          // Check if user can still review (within 14 days)
          let canReview = false;
          if (sale.status === "completed" && sale.completed_at && !reviewData) {
            const completedAt = new Date(sale.completed_at);
            const fourteenDaysAgo = new Date();
            fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
            canReview = completedAt >= fourteenDaysAgo;
          }

          return {
            id: sale.id,
            product_id: sale.product_id,
            status: sale.status,
            completed_at: sale.completed_at,
            product: productData || null,
            seller_username: sellerData?.username || "Ukendt sælger",
            has_reviewed: !!reviewData,
            can_review: canReview,
          };
        })
      );

      setPurchases(purchasesWithDetails);
    } catch {
      // Error fetching purchases - handled silently
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price: number | null) => {
    if (!price) return "Pris ukendt";
    return `${price.toLocaleString("da-DK")} kr.`;
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "";
    return new Date(dateString).toLocaleDateString("da-DK", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getDaysLeft = (completedAt: string | null) => {
    if (!completedAt) return 0;
    const completed = new Date(completedAt);
    const deadline = new Date(completed);
    deadline.setDate(deadline.getDate() + 14);
    const now = new Date();
    const daysLeft = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(0, daysLeft);
  };

  if (loading) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-neon-blue" />
      </div>
    );
  }

  return (
    <div className="min-h-[80vh] py-8 px-4">
      <div className="container mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate("/profil")}
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-neon-blue transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">Tilbage til profil</span>
          </button>
          <h1 className="text-3xl md:text-4xl font-bold text-white">Mine køb</h1>
          <p className="text-muted-foreground mt-2">
            Se produkter du har købt og skriv anmeldelser
          </p>
        </div>

        {/* Purchases List */}
        {purchases.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-12 rounded-xl border border-white/10 bg-secondary/20"
          >
            <Package className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Du har ingen køb endnu</p>
          </motion.div>
        ) : (
          <div className="space-y-4">
            {purchases.map((purchase, index) => (
              <motion.div
                key={purchase.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="rounded-xl border border-white/10 bg-secondary/20 overflow-hidden"
              >
                <div className="flex flex-col sm:flex-row">
                  {/* Product Image */}
                  <div
                    className="w-full sm:w-40 aspect-square sm:aspect-auto sm:h-40 bg-slate-700 flex-shrink-0 cursor-pointer"
                    onClick={() => navigate(`/product/${purchase.product_id}`)}
                  >
                    {purchase.product?.image_urls?.[0] ? (
                      <img
                        src={purchase.product.image_urls[0]}
                        alt={purchase.product.model || purchase.product.type}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="w-8 h-8 text-muted-foreground" />
                      </div>
                    )}
                  </div>

                  {/* Product Info */}
                  <div className="flex-1 p-4">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                      <div>
                        <h3
                          className="font-semibold text-white hover:text-neon-blue cursor-pointer transition-colors"
                          onClick={() => navigate(`/product/${purchase.product_id}`)}
                        >
                          {purchase.product?.brand && purchase.product?.model
                            ? `${purchase.product.brand} ${purchase.product.model}`
                            : purchase.product?.type || "Produkt ikke tilgængeligt"}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          Købt af {purchase.seller_username}
                        </p>
                        {purchase.completed_at && (
                          <p className="text-xs text-muted-foreground">
                            {formatDate(purchase.completed_at)}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-white">
                          {formatPrice(purchase.product?.price || null)}
                        </p>
                        {purchase.status === "completed" && (
                          <span className="inline-flex items-center gap-1 text-xs text-green-400">
                            <CheckCircle2 className="w-3 h-3" />
                            Gennemført
                          </span>
                        )}
                        {purchase.status === "pending" && (
                          <span className="inline-flex items-center gap-1 text-xs text-yellow-400">
                            <Clock className="w-3 h-3" />
                            Afventer
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Review Status */}
                    {purchase.status === "completed" && (
                      <div className="mt-3 pt-3 border-t border-white/5">
                        {purchase.has_reviewed ? (
                          <span className="inline-flex items-center gap-1 text-sm text-green-400">
                            <Star className="w-4 h-4 fill-green-400" />
                            Du har skrevet en anmeldelse
                          </span>
                        ) : purchase.can_review ? (
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">
                              <Clock className="w-4 h-4 inline mr-1" />
                              {getDaysLeft(purchase.completed_at)} dage tilbage til at anmelde
                            </span>
                            <button
                              onClick={() => navigate(`/product/${purchase.product_id}`)}
                              className="px-3 py-1.5 text-sm rounded-lg bg-neon-blue/20 text-neon-blue border border-neon-blue/50 hover:bg-neon-blue/30 transition-colors"
                            >
                              Skriv anmeldelse
                            </button>
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">
                            Anmeldelsesperioden er udløbet
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

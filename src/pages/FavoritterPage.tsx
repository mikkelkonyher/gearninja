import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Heart } from "lucide-react";

export function FavoritterPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-[80vh] py-8 px-4">
      <div className="container mx-auto max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          <button
            onClick={() => navigate("/profile")}
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-neon-blue transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">Tilbage til profil</span>
          </button>
          <Heart className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-3">
            Favoritter
          </h1>
          <p className="text-lg text-muted-foreground">
            Denne funktion kommer snart
          </p>
        </motion.div>
      </div>
    </div>
  );
}


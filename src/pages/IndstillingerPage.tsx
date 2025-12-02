import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Settings, Lock, ArrowRight } from "lucide-react";

export function IndstillingerPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-[80vh] py-8 px-4">
      <div className="container mx-auto max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <button
            onClick={() => navigate("/profile")}
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-neon-blue transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">Tilbage til profil</span>
          </button>

          <div className="text-center mb-8">
            <Settings className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-3">
              Indstillinger
            </h1>
            <p className="text-lg text-muted-foreground">
              Administrer din konto og indstillinger
            </p>
          </div>

          {/* Settings Options */}
          <div className="max-w-2xl mx-auto space-y-4">
            {/* Reset Password Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              onClick={() => navigate("/reset-password")}
              className="rounded-xl border border-white/10 bg-secondary/40 p-6 cursor-pointer hover:bg-secondary/60 transition-all duration-200 hover:border-neon-blue/50 group"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4 flex-1">
                  <div className="p-3 rounded-lg bg-neon-blue/20 border border-neon-blue/30">
                    <Lock className="w-6 h-6 text-neon-blue" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-white mb-2">
                      Nulstil adgangskode
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Send et link til din email for at nulstille din adgangskode
                    </p>
                  </div>
                </div>
                <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-neon-blue group-hover:translate-x-1 transition-all" />
              </div>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}


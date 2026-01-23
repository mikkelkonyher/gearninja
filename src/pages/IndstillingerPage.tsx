import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Settings, Lock, ArrowRight, Trash2, AlertTriangle } from "lucide-react";
import { useState } from "react";
import { supabase } from "../lib/supabase";
import { Button } from "../components/ui/Button";

export function IndstillingerPage() {
  const navigate = useNavigate();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [password, setPassword] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setDeleteError("");
    setIsDeleting(true);

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) {
        setDeleteError("Kunne ikke finde bruger");
        setIsDeleting(false);
        return;
      }

      // Verify password by attempting to sign in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: password,
      });

      if (signInError) {
        setDeleteError("Forkert adgangskode");
        setIsDeleting(false);
        return;
      }

      // Call the edge function to delete user and all related data
      const { data: session } = await supabase.auth.getSession();
      const supabaseUrl = import.meta.env.SUPABASE_URL ?? import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(
        `${supabaseUrl}/functions/v1/delete-user`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.session?.access_token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = "Der opstod en fejl ved sletning af konto";
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.error || errorMessage;
        } catch {
          // If not JSON, use the text as error
          errorMessage = errorText || errorMessage;
        }
        setDeleteError(errorMessage);
        setIsDeleting(false);
        return;
      }

      // Sign out and redirect
      await supabase.auth.signOut();
      navigate("/");
    } catch {
      setDeleteError("Der opstod en fejl. Prøv igen senere.");
      setIsDeleting(false);
    }
  };

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

            {/* Delete Account Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              onClick={() => setShowDeleteModal(true)}
              className="rounded-xl border border-red-500/20 bg-red-950/20 p-6 cursor-pointer hover:bg-red-950/30 transition-all duration-200 hover:border-red-500/50 group"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4 flex-1">
                  <div className="p-3 rounded-lg bg-red-500/20 border border-red-500/30">
                    <Trash2 className="w-6 h-6 text-red-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-white mb-2">
                      Slet konto
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Slet din konto permanent. Denne handling kan ikke fortrydes.
                    </p>
                  </div>
                </div>
                <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-red-400 group-hover:translate-x-1 transition-all" />
              </div>
            </motion.div>
          </div>
        </motion.div>
      </div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => !isDeleting && setShowDeleteModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-secondary/95 backdrop-blur-md border border-red-500/30 rounded-2xl p-6 max-w-md w-full"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 rounded-full bg-red-500/20">
                  <AlertTriangle className="w-6 h-6 text-red-400" />
                </div>
                <h2 className="text-2xl font-bold text-white">Slet konto</h2>
              </div>

              <p className="text-muted-foreground mb-6">
                Er du sikker på, at du vil slette din konto? Alle dine data vil blive permanent slettet. Denne handling kan ikke fortrydes.
              </p>

              <form onSubmit={handleDeleteAccount} className="space-y-4">
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-white mb-2">
                    Bekræft med din adgangskode
                  </label>
                  <input
                    type="password"
                    id="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Indtast din adgangskode"
                    className="w-full px-4 py-3 rounded-lg bg-background/50 border border-white/10 text-white placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    required
                    disabled={isDeleting}
                  />
                </div>

                {deleteError && (
                  <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                    {deleteError}
                  </div>
                )}

                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowDeleteModal(false)}
                    disabled={isDeleting}
                    className="flex-1"
                  >
                    Annuller
                  </Button>
                  <Button
                    type="submit"
                    disabled={isDeleting}
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white border-red-600"
                  >
                    {isDeleting ? "Sletter..." : "Slet konto"}
                  </Button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}


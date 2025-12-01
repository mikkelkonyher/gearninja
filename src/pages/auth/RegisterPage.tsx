import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Mail, Lock, Loader2 } from "lucide-react";
import { Button } from "../../components/ui/Button";
import { supabase } from "../../lib/supabase";
import { PUSHIABLE_API_KEY } from "../../lib/env";

export function RegisterPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.username.trim()) {
      setError("Vælg et brugernavn");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError("Adgangskoderne matcher ikke");
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.functions.invoke("register", {
        body: {
          email: formData.email,
          password: formData.password,
          username: formData.username.trim(),
        },
        headers: {
          apikey: PUSHIABLE_API_KEY || "",
        },
      });

      if (error) {
        // error.message will contain what the Edge Function returned in most cases
        throw new Error(error.message || "Der skete en fejl under oprettelsen");
      }

      navigate("/login", {
        state: {
          message:
            "Konto oprettet! Tjek din email for at bekræfte (hvis bekræftelse er slået til).",
        },
      });
    } catch (err: any) {
      setError(
        err?.message || "Der skete en fejl under oprettelsen. Prøv igen senere."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md"
      >
        <div className="bg-secondary/30 border border-white/10 rounded-2xl p-8 shadow-2xl backdrop-blur-sm">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">Opret profil</h1>
            <p className="text-muted-foreground">
              Bliv en del af GearNinja fællesskabet
            </p>
          </div>

          {error && (
            <div className="mb-6 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">
                Brugernavn
              </label>
              <input
                type="text"
                required
                className="w-full bg-background/50 border border-white/10 rounded-lg py-2 px-3 text-white focus:outline-none focus:border-neon-blue focus:ring-1 focus:ring-neon-blue transition-all"
                placeholder="f.eks. trommeslager87"
                value={formData.username}
                onChange={(e) =>
                  setFormData({ ...formData, username: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  type="email"
                  required
                  className="w-full bg-background/50 border border-white/10 rounded-lg py-2 pl-10 pr-4 text-white focus:outline-none focus:border-neon-blue focus:ring-1 focus:ring-neon-blue transition-all"
                  placeholder="din@email.dk"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">
                Adgangskode
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  type="password"
                  required
                  className="w-full bg-background/50 border border-white/10 rounded-lg py-2 pl-10 pr-4 text-white focus:outline-none focus:border-neon-blue focus:ring-1 focus:ring-neon-blue transition-all"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">
                Bekræft adgangskode
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  type="password"
                  required
                  className="w-full bg-background/50 border border-white/10 rounded-lg py-2 pl-10 pr-4 text-white focus:outline-none focus:border-neon-blue focus:ring-1 focus:ring-neon-blue transition-all"
                  placeholder="••••••••"
                  value={formData.confirmPassword}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      confirmPassword: e.target.value,
                    })
                  }
                />
              </div>
            </div>

            <Button
              type="submit"
              variant="neon"
              className="w-full mt-6"
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin mx-auto" />
              ) : (
                "Opret konto"
              )}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-muted-foreground">
            Har du allerede en konto?{" "}
            <Link to="/login" className="text-neon-blue hover:underline">
              Log ind her
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

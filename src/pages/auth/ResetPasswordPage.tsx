import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Lock, Loader2, CheckCircle } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { supabase } from '../../lib/supabase';

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isResetMode, setIsResetMode] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
  });

  useEffect(() => {
    // Check if we have hash fragments (Supabase redirects with #access_token=...)
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const type = hashParams.get('type');
    
    // Also check query params for type
    const queryType = searchParams.get('type');
    
    // If we have a recovery type, we're in reset mode
    if (type === 'recovery' || queryType === 'recovery') {
      setIsResetMode(true);
      
      // Verify the session - Supabase should have set it from the hash
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (!session) {
          setError('Ugyldig eller udløbet link. Anmod om et nyt link.');
        }
      });
    }

    // Listen for auth state changes (when user arrives via email link)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsResetMode(true);
      }
    });

    return () => subscription.unsubscribe();
  }, [searchParams]);

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(formData.email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;

      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Der skete en fejl. Prøv igen senere.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (formData.password !== formData.confirmPassword) {
      setError('Adgangskoderne matcher ikke');
      return;
    }

    if (formData.password.length < 6) {
      setError('Adgangskoden skal være mindst 6 tegn');
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: formData.password,
      });

      if (error) throw error;

      setSuccess(true);
      setTimeout(() => {
        navigate('/login', {
          state: { message: 'Adgangskode opdateret! Du kan nu logge ind.' },
        });
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Der skete en fejl. Prøv igen senere.');
    } finally {
      setLoading(false);
    }
  };

  // If success, show success message
  if (success && !isResetMode) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md"
        >
          <div className="bg-secondary/30 border border-white/10 rounded-2xl p-8 shadow-2xl backdrop-blur-sm text-center">
            <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-white mb-2">Email sendt!</h1>
            <p className="text-muted-foreground mb-6">
              Tjek din email for et link til at nulstille din adgangskode.
            </p>
            <Link to="/login">
              <Button variant="neon" className="w-full">
                Tilbage til login
              </Button>
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  if (success && isResetMode) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md"
        >
          <div className="bg-secondary/30 border border-white/10 rounded-2xl p-8 shadow-2xl backdrop-blur-sm text-center">
            <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-white mb-2">Adgangskode opdateret!</h1>
            <p className="text-muted-foreground">
              Du bliver omdirigeret til login siden...
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md"
      >
        <div className="bg-secondary/30 border border-white/10 rounded-2xl p-8 shadow-2xl backdrop-blur-sm">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">
              {isResetMode ? 'Nulstil adgangskode' : 'Glemt adgangskode?'}
            </h1>
            <p className="text-muted-foreground">
              {isResetMode
                ? 'Indtast din nye adgangskode'
                : 'Indtast din email, og vi sender dig et link til at nulstille din adgangskode'}
            </p>
          </div>

          {error && (
            <div className="mb-6 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center">
              {error}
            </div>
          )}

          <form
            onSubmit={isResetMode ? handleResetPassword : handleRequestReset}
            className="space-y-4"
          >
            {!isResetMode && (
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
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
              </div>
            )}

            {isResetMode && (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300">
                    Ny adgangskode
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
              </>
            )}

            <Button
              type="submit"
              variant="neon"
              className="w-full mt-6"
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin mx-auto" />
              ) : isResetMode ? (
                'Opdater adgangskode'
              ) : (
                'Send nulstillingslink'
              )}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-muted-foreground">
            <Link to="/login" className="text-neon-blue hover:underline">
              Tilbage til login
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
}


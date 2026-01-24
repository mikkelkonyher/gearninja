import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Settings, Lock, ArrowRight, Trash2, AlertTriangle, Camera, Loader2, User } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { supabase } from "../lib/supabase";
import { Button } from "../components/ui/Button";

export function IndstillingerPage() {
  const navigate = useNavigate();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [password, setPassword] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState("");
  const [avatarSuccess, setAvatarSuccess] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (currentUser) {
      setUser(currentUser);
      setAvatarUrl(currentUser.user_metadata?.avatar_url || null);
    }
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Validate file type
    const validTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!validTypes.includes(file.type)) {
      setAvatarError("Kun JPG, PNG og WebP billeder er tilladt");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setAvatarError("Billedet må højst være 5 MB");
      return;
    }

    setAvatarError("");
    setAvatarSuccess("");
    setIsUploadingAvatar(true);

    try {
      // Create unique filename with user id prefix (matching storage policy: user_id/filename)
      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}/avatar.${fileExt}`;

      // Delete existing avatar if any (look for any avatar.* files)
      const { data: existingFiles } = await supabase.storage
        .from("gearninjaImages")
        .list(user.id);

      if (existingFiles && existingFiles.length > 0) {
        // Only delete avatar files, not product images
        const avatarFiles = existingFiles.filter(f => f.name.startsWith("avatar."));
        if (avatarFiles.length > 0) {
          const filesToDelete = avatarFiles.map(f => `${user.id}/${f.name}`);
          await supabase.storage.from("gearninjaImages").remove(filesToDelete);
        }
      }

      // Upload new avatar
      const { error: uploadError } = await supabase.storage
        .from("gearninjaImages")
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL with cache-busting timestamp
      const { data: urlData } = supabase.storage
        .from("gearninjaImages")
        .getPublicUrl(fileName);

      // Add timestamp to prevent browser caching
      const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`;

      // Update user metadata with avatar URL
      const { error: updateError } = await supabase.auth.updateUser({
        data: { avatar_url: publicUrl }
      });

      if (updateError) throw updateError;

      setAvatarUrl(publicUrl);
      setAvatarSuccess("Profilbillede opdateret!");
      
      // Clear success message after 3 seconds
      setTimeout(() => setAvatarSuccess(""), 3000);
    } catch (error: any) {
      console.error("Error uploading avatar:", error);
      setAvatarError(error.message || "Der opstod en fejl ved upload af billedet");
    } finally {
      setIsUploadingAvatar(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemoveAvatar = async () => {
    if (!user) return;

    setAvatarError("");
    setAvatarSuccess("");
    setIsUploadingAvatar(true);

    try {
      // Delete avatar from storage
      const { data: existingFiles } = await supabase.storage
        .from("gearninjaImages")
        .list(user.id);

      if (existingFiles && existingFiles.length > 0) {
        // Only delete avatar files, not product images
        const avatarFiles = existingFiles.filter(f => f.name.startsWith("avatar."));
        if (avatarFiles.length > 0) {
          const filesToDelete = avatarFiles.map(f => `${user.id}/${f.name}`);
          await supabase.storage.from("gearninjaImages").remove(filesToDelete);
        }
      }

      // Remove avatar URL from user metadata
      const { error: updateError } = await supabase.auth.updateUser({
        data: { avatar_url: null }
      });

      if (updateError) throw updateError;

      setAvatarUrl(null);
      setAvatarSuccess("Profilbillede fjernet!");
      
      setTimeout(() => setAvatarSuccess(""), 3000);
    } catch (error: any) {
      console.error("Error removing avatar:", error);
      setAvatarError(error.message || "Der opstod en fejl ved fjernelse af billedet");
    } finally {
      setIsUploadingAvatar(false);
    }
  };

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
            {/* Profile Picture Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.05 }}
              className="rounded-xl border border-white/10 bg-secondary/40 p-6"
            >
              <div className="flex flex-col sm:flex-row items-center gap-6">
                {/* Avatar Preview */}
                <div className="relative">
                  <div 
                    onClick={handleAvatarClick}
                    className="w-24 h-24 rounded-full bg-gradient-to-br from-neon-blue/20 to-purple-500/20 border-2 border-neon-blue/30 flex items-center justify-center cursor-pointer hover:border-neon-blue/60 transition-colors overflow-hidden group"
                  >
                    {isUploadingAvatar ? (
                      <Loader2 className="w-8 h-8 animate-spin text-neon-blue" />
                    ) : avatarUrl ? (
                      <img 
                        src={avatarUrl} 
                        alt="Profilbillede" 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User className="w-10 h-10 text-muted-foreground" />
                    )}
                    {/* Overlay on hover */}
                    {!isUploadingAvatar && (
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-full">
                        <Camera className="w-6 h-6 text-white" />
                      </div>
                    )}
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/webp"
                    onChange={handleAvatarChange}
                    className="hidden"
                  />
                </div>

                {/* Text and Actions */}
                <div className="flex-1 text-center sm:text-left">
                  <h3 className="text-xl font-semibold text-white mb-2">
                    Profilbillede
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Klik på billedet for at uploade et nyt profilbillede. JPG, PNG eller WebP (maks 5 MB).
                  </p>
                  
                  <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleAvatarClick}
                      disabled={isUploadingAvatar}
                    >
                      <Camera className="w-4 h-4 mr-2" />
                      Vælg billede
                    </Button>
                    {avatarUrl && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleRemoveAvatar}
                        disabled={isUploadingAvatar}
                        className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Fjern billede
                      </Button>
                    )}
                  </div>

                  {avatarError && (
                    <div className="mt-3 p-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                      {avatarError}
                    </div>
                  )}
                  {avatarSuccess && (
                    <div className="mt-3 p-2 rounded-lg bg-green-500/10 border border-green-500/30 text-green-400 text-sm">
                      {avatarSuccess}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>

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


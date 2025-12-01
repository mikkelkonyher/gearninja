import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Upload,
  X,
  GripVertical,
  Loader2,
} from "lucide-react";
import { Button } from "../components/ui/Button";
import { supabase } from "../lib/supabase";

const roomTypes = ["Musikstudie", "Øvelokale", "Andet"];

const paymentTypes = ["pr/time", "pr måned"];

const locations = [
  "København",
  "Aarhus",
  "Odense",
  "Aalborg",
  "Esbjerg",
  "Randers",
  "Kolding",
  "Horsens",
  "Vejle",
  "Roskilde",
  "Herning",
  "Helsingør",
  "Silkeborg",
  "Næstved",
  "Fredericia",
  "Fyn",
  "Jylland",
  "Sjælland",
  "Bornholm",
  "Andet",
];

interface ImageFile {
  file?: File;
  preview: string;
  uploadedUrl?: string;
  isExisting?: boolean;
}

export function CreateOevelokalerPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const editRoom = (location.state as any)?.editRoom;
  const isEditMode = !!editRoom;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [images, setImages] = useState<ImageFile[]>([]);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    location: "",
    description: "",
    paymentType: "",
    price: "",
    roomSize: "",
    type: "",
  });

  // Check if user is logged in on mount
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError("Log ind for at oprette en annonce");
      }
    };
    checkAuth();
  }, []);

  // Load existing room data when editing
  useEffect(() => {
    if (editRoom) {
      setFormData({
        name: editRoom.name || "",
        address: editRoom.address || "",
        location: editRoom.location || "",
        description: editRoom.description || "",
        paymentType: editRoom.payment_type || "",
        price: editRoom.price ? editRoom.price.toString() : "",
        roomSize: editRoom.room_size ? editRoom.room_size.toString() : "",
        type: editRoom.type || "",
      });

      // Load existing images
      if (editRoom.image_urls && editRoom.image_urls.length > 0) {
        const existingImages: ImageFile[] = editRoom.image_urls.map((url: string) => ({
          preview: url,
          uploadedUrl: url,
          isExisting: true,
        }));
        setImages(existingImages);
      }
    }
  }, [editRoom]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const remainingSlots = 6 - images.length;

    if (files.length > remainingSlots) {
      setError(`Du kan kun uploade ${remainingSlots} flere billeder`);
      return;
    }

    const newImages: ImageFile[] = files.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
    }));

    setImages([...images, ...newImages]);
    setError(null);
  };

  const removeImage = (index: number) => {
    const imageToRemove = images[index];
    const newImages = images.filter((_, i) => i !== index);
    
    // Revoke blob URL if it's a new upload
    if (imageToRemove.preview.startsWith("blob:")) {
      URL.revokeObjectURL(imageToRemove.preview);
    }
    
    setImages(newImages);
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null) return;

    const newImages = [...images];
    const draggedItem = newImages[draggedIndex];
    newImages.splice(draggedIndex, 1);
    newImages.splice(index, 0, draggedItem);
    setImages(newImages);
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const uploadImages = async (): Promise<string[]> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Du skal være logget ind");

    const uploadedUrls: string[] = [];

    for (const image of images) {
      // If it's an existing image, keep the URL
      if (image.isExisting && image.uploadedUrl) {
        uploadedUrls.push(image.uploadedUrl);
        continue;
      }

      // Upload new images
      if (image.file) {
        const fileExt = image.file.name.split(".").pop();
        const fileName = `${user.id}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from("gearninjaImages")
          .upload(fileName, image.file, {
            cacheControl: "3600",
            upsert: false,
          });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from("gearninjaImages")
          .getPublicUrl(fileName);

        uploadedUrls.push(publicUrl);
      }
    }

    return uploadedUrls;
  };

  const deleteRemovedImages = async () => {
    if (!editRoom?.image_urls) return;

    const currentUrls = images
      .filter((img) => img.isExisting && img.uploadedUrl)
      .map((img) => img.uploadedUrl!);

    const removedUrls = editRoom.image_urls.filter(
      (url: string) => !currentUrls.includes(url)
    );

    for (const url of removedUrls) {
      try {
        const path = url.split("/gearninjaImages/")[1];
        if (path) {
          await supabase.storage.from("gearninjaImages").remove([path]);
        }
      } catch (err) {
        console.error("Error deleting removed image:", err);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.type) {
      setError("Vælg venligst en type");
      return;
    }

    if (!formData.paymentType) {
      setError("Vælg venligst en betalingstype");
      return;
    }

    if (images.length === 0) {
      setError("Tilføj mindst ét billede");
      return;
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("Du skal være logget ind for at oprette en annonce");
      }

      // Delete removed images if editing
      if (isEditMode) {
        await deleteRemovedImages();
      }

      // Upload new images and get all image URLs
      const imageUrls = await uploadImages();

      const roomData = {
        name: formData.name || null,
        address: formData.address || null,
        location: formData.location || null,
        description: formData.description || null,
        payment_type: formData.paymentType || null,
        price: formData.price ? parseFloat(formData.price) : null,
        room_size: formData.roomSize ? parseFloat(formData.roomSize) : null,
        type: formData.type,
        image_urls: imageUrls,
      };

      if (isEditMode && editRoom) {
        // Update existing room
        const { error: updateError } = await supabase
          .from("rehearsal_rooms")
          .update(roomData)
          .eq("id", editRoom.id)
          .eq("user_id", user.id);

        if (updateError) throw updateError;

        navigate("/mine-annoncer", { state: { message: "Annonce opdateret!" } });
      } else {
        // Create new room
        const { error: insertError } = await supabase
          .from("rehearsal_rooms")
          .insert({
            ...roomData,
            user_id: user.id,
          });

        if (insertError) throw insertError;

        navigate("/oevelokaler", { state: { message: "Annonce oprettet!" } });
      }
    } catch (err: any) {
      setError(err.message || "Der skete en fejl");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Header */}
          <div className="mb-8">
            <button
              onClick={() => navigate(isEditMode ? "/mine-annoncer" : "/create")}
              className="inline-flex items-center gap-2 text-muted-foreground hover:text-neon-blue transition-colors mb-4"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm">Tilbage</span>
            </button>
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-3">
              {isEditMode ? "Rediger annonce - Øvelokaler" : "Opret annonce - Øvelokaler"}
            </h1>
            <p className="text-lg text-muted-foreground">
              {isEditMode
                ? "Opdater informationerne nedenfor for din annonce"
                : "Udfyld informationerne nedenfor for at oprette din annonce"}
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Type Selector */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">
                Type <span className="text-red-400">*</span>
              </label>
              <select
                required
                value={formData.type}
                onChange={(e) =>
                  setFormData({ ...formData, type: e.target.value })
                }
                className="w-full bg-background/50 border border-white/10 rounded-lg py-2 px-3 text-white focus:outline-none focus:border-neon-blue focus:ring-1 focus:ring-neon-blue transition-all"
              >
                <option value="">Vælg type</option>
                {roomTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            {/* Name */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">Navn</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="F.eks. Musikstudie i København"
                className="w-full bg-background/50 border border-white/10 rounded-lg py-2 px-3 text-white placeholder:text-muted-foreground focus:outline-none focus:border-neon-blue focus:ring-1 focus:ring-neon-blue transition-all"
              />
            </div>

            {/* Address */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">Adresse</label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) =>
                  setFormData({ ...formData, address: e.target.value })
                }
                placeholder="F.eks. Nørregade 12, 1. sal"
                className="w-full bg-background/50 border border-white/10 rounded-lg py-2 px-3 text-white placeholder:text-muted-foreground focus:outline-none focus:border-neon-blue focus:ring-1 focus:ring-neon-blue transition-all"
              />
            </div>

            {/* Location */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">Lokation</label>
              <select
                value={formData.location}
                onChange={(e) =>
                  setFormData({ ...formData, location: e.target.value })
                }
                className="w-full bg-background/50 border border-white/10 rounded-lg py-2 px-3 text-white focus:outline-none focus:border-neon-blue focus:ring-1 focus:ring-neon-blue transition-all"
              >
                <option value="">Vælg lokation</option>
                {locations.map((loc) => (
                  <option key={loc} value={loc}>
                    {loc}
                  </option>
                ))}
              </select>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">
                Beskrivelse
              </label>
              <textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Beskriv dit øvelokale eller studie..."
                rows={4}
                className="w-full bg-background/50 border border-white/10 rounded-lg py-2 px-3 text-white placeholder:text-muted-foreground focus:outline-none focus:border-neon-blue focus:ring-1 focus:ring-neon-blue transition-all resize-none"
              />
            </div>

            {/* Payment Type and Price */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">
                  Betalingstype <span className="text-red-400">*</span>
                </label>
                <select
                  required
                  value={formData.paymentType}
                  onChange={(e) =>
                    setFormData({ ...formData, paymentType: e.target.value })
                  }
                  className="w-full bg-background/50 border border-white/10 rounded-lg py-2 px-3 text-white focus:outline-none focus:border-neon-blue focus:ring-1 focus:ring-neon-blue transition-all"
                >
                  <option value="">Vælg betalingstype</option>
                  {paymentTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">Pris</label>
                <input
                  type="number"
                  value={formData.price}
                  onChange={(e) =>
                    setFormData({ ...formData, price: e.target.value })
                  }
                  placeholder="F.eks. 500"
                  min="0"
                  step="0.01"
                  className="w-full bg-background/50 border border-white/10 rounded-lg py-2 px-3 text-white placeholder:text-muted-foreground focus:outline-none focus:border-neon-blue focus:ring-1 focus:ring-neon-blue transition-all"
                />
              </div>
            </div>

            {/* Room Size */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">
                Størrelse (m²)
              </label>
              <input
                type="number"
                value={formData.roomSize}
                onChange={(e) =>
                  setFormData({ ...formData, roomSize: e.target.value })
                }
                placeholder="F.eks. 25"
                min="0"
                step="0.1"
                className="w-full bg-background/50 border border-white/10 rounded-lg py-2 px-3 text-white placeholder:text-muted-foreground focus:outline-none focus:border-neon-blue focus:ring-1 focus:ring-neon-blue transition-all"
              />
            </div>

            {/* Image Upload */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">
                Billeder <span className="text-red-400">*</span> (max 6, første
                er hovedbillede)
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {images.map((image, index) => (
                  <div
                    key={index}
                    draggable
                    onDragStart={() => handleDragStart(index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDragEnd={handleDragEnd}
                    className={`relative aspect-square rounded-lg overflow-hidden border-2 ${
                      index === 0
                        ? "border-green-500"
                        : "border-white/10"
                    } ${
                      draggedIndex === index ? "opacity-50" : ""
                    } cursor-move group`}
                  >
                    <img
                      src={image.preview}
                      alt={`Upload ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                    {index === 0 && (
                      <div className="absolute top-2 left-2 px-2 py-1 bg-green-500/80 text-white text-xs font-semibold rounded border border-green-500">
                        Hovedbillede
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      className="absolute top-2 right-2 p-1 bg-red-500/80 hover:bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    <div className="absolute bottom-2 left-2 p-1 bg-background/80 text-white rounded">
                      <GripVertical className="w-4 h-4" />
                    </div>
                  </div>
                ))}
                {images.length < 6 && (
                  <label className="aspect-square rounded-lg border-2 border-dashed border-white/20 hover:border-neon-blue/50 flex items-center justify-center cursor-pointer transition-colors group">
                    <div className="text-center">
                      <Upload className="w-8 h-8 text-muted-foreground group-hover:text-neon-blue mx-auto mb-2 transition-colors" />
                      <span className="text-xs text-muted-foreground group-hover:text-neon-blue">
                        Tilføj billede
                      </span>
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
            </div>

            {/* Submit Buttons */}
            <div className="flex gap-4 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(isEditMode ? "/mine-annoncer" : "/create")}
                disabled={loading}
              >
                Annuller
              </Button>
              <Button
                type="submit"
                variant="neon"
                disabled={loading}
                className="flex-1"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                    {isEditMode ? "Gemmer..." : "Opretter..."}
                  </>
                ) : (
                  isEditMode ? "Gem ændringer" : "Opret annonce"
                )}
              </Button>
            </div>
          </form>
        </motion.div>
      </div>
    </div>
  );
}


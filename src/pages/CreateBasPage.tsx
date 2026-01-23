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
import { compressImageFile } from "../lib/utils";

const basTypes = [
  "Elektrisk bas",
  "Akustisk bas",
  "Effektpedal",
  "Kontrabas",
  "Basforstærker",
  "Tilbehør til bas",
  "Andet",
];

const conditions = ["Ny", "Som ny", "God", "Brugt", "Meget brugt"];

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

// Generate years from current year back to 1950
const currentYear = new Date().getFullYear();
const years = Array.from({ length: currentYear - 1949 }, (_, i) => currentYear - i);

interface ImageFile {
  file?: File;
  preview: string;
  uploadedUrl?: string;
  isExisting?: boolean;
}

export function CreateBasPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const editProduct = (location.state as any)?.editProduct;
  const isEditMode = !!editProduct;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [images, setImages] = useState<ImageFile[]>([]);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [selectedSwapIndex, setSelectedSwapIndex] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    type: "",
    brand: "",
    model: "",
    description: "",
    price: "",
    location: "",
    condition: "",
    year: "",
  });

  // Load existing product data when editing
  useEffect(() => {
    if (editProduct) {
      setFormData({
        type: editProduct.type || "",
        brand: editProduct.brand || "",
        model: editProduct.model || "",
        description: editProduct.description || "",
        price: editProduct.price ? editProduct.price.toString() : "",
        location: editProduct.location || "",
        condition: editProduct.condition || "",
        year: editProduct.year ? editProduct.year.toString() : "Ved ikke",
      });

      // Load existing images
      if (editProduct.image_urls && editProduct.image_urls.length > 0) {
        const existingImages: ImageFile[] = editProduct.image_urls.map(
          (url: string) => ({
            preview: url,
            uploadedUrl: url,
            isExisting: true,
          })
        );
        setImages(existingImages);
      }
    }
  }, [editProduct]);

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

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const remainingSlots = 6 - images.length;

    if (files.length > remainingSlots) {
      setError(`Du kan kun uploade ${remainingSlots} flere billeder`);
      return;
    }

    const newImages: ImageFile[] = [];
    for (const file of files) {
      const compressed = await compressImageFile(file);
      newImages.push({
        file: compressed,
        preview: URL.createObjectURL(compressed),
      });
    }

    setImages([...images, ...newImages]);
    setError(null);
  };

  const removeImage = (index: number) => {
    const newImages = images.filter((_, i) => i !== index);
    newImages.forEach((img) => {
      if (img.preview.startsWith("blob:")) {
        URL.revokeObjectURL(img.preview);
      }
    });
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

  // Tap-to-swap for mobile: tap one image to select, tap another to swap positions
  const handleImageTap = (index: number) => {
    if (selectedSwapIndex === null) {
      // No image selected, select this one
      setSelectedSwapIndex(index);
    } else if (selectedSwapIndex === index) {
      // Same image tapped, deselect
      setSelectedSwapIndex(null);
    } else {
      // Different image tapped, swap positions
      const newImages = [...images];
      const temp = newImages[selectedSwapIndex];
      newImages[selectedSwapIndex] = newImages[index];
      newImages[index] = temp;
      setImages(newImages);
      setSelectedSwapIndex(null);
    }
  };

  const uploadImages = async (): Promise<string[]> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Du skal være logget ind");

    const uploadedUrls: string[] = [];

    for (const image of images) {
      // Keep existing images
      if (image.isExisting && image.uploadedUrl) {
        uploadedUrls.push(image.uploadedUrl);
        continue;
      }

      // Upload new images
      if (image.file) {
        const fileExt = image.file.name.split(".").pop();
        const fileName = `${user.id}/${Date.now()}_${Math.random()
          .toString(36)
          .substring(7)}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from("gearninjaImages")
          .upload(fileName, image.file, {
            cacheControl: "3600",
            upsert: false,
          });

        if (uploadError) throw uploadError;

        const {
          data: { publicUrl },
        } = supabase.storage
          .from("gearninjaImages")
          .getPublicUrl(fileName);

        uploadedUrls.push(publicUrl);
      }
    }

    return uploadedUrls;
  };

  const deleteRemovedImages = async () => {
    if (!editProduct?.image_urls) return;

    const currentUrls = images
      .filter((img) => img.isExisting && img.uploadedUrl)
      .map((img) => img.uploadedUrl!);

    const removedUrls = editProduct.image_urls.filter(
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

      // Upload images and get all image URLs (existing + new)
      const imageUrls = await uploadImages();

      // Prepare payload for edge function
      const payload = {
        id: isEditMode && editProduct ? editProduct.id : undefined,
        category: "bas",
        type: formData.type,
        brand: formData.brand || null,
        model: formData.model || null,
        description: formData.description || null,
        price: formData.price ? parseFloat(formData.price) : null,
        location: formData.location || null,
        condition: formData.condition || null,
        year:
          formData.year && formData.year !== "Ved ikke"
            ? parseInt(formData.year)
            : null,
        image_urls: imageUrls,
      };

      const { error: functionError } = await supabase.functions.invoke(
        "create-product",
        {
          body: payload,
        }
      );

      if (functionError) throw functionError;

      if (isEditMode) {
        navigate("/mine-annoncer", {
          state: { message: "Annonce opdateret!" },
        });
      } else {
        navigate("/bas", { state: { message: "Annonce oprettet!" } });
      }
    } catch (err: any) {
      console.error("Error submitting product:", err);
      // Try to parse error message if it's a JSON string from edge function
      let errorMessage = "Der skete en fejl under oprettelsen";
      if (err.message) {
         try {
            const errorObj = JSON.parse(err.message);
            errorMessage = errorObj.error || errorMessage;
         } catch {
            errorMessage = err.message;
         }
      }
      setError(errorMessage);
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
              <span className="text-sm">
                {isEditMode ? "Tilbage til mine annoncer" : "Tilbage"}
              </span>
            </button>
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-3">
              {isEditMode ? "Rediger annonce - Bas" : "Opret annonce - Bas"}
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
                {basTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            {/* Brand and Model */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">
                  Mærke
                </label>
                <input
                  type="text"
                  maxLength={100}
                  value={formData.brand}
                  onChange={(e) =>
                    setFormData({ ...formData, brand: e.target.value })
                  }
                  className="w-full bg-background/50 border border-white/10 rounded-lg py-2 px-3 text-white focus:outline-none focus:border-neon-blue focus:ring-1 focus:ring-neon-blue transition-all"
                  placeholder="f.eks. Fender, Music Man"
                />
                <p className="text-xs text-muted-foreground">
                  {formData.brand.length}/100 tegn
                </p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">
                  Model
                </label>
                <input
                  type="text"
                  maxLength={100}
                  value={formData.model}
                  onChange={(e) =>
                    setFormData({ ...formData, model: e.target.value })
                  }
                  className="w-full bg-background/50 border border-white/10 rounded-lg py-2 px-3 text-white focus:outline-none focus:border-neon-blue focus:ring-1 focus:ring-neon-blue transition-all"
                  placeholder="f.eks. Precision Bass"
                />
                <p className="text-xs text-muted-foreground">
                  {formData.model.length}/100 tegn
                </p>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">
                Beskrivelse
              </label>
              <textarea
                maxLength={5000}
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                rows={5}
                className="w-full bg-background/50 border border-white/10 rounded-lg py-2 px-3 text-white focus:outline-none focus:border-neon-blue focus:ring-1 focus:ring-neon-blue transition-all resize-none"
                placeholder="Beskriv produktet..."
              />
              <p className="text-xs text-muted-foreground">
                {formData.description.length}/5000 tegn
              </p>
            </div>

            {/* Price, Location, Condition, Year */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">
                  Pris (kr.)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) =>
                    setFormData({ ...formData, price: e.target.value })
                  }
                  className="w-full bg-background/50 border border-white/10 rounded-lg py-2 px-3 text-white focus:outline-none focus:border-neon-blue focus:ring-1 focus:ring-neon-blue transition-all"
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">
                  Lokation
                </label>
                <select
                  value={formData.location}
                  onChange={(e) =>
                    setFormData({ ...formData, location: e.target.value })
                  }
                  className="w-full bg-background/50 border border-white/10 rounded-lg py-2 px-3 text-white focus:outline-none focus:border-neon-blue focus:ring-1 focus:ring-neon-blue transition-all"
                >
                  <option value="">Vælg lokation</option>
                  {locations.map((location) => (
                    <option key={location} value={location}>
                      {location}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">
                  Stand
                </label>
                <select
                  value={formData.condition}
                  onChange={(e) =>
                    setFormData({ ...formData, condition: e.target.value })
                  }
                  className="w-full bg-background/50 border border-white/10 rounded-lg py-2 px-3 text-white focus:outline-none focus:border-neon-blue focus:ring-1 focus:ring-neon-blue transition-all"
                >
                  <option value="">Vælg stand</option>
                  {conditions.map((cond) => (
                    <option key={cond} value={cond}>
                      {cond}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">Produktionsår</label>
                <select
                  value={formData.year}
                  onChange={(e) =>
                    setFormData({ ...formData, year: e.target.value })
                  }
                  className="w-full bg-background/50 border border-white/10 rounded-lg py-2 px-3 text-white focus:outline-none focus:border-neon-blue focus:ring-1 focus:ring-neon-blue transition-all"
                >
                  <option value="">Vælg år</option>
                  <option value="Ved ikke">Ved ikke</option>
                  {years.map((year) => (
                    <option key={year} value={year.toString()}>
                      {year}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Image Upload */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">
                Billeder <span className="text-red-400">*</span> (max 6, første
                er hovedbillede)
              </label>
              {images.length > 1 && (
                <p className="text-xs text-muted-foreground">
                  Tryk på et billede for at vælge det, og tryk på et andet for at bytte plads
                </p>
              )}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {images.map((image, index) => (
                  <motion.div
                    key={index}
                    data-image-index={index}
                    draggable
                    onDragStart={() => handleDragStart(index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDragEnd={handleDragEnd}
                    onClick={() => handleImageTap(index)}
                    whileDrag={{ opacity: 0.5 }}
                    className={`relative group aspect-square rounded-lg overflow-hidden border-2 bg-background/30 cursor-pointer transition-all ${
                      selectedSwapIndex === index
                        ? "border-neon-blue ring-2 ring-neon-blue/50 scale-[0.98]"
                        : index === 0
                        ? "border-green-500"
                        : "border-white/10"
                    }`}
                  >
                    <img
                      src={image.preview}
                      alt={`Upload ${index + 1}`}
                      className="w-full h-full object-cover pointer-events-none"
                    />
                    {selectedSwapIndex === index && (
                      <div className="absolute inset-0 bg-neon-blue/20 flex items-center justify-center">
                        <span className="text-white text-xs font-medium bg-neon-blue/80 px-2 py-1 rounded">
                          Vælg billede at bytte med
                        </span>
                      </div>
                    )}
                    {selectedSwapIndex !== null && selectedSwapIndex !== index && (
                      <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                        <span className="text-white text-xs font-medium bg-background/80 px-2 py-1 rounded">
                          Tryk for at bytte
                        </span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 md:flex hidden">
                      <GripVertical className="w-5 h-5 text-white cursor-move" />
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeImage(index);
                        if (selectedSwapIndex === index) setSelectedSwapIndex(null);
                      }}
                      className="absolute top-2 right-2 p-1 rounded-full bg-red-500/80 hover:bg-red-500 transition-colors opacity-0 group-hover:opacity-100 md:opacity-0 opacity-100"
                    >
                      <X className="w-4 h-4 text-white" />
                    </button>
                    {index === 0 && (
                      <div className="absolute top-2 left-2 px-2 py-1 bg-background/80 backdrop-blur-sm text-green-500 text-xs font-semibold rounded border border-green-500/50">
                        Hovedbillede
                      </div>
                    )}
                  </motion.div>
                ))}
                {images.length < 6 && (
                  <label className="aspect-square rounded-lg border-2 border-dashed border-white/20 hover:border-neon-blue transition-colors cursor-pointer flex flex-col items-center justify-center gap-2 bg-background/20 hover:bg-background/30">
                    <Upload className="w-8 h-8 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      Tilføj billede
                    </span>
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

            {/* Submit Button */}
            <div className="flex gap-4 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  navigate(isEditMode ? "/mine-annoncer" : "/create")
                }
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
                ) : isEditMode ? (
                  "Gem ændringer"
                ) : (
                  "Opret annonce"
                )}
              </Button>
            </div>
          </form>
        </motion.div>
      </div>
    </div>
  );
}


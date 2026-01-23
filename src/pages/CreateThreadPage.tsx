import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, ArrowLeft } from "lucide-react";
import { supabase } from "../lib/supabase";
import { Button } from "../components/ui/Button";

interface Category {
  id: string;
  name: string;
}

export function CreateThreadPage() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    categoryId: "",
    content: ""
  });

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    const { data } = await supabase
      .from("forum_categories")
      .select("id, name")
      .order("name");
    
    if (data) {
      setCategories(data);
      // Set default category if available
      if (data.length > 0) {
        setFormData(prev => ({ ...prev, categoryId: data[0].id }));
      }
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.content || !formData.categoryId) return;

    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-forum-thread", {
        body: {
          title: formData.title,
          content: formData.content,
          category_id: formData.categoryId
        }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      navigate(`/forum/thread/${data.thread.id}`);
    } catch (err: any) {
      alert(err.message || "Kunne ikke oprette tråd");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-neon-blue" />
      </div>
    );
  }

  return (
    <div className="min-h-[80vh] py-8 px-4">
      <div className="container mx-auto max-w-2xl">
        <button
          onClick={() => navigate("/forum")}
          className="flex items-center gap-2 text-muted-foreground hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Tilbage til forum
        </button>

        <div className="bg-secondary/40 border border-white/10 rounded-xl p-6 md:p-8">
          <h1 className="text-2xl font-bold text-white mb-6">Opret ny tråd</h1>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-white">Kategori</label>
              <select
                value={formData.categoryId}
                onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                className="w-full bg-black/20 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-neon-blue/50"
                required
              >
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id} className="bg-secondary text-white">
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-white">Titel</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Hvad handler tråden om?"
                className="w-full bg-black/20 border border-white/10 rounded-lg p-3 text-white placeholder:text-muted-foreground focus:outline-none focus:border-neon-blue/50"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-white">Indhold</label>
              <textarea
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                placeholder="Skriv dit indlæg her..."
                className="w-full h-48 bg-black/20 border border-white/10 rounded-lg p-3 text-white placeholder:text-muted-foreground focus:outline-none focus:border-neon-blue/50 resize-none"
                required
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="ghost"
                onClick={() => navigate("/forum")}
              >
                Annuller
              </Button>
              <Button
                type="submit"
                variant="neon"
                disabled={submitting}
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                Opret tråd
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

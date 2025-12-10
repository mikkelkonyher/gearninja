import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Loader2, Plus, MessageSquare, Clock, User, Search, Bookmark } from "lucide-react";
import { supabase } from "../lib/supabase";

interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
}

interface Thread {
  id: string;
  title: string;
  content: string;
  author_name: string;
  created_at: string;
  view_count: number;
  category: Category;
  user_id: string;
  post_count?: number;
}

export function ForumPage() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState<Category[]>([]);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  
  // Search and Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [showSavedOnly, setShowSavedOnly] = useState(false);
  const [savedThreadIds, setSavedThreadIds] = useState<Set<string>>(new Set());

  // Pagination State
  const PAGE_SIZE = 20;
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [fetchingMore, setFetchingMore] = useState(false);

  useEffect(() => {
    checkUser();
    fetchCategories();
  }, []);

  useEffect(() => {
    // Reset pagination when filters change
    setPage(0);
    setHasMore(true);
    fetchThreads(0);
  }, [activeCategory, searchQuery, showSavedOnly, user]);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
    if (user) {
      fetchSavedThreads(user.id);
    }
  };

  const fetchCategories = async () => {
    const { data } = await supabase
      .from("forum_categories")
      .select("*")
      .order("name");
    if (data) setCategories(data);
  };

  const fetchSavedThreads = async (userId: string) => {
    const { data } = await supabase
      .from("forum_favorites")
      .select("thread_id")
      .eq("user_id", userId);
      
    if (data) {
      setSavedThreadIds(new Set(data.map(f => f.thread_id)));
    }
  };

  const fetchThreads = async (pageNumber: number) => {
    if (pageNumber === 0) setLoading(true);
    else setFetchingMore(true);

    try {
      let query = supabase
        .from("forum_threads")
        .select(`
          *,
          category:forum_categories(*),
          posts:forum_posts(count)
        `)
        .order("created_at", { ascending: false });

      if (activeCategory) {
        query = query.eq("category_id", activeCategory);
      }

      if (searchQuery) {
        query = query.ilike("title", `%${searchQuery}%`);
      }

      if (showSavedOnly && user) {
         if (savedThreadIds.size > 0) {
           query = query.in("id", Array.from(savedThreadIds));
         } else {
           setThreads([]);
           setLoading(false);
           setHasMore(false);
           return;
         }
      }

      // Pagination range
      const from = pageNumber * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      query = query.range(from, to);

      const { data } = await query;
      
      if (data) {
        const formattedThreads = data.map((thread: any) => ({
          ...thread,
          post_count: thread.posts?.[0]?.count || 0
        }));

        if (pageNumber === 0) {
          setThreads(formattedThreads);
        } else {
          setThreads(prev => [...prev, ...formattedThreads]);
        }
        
        setHasMore(data.length === PAGE_SIZE);
        setPage(pageNumber);
      }
    } catch (error) {
      console.error("Error fetching threads:", error);
    } finally {
      if (pageNumber === 0) setLoading(false);
      else setFetchingMore(false);
    }
  };

  const handleLoadMore = () => {
    fetchThreads(page + 1);
  };

  const toggleSaveThread = async (e: React.MouseEvent, threadId: string) => {
    e.stopPropagation();
    if (!user) {
      navigate("/login");
      return;
    }

    const isSaved = savedThreadIds.has(threadId);
    
    // Optimistic update
    const newSaved = new Set(savedThreadIds);
    if (isSaved) {
      newSaved.delete(threadId);
      await supabase.from("forum_favorites").delete().match({ user_id: user.id, thread_id: threadId });
    } else {
      newSaved.add(threadId);
      await supabase.from("forum_favorites").insert({ user_id: user.id, thread_id: threadId });
    }
    setSavedThreadIds(newSaved);
    
    // If we are in "Saved only" view and untoggle, refresh to remove it
    if (showSavedOnly && isSaved) {
      // Refresh list to remove the unsaved item
      fetchThreads(0);
    }
  };

  return (
    <div className="min-h-[80vh] py-8 px-4">
      <div className="container mx-auto max-w-6xl">
        {/* Header - Always visible at top */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
              {activeCategory 
                ? categories.find(c => c.id === activeCategory)?.name 
                : (showSavedOnly ? "Gemte tråde" : "Forum")}
            </h1>
            <p className="text-muted-foreground">
              {/* Note: This count is now just the loaded threads, not total. Ideally we'd fetch a count. */}
              Viser {threads.length} tråde
            </p>
          </div>
          
          <div className="flex items-center gap-3">
             {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input 
                type="text"
                placeholder="Søg i emner..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-secondary/40 border border-white/10 rounded-lg py-2 pl-9 pr-4 text-sm text-white focus:border-neon-blue focus:outline-none w-full md:w-64"
              />
            </div>

            <Link to={user ? "/forum/create" : "/login"}>
              <button className="flex items-center gap-2 px-4 py-2 bg-neon-blue text-black font-semibold rounded-lg hover:bg-neon-blue/90 transition-colors whitespace-nowrap">
                <Plus className="w-5 h-5" />
                <span className="hidden md:inline">Opret tråd</span>
                <span className="md:hidden">Opret</span>
              </button>
            </Link>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-8">
          {/* Sidebar - Categories */}
          <div className="w-full md:w-64 flex-shrink-0">
            <div className="bg-secondary/40 rounded-xl border border-white/10 p-4 sticky top-28">
              <h2 className="text-lg font-bold text-white mb-4 px-2">Kategorier</h2>
              <nav className="flex flex-col gap-1">
                <button
                  onClick={() => { setActiveCategory(null); setShowSavedOnly(false); }}
                  className={`px-3 py-2 text-sm text-left rounded-lg transition-colors flex items-center gap-2 ${
                    activeCategory === null && !showSavedOnly
                      ? "bg-neon-blue/20 text-neon-blue"
                      : "text-muted-foreground hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <MessageSquare className="w-4 h-4" />
                  Alle tråde
                </button>
                
                {user && (
                  <button
                    onClick={() => { setActiveCategory(null); setShowSavedOnly(true); }}
                    className={`px-3 py-2 text-sm text-left rounded-lg transition-colors flex items-center gap-2 ${
                      showSavedOnly
                        ? "bg-neon-blue/20 text-neon-blue"
                        : "text-muted-foreground hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    <Bookmark className="w-4 h-4" />
                    Gemte tråde
                  </button>
                )}

                <div className="h-px bg-white/10 my-2 mx-2" />

                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => { setActiveCategory(cat.id); setShowSavedOnly(false); }}
                    className={`px-3 py-2 text-sm text-left rounded-lg transition-colors ${
                      activeCategory === cat.id && !showSavedOnly
                        ? "bg-neon-blue/20 text-neon-blue"
                        : "text-muted-foreground hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    {cat.name}
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-neon-blue" />
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {threads.length === 0 ? (
                  <div className="text-center py-12 bg-secondary/20 rounded-xl border border-white/5">
                    <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                    <p className="text-lg text-muted-foreground">Ingen tråde fundet</p>
                    <p className="text-sm text-muted-foreground/60">
                      {searchQuery ? "Prøv en anden søgning" : "Vær den første til at oprette en tråd!"}
                    </p>
                  </div>
                ) : (
                  <>
                    {threads.map((thread) => (
                      <motion.div
                        key={thread.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="group bg-secondary/40 border border-white/10 rounded-xl p-5 hover:border-neon-blue/50 transition-colors cursor-pointer relative"
                        onClick={() => navigate(`/forum/thread/${thread.id}`)}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0 pr-4">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-white/5 text-muted-foreground border border-white/10">
                                {thread.category.name}
                              </span>
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <User className="w-3 h-3" />
                                {thread.author_name || "Anonym"}
                              </span>
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {new Intl.DateTimeFormat('da-DK', { day: 'numeric', month: 'short' }).format(new Date(thread.created_at))}
                              </span>
                            </div>
                            <h3 className="text-lg font-semibold text-white group-hover:text-neon-blue transition-colors truncate">
                              {thread.title}
                            </h3>
                            <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                              {thread.content}
                            </p>
                          </div>
                          <div className="flex flex-col items-end gap-3 flex-shrink-0">
                            {/* Save Button */}
                            <button
                              onClick={(e) => toggleSaveThread(e, thread.id)}
                              className={`p-2 rounded-full hover:bg-white/10 transition-colors ${
                                savedThreadIds.has(thread.id) ? "text-neon-blue" : "text-muted-foreground hover:text-white"
                              }`}
                            >
                              <Bookmark className={`w-5 h-5 ${savedThreadIds.has(thread.id) ? "fill-current" : ""}`} />
                            </button>
                            
                            <div className="flex items-center gap-1.5 text-sm text-muted-foreground px-2">
                              <MessageSquare className="w-4 h-4" />
                              <span>{thread.post_count}</span>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                    
                    {/* Load More Button */}
                    {hasMore && (
                      <div className="flex justify-center pt-4">
                        <button
                          onClick={handleLoadMore}
                          disabled={fetchingMore}
                          className="px-6 py-2 border border-white/10 rounded-lg text-sm font-medium text-white hover:bg-white/5 disabled:opacity-50 transition-colors flex items-center gap-2"
                        >
                          {fetchingMore && <Loader2 className="w-4 h-4 animate-spin" />}
                          Hent flere tråde
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

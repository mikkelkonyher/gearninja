import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Loader2, ArrowLeft, Clock, Send, Bookmark, Trash2, Edit2, X, Check } from "lucide-react";
import { supabase } from "../lib/supabase";
import { Button } from "../components/ui/Button";

interface Post {
  id: string;
  content: string;
  author_name: string;
  created_at: string;
  user_id: string;
}

interface Thread {
  id: string;
  title: string;
  content: string;
  author_name: string;
  created_at: string;
  user_id: string;
  category: { id: string; name: string };
}

export function ForumThreadPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [thread, setThread] = useState<Thread | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchingPosts, setFetchingPosts] = useState(false);
  const [newReply, setNewReply] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [isSaved, setIsSaved] = useState(false);
  
  // Pagination state
  const PAGE_SIZE = 20;
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  // Thread Edit State
  const [isEditingThread, setIsEditingThread] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editThreadContent, setEditThreadContent] = useState("");
  const [updatingThread, setUpdatingThread] = useState(false);

  // Post Edit State
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    checkUser();
    if (id) {
      fetchThread();
      fetchPosts(0);
    }
  }, [id]);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
    if (user && id) {
      checkIfSaved(user.id, id);
    }
  };

  const checkIfSaved = async (userId: string, threadId: string) => {
    const { data } = await supabase
      .from("forum_favorites")
      .select("id")
      .eq("user_id", userId)
      .eq("thread_id", threadId)
      .maybeSingle();
    if (data) setIsSaved(true);
  };

  const fetchThread = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("forum_threads")
        .select("*, category:forum_categories(id, name)")
        .eq("id", id)
        .single();

      if (error) throw error;
      setThread(data);
      setEditTitle(data.title);
      setEditThreadContent(data.content);
    } catch (err) {
      console.error("Error fetching thread:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPosts = async (pageNumber: number) => {
    try {
      setFetchingPosts(true);
      const from = pageNumber * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const { data, error } = await supabase
        .from("forum_posts")
        .select("*")
        .eq("thread_id", id)
        .order("created_at", { ascending: true })
        .range(from, to);

      if (error) throw error;

      if (data) {
        if (pageNumber === 0) {
          setPosts(data);
        } else {
          setPosts(prev => [...prev, ...data]);
        }
        
        setHasMore(data.length === PAGE_SIZE);
        setPage(pageNumber);
      }
    } catch (err) {
      console.error("Error fetching posts:", err);
    } finally {
      setFetchingPosts(false);
    }
  };

  const handleLoadMore = () => {
    fetchPosts(page + 1);
  };

  const handleSubmitReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newReply.trim() || !thread) return;

    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-forum-post", {
        body: {
          content: newReply.trim(),
          thread_id: thread.id
        }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      // Append new post immediately
      setPosts([...posts, data.post]);
      setNewReply("");
    } catch (err: any) {
      console.error("Error submitting reply:", err);
      alert(err.message || "Kunne ikke sende svar");
    } finally {
      setSubmitting(false);
    }
  };

  // --- Thread Actions ---
  const startEditingThread = () => {
    if (!thread) return;
    setEditTitle(thread.title);
    setEditThreadContent(thread.content);
    setIsEditingThread(true);
  };

  const cancelEditingThread = () => {
    setIsEditingThread(false);
    if (thread) {
       setEditTitle(thread.title);
       setEditThreadContent(thread.content);
    }
  };

  const handleUpdateThread = async () => {
    if (!thread || !editTitle.trim() || !editThreadContent.trim()) return;

    setUpdatingThread(true);
    try {
      const { data, error } = await supabase.functions.invoke("update-forum-thread", {
        body: {
          thread_id: thread.id,
          title: editTitle.trim(),
          content: editThreadContent.trim()
        }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      // Update local state
      setThread({
        ...thread,
        title: data.thread.title,
        content: data.thread.content
      });
      setIsEditingThread(false);
    } catch (err: any) {
      console.error("Error updating thread:", err);
      alert(err.message || "Kunne ikke opdatere tråd");
    } finally {
      setUpdatingThread(false);
    }
  };

  const handleDeleteThread = async () => {
    if (!thread) return;
    if (!confirm("Er du sikker på, at du vil slette hele tråden? Dette kan ikke fortrydes.")) return;

    try {
      const { error } = await supabase
        .from("forum_threads")
        .delete()
        .eq("id", thread.id);

      if (error) throw error;
      
      navigate("/forum");
    } catch (err) {
      console.error("Error deleting thread:", err);
      alert("Kunne ikke slette tråd");
    }
  };

  // --- Post Actions ---

  const handleDeletePost = async (postId: string) => {
    if (!confirm("Er du sikker på, at du vil slette dette svar?")) return;

    try {
      const { error } = await supabase
        .from("forum_posts")
        .delete()
        .eq("id", postId);

      if (error) throw error;

      setPosts(posts.filter(p => p.id !== postId));
    } catch (err) {
      console.error("Error deleting post:", err);
      alert("Kunne ikke slette svar");
    }
  };

  const startEditing = (post: Post) => {
    setEditingPostId(post.id);
    setEditContent(post.content);
  };

  const cancelEditing = () => {
    setEditingPostId(null);
    setEditContent("");
  };

  const handleUpdatePost = async () => {
    if (!editingPostId || !editContent.trim()) return;

    setUpdating(true);
    try {
      const { data, error } = await supabase.functions.invoke("update-forum-post", {
        body: {
          post_id: editingPostId,
          content: editContent.trim()
        }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      // Update local state
      setPosts(posts.map(p => p.id === editingPostId ? { ...p, content: data.post.content } : p));
      cancelEditing();
    } catch (err: any) {
      console.error("Error updating post:", err);
      alert(err.message || "Kunne ikke opdatere svar");
    } finally {
      setUpdating(false);
    }
  };

  const toggleSave = async () => {
    if (!user || !thread) {
       navigate("/login");
       return;
    }
    
    if (isSaved) {
      setIsSaved(false);
      await supabase.from("forum_favorites").delete().match({ user_id: user.id, thread_id: thread.id });
    } else {
      setIsSaved(true);
      await supabase.from("forum_favorites").insert({ user_id: user.id, thread_id: thread.id });
    }
  };

  const formatDate = (dateString: string) => {
    return new Intl.DateTimeFormat('da-DK', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(dateString));
  };
  const formatShortDate = (dateString: string) => {
    return new Intl.DateTimeFormat('da-DK', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(dateString));
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-neon-blue" />
      </div>
    );
  }

  if (!thread) return null;

  return (
    <div className="min-h-[80vh] py-8 px-4">
      <div className="container mx-auto max-w-4xl">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => navigate("/forum")}
            className="flex items-center gap-2 text-muted-foreground hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Tilbage til forum
          </button>
          
          <button
            onClick={toggleSave}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-colors ${
              isSaved 
                ? "bg-neon-blue/10 border-neon-blue text-neon-blue" 
                : "bg-secondary/40 border-white/10 text-muted-foreground hover:bg-secondary/60 hover:text-white"
            }`}
          >
            <Bookmark className={`w-4 h-4 ${isSaved ? "fill-current" : ""}`} />
            <span className="text-sm font-medium">{isSaved ? "Gemt" : "Gem tråd"}</span>
          </button>
        </div>

        {/* Thread Header */}
        <div className="bg-secondary/40 border border-white/10 rounded-xl p-4 md:p-6 mb-6 relative group">
          <div className="flex items-start justify-between mb-4">
            <div className="flex flex-col md:flex-row md:items-center gap-2">
              <span className="w-fit px-2.5 py-1 text-xs font-medium rounded-full bg-neon-blue/10 text-neon-blue border border-neon-blue/20">
                {thread.category.name}
              </span>
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formatDate(thread.created_at)}
              </span>
            </div>
             
             {/* Thread Actions - Now part of flex justify-between */}
             {user && user.id === thread.user_id && !isEditingThread && (
                <div className="flex gap-2">
                   <button 
                     onClick={startEditingThread}
                     className="p-1.5 rounded-lg bg-secondary/80 text-muted-foreground hover:text-white hover:bg-secondary transition-colors"
                     title="Rediger tråd"
                   >
                     <Edit2 className="w-3.5 h-3.5" />
                   </button>
                   <button 
                     onClick={handleDeleteThread}
                     className="p-1.5 rounded-lg bg-secondary/80 text-muted-foreground hover:text-red-500 hover:bg-secondary transition-colors"
                     title="Slet tråd"
                   >
                     <Trash2 className="w-3.5 h-3.5" />
                   </button>
                </div>
              )}
          </div>
          
          {isEditingThread ? (
             <div className="space-y-4 mb-4">
               <div>
                  <label className="block text-xs text-muted-foreground mb-1">Titel</label>
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full bg-black/40 border border-neon-blue/50 rounded-lg p-2 text-white font-bold text-xl focus:outline-none"
                  />
               </div>
               <div>
                  <label className="block text-xs text-muted-foreground mb-1">Indhold</label>
                  <textarea
                    value={editThreadContent}
                    onChange={(e) => setEditThreadContent(e.target.value)}
                    className="w-full bg-black/40 border border-neon-blue/50 rounded-lg p-3 text-white focus:outline-none min-h-[150px]"
                  />
               </div>
               <div className="flex justify-end gap-2">
                 <button 
                   onClick={cancelEditingThread}
                   className="flex items-center gap-1 px-3 py-1.5 text-xs rounded bg-secondary hover:bg-secondary/80 text-white transition-colors"
                 >
                   <X className="w-3 h-3" /> Annuller
                 </button>
                 <button 
                   onClick={handleUpdateThread}
                   disabled={updatingThread}
                   className="flex items-center gap-1 px-3 py-1.5 text-xs rounded bg-neon-blue text-black font-semibold hover:bg-neon-blue/90 transition-colors"
                 >
                   {updatingThread ? <Loader2 className="w-3 h-3 animate-spin"/> : <Check className="w-3 h-3" />} 
                   Gem ændringer
                 </button>
              </div>
             </div>
          ) : (
             <>
               <h1 className="text-2xl md:text-3xl font-bold text-white mb-4">
                 {thread.title}
               </h1>

               <div className="flex items-center gap-3 mb-6 pb-6 border-b border-white/10">
                 <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-secondary flex items-center justify-center border border-white/10">
                   <span className="text-lg font-bold text-white">
                     {thread.author_name.charAt(0).toUpperCase()}
                   </span>
                 </div>
                 <div>
                   <p className="text-sm font-medium text-white">{thread.author_name}</p>
                   <p className="text-xs text-muted-foreground">Opretter</p>
                 </div>
               </div>

               <div className="prose prose-invert max-w-none text-muted-foreground whitespace-pre-wrap">
                 {thread.content}
               </div>
             </>
          )}
        </div>

        {/* Replies */}
        <div className="space-y-6 mb-8">
          <h3 className="text-lg font-semibold text-white px-2">
            {posts.length} {posts.length === 1 ? "svar" : "svar"}
          </h3>
          
          {posts.map((post) => (
            <motion.div
              key={post.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-black/20 border border-white/5 rounded-xl p-4 md:p-6 relative group"
            >
              <div className="flex items-start gap-3 md:gap-4">
                <div className="w-8 h-8 rounded-full bg-secondary/60 flex-shrink-0 flex items-center justify-center border border-white/10">
                  <span className="text-sm font-bold text-white">
                    {post.author_name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1">
                  <div className="flex items-baseline justify-between mb-2">
                    <span className="font-medium text-white text-sm">{post.author_name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {formatShortDate(post.created_at)}
                      </span>
                      {/* Edit/Delete Actions - Now inline next to date */}
                      {user && user.id === post.user_id && !editingPostId && (
                        <div className="flex gap-1">
                          <button 
                            onClick={() => startEditing(post)}
                            className="p-1 rounded bg-secondary/80 text-muted-foreground hover:text-white hover:bg-secondary transition-colors"
                            title="Rediger"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                          <button 
                            onClick={() => handleDeletePost(post.id)}
                            className="p-1 rounded bg-secondary/80 text-muted-foreground hover:text-red-500 hover:bg-secondary transition-colors"
                            title="Slet"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {editingPostId === post.id ? (
                    <div className="space-y-3">
                      <textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        className="w-full bg-black/40 border border-neon-blue/50 rounded-lg p-3 text-white focus:outline-none min-h-[100px]"
                      />
                      <div className="flex justify-end gap-2">
                         <button 
                           onClick={cancelEditing}
                           className="flex items-center gap-1 px-3 py-1.5 text-xs rounded bg-secondary hover:bg-secondary/80 text-white transition-colors"
                         >
                           <X className="w-3 h-3" /> Annuller
                         </button>
                         <button 
                           onClick={handleUpdatePost}
                           disabled={updating}
                           className="flex items-center gap-1 px-3 py-1.5 text-xs rounded bg-neon-blue text-black font-semibold hover:bg-neon-blue/90 transition-colors"
                         >
                           {updating ? <Loader2 className="w-3 h-3 animate-spin"/> : <Check className="w-3 h-3" />} 
                           Gem
                         </button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground whitespace-pre-wrap relative">
                      {post.content}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ))}

          {/* Load More Button */}
          {hasMore && (
            <div className="flex justify-center pt-4">
              <Button
                variant="outline"
                onClick={handleLoadMore}
                disabled={fetchingPosts}
                className="w-full md:w-auto"
              >
                {fetchingPosts ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : null}
                Hent flere svar
              </Button>
            </div>
          )}
        </div>

        {/* Reply Form */}
        {user ? (
          <form onSubmit={handleSubmitReply} className="bg-secondary/40 border border-white/10 rounded-xl p-4 md:p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Skriv et svar</h3>
            <div className="mb-4">
              <textarea
                value={newReply}
                onChange={(e) => setNewReply(e.target.value)}
                placeholder="Hvad tænker du?"
                className="w-full h-32 bg-black/20 border border-white/10 rounded-lg p-3 text-white placeholder:text-muted-foreground focus:outline-none focus:border-neon-blue/50 resize-none"
                required
              />
            </div>
            <div className="flex justify-end">
              <Button
                variant="neon"
                size="sm"
                className="gap-2"
                disabled={submitting}
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                Send svar
              </Button>
            </div>
          </form>
        ) : (
          <div className="bg-secondary/20 border border-dashed border-white/10 rounded-xl p-8 text-center">
            <p className="text-muted-foreground mb-4">Log ind for at deltage i samtalen</p>
            <Button
              variant="outline"
              onClick={() => navigate("/login", { state: { from: `/forum/thread/${id}` } })}
            >
              Log ind
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

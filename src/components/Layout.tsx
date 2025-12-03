import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { Menu, X, Plus } from "lucide-react";
import { Button } from "./ui/Button";
import { supabase } from "../lib/supabase";
import { motion, AnimatePresence } from "framer-motion";
import { NotificationBell } from "./NotificationBell";

const categories = [
  "Trommer",
  "Bas",
  "Guitar",
  "Keyboards",
  "Blæs",
  "Strygere",
  "Studieudstyr",
  "Øvelokaler",
  "Forum",
];

export function Layout({ children }: { children: React.ReactNode }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const [userEmail, setUserEmail] = React.useState<string | null>(null);
  const [username, setUsername] = React.useState<string | null>(null);
  const [userId, setUserId] = React.useState<string | null>(null);
  const [isUserMenuOpen, setIsUserMenuOpen] = React.useState(false);
  const navigate = useNavigate();
  const userMenuRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    let isMounted = true;

    supabase.auth.getUser().then(({ data }) => {
      if (!isMounted) return;
      const user = data.user;
      setUserEmail(user?.email ?? null);
      setUserId(user?.id ?? null);
      setUsername(
        (user?.user_metadata as any)?.username ??
          (user?.email ? user.email.split("@")[0] : null)
      );
    });

    const { data: subscription } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        const user = session?.user ?? null;
        setUserEmail(user?.email ?? null);
        setUserId(user?.id ?? null);
        setUsername(
          (user?.user_metadata as any)?.username ??
            (user?.email ? user.email.split("@")[0] : null)
        );
      }
    );

    return () => {
      isMounted = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setIsUserMenuOpen(false);
    navigate("/");
  };

  // Close user menu when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isUserMenuOpen &&
        userMenuRef.current &&
        !userMenuRef.current.contains(event.target as Node)
      ) {
        setIsUserMenuOpen(false);
      }
    };

    if (isUserMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isUserMenuOpen]);

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans text-foreground selection:bg-neon-blue/30">
      <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 h-24 flex items-center justify-center relative">
          {/* Logo */}
          <Link
            to="/"
            className="absolute left-4 flex items-center gap-2 group"
          >
            <img
              src="/logo.png"
              alt="GearNinja"
              className="h-24 w-auto object-contain group-hover:scale-105 transition-transform duration-300"
            />
          </Link>

          {/* Desktop Navigation - Centered with max-width */}
          <nav className="hidden lg:flex items-center justify-center gap-2 max-w-3xl mx-auto">
            {categories.map((category) => {
              let categoryPath = `/category/${category.toLowerCase()}`;
              if (category === "Trommer") {
                categoryPath = "/trommer";
              } else if (category === "Guitar") {
                categoryPath = "/guitar";
              } else if (category === "Bas") {
                categoryPath = "/bas";
              } else if (category === "Keyboards") {
                categoryPath = "/keyboards";
              } else if (category === "Blæs") {
                categoryPath = "/blaes";
              } else if (category === "Strygere") {
                categoryPath = "/strygere";
              } else if (category === "Studieudstyr") {
                categoryPath = "/studieudstyr";
              } else if (category === "Øvelokaler") {
                categoryPath = "/oevelokaler";
              }
              return (
                <Link
                  key={category}
                  to={categoryPath}
                  className="px-2.5 py-2 text-sm font-medium text-muted-foreground hover:text-neon-blue transition-colors relative group"
                >
                  {category}
                  <span className="absolute inset-x-0 -bottom-[1px] h-[1px] bg-neon-blue scale-x-0 group-hover:scale-x-100 transition-transform duration-300" />
                </Link>
              );
            })}
          </nav>

          {/* Actions - Desktop */}
          <div className="hidden md:flex items-center gap-4 absolute right-4">
            {userEmail && <NotificationBell userId={userId} />}
            <Link
              to="/create"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-neon-blue/20 border border-neon-blue/50 text-neon-blue hover:bg-neon-blue/30 transition-colors"
              aria-label="Opret annonce"
            >
              <Plus className="w-5 h-5" />
            </Link>
            {userEmail ? (
              <div className="relative flex items-center gap-3 border-l border-white/10 pl-4">
                <div className="relative" ref={userMenuRef}>
                  <span className="hidden text-sm text-muted-foreground md:inline">
                    {username ?? userEmail}
                  </span>
                  <button
                    onClick={() => setIsUserMenuOpen((open) => !open)}
                    className="relative inline-flex h-9 w-9 items-center justify-center rounded-full bg-secondary/60 border border-white/10 text-sm font-medium text-white hover:bg-secondary/80 transition-colors"
                  >
                    {(username ?? userEmail).charAt(0).toUpperCase()}
                  </button>
                  {isUserMenuOpen && (
                    <div className="absolute right-0 top-11 w-52 rounded-xl border border-white/10 bg-background/95 shadow-xl backdrop-blur-sm text-sm z-50">
                      <div className="px-3 py-2 border-b border-white/5 text-xs text-muted-foreground truncate">
                        {username ?? userEmail}
                      </div>
                      <nav className="py-1">
                        <button
                          className="w-full text-left px-3 py-2 text-sm hover:bg-white/5"
                          onClick={() => {
                            setIsUserMenuOpen(false);
                            navigate("/profile");
                          }}
                        >
                          Profil
                        </button>
                        <button
                          className="w-full text-left px-3 py-2 text-sm hover:bg-white/5"
                          onClick={() => {
                            setIsUserMenuOpen(false);
                            navigate("/chats");
                          }}
                        >
                          Indbakke
                        </button>
                        <button
                          className="w-full text-left px-3 py-2 text-sm text-red-400 hover:bg-red-500/10"
                          onClick={handleLogout}
                        >
                          Log ud
                        </button>
                      </nav>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 border-l border-white/10 pl-4">
                <Link to="/login">
                  <Button variant="ghost" size="sm">
                    Log ind
                  </Button>
                </Link>
                <Link to="/register">
                  <Button variant="neon" size="sm">
                    Opret bruger
                  </Button>
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Actions */}
          <div className="md:hidden flex items-center gap-3 absolute right-4">
            <Link
              to="/create"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-neon-blue/20 border border-neon-blue/50 text-neon-blue hover:bg-neon-blue/30 transition-colors"
              aria-label="Opret annonce"
            >
              <Plus className="w-5 h-5" />
            </Link>
            {userEmail && (
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setIsUserMenuOpen((open) => !open)}
                  className="relative inline-flex h-9 w-9 items-center justify-center rounded-full bg-secondary/60 border border-white/10 text-sm font-medium text-white hover:bg-secondary/80 transition-colors"
                >
                  {(username ?? userEmail).charAt(0).toUpperCase()}
                </button>
                {isUserMenuOpen && (
                  <div className="absolute right-0 top-11 w-52 rounded-xl border border-white/10 bg-background/95 shadow-xl backdrop-blur-sm text-sm z-50">
                    <div className="px-3 py-2 border-b border-white/5 text-xs text-muted-foreground truncate">
                      {username ?? userEmail}
                    </div>
                    <nav className="py-1">
                      <button
                        className="w-full text-left px-3 py-2 text-sm hover:bg-white/5"
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          navigate("/profile");
                        }}
                      >
                        Profil
                      </button>
                      <button
                        className="w-full text-left px-3 py-2 text-sm hover:bg-white/5"
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          navigate("/chats");
                        }}
                      >
                        Indbakke
                      </button>
                      <button
                        className="w-full text-left px-3 py-2 text-sm text-red-400 hover:bg-red-500/10"
                        onClick={handleLogout}
                      >
                        Log ud
                      </button>
                    </nav>
                  </div>
                )}
              </div>
            )}
            {userEmail && <NotificationBell userId={userId} />}
            {!userEmail && (
              <Link to="/login">
                <Button variant="ghost" size="sm">
                  Log ind
                </Button>
              </Link>
            )}
            <button
              className="p-2 text-muted-foreground hover:text-white"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? <X /> : <Menu />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="lg:hidden border-b border-white/10 bg-background"
            >
              <div className="container mx-auto px-4 py-4 flex flex-col gap-4">
                <nav className="flex flex-col gap-2">
                  {categories.map((category) => {
                    let categoryPath = `/category/${category.toLowerCase()}`;
                    if (category === "Trommer") {
                      categoryPath = "/trommer";
                    } else if (category === "Guitar") {
                      categoryPath = "/guitar";
                    } else if (category === "Bas") {
                      categoryPath = "/bas";
                    } else if (category === "Keyboards") {
                      categoryPath = "/keyboards";
                    } else if (category === "Blæs") {
                      categoryPath = "/blaes";
                    } else if (category === "Strygere") {
                      categoryPath = "/strygere";
                    } else if (category === "Studieudstyr") {
                      categoryPath = "/studieudstyr";
                    } else if (category === "Øvelokaler") {
                      categoryPath = "/oevelokaler";
                    }
                    return (
                      <Link
                        key={category}
                        to={categoryPath}
                        className="px-4 py-2 text-base font-medium text-muted-foreground hover:text-neon-blue hover:bg-white/5 rounded-md transition-colors"
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        {category}
                      </Link>
                    );
                  })}
                </nav>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      <main className="flex-1 relative">
        {/* Background Gradients */}
        <div className="fixed inset-0 pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 rounded-full blur-[120px]" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/10 rounded-full blur-[120px]" />
        </div>

        <div className="relative z-10">{children}</div>
      </main>

      <footer className="border-t border-white/10 bg-background/50 backdrop-blur-sm py-8 mt-auto">
        <div className="container mx-auto px-4 text-center text-muted-foreground text-sm">
          <p>
            &copy; {new Date().getFullYear()} GearNinja. Alle rettigheder
            forbeholdes.
          </p>
        </div>
      </footer>
    </div>
  );
}

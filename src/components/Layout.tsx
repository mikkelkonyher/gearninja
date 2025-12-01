import React from 'react';
import { Link } from 'react-router-dom';
import { Menu, X, Search } from 'lucide-react';
import { Button } from './ui/Button';

import { motion, AnimatePresence } from 'framer-motion';

const categories = [
  'Trommer',
  'Bas',
  'Guitar',
  'Keyboards',
  'Synths',
  'Blæs',
  'Studieudstyr',
  'Øvelokaler',
];

export function Layout({ children }: { children: React.ReactNode }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);


  return (
    <div className="min-h-screen bg-background flex flex-col font-sans text-foreground selection:bg-neon-blue/30">
      <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400 group-hover:from-neon-blue group-hover:to-neon-purple transition-all duration-300">
              GearNinja
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-1">
            {categories.map((category) => (
              <Link
                key={category}
                to={`/category/${category.toLowerCase()}`}
                className="px-3 py-2 text-sm font-medium text-muted-foreground hover:text-neon-blue transition-colors relative group"
              >
                {category}
                <span className="absolute inset-x-0 -bottom-[1px] h-[1px] bg-neon-blue scale-x-0 group-hover:scale-x-100 transition-transform duration-300" />
              </Link>
            ))}
          </nav>

          {/* Actions */}
          <div className="hidden md:flex items-center gap-4">
            <div className="relative group">
              <Search className="w-5 h-5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 group-hover:text-neon-blue transition-colors" />
              <input 
                type="text" 
                placeholder="Søg efter gear..." 
                className="pl-10 pr-4 py-1.5 bg-secondary/50 border border-white/10 rounded-full text-sm focus:outline-none focus:border-neon-blue focus:ring-1 focus:ring-neon-blue transition-all w-64 placeholder:text-muted-foreground/50"
              />
            </div>
            <div className="flex items-center gap-2 border-l border-white/10 pl-4">
              <Link to="/login">
                <Button variant="ghost" size="sm">Log ind</Button>
              </Link>
              <Link to="/register">
                <Button variant="neon" size="sm">Opret bruger</Button>
              </Link>
            </div>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="lg:hidden p-2 text-muted-foreground hover:text-white"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X /> : <Menu />}
          </button>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="lg:hidden border-b border-white/10 bg-background"
            >
              <div className="container mx-auto px-4 py-4 flex flex-col gap-4">
                <nav className="flex flex-col gap-2">
                  {categories.map((category) => (
                    <Link
                      key={category}
                      to={`/category/${category.toLowerCase()}`}
                      className="px-4 py-2 text-base font-medium text-muted-foreground hover:text-neon-blue hover:bg-white/5 rounded-md transition-colors"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      {category}
                    </Link>
                  ))}
                </nav>
                <div className="flex flex-col gap-2 pt-4 border-t border-white/10">
                  <Link to="/login" onClick={() => setIsMobileMenuOpen(false)}>
                    <Button variant="ghost" className="w-full justify-start">Log ind</Button>
                  </Link>
                  <Link to="/register" onClick={() => setIsMobileMenuOpen(false)}>
                    <Button variant="neon" className="w-full">Opret bruger</Button>
                  </Link>
                </div>
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
        
        <div className="relative z-10">
          {children}
        </div>
      </main>

      <footer className="border-t border-white/10 bg-background/50 backdrop-blur-sm py-8 mt-auto">
        <div className="container mx-auto px-4 text-center text-muted-foreground text-sm">
          <p>&copy; {new Date().getFullYear()} GearNinja. Alle rettigheder forbeholdes.</p>
        </div>
      </footer>
    </div>
  );
}

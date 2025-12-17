import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  Drum,
  Guitar,
  Piano,
  Wind,
  Headphones,
  Building2,
  ArrowLeft,
  Music,
} from "lucide-react";

const categories = [
  {
    name: "Trommer",
    slug: "trommer",
    icon: Drum,
    color: "from-orange-500/20 to-red-500/20",
    borderColor: "border-orange-500/30",
    hoverColor: "hover:border-orange-500/60",
  },
  {
    name: "Bas",
    slug: "bas",
    icon: Guitar,
    color: "from-blue-500/20 to-cyan-500/20",
    borderColor: "border-blue-500/30",
    hoverColor: "hover:border-blue-500/60",
  },
  {
    name: "Guitar",
    slug: "guitar",
    icon: Guitar,
    color: "from-purple-500/20 to-pink-500/20",
    borderColor: "border-purple-500/30",
    hoverColor: "hover:border-purple-500/60",
  },
  {
    name: "Keyboards",
    slug: "keyboards",
    icon: Piano,
    color: "from-yellow-500/20 to-orange-500/20",
    borderColor: "border-yellow-500/30",
    hoverColor: "hover:border-yellow-500/60",
  },
  {
    name: "Blæs",
    slug: "blaes",
    icon: Wind,
    color: "from-cyan-500/20 to-blue-500/20",
    borderColor: "border-cyan-500/30",
    hoverColor: "hover:border-cyan-500/60",
  },
  {
    name: "Strygere",
    slug: "strygere",
    icon: Music,
    color: "from-violet-500/20 to-purple-500/20",
    borderColor: "border-violet-500/30",
    hoverColor: "hover:border-violet-500/60",
  },
  {
    name: "Studieudstyr",
    slug: "studieudstyr",
    icon: Headphones,
    color: "from-indigo-500/20 to-purple-500/20",
    borderColor: "border-indigo-500/30",
    hoverColor: "hover:border-indigo-500/60",
  },
  {
    name: "Øvelokaler",
    slug: "oevelokaler",
    icon: Building2,
    color: "from-slate-500/20 to-gray-500/20",
    borderColor: "border-slate-500/30",
    hoverColor: "hover:border-slate-500/60",
  },
];

export function CreateAnnouncementPage() {
  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-4xl"
      >
        {/* Header */}
        <div className="mb-8">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-neon-blue transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">Tilbage</span>
          </Link>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-3">
            Vælg kategori
          </h1>
          <p className="text-lg text-muted-foreground">
            Vælg hvilken type produkt eller service du vil oprette en annonce
            for
          </p>
        </div>

        {/* Category Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {categories.map((category, index) => {
            const Icon = category.icon;
            return (
              <motion.div
                key={category.slug}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{
                  duration: 0.3,
                  delay: index * 0.05,
                }}
                whileHover={{ scale: 1.05, y: -4 }}
                whileTap={{ scale: 0.98 }}
              >
                <Link
                  to={`/create/${category.slug}`}
                  className={`block p-6 rounded-xl bg-gradient-to-br ${category.color} border ${category.borderColor} ${category.hoverColor} transition-all duration-300 group cursor-pointer backdrop-blur-sm`}
                >
                  <div className="flex flex-col items-center gap-3">
                    <div className="p-3 rounded-lg bg-background/30 backdrop-blur-sm group-hover:bg-background/50 transition-colors">
                      <Icon className="w-8 h-8 text-white group-hover:text-neon-blue transition-colors" />
                    </div>
                    <span className="text-sm font-semibold text-white text-center group-hover:text-neon-blue transition-colors">
                      {category.name}
                    </span>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
}

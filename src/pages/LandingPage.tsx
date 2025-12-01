import { motion } from "framer-motion";
import { ArrowRight, Search } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "../components/ui/Button";

export function LandingPage() {
  return (
    <div className="flex flex-col gap-20 pb-20">
      {/* Hero Section */}
      <section className="relative pt-16 pb-20 md:pt-20 md:pb-24 overflow-hidden">
        <div className="container mx-auto px-4 relative z-10 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="space-y-6"
          >
            {/* Landing search */}
            <div className="max-w-3xl mx-auto">
              <div className="relative group">
                <Search className="w-6 h-6 text-muted-foreground absolute left-5 top-1/2 -translate-y-1/2 group-hover:text-neon-blue transition-colors" />
                <input
                  type="text"
                  placeholder="Søg efter musikudstyr..."
                  className="w-full pl-14 pr-5 py-4 md:py-5 rounded-full bg-gradient-to-r from-slate-950/90 via-slate-900/90 to-slate-950/90 border border-white/20 text-base md:text-lg text-foreground placeholder:text-muted-foreground/70 shadow-[0_18px_45px_rgba(0,0,0,0.8)] focus:outline-none focus:ring-2 focus:ring-neon-blue focus:border-neon-blue transition-all"
                />
              </div>
            </div>

            <h1 className="text-5xl md:text-7xl font-bold tracking-tight">
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-white via-blue-100 to-gray-400">
                Køb. Sælg. Connect.
              </span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Fra musikere, til musikere – uden støj.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/register">
                <Button
                  variant="neon"
                  size="lg"
                  className="w-full sm:w-auto group"
                >
                  Kom i gang
                  <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <Link to="/create">
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full sm:w-auto"
                >
                  Opret annonce
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>

        {/* Background Elements */}
        <div className="absolute inset-0 z-0">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-500/5 rounded-full blur-[100px] animate-pulse" />
        </div>
      </section>

      {/* Carousels */}
      <section className="container mx-auto px-4 space-y-12">
        {/* Popular musicgear */}
        <div className="space-y-3">
          <div className="flex flex-col items-center gap-1">
            <h2 className="text-xl font-semibold text-white text-center">
              Populært gear
            </h2>
            <button className="text-xs text-muted-foreground hover:text-white">
              Se alt populært
            </button>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-4 flex-nowrap scroll-smooth snap-x snap-mandatory scroll-px-4">
            {[
              {
                title: "Fender Jazz Bass",
                meta: '34" · 4-strenget · Vintage',
                likes: 42,
              },
              {
                title: "Nord Stage 3",
                meta: "88 keys · Stage piano",
                likes: 35,
              },
              { title: "Ludwig Supraphonic", meta: '14x5" · Snare', likes: 28 },
              {
                title: "Universal Audio Apollo Twin",
                meta: "2x6 Thunderbolt",
                likes: 21,
              },
              { title: "Roland Juno-106", meta: "Analog polysynth", likes: 18 },
              {
                title: "Mesa Boogie Dual Rectifier",
                meta: "Guitarforstærker",
                likes: 16,
              },
              { title: "Moog Sub 37", meta: "Monosynth", likes: 14 },
            ].map((item) => (
              <motion.div
                key={item.title}
                whileHover={{ y: -2 }}
                className="min-w-[220px] max-w-[220px] md:min-w-[230px] md:max-w-[230px] lg:min-w-[240px] lg:max-w-[240px] rounded-xl border border-white/10 bg-secondary/40 p-4 flex-shrink-0 flex flex-col gap-2 snap-start"
              >
                <div
                  className="h-32 w-full rounded-lg bg-cover bg-center bg-slate-700 mb-3"
                  style={{
                    backgroundImage:
                      "url(https://images.pexels.com/photos/164745/pexels-photo-164745.jpeg?auto=compress&cs=tinysrgb&w=640)",
                  }}
                />
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold text-white line-clamp-2">
                    {item.title}
                  </h3>
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <span>♥</span>
                    <span>{item.likes}</span>
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">{item.meta}</p>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Newest uploads */}
        <div className="space-y-3">
          <div className="flex flex-col items-center gap-1">
            <h2 className="text-xl font-semibold text-white text-center">
              Nyeste uploads
            </h2>
            <button className="text-xs text-muted-foreground hover:text-white">
              Se alle nye annoncer
            </button>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-4 flex-nowrap scroll-smooth snap-x snap-mandatory scroll-px-4">
            {[
              {
                title: "Gibson Les Paul Studio 2012",
                meta: "København · 7.500 kr.",
              },
              { title: "Elektron Digitakt", meta: "Aarhus · 3.800 kr." },
              {
                title: "Yamaha HS8 monitors (sæt)",
                meta: "Odense · 2.900 kr.",
              },
              { title: "Shure SM7B", meta: "Online handel · 2.000 kr." },
              {
                title: "Boss RC-505 Loop Station",
                meta: "København · 2.300 kr.",
              },
              {
                title: "Gretsch Brooklyn Drum Kit",
                meta: "Aalborg · 11.500 kr.",
              },
              { title: "Line 6 HX Stomp", meta: "Aarhus · 2.400 kr." },
            ].map((item) => (
              <motion.div
                key={item.title}
                whileHover={{ y: -2 }}
                className="min-w-[220px] max-w-[220px] md:min-w-[230px] md:max-w-[230px] lg:min-w-[240px] lg:max-w-[240px] rounded-xl border border-white/10 bg-secondary/40 p-4 flex-shrink-0 flex flex-col gap-2 snap-start"
              >
                <div
                  className="h-32 w-full rounded-lg bg-cover bg-center bg-slate-700 mb-3"
                  style={{
                    backgroundImage:
                      "url(https://images.pexels.com/photos/709746/pexels-photo-709746.jpeg?auto=compress&cs=tinysrgb&w=640)",
                  }}
                />
                <h3 className="text-sm font-semibold text-white line-clamp-2">
                  {item.title}
                </h3>
                <p className="text-xs text-muted-foreground">{item.meta}</p>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Newest rehearsalroom/studio uploads */}
        <div className="space-y-3">
          <div className="flex flex-col items-center gap-1">
            <h2 className="text-xl font-semibold text-white text-center">
              Nye øvelokaler &amp; studier
            </h2>
            <button className="text-xs text-muted-foreground hover:text-white">
              Se alle lokaler
            </button>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-4 flex-nowrap scroll-smooth snap-x snap-mandatory scroll-px-4">
            {[
              {
                title: "Øvelokale v. Nørrebro",
                meta: "Delt · 24/7 adgang · 2.000 kr./md.",
              },
              {
                title: "Projektstudie i Aarhus C",
                meta: "Kontrolrum + vokalboks",
              },
              {
                title: "Trommevenligt rum i kælder",
                meta: "Lydisoleret · Kbh NV",
              },
              {
                title: "Lydstudie til podcast",
                meta: "Full setup · Frederiksberg",
              },
              {
                title: "Replokale v. Vesterbro",
                meta: "Backline inkluderet · 3.200 kr./md.",
              },
              {
                title: "Delestudie i Kolding",
                meta: "2 producere · delt husleje",
              },
              {
                title: "Øvelokale til metalband",
                meta: "Tykkere vægge end normalt",
              },
            ].map((item) => (
              <motion.div
                key={item.title}
                whileHover={{ y: -2 }}
                className="min-w-[220px] max-w-[220px] md:min-w-[230px] md:max-w-[230px] lg:min-w-[240px] lg:max-w-[240px] rounded-xl border border-white/10 bg-secondary/40 p-4 flex-shrink-0 flex flex-col gap-2 snap-start"
              >
                <div
                  className="h-32 w-full rounded-lg bg-cover bg-center bg-slate-700 mb-3"
                  style={{
                    backgroundImage:
                      "url(https://images.pexels.com/photos/8101520/pexels-photo-8101520.jpeg?auto=compress&cs=tinysrgb&w=640)",
                  }}
                />
                <h3 className="text-sm font-semibold text-white line-clamp-2">
                  {item.title}
                </h3>
                <p className="text-xs text-muted-foreground">{item.meta}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-blue-900/20 to-purple-900/20 border border-white/10 p-12 text-center">
          <div className="relative z-10">
            <h2 className="text-3xl md:text-4xl font-bold mb-6 text-white">
              Klar til at tage din musik til næste niveau?
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
              Opret en gratis profil i dag og bliv en del af Danmarks hurtigst
              voksende musikfællesskab.
            </p>
            <Link to="/register">
              <Button variant="neon" size="lg">
                Opret gratis profil
              </Button>
            </Link>
          </div>
          <div className="absolute inset-0 bg-grid-white/[0.02]" />
        </div>
      </section>
    </div>
  );
}


import { motion } from 'framer-motion';
import { ArrowRight, Music, Users, Mic2, Speaker } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';

export function LandingPage() {
  return (
    <div className="flex flex-col gap-20 pb-20">
      {/* Hero Section */}
      <section className="relative min-h-[80vh] flex items-center justify-center overflow-hidden">
        <div className="container mx-auto px-4 relative z-10 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h1 className="text-5xl md:text-7xl font-bold mb-6 tracking-tight">
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-white via-blue-100 to-gray-400">
                Din portal til
              </span>
              <br />
              <span className="text-neon-blue">musikalsk frihed</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
              Køb og sælg brugt gear, find dit næste øvelokale, eller connect med ligesindede musikere. 
              Alt samlet ét sted.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/register">
                <Button variant="neon" size="lg" className="w-full sm:w-auto group">
                  Kom i gang
                  <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <Link to="/category/all">
                <Button variant="outline" size="lg" className="w-full sm:w-auto">
                  Udforsk markedet
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

      {/* Features Grid */}
      <section className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            {
              icon: <Music className="w-8 h-8 text-neon-blue" />,
              title: "Køb & Salg",
              description: "Find det perfekte instrument eller sælg dit gamle gear sikkert og nemt."
            },
            {
              icon: <Users className="w-8 h-8 text-neon-purple" />,
              title: "Find Bandmates",
              description: "Mangler i en bassist? Opret en profil og find musikere i dit område."
            },
            {
              icon: <Speaker className="w-8 h-8 text-neon-green" />,
              title: "Øvelokaler",
              description: "Lej professionelle øvelokaler eller find nogen at dele dit eget med."
            },
            {
              icon: <Mic2 className="w-8 h-8 text-pink-500" />,
              title: "Studieudstyr",
              description: "Opgrader dit hjemmestudie med professionelt grej fra andre brugere."
            }
          ].map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              viewport={{ once: true }}
              className="p-6 rounded-2xl bg-secondary/30 border border-white/5 hover:border-white/10 hover:bg-secondary/50 transition-all group"
            >
              <div className="mb-4 p-3 rounded-xl bg-background/50 w-fit group-hover:scale-110 transition-transform duration-300">
                {feature.icon}
              </div>
              <h3 className="text-xl font-semibold mb-2 text-white group-hover:text-neon-blue transition-colors">
                {feature.title}
              </h3>
              <p className="text-muted-foreground">
                {feature.description}
              </p>
            </motion.div>
          ))}
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
              Opret en gratis profil i dag og bliv en del af Danmarks hurtigst voksende musikfællesskab.
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

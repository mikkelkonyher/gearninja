import { X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface TermsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function TermsModal({ isOpen, onClose }: TermsModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pt-24">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-secondary/95 border border-white/10 rounded-2xl shadow-2xl backdrop-blur-md w-full max-w-2xl max-h-[75vh] flex flex-col"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-white/10">
                <h2 className="text-2xl font-bold text-white">
                  Vilkår og betingelser
                </h2>
                <button
                  onClick={onClose}
                  className="text-muted-foreground hover:text-white transition-colors p-2 hover:bg-white/5 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Content */}
              <div className="overflow-y-auto p-6 space-y-6 text-gray-300">
                <section>
                  <h3 className="text-lg font-semibold text-white mb-2">
                    1. Generelt
                  </h3>
                  <p className="text-sm leading-relaxed">
                    Disse vilkår og betingelser gælder for brugen af GearNinja.dk. Ved at benytte vores tjenester accepterer du at overholde disse vilkår. Hvis du ikke accepterer vilkårene, skal du stoppe med at bruge tjenesten.
                  </p>
                </section>

                <section>
                  <h3 className="text-lg font-semibold text-white mb-2">
                    2. Brug af tjenesten
                  </h3>
                  <p className="text-sm leading-relaxed">
                    GearNinja.dk er en platform, der faciliterer kommunikation mellem brugere. Du må kun bruge tjenesten til lovlige formål og på måder, der ikke skader tjenesten eller andre brugere. Vi forbeholder os retten til at suspendere eller lukke din konto, hvis du overtræder disse vilkår.
                  </p>
                </section>

                <section>
                  <h3 className="text-lg font-semibold text-white mb-2">
                    3. Brugeraftaler og betalinger
                  </h3>
                  <p className="text-sm leading-relaxed">
                    GearNinja.dk påtager sig ikke noget ansvar for aftaler om betalinger, køb eller salg af varer og tjenester mellem brugere. Alle betalinger og aftaler skal aftales direkte mellem brugerne. Vi anbefaler, at du tager de nødvendige forholdsregler for at sikre, at disse aftaler gennemføres på en sikker måde.
                  </p>
                </section>

                <section>
                  <h3 className="text-lg font-semibold text-white mb-2">
                    4. Brugeroplysninger
                  </h3>
                  <p className="text-sm leading-relaxed">
                    Du er ansvarlig for at beskytte dine brugeroplysninger, og du skal sikre, at de er korrekte og opdaterede. GearNinja.dk er ikke ansvarlig for eventuelle problemer, der opstår som følge af falske eller misbrugte oplysninger. Del kun oplysninger med andre brugere, som du er tryg ved.
                  </p>
                </section>

                <section>
                  <h3 className="text-lg font-semibold text-white mb-2">
                    5. Ophavsret
                  </h3>
                  <p className="text-sm leading-relaxed">
                    Alt indhold på GearNinja.dk, herunder tekst, billeder og andre materialer, er beskyttet af ophavsret. Du må ikke kopiere, distribuere eller på anden måde bruge indholdet uden forudgående tilladelse.
                  </p>
                </section>

                <section>
                  <h3 className="text-lg font-semibold text-white mb-2">
                    6. Ansvarsfraskrivelse
                  </h3>
                  <p className="text-sm leading-relaxed">
                    GearNinja.dk leverer tjenesten "som den er", og vi påtager os ikke ansvar for fejl, mangler eller andre problemer, der måtte opstå som følge af brug af tjenesten eller aftaler mellem brugere. Vi er heller ikke ansvarlige for betalinger eller leverancer relateret til de aftaler, der indgås mellem brugere.
                  </p>
                </section>

                <section>
                  <h3 className="text-lg font-semibold text-white mb-2">
                    7. Ændringer
                  </h3>
                  <p className="text-sm leading-relaxed">
                    GearNinja.dk forbeholder sig retten til at ændre disse vilkår og betingelser. Ændringer træder i kraft, når de offentliggøres på denne side, og det er brugerens ansvar at holde sig opdateret på eventuelle ændringer.
                  </p>
                </section>

                <section>
                  <h3 className="text-lg font-semibold text-white mb-2">
                    8. Lovgivning
                  </h3>
                  <p className="text-sm leading-relaxed">
                    Disse vilkår og betingelser er underlagt dansk lovgivning, og eventuelle tvister skal afgøres ved domstolene i Danmark.
                  </p>
                </section>

                <section>
                  <h3 className="text-lg font-semibold text-white mb-2">
                    9. Kontakt
                  </h3>
                  <p className="text-sm leading-relaxed">
                    Hvis du har spørgsmål til disse vilkår og betingelser, kan du kontakte GearNinja.dk på{" "}
                    <a
                      href="mailto:Gearninja@GearNinja.dk"
                      className="text-neon-blue hover:underline"
                    >
                      Gearninja@GearNinja.dk
                    </a>
                    .
                  </p>
                </section>
              </div>

              {/* Footer */}
              <div className="p-6 border-t border-white/10">
                <button
                  onClick={onClose}
                  className="w-full border border-[#00f3ff] text-[#00f3ff] shadow-[0_0_10px_#00f3ff] hover:bg-[#00f3ff]/10 hover:shadow-[0_0_20px_#00f3ff] font-semibold py-3 px-4 rounded-lg transition-all duration-300"
                >
                  Luk
                </button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}

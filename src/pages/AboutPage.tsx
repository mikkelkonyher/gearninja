import TroelsOgMikkelImage from "../assets/troelsogmikkel.jpg";
import MikkelSignature from "../assets/Mikkel signatur.png";
import TroelsSignature from "../assets/Troels signatur.png";

export function AboutPage() {
  return (
    <div className="container mx-auto px-4 py-12 max-w-5xl">
      <div className="grid gap-10 md:grid-cols-[minmax(0,2fr)_minmax(0,1.3fr)] items-center">
        <div className="space-y-5 md:pt-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-2 text-white">
            Om GearNinja
          </h1>

          <p className="text-muted-foreground leading-relaxed">
            GearNinja er et online musikmarked og fællesskab skabt af musikere
            – for musikere.
          </p>

          <p className="text-muted-foreground leading-relaxed">
            Vi er non-profit og sat i verden som et modsvar til rodede
            salgsopslag, spam og falske profiler. Hos os er der ingen skjult
            datahøst eller algoritmer med skjulte dagsordener – kun ægte gear,
            ægte mennesker og en platform bygget på gennemsigtighed og tillid.
          </p>

          <p className="text-muted-foreground leading-relaxed">
            Vi er Mikkel Konyher og Troels Dankert. Vores venskab går tilbage
            til gymnasiet i 2007, hvor vi startede vores første band sammen.
            Musikken har fulgt os siden, og med tiden voksede også en fælles
            passion for digital design og softwareudvikling.
          </p>

          <p className="text-muted-foreground leading-relaxed">
            GearNinja er vores svar på et behov vi selv har mærket som aktive
            musikere: et trygt og overskueligt sted at købe, sælge og nørde
            musikudstyr – og ikke mindst møde andre, der deler kærligheden til
            musik.
          </p>

          <p className="text-muted-foreground leading-relaxed">
            Velkommen til GearNinja – hvor gearskift sker med god karma.
          </p>

          <div className="pt-2 space-y-4">
            <p className="text-muted-foreground leading-relaxed">
              De bedste hilsner,
              <br />
              <span className="font-medium text-white">Mikkel &amp; Troels</span>
            </p>

            {/* Signaturbilleder */}
            <div className="flex flex-wrap gap-4 items-center">
              <div className="h-16 flex items-center justify-center">
                <img
                  src={MikkelSignature}
                  alt="Mikkel signatur"
                  className="max-h-full max-w-full object-contain brightness-0 invert"
                />
              </div>
              <div className="h-16 flex items-center justify-center">
                <img
                  src={TroelsSignature}
                  alt="Troels signatur"
                  className="max-h-full max-w-full object-contain brightness-0 invert"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="w-full flex justify-center md:self-center md:-mt-16">
          <div className="w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-white/5">
            <img
              src={TroelsOgMikkelImage}
              alt="Mikkel og Troels"
              className="w-full h-auto object-contain"
            />
          </div>
        </div>
      </div>
    </div>
  );
}




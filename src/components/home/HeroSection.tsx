import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ChevronRight, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import FloatingEmbers from "@/components/FloatingEmbers";
import hadesLogo from "@/assets/logo.png";

const HeroSection = () => {
  const [heroImage, setHeroImage] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from("site_settings")
      .select("value")
      .eq("key", "preview_images")
      .maybeSingle()
      .then(({ data }) => {
        if (data?.value && typeof data.value === "object") {
          const val = data.value as Record<string, string>;
          if (val.hero_image) setHeroImage(val.hero_image);
        }
      });
  }, []);

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
      {/* Background effects */}
      <div className="absolute inset-0">
        <FloatingEmbers />
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-primary/5 blur-[120px] animate-pulse-glow" />
        <div className="absolute bottom-1/4 left-1/4 w-[400px] h-[400px] rounded-full bg-accent/5 blur-[100px] animate-pulse-glow" style={{ animationDelay: "1.5s" }} />
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: "linear-gradient(hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />
      </div>

      <div className="container relative z-10 mx-auto px-4 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          {/* Title with logo beside full HADES wordmark */}
          <h1 className="font-display text-6xl sm:text-7xl md:text-8xl lg:text-9xl font-black tracking-tight mb-6 flex items-center justify-center gap-4 sm:gap-6">
            <motion.img
              src={hadesLogo}
              alt=""
              className="h-[1.4em] w-auto drop-shadow-[0_0_25px_hsl(348,80%,50%/0.6)]"
              initial={{ opacity: 0, scale: 0.5, rotate: -10 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            />
            <span className="gradient-hades-text glow-text tracking-[0.02em]">HADES</span>
          </h1>

          <p className="max-w-xl mx-auto text-lg sm:text-xl text-muted-foreground mb-10 leading-relaxed">
            The ultimate <strong>injection client</strong> for <strong>LabyMod v4</strong>.
            <br className="hidden sm:block" />
            Loaded with <strong>rage features</strong> and powerful <strong>bypasses</strong>.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/download">
              <Button size="lg" className="gradient-hades glow-orange font-display font-semibold text-sm tracking-wider px-8 h-12">
                <Download className="h-4 w-4 mr-2" />
                Download Now
              </Button>
            </Link>
            <Link to="/marketplace">
              <Button size="lg" variant="outline" className="font-display font-semibold text-sm tracking-wider px-8 h-12 border-border/50 hover:border-primary/50 hover:bg-primary/5">
                Explore Configs
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          </div>
        </motion.div>

        {/* Hero preview image or placeholder */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 1 }}
          className="mt-20"
        >
          {heroImage ? (
            <div className="mx-auto max-w-[600px] rounded-xl overflow-hidden glass glow-orange">
              <img src={heroImage} alt="Hades Minecraft cheat client in-game preview" className="w-full h-auto" width={600} height={340} />
            </div>
          ) : (
            <div className="mx-auto w-[280px] sm:w-[400px] h-[160px] sm:h-[220px] rounded-xl glass glow-orange overflow-hidden flex items-center justify-center">
              <div className="text-center">
                <div className="font-display text-xs text-muted-foreground mb-2 tracking-wider uppercase">Preview</div>
                <div className="font-display text-2xl sm:text-3xl font-bold gradient-hades-text">In-Game HUD</div>
                <div className="text-xs text-muted-foreground mt-1">Coming soon</div>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </section>
  );
};

export default HeroSection;

import { motion } from "framer-motion";
import { Ghost, Shield, Zap, Eye, Layers, Settings } from "lucide-react";
import TiltCard from "@/components/TiltCard";

const features = [
  {
    icon: Ghost,
    title: "LabyMod v4 Injection",
    description: "Purpose-built injection client for LabyMod v4. Seamless integration with the LabyMod ecosystem.",
  },
  {
    icon: Shield,
    title: "Bypass Engine",
    description: "Powerful bypasses tuned for modern anti-cheats so your rage modules land clean.",
  },
  {
    icon: Zap,
    title: "Rage Features",
    description: "Aggressive killaura, reach, hitboxes, and combat modules built for rage gameplay.",
  },
  {
    icon: Eye,
    title: "Performance Tuned",
    description: "Optimized to run smoothly inside LabyMod v4. No FPS drops, no lag spikes.",
  },
  {
    icon: Layers,
    title: "Module System",
    description: "Over 100+ modules with deep customization. Build your perfect rage setup.",
  },
  {
    icon: Settings,
    title: "Config System",
    description: "Import, export, and share configs. Browse community configs on our marketplace.",
  },
];

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

const FeaturesSection = () => {
  return (
    <section className="py-24 relative" aria-label="Features">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="font-display text-3xl sm:text-4xl font-bold mb-4">
            Why Choose <span className="gradient-hades-text">HADES</span>?
          </h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            The injection client built for LabyMod v4 — rage, bypasses, and performance.
          </p>
        </motion.div>

        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {features.map((f) => (
            <motion.div key={f.title} variants={item}>
              <TiltCard className="h-full">
                <div className="glass rounded-xl p-6 h-full border border-border/20 hover:border-primary/30 transition-colors">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    <f.icon className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="font-display text-sm font-semibold mb-2 tracking-wide">{f.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{f.description}</p>
                </div>
              </TiltCard>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default FeaturesSection;

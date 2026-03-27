import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Flame } from "lucide-react";

const CTASection = () => {
  return (
    <section className="py-24 relative overflow-hidden">
      <div className="absolute inset-0">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-primary/5 blur-[120px]" />
      </div>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="container mx-auto px-4 text-center relative z-10"
      >
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          whileInView={{ scale: 1, opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
        >
          <Flame className="h-12 w-12 text-primary mx-auto mb-6 drop-shadow-[0_0_15px_hsl(var(--primary)/0.5)]" />
        </motion.div>
        <h2 className="font-display text-3xl sm:text-4xl font-bold mb-4">
          Ready to <span className="gradient-hades-text">Dominate</span>?
        </h2>
        <p className="text-muted-foreground max-w-md mx-auto mb-8">
          Join thousands of players using the best undetected Minecraft cheat. Get started in under 60 seconds.
        </p>
        <Link to="/download">
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.98 }}
            className="inline-block"
          >
            <Button size="lg" className="gradient-hades glow-orange font-display font-semibold tracking-wider px-10 h-12">
              Get Hades Now
            </Button>
          </motion.div>
        </Link>
      </motion.div>
    </section>
  );
};

export default CTASection;

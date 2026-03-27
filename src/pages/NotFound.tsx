import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Flame, Home, Download, Search } from "lucide-react";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center relative overflow-hidden">
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-primary/5 blur-[120px]" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center relative z-10 px-4"
      >
        <Link to="/" className="inline-flex items-center gap-2 mb-8">
          <Flame className="h-8 w-8 text-primary" />
          <span className="font-display text-2xl font-bold gradient-hades-text tracking-widest">HADES</span>
        </Link>

        <h1 className="font-display text-8xl font-bold gradient-hades-text mb-4">404</h1>
        <p className="text-xl text-foreground font-medium mb-2">Page Not Found</p>
        <p className="text-muted-foreground mb-8 max-w-md mx-auto">
          The page you're looking for doesn't exist or has been moved.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link to="/">
            <Button className="gradient-hades glow-orange font-display font-semibold gap-2">
              <Home className="h-4 w-4" />
              Back to Home
            </Button>
          </Link>
          <Link to="/download">
            <Button variant="outline" className="font-display gap-2">
              <Download className="h-4 w-4" />
              Downloads
            </Button>
          </Link>
          <Link to="/marketplace">
            <Button variant="ghost" className="font-display gap-2">
              <Search className="h-4 w-4" />
              Marketplace
            </Button>
          </Link>
        </div>
      </motion.div>
    </div>
  );
};

export default NotFound;

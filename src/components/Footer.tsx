import { Link } from "react-router-dom";
import { Github, MessageCircle } from "lucide-react";
import hadesLogo from "@/assets/logo.png";

const Footer = () => {
  return (
    <footer className="border-t border-border/30 bg-card/30">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="md:col-span-1">
            <div className="flex items-center gap-2.5 mb-4">
              <img src={hadesLogo} alt="Hades" className="h-7 w-7" />
              <span className="font-display text-lg font-bold gradient-hades-text tracking-widest">HADES</span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              The ultimate ghost injection client. Undetected. Unstoppable.
            </p>
          </div>

          {/* Links */}
          <div>
            <h4 className="font-display text-xs font-semibold uppercase tracking-wider text-foreground mb-4">Product</h4>
            <div className="flex flex-col gap-2">
              <Link to="/download" className="text-sm text-muted-foreground hover:text-primary transition-colors">Download</Link>
              <Link to="/marketplace" className="text-sm text-muted-foreground hover:text-primary transition-colors">Marketplace</Link>
              <span className="text-sm text-muted-foreground">Changelog</span>
            </div>
          </div>

          <div>
            <h4 className="font-display text-xs font-semibold uppercase tracking-wider text-foreground mb-4">Account</h4>
            <div className="flex flex-col gap-2">
              <Link to="/login" className="text-sm text-muted-foreground hover:text-primary transition-colors">Login</Link>
              <Link to="/register" className="text-sm text-muted-foreground hover:text-primary transition-colors">Register</Link>
              <span className="text-sm text-muted-foreground">Profile</span>
            </div>
          </div>

          <div>
            <h4 className="font-display text-xs font-semibold uppercase tracking-wider text-foreground mb-4">Legal</h4>
            <div className="flex flex-col gap-2">
              <Link to="/terms" className="text-sm text-muted-foreground hover:text-primary transition-colors">Terms of Service</Link>
              <Link to="/privacy" className="text-sm text-muted-foreground hover:text-primary transition-colors">Privacy Policy</Link>
              <Link to="/refund-policy" className="text-sm text-muted-foreground hover:text-primary transition-colors">Refund Policy</Link>
              <Link to="/cookies" className="text-sm text-muted-foreground hover:text-primary transition-colors">Cookie Policy</Link>
              <Link to="/agb" className="text-sm text-muted-foreground hover:text-primary transition-colors">AGB</Link>
            </div>
          </div>
        </div>

        <div className="border-t border-border/30 mt-8 pt-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} Hades Client. All rights reserved.
          </p>
          <div className="flex items-center gap-3">
            <a href="#" className="text-muted-foreground hover:text-primary transition-colors" aria-label="Discord">
              <MessageCircle className="h-4 w-4" />
            </a>
            <a href="#" className="text-muted-foreground hover:text-primary transition-colors" aria-label="GitHub">
              <Github className="h-4 w-4" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

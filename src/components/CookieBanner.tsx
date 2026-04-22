import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Cookie, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "hades_cookie_consent";

const CookieBanner = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      if (!localStorage.getItem(STORAGE_KEY)) {
        const t = setTimeout(() => setVisible(true), 600);
        return () => clearTimeout(t);
      }
    } catch {
      setVisible(true);
    }
  }, []);

  const accept = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ necessary: true, ts: Date.now() }));
    } catch {}
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Cookie notice"
      className="fixed bottom-4 left-4 right-4 md:left-6 md:right-auto md:max-w-md z-[100] glass border border-border/40 rounded-xl p-4 shadow-2xl animate-in fade-in slide-in-from-bottom-4"
    >
      <div className="flex items-start gap-3">
        <div className="shrink-0 w-9 h-9 rounded-lg bg-primary/15 text-primary flex items-center justify-center">
          <Cookie className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-display text-sm font-semibold text-foreground mb-1">We use essential cookies</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Hades only uses strictly necessary cookies and local storage to keep you signed in and remember UI preferences. No tracking, no ads. Read our{" "}
            <Link to="/cookies" className="text-primary hover:underline">Cookie Policy</Link>.
          </p>
          <div className="flex items-center gap-2 mt-3">
            <Button size="sm" onClick={accept} className="gradient-hades font-semibold h-8 text-xs">
              Got it
            </Button>
            <Link to="/cookies">
              <Button size="sm" variant="ghost" className="h-8 text-xs">Learn more</Button>
            </Link>
          </div>
        </div>
        <button
          onClick={accept}
          aria-label="Dismiss"
          className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default CookieBanner;

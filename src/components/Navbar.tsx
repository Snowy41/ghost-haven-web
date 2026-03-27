import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, Coins, LogOut, User, Crown, Bug } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import hadesLogo from "@/assets/logo.png";

const navItems = [
  { label: "Home", path: "/" },
  { label: "Download", path: "/download" },
  { label: "Marketplace", path: "/marketplace" },
];

const Navbar = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, profile, signOut, loading, isOwnerOrAdmin } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-border/30">
      <div className="container mx-auto flex items-center justify-between h-16 px-4">
        <Link to="/" className="flex items-center group gap-0">
          <img src={hadesLogo} alt="Hades" className="h-6 w-auto transition-all group-hover:drop-shadow-[0_0_8px_hsl(348,80%,50%)]" />
          <span className="font-display text-lg font-extrabold gradient-hades-text tracking-[0.08em] ml-[2px]">ADES</span>
        </Link>

        <div className="hidden md:flex items-center gap-1">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                location.pathname === item.path
                  ? "text-primary bg-primary/10"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
              }`}
            >
              {item.label}
            </Link>
          ))}
          {user && (
            <Link
              to="/beta-reports"
              className={`relative px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                location.pathname === "/beta-reports"
                  ? "text-destructive bg-destructive/10"
                  : "text-destructive/80 hover:text-destructive hover:bg-destructive/10"
              }`}
            >
              <span className="flex items-center gap-1.5">
                <Bug className="h-3.5 w-3.5" />
                BETA
              </span>
              <span className="absolute -top-1 -right-1 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-destructive" />
              </span>
            </Link>
          )}
        </div>

        <div className="hidden md:flex items-center gap-3">
          {!loading && user && profile ? (
            <>
              {isOwnerOrAdmin && (
                <Link to="/dashboard">
                  <Button variant="ghost" size="sm" className="text-primary hover:text-primary gap-1.5">
                    <Crown className="h-4 w-4" />
                    Dashboard
                  </Button>
                </Link>
              )}
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-sm font-semibold">
                <Coins className="h-4 w-4" />
                {profile.hades_coins}
              </div>
              <Link to="/profile">
                <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground gap-1.5">
                  <User className="h-4 w-4" />
                  {profile.username}
                </Button>
              </Link>
              <Button variant="ghost" size="icon" onClick={handleSignOut} className="text-muted-foreground hover:text-foreground">
                <LogOut className="h-4 w-4" />
              </Button>
            </>
          ) : !loading ? (
            <>
              <Link to="/login">
                <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">Login</Button>
              </Link>
              <Link to="/register">
                <Button size="sm" className="gradient-hades font-semibold glow-orange">Sign Up</Button>
              </Link>
            </>
          ) : null}
        </div>

        <button className="md:hidden text-foreground" onClick={() => setMobileOpen(!mobileOpen)}>
          {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden glass border-t border-border/30 overflow-hidden"
          >
            <div className="flex flex-col p-4 gap-2">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileOpen(false)}
                  className={`px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                    location.pathname === item.path
                      ? "text-primary bg-primary/10"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                  }`}
                >
                  {item.label}
                </Link>
              ))}
              {user && (
                <Link
                  to="/beta-reports"
                  onClick={() => setMobileOpen(false)}
                  className={`px-4 py-3 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                    location.pathname === "/beta-reports"
                      ? "text-destructive bg-destructive/10"
                      : "text-destructive/80 hover:text-destructive hover:bg-destructive/10"
                  }`}
                >
                  <Bug className="h-4 w-4" />
                  BETA Reports
                  <span className="relative flex h-2 w-2 ml-1">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-destructive" />
                  </span>
                </Link>
              )}
              {user && profile ? (
                <>
                  {isOwnerOrAdmin && (
                    <Link to="/dashboard" onClick={() => setMobileOpen(false)}>
                      <Button variant="outline" className="w-full gap-1.5">
                        <Crown className="h-4 w-4" /> Dashboard
                      </Button>
                    </Link>
                  )}
                  <div className="flex items-center gap-1.5 px-4 py-3 text-primary text-sm font-semibold">
                    <Coins className="h-4 w-4" /> {profile.hades_coins} Hades Coins
                  </div>
                  <Link to="/profile" onClick={() => setMobileOpen(false)}>
                    <Button variant="outline" className="w-full">Profile</Button>
                  </Link>
                  <Button variant="ghost" className="w-full" onClick={() => { handleSignOut(); setMobileOpen(false); }}>
                    Sign Out
                  </Button>
                </>
              ) : (
                <div className="flex gap-2 mt-2">
                  <Link to="/login" className="flex-1" onClick={() => setMobileOpen(false)}>
                    <Button variant="outline" className="w-full">Login</Button>
                  </Link>
                  <Link to="/register" className="flex-1" onClick={() => setMobileOpen(false)}>
                    <Button className="w-full gradient-hades glow-orange">Sign Up</Button>
                  </Link>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default Navbar;

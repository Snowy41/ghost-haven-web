import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Star, Clock, Play, Shield, Zap, Ghost, Crosshair, ArrowRight, Download as DownloadIcon, ChevronLeft, ChevronRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";
import SEOHead from "@/components/SEOHead";

const features = [
  { text: "All modules (100+)", icon: Crosshair },
  { text: "Ghost injection", icon: Ghost },
  { text: "Bypass engine", icon: Shield },
  { text: "Stealth mode", icon: Zap },
  { text: "Community configs", icon: Star },
  { text: "Priority support", icon: Check },
];

const faqItems = [
  {
    q: "What's included in Premium?",
    a: "Full access to every module (100+), the bypass engine, stealth mode, ghost injection, all community configs from the marketplace, and priority support from our team.",
  },
  {
    q: "How do I get an invite key?",
    a: "Invite keys are distributed through our Discord community and by existing members. Join our Discord server and check the announcements channel for key drops.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Yes — your subscription renews monthly and you can cancel at any time. You'll keep access until the end of your current billing period.",
  },
  {
    q: "What payment methods are accepted?",
    a: "We accept all major credit and debit cards through Stripe, including Visa, Mastercard, and American Express.",
  },
  {
    q: "Is the injector safe to use?",
    a: "The injector is designed with a multi-layer bypass engine and stealth mode to minimize detection. We continuously update our bypass methods.",
  },
];

interface ChangelogEntry {
  id: string;
  title: string;
  content: string;
  version: string | null;
  created_at: string;
}

interface SubInfo {
  status: string;
  current_period_end: string | null;
}

const Download = () => {
  const { user, session } = useAuth();
  const { toast } = useToast();
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [betaLoading, setBetaLoading] = useState(false);
  const [showcaseImages, setShowcaseImages] = useState<string[]>([]);
  const [changelogs, setChangelogs] = useState<ChangelogEntry[]>([]);
  const [subscription, setSubscription] = useState<SubInfo | null>(null);
  const [carouselIndex, setCarouselIndex] = useState(0);

  useEffect(() => {
    Promise.all([
      supabase.from("site_settings").select("value").eq("key", "preview_images").maybeSingle(),
      supabase.from("changelogs").select("id, title, content, version, created_at").eq("published", true).order("created_at", { ascending: false }).limit(5),
    ]).then(([imgRes, clRes]) => {
      if (imgRes.data?.value && typeof imgRes.data.value === "object") {
        const val = imgRes.data.value as Record<string, string>;
        // Collect all carousel images + legacy showcase keys
        const imgs: string[] = [];
        // Legacy showcase_1, showcase_2
        if (val.showcase_1) imgs.push(val.showcase_1);
        if (val.showcase_2) imgs.push(val.showcase_2);
        // Carousel images stored as carousel_0, carousel_1, etc.
        let i = 0;
        while (val[`carousel_${i}`]) {
          const url = val[`carousel_${i}`];
          if (!imgs.includes(url)) imgs.push(url);
          i++;
        }
        setShowcaseImages(imgs);
      }
      setChangelogs((clRes.data as any[]) || []);
    });
  }, []);

  // Fetch subscription status
  useEffect(() => {
    if (!user) {
      setSubscription(null);
      return;
    }
    supabase
      .from("subscriptions")
      .select("status, current_period_end")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setSubscription(data as SubInfo);
      });
  }, [user]);

  // Auto-advance carousel
  useEffect(() => {
    if (showcaseImages.length <= 1) return;
    const timer = setInterval(() => {
      setCarouselIndex((prev) => (prev + 1) % showcaseImages.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [showcaseImages.length]);

  const isSubActive = subscription?.status === "active" && subscription.current_period_end && new Date(subscription.current_period_end) > new Date();

  const handleSubscribe = async () => {
    if (!user || !session) {
      toast({ title: "Sign in required", description: "Please sign in first.", variant: "destructive" });
      return;
    }
    setCheckoutLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { origin: window.location.origin },
      });
      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (err: any) {
      toast({ title: "Checkout failed", description: err.message, variant: "destructive" });
    } finally {
      setCheckoutLoading(false);
    }
  };

  const handleBetaDownload = async () => {
    if (!user || !session) {
      toast({ title: "Sign in required", description: "Please sign in first.", variant: "destructive" });
      return;
    }
    setBetaLoading(true);
    try {
      const response = await supabase.functions.invoke("launcher-beta-download");
      if (response.error) throw response.error;
      const result = response.data;
      if (result?.url) {
        const a = document.createElement("a");
        a.href = result.url;
        a.download = "injector.exe";
        a.click();
        toast({ title: "Download started!" });
      } else {
        throw new Error("Download failed — no URL returned");
      }
    } catch (err: any) {
      toast({ title: "Download failed", description: err.message, variant: "destructive" });
    } finally {
      setBetaLoading(false);
    }
  };

  const prevSlide = () => setCarouselIndex((prev) => (prev - 1 + showcaseImages.length) % showcaseImages.length);
  const nextSlide = () => setCarouselIndex((prev) => (prev + 1) % showcaseImages.length);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-24">
        {/* Hero */}
        <section className="py-16 text-center">
          <div className="container mx-auto px-4">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <h1 className="font-display text-4xl sm:text-5xl font-bold mb-4">
                Get <span className="gradient-hades-text">Hades Premium</span>
              </h1>
              <p className="text-muted-foreground max-w-lg mx-auto">
                One plan. Full access. Everything you need to dominate.
              </p>
            </motion.div>
          </div>
        </section>

        {/* Active Subscription Banner */}
        {isSubActive && (
          <section className="pb-8">
            <div className="container mx-auto px-4 max-w-3xl">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="rounded-xl p-5 glass border-primary/40 glow-orange flex items-center gap-4"
              >
                <CheckCircle2 className="h-8 w-8 text-primary flex-shrink-0" />
                <div className="flex-1">
                  <p className="font-display font-semibold text-foreground">Premium Active</p>
                  <p className="text-sm text-muted-foreground">
                    Your subscription is active until{" "}
                    <span className="text-foreground font-medium">
                      {new Date(subscription!.current_period_end!).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </span>
                  </p>
                </div>
              </motion.div>
            </div>
          </section>
        )}

        {/* Beta + Premium Cards */}
        <section className="pb-24">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl mx-auto">
              {/* Beta Card - Free */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 }}
                className="relative rounded-xl p-8 glass border-border/40"
              >
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-secondary text-xs font-display font-semibold text-secondary-foreground">
                  Free
                </div>
                <div className="flex items-center gap-2 mb-4">
                  <DownloadIcon className="h-5 w-5 text-muted-foreground" />
                  <span className="font-display text-sm font-semibold tracking-wider">BETA</span>
                </div>
                <div className="mb-6">
                  <span className="font-display text-4xl font-bold">€0</span>
                  <span className="text-sm text-muted-foreground ml-1">/forever</span>
                </div>
                <div className="flex flex-col gap-3 mb-8">
                  <div className="flex items-center gap-3 text-sm">
                    <DownloadIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <span className="text-foreground">Injector download</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <Shield className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <span className="text-foreground">Basic features</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <Star className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <span className="text-foreground">Community access</span>
                  </div>
                </div>
                {user ? (
                  <Button
                    className="w-full font-display font-semibold tracking-wider"
                    variant="outline"
                    onClick={handleBetaDownload}
                    disabled={betaLoading}
                  >
                    {betaLoading ? "Downloading..." : "Download Injector"}
                    {!betaLoading && <DownloadIcon className="ml-2 h-4 w-4" />}
                  </Button>
                ) : (
                  <Link to="/register">
                    <Button className="w-full font-display font-semibold tracking-wider" variant="outline">
                      Sign Up to Download
                    </Button>
                  </Link>
                )}
              </motion.div>
              {/* Premium Card */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="relative rounded-xl p-8 glass border-primary/40 glow-orange"
              >
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full gradient-hades text-xs font-display font-semibold text-primary-foreground">
                  Full Access
                </div>
                <div className="flex items-center gap-2 mb-4">
                  <Star className="h-5 w-5 text-primary" />
                  <span className="font-display text-sm font-semibold tracking-wider">PREMIUM</span>
                </div>
                <div className="mb-6">
                  <span className="font-display text-4xl font-bold">€10</span>
                  <span className="text-sm text-muted-foreground ml-1">/month</span>
                </div>
                <div className="flex flex-col gap-3 mb-8">
                  {features.map((f) => (
                    <div key={f.text} className="flex items-center gap-3 text-sm">
                      <f.icon className="h-4 w-4 text-primary flex-shrink-0" />
                      <span className="text-foreground">{f.text}</span>
                    </div>
                  ))}
                </div>
                {user ? (
                  isSubActive ? (
                    <Button className="w-full font-display font-semibold tracking-wider" variant="outline" disabled>
                      <CheckCircle2 className="mr-2 h-4 w-4 text-primary" />
                      Subscribed
                    </Button>
                  ) : (
                    <Button
                      className="w-full gradient-hades glow-orange font-display font-semibold tracking-wider"
                      onClick={handleSubscribe}
                      disabled={checkoutLoading}
                    >
                      {checkoutLoading ? "Redirecting..." : "Subscribe Now"}
                      {!checkoutLoading && <ArrowRight className="ml-2 h-4 w-4" />}
                    </Button>
                  )
                ) : (
                  <Link to="/register">
                    <Button className="w-full gradient-hades glow-orange font-display font-semibold tracking-wider">
                      Sign Up to Subscribe
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                )}
                {!isSubActive && (
                  <p className="text-xs text-muted-foreground text-center mt-3">
                    Requires an invite key to register. Cancel anytime.
                  </p>
                )}
              </motion.div>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="pb-16 border-t border-border/20 pt-16">
          <div className="container mx-auto px-4 max-w-2xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-10"
            >
              <h2 className="font-display text-2xl sm:text-3xl font-bold mb-3">
                Frequently <span className="gradient-hades-text">Asked</span>
              </h2>
            </motion.div>
            <Accordion type="single" collapsible className="space-y-2">
              {faqItems.map((item, i) => (
                <AccordionItem key={i} value={`faq-${i}`} className="glass rounded-lg border-border/20 px-4">
                  <AccordionTrigger className="font-display text-sm font-medium hover:no-underline">
                    {item.q}
                  </AccordionTrigger>
                  <AccordionContent className="text-sm text-muted-foreground">
                    {item.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>

        {/* Showcase Carousel */}
        <section className="py-16 border-t border-border/20">
          <div className="container mx-auto px-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-12"
            >
              <h2 className="font-display text-2xl sm:text-3xl font-bold mb-3">
                See It <span className="gradient-hades-text">In Action</span>
              </h2>
              <p className="text-muted-foreground">Watch Hades dominate on every server.</p>
            </motion.div>

            {showcaseImages.length > 0 ? (
              <div className="relative max-w-3xl mx-auto">
                <div className="relative aspect-video rounded-xl overflow-hidden glass border-border/20">
                  <AnimatePresence mode="wait">
                    <motion.img
                      key={carouselIndex}
                      src={showcaseImages[carouselIndex]}
                      alt={`Showcase ${carouselIndex + 1}`}
                      className="w-full h-full object-cover"
                      initial={{ opacity: 0, x: 30 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -30 }}
                      transition={{ duration: 0.3 }}
                    />
                  </AnimatePresence>
                </div>
                {showcaseImages.length > 1 && (
                  <>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute left-2 top-1/2 -translate-y-1/2 bg-background/60 backdrop-blur-sm hover:bg-background/80 rounded-full"
                      onClick={prevSlide}
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-2 top-1/2 -translate-y-1/2 bg-background/60 backdrop-blur-sm hover:bg-background/80 rounded-full"
                      onClick={nextSlide}
                    >
                      <ChevronRight className="h-5 w-5" />
                    </Button>
                    {/* Dots */}
                    <div className="flex justify-center gap-2 mt-4">
                      {showcaseImages.map((_, i) => (
                        <button
                          key={i}
                          onClick={() => setCarouselIndex(i)}
                          className={`w-2 h-2 rounded-full transition-all ${i === carouselIndex ? "bg-primary w-6" : "bg-muted-foreground/30"}`}
                        />
                      ))}
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-3xl mx-auto">
                {["PvP Highlights", "Bypass Demo"].map((title) => (
                  <div
                    key={title}
                    className="glass rounded-xl aspect-video flex items-center justify-center group cursor-pointer hover:border-primary/30 transition-all"
                  >
                    <div className="text-center">
                      <Play className="h-10 w-10 text-primary mx-auto mb-2 group-hover:scale-110 transition-transform" />
                      <span className="text-sm text-muted-foreground">{title}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Changelog */}
        <section className="py-16 border-t border-border/20">
          <div className="container mx-auto px-4 max-w-2xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-12"
            >
              <h2 className="font-display text-2xl sm:text-3xl font-bold mb-3">
                <span className="gradient-hades-text">Changelog</span>
              </h2>
              <p className="text-muted-foreground">Latest updates and improvements.</p>
            </motion.div>
            {changelogs.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No updates yet.</p>
            ) : (
              <div className="space-y-4">
                {changelogs.map((entry, i) => (
                  <motion.div
                    key={entry.id}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.05 }}
                    className="glass rounded-lg p-4 flex items-start gap-4"
                  >
                    <div className="flex-shrink-0 flex items-center gap-2">
                      <Clock className="h-4 w-4 text-primary" />
                      {entry.version && (
                        <span className="font-display text-xs font-semibold text-primary">{entry.version}</span>
                      )}
                    </div>
                    <div>
                      <div className="font-medium text-sm text-foreground mb-0.5">{entry.title}</div>
                      <div className="text-xs text-muted-foreground mb-1">
                        {new Date(entry.created_at).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
                      </div>
                      <p className="text-sm text-muted-foreground">{entry.content}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Download;

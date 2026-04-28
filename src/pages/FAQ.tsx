import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Helmet } from "react-helmet-async";
import { HelpCircle } from "lucide-react";

const faqs = [
  {
    q: "What is Hades Client?",
    a: "Hades is an injection client for LabyMod v4 with rage features and powerful bypasses, including 100+ modules tailored for competitive play.",
  },
  {
    q: "How do I get access?",
    a: "Account registration requires a single-use invite key. You can obtain one by purchasing a license or being invited by an existing member through our Discord.",
  },
  {
    q: "Which Minecraft versions are supported?",
    a: "Hades targets LabyMod v4. Check the Download page for the current list of supported Minecraft versions and the latest launcher build.",
  },
  {
    q: "How does the launcher work?",
    a: "Our launcher authenticates with your Hades account, fetches a 24-hour session token, and securely injects the client JAR into your LabyMod v4 instance.",
  },
  {
    q: "What are Hades Coins?",
    a: "Hades Coins are the in-app currency used to purchase configs in the Marketplace and unlock cosmetic upgrades. You can earn them by sharing configs or buy them via Stripe.",
  },
  {
    q: "Can I share or sell my configs?",
    a: "Yes. Upload your configs to the Marketplace and set a price in Hades Coins. You receive coins each time another user purchases your config.",
  },
  {
    q: "How do I link my Discord account?",
    a: "Open your Profile and click 'Link Discord'. Once linked, our Discord bot automatically assigns the correct role based on your purchase or invite status.",
  },
  {
    q: "Is Hades safe to use?",
    a: "We use industry-standard security: rate limiting, HIBP password checks, strict row-level security on the backend, and short-lived session tokens. Never share your account credentials.",
  },
  {
    q: "What is your refund policy?",
    a: "See our Refund Policy page for full details. In short, refunds are evaluated on a case-by-case basis depending on usage and time since purchase.",
  },
  {
    q: "How do I report a bug?",
    a: "Use the BETA Reports page in the navbar while signed in. Bug reports go directly to the admin dashboard for review.",
  },
  {
    q: "Where can I get support?",
    a: "Join our Discord server using the link in the footer. Our team and community are active and respond quickly.",
  },
];

const FAQ = () => {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="FAQ — Hades Client | Frequently Asked Questions"
        description="Answers to common questions about Hades Client: access, launcher, Hades Coins, Marketplace, Discord, security and support."
        path="/faq"
      />
      <Helmet>
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      </Helmet>
      <Navbar />
      <main className="container mx-auto px-4 pt-28 pb-16 max-w-3xl">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-lg bg-primary/15 text-primary flex items-center justify-center">
            <HelpCircle className="h-5 w-5" />
          </div>
          <h1 className="font-display text-4xl font-bold gradient-hades-text">FAQ</h1>
        </div>
        <p className="text-muted-foreground mb-10">
          Everything you need to know about Hades Client. Can't find your answer? Reach out on Discord.
        </p>

        <Accordion type="single" collapsible className="glass border border-border/40 rounded-xl px-4">
          {faqs.map((f, i) => (
            <AccordionItem key={i} value={`item-${i}`} className="border-border/30 last:border-0">
              <AccordionTrigger className="text-left text-foreground font-semibold hover:no-underline">
                {f.q}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground leading-relaxed">
                {f.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </main>
      <Footer />
    </div>
  );
};

export default FAQ;

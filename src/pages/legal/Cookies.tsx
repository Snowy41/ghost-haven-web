import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";

const Cookies = () => (
  <div className="min-h-screen bg-background">
    <SEOHead title="Cookie Policy — Hades Client" description="How Hades Client uses cookies and local storage." />
    <Navbar />
    <main className="container mx-auto px-4 pt-28 pb-16 max-w-3xl">
      <h1 className="font-display text-4xl font-bold mb-2 gradient-hades-text">Cookie Policy</h1>
      <p className="text-sm text-muted-foreground mb-8">Last updated: {new Date().toLocaleDateString()}</p>

      <article className="space-y-6 text-muted-foreground leading-relaxed">
        <section>
          <h2 className="text-xl font-semibold text-foreground">1. What We Use</h2>
          <p>Hades Client uses a small number of <strong>cookies</strong> and browser storage technologies (<code>localStorage</code>, <code>sessionStorage</code>). We do <strong>not</strong> use any third-party advertising or tracking cookies.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">2. Categories</h2>

          <h3 className="text-lg font-semibold text-foreground mt-4">Strictly Necessary (always active)</h3>
          <ul className="list-disc pl-6 space-y-1">
            <li><strong>Authentication session</strong> (<code>localStorage</code>): keeps you signed in. Stored by our authentication provider.</li>
            <li><strong>Sidebar state</strong> (<code>sidebar:state</code> cookie): remembers whether the dashboard sidebar is open.</li>
            <li><strong>UI preferences</strong> (<code>sessionStorage</code>): e.g. dismissing the Discord-link prompt for the current session.</li>
            <li><strong>Cookie consent</strong> (<code>hades_cookie_consent</code>): remembers your choice on this banner.</li>
          </ul>

          <h3 className="text-lg font-semibold text-foreground mt-4">Functional</h3>
          <p>None at this time.</p>

          <h3 className="text-lg font-semibold text-foreground mt-4">Analytics / Marketing</h3>
          <p>None. We do not run analytics, advertising, or fingerprinting trackers on this website.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">3. Managing Cookies</h2>
          <p>Because we only use strictly necessary storage, no consent toggle is required for them. You can clear cookies and local storage at any time through your browser settings — note that doing so will sign you out and reset preferences.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">4. Changes</h2>
          <p>If we ever introduce non-essential cookies (e.g. analytics), we will update this policy and request explicit opt-in consent.</p>
        </section>
      </article>
    </main>
    <Footer />
  </div>
);

export default Cookies;

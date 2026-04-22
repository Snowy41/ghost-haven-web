import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";

const Privacy = () => (
  <div className="min-h-screen bg-background">
    <SEOHead title="Privacy Policy — Hades Client" description="How Hades Client collects, uses, and protects your data." />
    <Navbar />
    <main className="container mx-auto px-4 pt-28 pb-16 max-w-3xl">
      <h1 className="font-display text-4xl font-bold mb-2 gradient-hades-text">Privacy Policy</h1>
      <p className="text-sm text-muted-foreground mb-8">Last updated: {new Date().toLocaleDateString()}</p>

      <article className="space-y-6 text-muted-foreground leading-relaxed">
        <section>
          <h2 className="text-xl font-semibold text-foreground">1. Data We Collect</h2>
          <ul className="list-disc pl-6 space-y-1">
            <li><strong>Account data:</strong> email, username, password hash.</li>
            <li><strong>Profile data:</strong> avatar, banner, description, linked Discord ID/username/avatar.</li>
            <li><strong>Hardware identifier (HWID):</strong> a hashed device identifier used to prevent account abuse.</li>
            <li><strong>Usage data:</strong> session tokens, download tokens, presence/activity status, friend list, messages.</li>
            <li><strong>Payment data:</strong> handled by Stripe — we never store card details. We retain Stripe customer/subscription IDs.</li>
            <li><strong>Technical data:</strong> IP address (used only for rate limiting and security), browser type.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">2. How We Use Data</h2>
          <ul className="list-disc pl-6 space-y-1">
            <li>To provide authentication, the launcher, the marketplace, and friend features.</li>
            <li>To process payments and manage subscriptions.</li>
            <li>To enforce security (rate limiting, HWID checks, breach detection via HIBP).</li>
            <li>To communicate important account or service notices.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">3. Legal Basis (GDPR)</h2>
          <p>We process personal data based on (a) the performance of a contract with you, (b) your consent (e.g. Discord linking, optional cookies), and (c) our legitimate interest in securing the Service.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">4. Data Sharing</h2>
          <p>We share data only with processors needed to operate the Service: Supabase (hosting, database, storage), Stripe (payments), Discord (only if you link your account). We never sell your data.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">5. Data Retention</h2>
          <p>Account data is retained while your account is active. Upon deletion, we remove personal data within 30 days, except where retention is legally required (e.g. invoices).</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">6. Your Rights (GDPR)</h2>
          <p>You have the right to access, rectify, erase, restrict, or port your data, and to object to processing. Contact us via Discord to exercise these rights.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">7. Security</h2>
          <p>We use industry-standard measures: TLS encryption, hashed passwords, Row-Level Security on the database, HWID/IP rate limiting, and breach-password screening. No system is 100% secure.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">8. Children</h2>
          <p>The Service is not intended for users under 16. We do not knowingly collect data from children.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">9. Changes</h2>
          <p>We may update this Policy. Material changes will be announced via the site or Discord.</p>
        </section>
      </article>
    </main>
    <Footer />
  </div>
);

export default Privacy;

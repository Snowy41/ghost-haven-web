import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";

const Terms = () => (
  <div className="min-h-screen bg-background">
    <SEOHead title="Terms of Service — Hades Client" description="Terms of Service for using Hades Client." />
    <Navbar />
    <main className="container mx-auto px-4 pt-28 pb-16 max-w-3xl">
      <h1 className="font-display text-4xl font-bold mb-2 gradient-hades-text">Terms of Service</h1>
      <p className="text-sm text-muted-foreground mb-8">Last updated: {new Date().toLocaleDateString()}</p>

      <article className="prose prose-invert max-w-none space-y-6 text-muted-foreground leading-relaxed">
        <section>
          <h2 className="text-xl font-semibold text-foreground">1. Acceptance of Terms</h2>
          <p>By accessing or using Hades Client ("the Service"), you agree to be bound by these Terms of Service. If you do not agree, do not use the Service.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">2. Eligibility</h2>
          <p>You must be at least 16 years old (or the age of digital consent in your jurisdiction) to use the Service. By creating an account, you confirm that you meet this requirement.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">3. Account Responsibility</h2>
          <p>You are responsible for safeguarding your account credentials and for all activity under your account. Account sharing, reselling, or transferring is strictly forbidden and may result in permanent termination without refund.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">4. Acceptable Use</h2>
          <p>You agree not to use the Service for any unlawful purpose, to harass others, to attempt to reverse engineer, decompile, or redistribute the client, or to abuse the marketplace, friend system, or invite-key system. We reserve the right to suspend or terminate accounts that violate these rules.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">5. License</h2>
          <p>We grant you a limited, non-exclusive, non-transferable, revocable license to use the Hades Client software for personal, non-commercial use, subject to your compliance with these Terms and your active subscription where applicable.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">6. Third-Party Services</h2>
          <p>The Service may interact with third-party platforms (e.g. Minecraft, Discord). We are not affiliated with, endorsed by, or sponsored by Mojang, Microsoft, or Discord. Use of those platforms remains subject to their own terms.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">7. Disclaimer of Warranty</h2>
          <p>The Service is provided "as is" and "as available" without warranties of any kind. We do not guarantee uninterrupted availability, undetected status, or compatibility with any particular server or anti-cheat.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">8. Limitation of Liability</h2>
          <p>To the maximum extent permitted by law, Hades Client shall not be liable for any indirect, incidental, special, or consequential damages, including but not limited to account bans on third-party platforms, loss of data, or loss of profits.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">9. Termination</h2>
          <p>We may suspend or terminate your access at any time for any reason, including violation of these Terms, without prior notice and without refund.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">10. Changes to Terms</h2>
          <p>We may modify these Terms at any time. Continued use of the Service after changes constitutes acceptance of the updated Terms.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">11. Contact</h2>
          <p>For questions about these Terms, contact us via our official Discord server.</p>
        </section>
      </article>
    </main>
    <Footer />
  </div>
);

export default Terms;

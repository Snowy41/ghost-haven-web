import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";

const Refund = () => (
  <div className="min-h-screen bg-background">
    <SEOHead title="Refund Policy — Hades Client" description="Refund policy for Hades Client subscriptions and digital purchases." />
    <Navbar />
    <main className="container mx-auto px-4 pt-28 pb-16 max-w-3xl">
      <h1 className="font-display text-4xl font-bold mb-2 gradient-hades-text">Refund Policy</h1>
      <p className="text-sm text-muted-foreground mb-8">Last updated: {new Date().toLocaleDateString()}</p>

      <article className="space-y-6 text-muted-foreground leading-relaxed">
        <section>
          <h2 className="text-xl font-semibold text-foreground">1. Digital Goods — No Refunds</h2>
          <p>Hades Client provides instantly-accessible digital software and digital marketplace items. By purchasing a subscription, Hades Coins, or a marketplace config, you expressly consent to immediate delivery and acknowledge that you <strong>waive your right of withdrawal</strong> under EU Directive 2011/83/EU Art. 16(m) once delivery has begun.</p>
          <p>As a result, all sales are <strong>final and non-refundable</strong>.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">2. Exceptions</h2>
          <p>We may issue a refund at our sole discretion in the following cases:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Duplicate charge caused by a payment processor error.</li>
            <li>Confirmed unauthorized payment (subject to investigation).</li>
            <li>Major service outage exceeding 7 consecutive days that prevents use of the Service.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">3. No Refund Cases</h2>
          <ul className="list-disc pl-6 space-y-1">
            <li>Account bans, terminations, or suspensions caused by Terms violations.</li>
            <li>Detection by third-party anti-cheats — we provide no guarantee of undetected status.</li>
            <li>Change of mind or accidental purchase.</li>
            <li>Unused subscription time after cancellation.</li>
            <li>Marketplace configs (instantly delivered digital goods).</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">4. Subscription Cancellation</h2>
          <p>You can cancel your recurring subscription at any time from your profile. Cancellation stops future charges; you keep access until the end of the current billing period. No partial refunds are issued.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">5. Chargebacks</h2>
          <p>Initiating a chargeback without first contacting us results in immediate and permanent account termination, and may result in further legal action.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">6. How to Request a Review</h2>
          <p>To request a refund review under one of the exceptions above, contact us within 14 days of purchase via our official Discord server with your transaction ID.</p>
        </section>
      </article>
    </main>
    <Footer />
  </div>
);

export default Refund;

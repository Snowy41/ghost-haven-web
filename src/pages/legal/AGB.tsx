import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";

const AGB = () => (
  <div className="min-h-screen bg-background">
    <SEOHead title="AGB — Hades Client" description="Allgemeine Geschäftsbedingungen von Hades Client." />
    <Navbar />
    <main className="container mx-auto px-4 pt-28 pb-16 max-w-3xl">
      <h1 className="font-display text-4xl font-bold mb-2 gradient-hades-text">Allgemeine Geschäftsbedingungen</h1>
      <p className="text-sm text-muted-foreground mb-8">Stand: {new Date().toLocaleDateString("de-DE")}</p>

      <article className="space-y-6 text-muted-foreground leading-relaxed">
        <section>
          <h2 className="text-xl font-semibold text-foreground">§1 Geltungsbereich</h2>
          <p>Diese Allgemeinen Geschäftsbedingungen (nachfolgend „AGB") gelten für alle Verträge zwischen dem Betreiber von Hades Client (nachfolgend „Anbieter") und natürlichen oder juristischen Personen (nachfolgend „Nutzer") über die Nutzung der Website, des Launchers und aller damit verbundenen Dienste.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">§2 Vertragsgegenstand</h2>
          <p>Gegenstand des Vertrags ist die Bereitstellung der Hades-Client-Software, der zugehörigen Online-Dienste, des Marketplace sowie optionaler kostenpflichtiger Abonnements und digitaler Inhalte (z. B. Hades Coins, Configs).</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">§3 Vertragsschluss</h2>
          <p>Mit der Registrierung eines Kontos bzw. dem Abschluss eines kostenpflichtigen Abonnements kommt ein Vertrag zwischen Anbieter und Nutzer nach Maßgabe dieser AGB zustande. Voraussetzung für die Registrierung ist u. a. ein gültiger Einladungscode.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">§4 Preise und Zahlung</h2>
          <p>Es gelten die zum Zeitpunkt der Bestellung im Bestellformular angegebenen Preise inklusive gesetzlicher Mehrwertsteuer. Die Zahlung erfolgt über den Zahlungsdienstleister Stripe. Bei Abonnements wird der Betrag zu Beginn jedes Abrechnungszeitraums automatisch eingezogen.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">§5 Widerrufsrecht bei digitalen Inhalten</h2>
          <p>Der Nutzer stimmt mit dem Kauf ausdrücklich zu, dass die Bereitstellung digitaler Inhalte (Software-Zugang, Hades Coins, Marketplace-Configs) <strong>vor Ablauf der Widerrufsfrist</strong> beginnt. Gemäß § 356 Abs. 5 BGB erlischt das Widerrufsrecht damit. Im Übrigen gilt unsere <a href="/refund-policy" className="text-primary hover:underline">Refund Policy</a>.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">§6 Pflichten des Nutzers</h2>
          <ul className="list-disc pl-6 space-y-1">
            <li>Wahrheitsgemäße Angaben bei der Registrierung.</li>
            <li>Geheimhaltung der Zugangsdaten; keine Weitergabe oder Veräußerung des Kontos.</li>
            <li>Kein Reverse Engineering, keine Weiterverbreitung der Software, kein Missbrauch der API.</li>
            <li>Beachtung geltender Gesetze sowie der Nutzungsbedingungen Dritter (z. B. Mojang/Microsoft, Discord).</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">§7 Sperrung und Kündigung</h2>
          <p>Der Anbieter ist berechtigt, Konten bei Verstößen gegen diese AGB ohne Vorankündigung und ohne Erstattung zu sperren oder zu löschen. Der Nutzer kann sein Konto und Abonnement jederzeit über sein Profil kündigen.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">§8 Haftung</h2>
          <p>Der Anbieter haftet unbeschränkt nur bei Vorsatz und grober Fahrlässigkeit sowie bei Verletzung von Leben, Körper und Gesundheit. Im Übrigen ist die Haftung auf den vertragstypischen, vorhersehbaren Schaden begrenzt. Eine Haftung für Sperrungen durch Dritte (z. B. Anti-Cheat-Systeme) ist ausgeschlossen.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">§9 Datenschutz</h2>
          <p>Die Verarbeitung personenbezogener Daten erfolgt nach Maßgabe unserer <a href="/privacy" className="text-primary hover:underline">Datenschutzerklärung</a>.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">§10 Schlussbestimmungen</h2>
          <p>Es gilt das Recht der Bundesrepublik Deutschland unter Ausschluss des UN-Kaufrechts. Sollten einzelne Bestimmungen dieser AGB unwirksam sein, bleibt die Wirksamkeit der übrigen Bestimmungen davon unberührt.</p>
        </section>
      </article>
    </main>
    <Footer />
  </div>
);

export default AGB;

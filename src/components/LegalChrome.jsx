/* ============================================================
   COMPASSSCRIBE — Legal page chrome (header + footer)
   A lightweight, English-only, locale-free shell for the Twilio
   compliance pages (/sms-consent, /sms-terms, /privacy-policy, /terms).
   Deliberately NOT the bilingual marketing Header/Footer (BlogChrome) —
   those carry /vi /en nav + anchor links that don't fit legal pages.
   Server component (no client state needed).
   ============================================================ */
import { BRAND, SUPPORT_EMAIL, LEGAL_LINKS } from "../legal-data.js";

export default function LegalChrome({ children }) {
  return (
    <>
      <header className="legal-header">
        <div className="container legal-header-inner">
          <a className="legal-brand" href="/" aria-label={`${BRAND} home`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/assets/logo-color.svg" alt={BRAND} height={44} />
          </a>
          <nav className="legal-nav" aria-label="Compliance pages">
            {LEGAL_LINKS.map((l) => (
              <a key={l.href} href={l.href}>{l.label}</a>
            ))}
          </nav>
        </div>
      </header>

      <main className="legal-main">{children}</main>

      <footer className="legal-footer">
        <div className="container">
          <nav className="legal-footer-nav" aria-label="Compliance pages">
            {LEGAL_LINKS.map((l) => (
              <a key={l.href} href={l.href}>{l.label}</a>
            ))}
          </nav>
          <p className="legal-footer-meta">
            Questions? Contact{" "}
            <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
          </p>
          <p className="legal-footer-meta legal-entity">
            Compass Medical Administrative Services LLC ({BRAND})
          </p>
        </div>
      </footer>
    </>
  );
}

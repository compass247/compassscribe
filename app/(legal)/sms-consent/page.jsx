import { SITE_URL } from "../../../src/seo.js";
import LegalChrome from "../../../src/components/LegalChrome.jsx";
import SmsConsentForm from "../../../src/components/SmsConsentForm.jsx";
import { ENTITY } from "../../../src/legal-data.js";

export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: "SMS Consent — CMAS",
  description:
    "Opt in to receive SMS text messages from Compass Medical Administrative Services LLC (CMAS): appointment reminders, verification codes, and healthcare notifications.",
  alternates: { canonical: `${SITE_URL}/sms-consent` },
  robots: { index: true, follow: true },
};

export default function SmsConsentPage() {
  return (
    <LegalChrome>
      <section className="bg-white section-pad">
        <div className="container legal-doc">
          <h1>SMS Text Message Consent</h1>
          <p className="lede">
            Opt in to receive SMS text messages from {ENTITY} (CMAS). Complete the
            form below to confirm your consent. This consent is not a condition of
            receiving healthcare services.
          </p>
          <SmsConsentForm />
        </div>
      </section>
    </LegalChrome>
  );
}

import { SITE_URL } from "../../../src/seo.js";
import LegalChrome from "../../../src/components/LegalChrome.jsx";
import { ENTITY, SUPPORT_EMAIL, LEGAL_EFFECTIVE_DATE } from "../../../src/legal-data.js";

export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Privacy Policy — CMAS",
  description:
    "Privacy Policy for Compass Medical Administrative Services LLC (CMAS): what we collect, how we use it, SMS communications, data protection, retention, and your rights.",
  alternates: { canonical: `${SITE_URL}/privacy-policy` },
  robots: { index: true, follow: true },
};

export default function PrivacyPolicyPage() {
  return (
    <LegalChrome>
      <section className="bg-white section-pad">
        <div className="container legal-doc">
          <h1>Privacy Policy</h1>
          <p className="legal-updated">
            Effective date: {LEGAL_EFFECTIVE_DATE} &middot; Last updated:{" "}
            {LEGAL_EFFECTIVE_DATE}
          </p>

          <p className="lede">
            {ENTITY} (&ldquo;CMAS,&rdquo; &ldquo;we,&rdquo; &ldquo;us&rdquo;)
            provides healthcare administrative technology services. This policy
            explains how we collect, use, protect, and share your information,
            including protected health information (PHI) we handle on behalf of
            our healthcare clients.
          </p>

          <h2>Information We Collect</h2>
          <ul>
            <li><strong>Identity &amp; contact data:</strong> name, phone number, email address.</li>
            <li>
              <strong>Health information:</strong> health-related information as
              needed to provide administrative services (e.g., appointment and
              eligibility details), handled in accordance with HIPAA.
            </li>
            <li>
              <strong>Consent records:</strong> for SMS, your phone number, the
              consent text you agreed to, a timestamp, IP address, and device/user
              agent — collected to document your opt-in.
            </li>
            <li>
              <strong>Technical data:</strong> limited log data needed to operate
              and secure our services.
            </li>
          </ul>

          <h2>How We Use Your Information</h2>
          <ul>
            <li>Healthcare administration and coordination on behalf of providers.</li>
            <li>Appointment management (scheduling, reminders, confirmations).</li>
            <li>Billing and related administrative functions.</li>
            <li>Sending SMS messages you have consented to receive.</li>
            <li>Security, fraud prevention, and legal compliance.</li>
          </ul>

          <h2>SMS Communications</h2>
          <p>
            When you opt in to SMS, we collect the phone number you provide and
            store your consent with a timestamp as proof of opt-in. We honor
            opt-out requests immediately: reply STOP to any message and we will
            stop sending messages to that number. See our{" "}
            <a href="/sms-terms">SMS Terms of Service</a> for full program details.
            Mobile information collected for SMS is not sold or shared with third
            parties for their own marketing purposes.
          </p>

          <h2>Data Protection</h2>
          <ul>
            <li>Encryption of data in transit (TLS) and at rest.</li>
            <li>Role-based access controls limiting who can access your data.</li>
            <li>
              Business Associate Agreements (BAAs) with subprocessors that handle
              PHI, as required by HIPAA.
            </li>
          </ul>

          <h2>Data Retention</h2>
          <p>
            We retain personal and health-related records only as long as needed
            for the purposes above or as required by law. Consent records are
            retained for a minimum of five (5) years in accordance with applicable
            healthcare regulations.
          </p>

          <h2>Third Parties</h2>
          <p>We share data only with service providers necessary to operate our services:</p>
          <ul>
            <li><strong>Twilio</strong> — SMS message delivery.</li>
            <li><strong>Hosting provider</strong> — secure cloud infrastructure.</li>
          </ul>
          <p>
            These providers act under contract (including BAAs where PHI is
            involved) and may only use data to provide services to us.
          </p>

          <h2>Your Rights</h2>
          <p>
            Subject to applicable law, you may request to access, correct, or
            delete your personal information. To exercise these rights, contact us
            at <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
          </p>

          <h2>HIPAA Notice of Privacy Practices</h2>
          <p>
            Where we act as a Business Associate to a covered entity, your
            provider&rsquo;s HIPAA Notice of Privacy Practices describes how your
            protected health information may be used and disclosed and your rights
            regarding that information. Contact your provider or{" "}
            <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> to obtain a copy.
          </p>

          <h2>Contact</h2>
          <p>
            {ENTITY}
            <br />
            <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
          </p>
        </div>
      </section>
    </LegalChrome>
  );
}

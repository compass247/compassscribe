import { SITE_URL } from "../../../src/seo.js";
import LegalChrome from "../../../src/components/LegalChrome.jsx";
import { ENTITY, SUPPORT_EMAIL, LEGAL_EFFECTIVE_DATE } from "../../../src/legal-data.js";

export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: "SMS Terms of Service — CMAS",
  description:
    "CMAS Patient SMS Notifications program terms: message types, frequency, opt-out (STOP), help (HELP), cost, and carrier disclaimers.",
  alternates: { canonical: `${SITE_URL}/sms-terms` },
  robots: { index: true, follow: true },
};

export default function SmsTermsPage() {
  return (
    <LegalChrome>
      <section className="bg-white section-pad">
        <div className="container legal-doc">
          <h1>SMS Terms of Service</h1>
          <p className="legal-updated">Last updated: {LEGAL_EFFECTIVE_DATE}</p>

          <p className="lede">
            These terms govern the <strong>CMAS Patient SMS Notifications</strong>{" "}
            program, operated by {ENTITY}.
          </p>

          <h2>Program Name</h2>
          <p>CMAS Patient SMS Notifications</p>

          <h2>Operated By</h2>
          <p>{ENTITY}</p>

          <h2>Message Types</h2>
          <p>By opting in, you may receive the following types of messages:</p>
          <ul>
            <li>Appointment reminders</li>
            <li>Appointment confirmations</li>
            <li>Verification codes (OTP)</li>
            <li>Healthcare notifications</li>
            <li>Prescription reminders</li>
          </ul>

          <h2>Message Frequency</h2>
          <p>
            Message frequency varies based on your healthcare interactions and
            appointment schedule. Typically 1-5 messages per month.
          </p>

          <h2>Opt-Out</h2>
          <p>
            You can opt out at any time by replying STOP to any message. You will
            receive a confirmation message and no further messages will be sent.
          </p>

          <h2>Help</h2>
          <p>
            For help, reply HELP to any message or contact us at{" "}
            <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
          </p>

          <h2>Cost</h2>
          <p>
            Message and data rates may apply. Check with your mobile carrier for
            details.
          </p>

          <h2>Carrier Disclaimer</h2>
          <p>Carriers are not liable for delayed or undelivered messages.</p>

          <h2>Supported Carriers</h2>
          <p>
            All major US carriers are supported including AT&amp;T, T-Mobile,
            Verizon, and others.
          </p>

          <h2>Privacy</h2>
          <p>
            Your phone number and consent information are stored securely and used
            only for the purposes described above. See our full{" "}
            <a href="/privacy-policy">Privacy Policy</a>.
          </p>

          <h2>Contact</h2>
          <p>
            <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
          </p>
        </div>
      </section>
    </LegalChrome>
  );
}

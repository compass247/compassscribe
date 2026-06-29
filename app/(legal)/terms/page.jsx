import { SITE_URL } from "../../../src/seo.js";
import LegalChrome from "../../../src/components/LegalChrome.jsx";
import { ENTITY, BRAND, SUPPORT_EMAIL, LEGAL_EFFECTIVE_DATE } from "../../../src/legal-data.js";

export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Terms of Use — CMAS",
  description:
    "Terms of Use for compassscribe.com, operated by Compass Medical Administrative Services LLC (CMAS).",
  alternates: { canonical: `${SITE_URL}/terms` },
  robots: { index: true, follow: true },
};

export default function TermsPage() {
  return (
    <LegalChrome>
      <section className="bg-white section-pad">
        <div className="container legal-doc">
          <h1>Terms of Use</h1>
          <p className="legal-updated">Last updated: {LEGAL_EFFECTIVE_DATE}</p>

          <p className="lede">
            These Terms of Use (&ldquo;Terms&rdquo;) govern your use of
            compassscribe.com and the services provided by {ENTITY} (&ldquo;
            {BRAND},&rdquo; &ldquo;we,&rdquo; &ldquo;us&rdquo;).
          </p>

          <h2>1. Acceptance of Terms</h2>
          <p>
            By accessing or using compassscribe.com, you agree to be bound by these
            Terms. If you do not agree, do not use the site or our services.
          </p>

          <h2>2. Service Description</h2>
          <p>
            We provide healthcare administrative technology services, including
            tools that support appointment management, eligibility, and related
            administrative functions on behalf of healthcare providers. We do not
            provide medical advice, diagnosis, or treatment.
          </p>

          <h2>3. User Accounts and Responsibilities</h2>
          <p>
            If you create an account, you are responsible for maintaining the
            confidentiality of your credentials and for all activity under your
            account. You agree to provide accurate information and to keep it
            current.
          </p>

          <h2>4. Acceptable Use</h2>
          <p>You agree not to:</p>
          <ul>
            <li>Use the services for any unlawful or unauthorized purpose.</li>
            <li>Attempt to gain unauthorized access to any system or data.</li>
            <li>Interfere with or disrupt the integrity or performance of the services.</li>
            <li>Submit false information or impersonate any person or entity.</li>
          </ul>

          <h2>5. Intellectual Property</h2>
          <p>
            All content, trademarks, logos, and software on compassscribe.com are
            owned by {ENTITY} or its licensors and are protected by applicable
            intellectual property laws. You may not copy, modify, or distribute our
            content without prior written permission.
          </p>

          <h2>6. SMS Messaging</h2>
          <p>
            SMS text messaging is governed by a separate{" "}
            <a href="/sms-terms">SMS Terms of Service</a>. Consent to receive SMS
            messages is collected separately and is not a condition of using this
            site or receiving healthcare services.
          </p>

          <h2>7. Privacy</h2>
          <p>
            Your use of our services is also governed by our{" "}
            <a href="/privacy-policy">Privacy Policy</a>, which explains how we
            collect, use, and protect your information.
          </p>

          <h2>8. Limitation of Liability</h2>
          <p>
            To the maximum extent permitted by law, {ENTITY} and its affiliates
            shall not be liable for any indirect, incidental, special,
            consequential, or punitive damages, or any loss of data, arising from
            your use of the site or services. The services are provided &ldquo;as
            is&rdquo; without warranties of any kind.
          </p>

          <h2>9. Governing Law</h2>
          <p>
            These Terms are governed by the laws of the State of California,
            without regard to its conflict-of-laws principles.
          </p>

          <h2>10. Contact</h2>
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

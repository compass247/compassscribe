"use client";
/* ============================================================
   COMPASSSCRIBE — SMS opt-in consent form
   Twilio toll-free verification (error 30513). Collects an auditable
   opt-in: Patient Full Name, US phone, and a SEPARATE unchecked consent
   checkbox carrying the verbatim CONSENT_TEXT. Posts to /api/sms-consent
   which stores the record (name, phone, consent text, timestamp, IP, UA).
   Reuses the site form styling (.form-wrap / .field / .check-opt / .btn).
   ============================================================ */
import { useState } from "react";
import { Icon } from "./icons.jsx";
import { submitSmsConsent } from "../api.js";
import { CONSENT_TEXT, CONSENT_VERSION, ENTITY } from "../legal-data.js";

// US phone: exactly 10 digits, or 11 with a leading "1" country code.
function phoneValid(phone) {
  const d = (String(phone).match(/\d/g) || []).join("");
  return d.length === 10 || (d.length === 11 && d.startsWith("1"));
}

export default function SmsConsentForm() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [consent, setConsent] = useState(false); // SEPARATE, unchecked by default
  const [company, setCompany] = useState(""); // honeypot
  const [touched, setTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const nameOk = name.trim().length > 1;
  const phoneOk = phoneValid(phone);
  const canSubmit = nameOk && phoneOk && consent;

  const submit = async (ev) => {
    ev.preventDefault();
    setTouched(true);
    setError("");
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      await submitSmsConsent({
        name: name.trim(),
        phone: phone.trim(),
        consent: true,
        consentText: CONSENT_TEXT,
        consentVersion: CONSENT_VERSION,
        company, // honeypot; backend silently discards if filled
      });
      setDone(true);
    } catch {
      setError("Something went wrong. Please try again or contact support.");
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <div className="form-wrap">
        <div className="form-success">
          <span className="tick"><Icon name="check" size={40} /></span>
          <h2>Consent confirmed</h2>
          <p>Thank you. You have been opted in to receive SMS text messages from CMAS.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="form-wrap">
      <form onSubmit={submit} noValidate aria-label="SMS consent opt-in form">
        <div className={"field" + (touched && !nameOk ? " invalid" : "")}>
          <label htmlFor="c-name">
            Patient Full Name <span className="req" aria-hidden="true">*</span>
          </label>
          <input
            id="c-name"
            type="text"
            value={name}
            placeholder="Jane Doe"
            autoComplete="name"
            aria-required="true"
            aria-invalid={touched && !nameOk ? "true" : "false"}
            aria-describedby="c-name-err"
            onChange={(e) => setName(e.target.value)}
          />
          <div className="err" id="c-name-err">Please enter your full name.</div>
        </div>

        <div className={"field" + (touched && !phoneOk ? " invalid" : "")}>
          <label htmlFor="c-phone">
            Phone Number <span className="req" aria-hidden="true">*</span>
          </label>
          <input
            id="c-phone"
            type="tel"
            value={phone}
            placeholder="(555) 123-4567"
            autoComplete="tel"
            inputMode="tel"
            aria-required="true"
            aria-invalid={touched && !phoneOk ? "true" : "false"}
            aria-describedby="c-phone-err c-phone-hint"
            onChange={(e) => setPhone(e.target.value)}
          />
          <div className="err" id="c-phone-err">Enter a valid US phone number (10 digits).</div>
          <div id="c-phone-hint" className="field-hint">
            US numbers only. We will only text the number you provide.
          </div>
        </div>

        {/* SEPARATE consent checkbox — NOT bundled with Terms/Privacy acceptance. */}
        <div className={"field" + (touched && !consent ? " invalid" : "")}>
          <label className={"check-opt consent-opt" + (consent ? " checked" : "")} htmlFor="c-consent">
            <input
              id="c-consent"
              type="checkbox"
              checked={consent}
              aria-required="true"
              aria-invalid={touched && !consent ? "true" : "false"}
              aria-describedby="c-consent-err"
              onChange={(e) => setConsent(e.target.checked)}
            />
            <span>{CONSENT_TEXT}</span>
          </label>
          <div className="err" id="c-consent-err">
            You must agree to receive SMS messages to opt in.
          </div>
        </div>

        {/* honeypot: visually hidden, off-screen, not announced to AT */}
        <input
          type="text"
          name="company"
          value={company}
          onChange={(e) => setCompany(e.target.value)}
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
          style={{ position: "absolute", left: "-9999px", width: 1, height: 1, opacity: 0 }}
        />

        {error && <p className="form-error" role="alert">{error}</p>}

        <button
          type="submit"
          className="btn btn-primary btn-lg"
          style={{ width: "100%" }}
          disabled={submitting}
        >
          {submitting ? "Submitting…" : "Confirm SMS Consent"}
        </button>

        <p className="consent-note">
          {ENTITY} will only use your number for the messages described above.
        </p>
      </form>
    </div>
  );
}

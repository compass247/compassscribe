/* ============================================================
   COMPASSSCRIBE — Legal / compliance constants
   Single source of truth for the Twilio toll-free SMS verification
   (error 30513) compliance pages. The consent text MUST stay verbatim
   across the opt-in form, the SMS Terms page, and the stored audit record,
   so it lives here and is imported everywhere it appears.
   ============================================================ */

// Legal entity behind the SMS program (CMAS) + public brand.
export const ENTITY = "Compass Medical Administrative Services LLC";
export const BRAND = "Compass Scribe";
export const SUPPORT_EMAIL = "support@compassscribe.com";

// Version stamp stored with each consent record — bump if the wording below
// ever changes, so the audit trail can tell which text a user agreed to.
export const CONSENT_VERSION = "v1";

// EXACT consent text shown next to the opt-in checkbox. Do not paraphrase —
// Twilio reviewers compare this against the SMS Terms. Stored verbatim in the
// consent record as proof of what the user agreed to.
export const CONSENT_TEXT =
  "I agree to receive SMS text messages from Compass Medical Administrative Services LLC " +
  "at the phone number provided. Messages may include: appointment reminders, verification codes, " +
  "and healthcare notifications. Message frequency varies. Message and data rates may apply. " +
  "Reply STOP to unsubscribe at any time. Reply HELP for assistance. This consent is not a " +
  "condition of receiving healthcare services.";

// Cross-links between the compliance pages (used in the shared footer nav).
export const LEGAL_LINKS = [
  { href: "/sms-consent", label: "SMS Consent" },
  { href: "/sms-terms", label: "SMS Terms" },
  { href: "/privacy-policy", label: "Privacy Policy" },
  { href: "/terms", label: "Terms of Use" },
];

// Last-reviewed date for the legal documents (Privacy Policy / Terms).
export const LEGAL_EFFECTIVE_DATE = "June 29, 2026";

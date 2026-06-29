import { Be_Vietnam_Pro } from "next/font/google";

/* ============================================================
   COMPASSSCRIBE — Legal route-group layout
   The Twilio compliance pages live OUTSIDE the [lang] segment so their
   URLs are locale-free (/sms-consent, /sms-terms, /privacy-policy, /terms)
   exactly as registered with Twilio. The root app/layout.jsx is a
   pass-through, so this layout owns the <html>/<body> shell (same approach
   as app/not-found.jsx). English-only.
   ============================================================ */
const beVietnamPro = Be_Vietnam_Pro({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  display: "swap",
  variable: "--font-be-vietnam",
});

export default function LegalLayout({ children }) {
  return (
    <html lang="en" className={beVietnamPro.variable}>
      <body>{children}</body>
    </html>
  );
}

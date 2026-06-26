/* ============================================================
   DEPRECATED — use backend/cms/run-local-seed.mjs (or `npm run cms:seed:local`,
   or the /run-local skill) instead.

   This older helper seeds ONLY team-page/blog/team-members and uses the stale
   :8055/:3000 ports; it does NOT seed the homepage, does NOT create the
   `languages` rows (so homepage seeding fails with INVALID_FOREIGN_KEY), and
   targets the wrong ports now that Compassscribe runs on :8155/:3100. Kept only
   to avoid breaking any direct references. run-local-seed.mjs supersedes it.
   ------------------------------------------------------------
   Seed the LOCAL Directus with sample content for all three areas
   (team page, blog, team members) — with the right LOCAL defaults so the
   revalidate webhooks point at the local Next.js dev server, NOT production.

   This is the "local" entry point used by `npm run cms:seed:local`. It just
   sets sensible local defaults and runs the three setup-*.mjs scripts in turn.

   Defaults (only applied if you didn't already set them):
     DIRECTUS_URL       = http://localhost:8055
     SITE_URL           = http://localhost:3000   ← webhooks target local dev
     REVALIDATE_SECRET  = local-revalidate-secret  (match .env.local)

   You still provide the local admin login:
     DIRECTUS_EMAIL=admin@compassscribe.com \
     DIRECTUS_PASSWORD=<local-pw> \
       npm run cms:seed:local
   (or DIRECTUS_TOKEN=<local-token>)
   ============================================================ */
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));

// Local-first defaults — only set when the caller hasn't.
const env = { ...process.env };
env.DIRECTUS_URL ??= "http://localhost:8055";
env.SITE_URL ??= "http://localhost:3000";
env.REVALIDATE_SECRET ??= "local-revalidate-secret";

// Guard rail: refuse to run against a non-local Directus from this helper.
// (Use the individual setup-*.mjs scripts directly for prod.)
if (!/^https?:\/\/(localhost|127\.0\.0\.1)/.test(env.DIRECTUS_URL)) {
  console.error(
    `Refusing: DIRECTUS_URL is "${env.DIRECTUS_URL}", not local.\n` +
      "cms:seed:local only targets a local Directus. For prod, run the " +
      "setup-*.mjs scripts directly with the prod URL."
  );
  process.exit(1);
}

const scripts = ["setup-team-page.mjs", "setup-blog.mjs", "setup-team-members.mjs"];

function run(script) {
  return new Promise((resolve, reject) => {
    const p = spawn(process.execPath, [join(HERE, script)], { env, stdio: "inherit" });
    p.on("close", (code) => (code === 0 ? resolve() : reject(new Error(`${script} exited ${code}`))));
  });
}

console.log(`Seeding LOCAL Directus → ${env.DIRECTUS_URL} (webhooks → ${env.SITE_URL})\n`);
for (const s of scripts) {
  console.log(`\n=== ${s} ===`);
  await run(s);
}
console.log("\n✓ Local seed complete. Open http://localhost:3000/vi");

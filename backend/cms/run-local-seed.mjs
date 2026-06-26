/* ============================================================
   ONE deterministic, idempotent entry point to fully seed a LOCAL Directus so
   the Next.js frontend renders exactly like production. This is what the
   `/run-local` skill calls — it encodes the correct ORDER that a manual run is
   easy to get wrong (languages rows MUST exist before homepage, homepage/
   bootstrap/grant scripts are TOKEN-only, etc.).

   Supersedes seed-local.mjs (which used stale ports and skipped homepage +
   languages). Reuses every existing setup, seed, bootstrap and schema-sync
   script — it orchestrates, it does not re-implement.

   Usage (local only):
     DIRECTUS_URL=http://localhost:8155 \
     SITE_URL=http://localhost:3100 \
     REVALIDATE_SECRET=local-revalidate-secret \
     DIRECTUS_EMAIL=admin@compassscribe.com DIRECTUS_PASSWORD=<local-pw> \
     # optional — only to pull a FRESH schema from prod when snapshot.json is absent:
     SRC_URL=https://cms.compassscribe.com SRC_EMAIL=<admin> SRC_PASSWORD=<pw> \
       node backend/cms/run-local-seed.mjs

   Idempotent: safe to re-run. If the DB is already seeded (languages exist) it
   skips the heavy schema/seed work and just ensures grants + a defensive rebrand
   pass, then prints a summary the skill reads to decide whether to revalidate.

   Final line is machine-readable:
     RUN_LOCAL_SEED: reseed=<bool> languages=<n> homepage=<ok|skip> ...
   ============================================================ */
import { existsSync } from "node:fs";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const SNAPSHOT = join(HERE, "snapshot.json");

const DIRECTUS_URL = (process.env.DIRECTUS_URL || "http://localhost:8155").replace(/\/$/, "");
const SITE_URL = (process.env.SITE_URL || "http://localhost:3100").replace(/\/$/, "");
const REVALIDATE_SECRET = process.env.REVALIDATE_SECRET || "local-revalidate-secret";
const EMAIL = process.env.DIRECTUS_EMAIL;
const PASSWORD = process.env.DIRECTUS_PASSWORD;

// Guard rail: this helper only ever targets a LOCAL Directus. For prod, run the
// individual scripts directly (mirrors seed-local.mjs:34).
if (!/^https?:\/\/(localhost|127\.0\.0\.1)/.test(DIRECTUS_URL)) {
  fail(`Refusing: DIRECTUS_URL is "${DIRECTUS_URL}", not local. Use the setup-*.mjs scripts directly for prod.`);
}
if (!EMAIL || !PASSWORD) {
  fail("Missing DIRECTUS_EMAIL + DIRECTUS_PASSWORD (read them from backend/cms/.env).");
}

function fail(msg) {
  console.error(`\n✗ run-local-seed: ${msg}`);
  process.exit(1);
}

// Run a bundled script with extra env layered on top, inheriting stdio so the
// child's own progress shows through. Rejects on non-zero exit.
function run(script, extraEnv = {}) {
  return new Promise((resolve, reject) => {
    const p = spawn(process.execPath, [join(HERE, script)], {
      env: { ...process.env, ...extraEnv },
      stdio: "inherit",
    });
    p.on("close", (code) => (code === 0 ? resolve() : reject(new Error(`${script} exited ${code}`))));
  });
}

async function api(path, token, init = {}) {
  const res = await fetch(`${DIRECTUS_URL}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...(init.headers || {}) },
  });
  return res;
}

async function waitForHealth(timeoutMs = 60_000) {
  const start = Date.now();
  // Date.now() is fine here — this is a standalone CLI, not a workflow script.
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`${DIRECTUS_URL}/server/health`);
      if (res.ok) return;
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 2000));
  }
  fail(`Directus at ${DIRECTUS_URL} did not become healthy within ${timeoutMs / 1000}s. Is 'npm run cms:up' running?`);
}

async function login() {
  const res = await fetch(`${DIRECTUS_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  if (!res.ok) fail(`Login failed → ${res.status}: ${await res.text()}. Check creds in backend/cms/.env.`);
  return (await res.json()).data.access_token;
}

async function countLanguages(token) {
  const res = await api("/items/languages?limit=-1", token);
  if (!res.ok) return 0; // collection missing / no access → treat as empty
  const json = await res.json();
  return (json.data || []).length;
}

async function main() {
  console.log(`\n▶ run-local-seed → ${DIRECTUS_URL} (webhooks → ${SITE_URL})\n`);

  await waitForHealth();
  const token = await login();
  console.log("✓ Logged in (token reused for all token-only scripts)\n");

  const langBefore = await countLanguages(token);
  const reseed = langBefore === 0;
  console.log(reseed ? "DB looks EMPTY → full seed.\n" : `DB already has ${langBefore} languages → ensure-only pass.\n`);

  // Token reused for every child script that needs auth, so each path works
  // whether the script is token-only or accepts email/password.
  const tokenEnv = { DIRECTUS_TOKEN: token, DIRECTUS_URL, SITE_URL, REVALIDATE_SECRET };

  // schema-sync.mjs takes a positional arg ("snapshot"/"apply") — run it specially.
  async function runArg(script, arg, extraEnv = {}) {
    return new Promise((resolve, reject) => {
      const p = spawn(process.execPath, [join(HERE, script), arg], {
        env: { ...process.env, ...extraEnv },
        stdio: "inherit",
      });
      p.on("close", (code) => (code === 0 ? resolve() : reject(new Error(`${script} ${arg} exited ${code}`))));
    });
  }

  let homepage = "skip";
  let posts = "skip";

  if (reseed) {
    // 1) Schema model (collections/fields/relations).
    const haveSrc = process.env.SRC_URL && (process.env.SRC_TOKEN || (process.env.SRC_EMAIL && process.env.SRC_PASSWORD));
    if (haveSrc) {
      console.log("=== schema-sync snapshot (from prod) ===");
      await runArg("schema-sync.mjs", "snapshot", {});
      console.log("=== schema-sync apply (→ local) ===");
      await runArg("schema-sync.mjs", "apply", { DST_URL: DIRECTUS_URL, DST_TOKEN: token });
    } else if (existsSync(SNAPSHOT)) {
      console.log("=== schema-sync apply (existing snapshot.json → local) ===");
      await runArg("schema-sync.mjs", "apply", { DST_URL: DIRECTUS_URL, DST_TOKEN: token });
    } else {
      console.log("⚠ No SRC_* and no snapshot.json — bootstrapping homepage/languages model only.");
      console.log("  (posts/team collections come from the setup-*.mjs scripts below.)");
    }

    // 2) languages rows (vi-VN / en-US) — the ONLY script that inserts them.
    //    Precondition for homepage (else INVALID_FOREIGN_KEY). Idempotent.
    console.log("\n=== bootstrap-schema (languages + homepage model) ===");
    await run("bootstrap-schema.mjs", tokenEnv);

    // 3) homepage hero/footer (token-only).
    console.log("\n=== seed-homepage ===");
    await run("seed-homepage.mjs", tokenEnv);
    homepage = "ok";

    // 4) Public read on homepage/translations/languages so the overlay can fetch.
    console.log("\n=== grant-homepage-public ===");
    await run("grant-homepage-public.mjs", tokenEnv);

    // 5) posts + team page + team members (also create the revalidate webhook
    //    pointing at SITE_URL, and grant their own Public read).
    for (const s of ["setup-team-page.mjs", "setup-blog.mjs", "setup-team-members.mjs"]) {
      console.log(`\n=== ${s} ===`);
      await run(s, tokenEnv);
    }
    posts = "ok";
  } else {
    // Already seeded: just make sure grants are in place (cheap, idempotent).
    console.log("=== grant-homepage-public (ensure) ===");
    await run("grant-homepage-public.mjs", tokenEnv).catch((e) =>
      console.log(`  (grant skipped: ${e.message.split("\n")[0]})`)
    );
  }

  // 6) Defensive rebrand pass — patch any stale "Compass AgeWell" if a previous
  //    DB volume was reused. Idempotent (no-op when already clean).
  console.log("\n=== rebrand-content (defensive) ===");
  await run("rebrand-content.mjs", tokenEnv).catch((e) =>
    console.log(`  (rebrand pass skipped: ${e.message.split("\n")[0]})`)
  );

  const langAfter = await countLanguages(token);
  console.log(`\n✓ Local seed complete. Open ${SITE_URL}/vi`);
  // Machine-readable summary for the skill.
  console.log(`RUN_LOCAL_SEED: reseed=${reseed} languages=${langAfter} homepage=${homepage} posts=${posts}`);
}

main().catch((e) => fail(e.message.split("\n")[0]));

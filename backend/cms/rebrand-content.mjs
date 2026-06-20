/* ============================================================
   One-off: rebrand "Compass AgeWell" -> "Compassscribe" in Directus content.

   The homepage hero/footer and the sample blog post are edited/stored in
   Directus (the frontend overlays Directus on top of content-data.js), so the
   static code rebrand does NOT change them. This script PATCHes only the brand
   string inside the affected records, leaving all other copy untouched.

   It is idempotent (running twice is a no-op) and only writes records that
   actually change.

   Usage (LOCAL):
     DIRECTUS_URL=http://localhost:8055 \
     DIRECTUS_EMAIL=admin@compassscribe.com DIRECTUS_PASSWORD=<local-pw> \
       node backend/cms/rebrand-content.mjs

   Usage (PROD) — back up first via sync-homepage.mjs pull:
     DIRECTUS_URL=https://cms.compassscribe.com \
     DIRECTUS_EMAIL=admin@compassscribe.com DIRECTUS_PASSWORD=<prod-pw> \
       node backend/cms/rebrand-content.mjs

   Auth: DIRECTUS_TOKEN (static admin token) OR DIRECTUS_EMAIL + DIRECTUS_PASSWORD.
   Add DRY_RUN=1 to preview without writing.
   ============================================================ */
const DIRECTUS_URL = (process.env.DIRECTUS_URL || "http://localhost:8055").replace(/\/$/, "");
const DRY_RUN = process.env.DRY_RUN === "1";

// Replace longest/most-specific first so "Compass AgeWell" wins over a bare
// "AgeWell", and we never double-apply.
const REPLACEMENTS = [
  [/Compass AgeWell/g, "Compassscribe"],
  [/AgeWell/g, "Compassscribe"],
];

function rebrand(value) {
  if (typeof value === "string") {
    let out = value;
    for (const [re, to] of REPLACEMENTS) out = out.replace(re, to);
    return out;
  }
  if (Array.isArray(value)) return value.map(rebrand);
  if (value && typeof value === "object") {
    const out = {};
    for (const [k, v] of Object.entries(value)) out[k] = rebrand(v);
    return out;
  }
  return value;
}

async function getToken() {
  if (process.env.DIRECTUS_TOKEN) return process.env.DIRECTUS_TOKEN;
  const res = await fetch(`${DIRECTUS_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: process.env.DIRECTUS_EMAIL,
      password: process.env.DIRECTUS_PASSWORD,
    }),
  });
  if (!res.ok) throw new Error(`auth failed: ${res.status} ${await res.text()}`);
  return (await res.json()).data.access_token;
}

async function api(token, path, init = {}) {
  const res = await fetch(`${DIRECTUS_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });
  if (!res.ok) throw new Error(`${init.method || "GET"} ${path} -> ${res.status} ${await res.text()}`);
  return res.json();
}

// Each entry: collection + the fields that may carry the brand string.
const TARGETS = [
  { collection: "homepage_translations", fields: ["hero", "footer"] },
  { collection: "posts_translations", fields: ["title", "meta_title", "meta_description"] },
  { collection: "pages_translations", fields: ["title", "meta_title", "meta_description", "body"] },
  { collection: "team_members_translations", fields: ["name", "role", "bio"] },
];

async function main() {
  const token = await getToken();
  let changedCount = 0;

  for (const { collection, fields } of TARGETS) {
    let rows;
    try {
      rows = (await api(token, `/items/${collection}?limit=-1&fields=id,${fields.join(",")}`)).data;
    } catch (e) {
      console.log(`skip ${collection}: ${e.message.split("\n")[0]}`);
      continue;
    }
    for (const row of rows || []) {
      const patch = {};
      for (const f of fields) {
        if (row[f] == null) continue;
        const next = rebrand(row[f]);
        if (JSON.stringify(next) !== JSON.stringify(row[f])) patch[f] = next;
      }
      if (Object.keys(patch).length === 0) continue;
      changedCount++;
      console.log(`${DRY_RUN ? "[dry] " : ""}${collection} id=${row.id}: ${Object.keys(patch).join(", ")}`);
      if (!DRY_RUN) {
        await api(token, `/items/${collection}/${row.id}`, {
          method: "PATCH",
          body: JSON.stringify(patch),
        });
      }
    }
  }

  console.log(changedCount === 0 ? "Nothing to change — already clean." : `${DRY_RUN ? "Would change" : "Changed"} ${changedCount} record(s).`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

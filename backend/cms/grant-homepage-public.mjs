/* One-shot: grant Public read on homepage + homepage_translations + languages.
   bootstrap-schema.mjs creates the homepage collections but (unlike setup-*.mjs)
   does not grant Public read, so the Next.js overlay can't fetch them. This adds
   it using the same Public-policy detection the setup-*.mjs scripts use.
   Idempotent. Usage:
     DIRECTUS_URL=https://cms.compassscribe.com DIRECTUS_TOKEN=<admin> \
       node backend/cms/grant-homepage-public.mjs
*/
const URL = (process.env.DIRECTUS_URL || "http://localhost:8055").replace(/\/$/, "");
const TOKEN = process.env.DIRECTUS_TOKEN;
if (!TOKEN) { console.error("Missing DIRECTUS_TOKEN"); process.exit(1); }

async function api(path, method = "GET", body) {
  const res = await fetch(`${URL}${path}`, {
    method,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${TOKEN}` },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok && ![400, 403, 404].includes(res.status)) {
    throw new Error(`${method} ${path} → ${res.status}: ${text}`);
  }
  return { status: res.status, body: text ? JSON.parse(text) : null };
}

const policies = await api(`/policies?fields=id,name,admin_access,app_access&limit=-1`);
const list = policies.body?.data || [];
const pub =
  list.find((p) => p.name === "$t:public_label") ||
  list.find((p) => p.admin_access === false && p.app_access === false && !p.name);
if (!pub) {
  console.error("! Could not auto-detect the Public policy. Grant manually in Studio.");
  process.exit(1);
}
console.log(`Public policy: ${pub.id}`);

for (const collection of ["homepage", "homepage_translations", "languages"]) {
  const existing = await api(
    `/permissions?filter[policy][_eq]=${pub.id}&filter[collection][_eq]=${collection}` +
      `&filter[action][_eq]=read&limit=1`
  );
  if (existing.body?.data?.length) { console.log(`= Public read on ${collection} (exists)`); continue; }
  const r = await api(`/permissions`, "POST", {
    policy: pub.id, collection, action: "read", fields: ["*"], permissions: {}, validation: {},
  });
  if (r.status >= 400) console.log(`! Failed Public read on ${collection} (${r.status})`);
  else console.log(`+ Public read on ${collection}`);
}
console.log("Done.");

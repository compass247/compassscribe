/* One-shot: create the read-only `leads` collection in Directus that lead-sync
   mirrors DynamoDB into (fields match backend/lead-sync/index.mjs upsertLead).
   Admin-only (no Public read). Idempotent. Usage:
     DIRECTUS_URL=https://cms.compassscribe.com DIRECTUS_TOKEN=<admin> \
       node backend/cms/setup-leads.mjs
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

async function ensureCollection(payload) {
  const exists = await api(`/collections/${payload.collection}`);
  if (exists.status === 200) { console.log(`= ${payload.collection} (exists)`); return; }
  const r = await api(`/collections`, "POST", payload);
  if (r.status >= 400) throw new Error(`create ${payload.collection} → ${r.status}: ${JSON.stringify(r.body)}`);
  console.log(`+ ${payload.collection}`);
}

async function ensureField(collection, field) {
  const exists = await api(`/fields/${collection}/${field.field}`);
  if (exists.status === 200) { console.log(`= ${collection}.${field.field}`); return; }
  const r = await api(`/fields/${collection}`, "POST", field);
  if (r.status >= 400) console.log(`! ${collection}.${field.field} (${r.status})`);
  else console.log(`+ ${collection}.${field.field}`);
}

await ensureCollection({
  collection: "leads",
  schema: { name: "leads" },
  meta: { icon: "contact_page", note: "Read-only mirror of DynamoDB leads (BD dashboard)." },
  fields: [
    { field: "id", type: "integer", meta: { hidden: true, interface: "input" }, schema: { is_primary_key: true, has_auto_increment: true } },
  ],
});

const fields = [
  { field: "lead_id", type: "string", meta: { interface: "input", readonly: true }, schema: { is_unique: true } },
  { field: "name", type: "string", meta: { interface: "input" } },
  { field: "phone", type: "string", meta: { interface: "input" } },
  { field: "services", type: "text", meta: { interface: "input-multiline" } },
  { field: "message", type: "text", meta: { interface: "input-multiline" } },
  { field: "lang", type: "string", meta: { interface: "input" } },
  { field: "source", type: "string", meta: { interface: "input" } },
  { field: "created_at", type: "timestamp", meta: { interface: "datetime" } },
];
for (const f of fields) await ensureField("leads", f);

console.log("Done. `leads` collection ready for lead-sync.");

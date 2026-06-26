---
name: run-local
description: >-
  Bring up the full Compassscribe local dev stack (Directus CMS + DynamoDB Local
  in Docker on the dedicated 81xx ports, a fully-seeded local Directus, Next.js
  on :3100) and verify every route is healthy with zero stale "agewell"
  branding. Use whenever the user wants to run, start, reset, or fix the local
  environment for this repo.
allowed-tools: Bash, Read, Glob, Grep
---

# Run the Compassscribe local dev environment (correctly, every time)

This repo shares a machine with the legacy **AgeWell** project. They use
SEPARATE ports + Docker compose project names so they can run side by side.
Compassscribe = **frontend :3100, Directus :8155, DynamoDB :8100/:8101**.
AgeWell keeps the old :3000/:8055/:8000.

The hard part (seeding a fresh local Directus in the right order) is delegated to
`backend/cms/run-local-seed.mjs` — a deterministic, idempotent orchestrator. Your
job is the operator wrapper: preconditions → docker up → seed → frontend → verify.

Do these steps in order. Stop and report if a precondition fails.

## 1. Preconditions (read-only)

- Confirm cwd is the repo root: `package.json` `"name"` must be `cmas-web` and
  `backend/cms/docker-compose.cms.yml` must exist. If not, you're in the wrong repo.
- `docker info` must succeed. If it fails, tell the user to start Docker Desktop and stop.
- `backend/cms/.env` must exist (it holds local admin creds, gitignored). If missing,
  copy `backend/cms/.env.example` → `backend/cms/.env`, tell the user to review it, and stop.
- Sanity-check `.env.local` contains `NEXT_PUBLIC_CMS_BASE=http://localhost:8155`
  and `REVALIDATE_SECRET=local-revalidate-secret`. If it points at :8055/:3000,
  the frontend would hit the AgeWell CMS — fix it before continuing.

## 2. Start both Docker stacks

```bash
npm run cms:up   # Directus + Postgres → project compassscribe-cms, host :8155
npm run db:up    # DynamoDB Local + admin → project compassscribe-backend, :8100/:8101
```

Then assert isolation with `docker ps`: you must see `cmas-cms`, `cmas-cms-db`
(and `cmas-dynamodb-local`/`-admin`) **Up**. If you see an `agewell-cms` get
**recreated** or removed, the compose project names collided — stop and report
(this should not happen now that `name:` is set, but it's the historical bug #1).

## 3. Load local admin creds (do NOT echo the password)

Use the Read tool on `backend/cms/.env` to get `ADMIN_EMAIL` and `ADMIN_PASSWORD`.
Pass them to the seed script via env vars — never print the password to the chat.

## 4. Seed the local Directus (delegated to the orchestrator)

If `backend/cms/snapshot.json` is **absent** (or the user wants a fresh schema
pulled from prod), ask the user for the prod source creds — do NOT hardcode them:
- `SRC_URL` (default `https://cms.compassscribe.com`)
- `SRC_EMAIL`, `SRC_PASSWORD`

Then run (fill creds from step 3 / the prompt):

```bash
DIRECTUS_URL=http://localhost:8155 \
SITE_URL=http://localhost:3100 \
REVALIDATE_SECRET=local-revalidate-secret \
DIRECTUS_EMAIL="$ADMIN_EMAIL" DIRECTUS_PASSWORD="$ADMIN_PASSWORD" \
  node backend/cms/run-local-seed.mjs
# add SRC_URL=… SRC_EMAIL=… SRC_PASSWORD=… only when pulling a fresh schema
```

The script waits for Directus health, logs in once, detects empty-vs-seeded, and
(if empty) runs schema → languages → homepage → grant public → posts/team in the
correct order. It is safe to re-run. Capture its final line:

```
RUN_LOCAL_SEED: reseed=<bool> languages=<n> homepage=<ok|skip> posts=<ok|skip>
```

Remember `reseed` — you need it in step 7.

## 5. Start the frontend on :3100

Start `npm run dev` **in the background** (it stays running). Then poll
`http://localhost:3100/healthz` until it returns `200` (body `ok`).

## 6. Verify every route is clean

```bash
for p in /vi /en /vi/blog /en/blog /vi/team /en/team; do
  body=$(curl -s -w "\n%{http_code}" "http://localhost:3100$p")
  echo "$p -> HTTP $(echo "$body" | tail -1), agewell=$(echo "$body" | grep -ic agewell)"
done
curl -s -o /dev/null -w "healthz %{http_code}\n" http://localhost:3100/healthz
```

PASS = all six routes HTTP 200 with `agewell=0`, healthz 200, blog shows the
sample post, team shows ≥1 member.

## 7. Bust stale cache if needed

If `reseed=true` (from step 4) OR any route still shows old cached content, the
Next.js fetch cache (`revalidate=3600`) is stale. Trigger on-demand revalidation
(homepage is force-dynamic and needs none):

```bash
for c in posts pages team_members; do
  curl -s -X POST "http://localhost:3100/api/revalidate?collection=$c&secret=local-revalidate-secret"
  echo
done
```

Re-run step 6. If a route is STILL dirty, fall back to: restart `npm run dev`, or
`rm -rf .next/cache` then restart. If `/api/revalidate` returns 401, the local
secret in `.env.local` doesn't match — reconcile them.

## 8. Report

Tell the user the stack is up and give the URLs:
- App: http://localhost:3100/vi and /en (+ /blog, /team)
- Directus Studio: http://localhost:8155 (login = creds in backend/cms/.env)
- State PASS/FAIL and anything you had to fix.

## Notes
- Runs ALONGSIDE AgeWell — never touches its containers or its :3000/:8055/:8000 ports.
- Never touches production. `SRC_*` (prod creds) are only used at runtime to pull a
  schema snapshot; never write them to a file or echo them.
- To reset the local CMS from scratch: `docker compose -f backend/cms/docker-compose.cms.yml down -v`
  (wipes the DB volume), then re-run this skill — it will full-seed again.

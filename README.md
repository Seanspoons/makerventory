# Makerventory

Makerventory is a production-oriented 3D printing inventory and operations manager for serious hobbyists, maker labs, and small print shops. It tracks printers, hardware assignments, filament, consumables, maintenance, imports, and purchase planning in one operational workspace.

## Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- Prisma
- PostgreSQL
- NextAuth credentials auth
- Resend for auth email delivery

## Product Overview

Makerventory is designed as an internal-tool style product rather than a generic dashboard template. The app now includes:

- workspace-owned inventory and operations data
- assignment-driven printer, plate, hotend, smart plug, and material-system behavior
- staged CSV and Notes imports with review and recovery paths
- onboarding, calmer inventory UX, and operational dashboarding
- regression tests for core inventory and import rules

## Local Development

1. Install dependencies:

```bash
npm install
```

2. Copy the example environment file:

```bash
cp .env.example .env
```

3. Fill in at least:

- `DATABASE_URL`
- `NEXTAUTH_URL`
- `AUTH_SECRET`

4. Apply local migrations:

```bash
npm run db:migrate
```

5. Start the dev server:

```bash
npm run dev
```

6. Open `http://localhost:3000`, create an account, and onboard your own inventory.

### Local Password Reset Behavior

For local-only testing, you can enable direct reset-link flashes instead of real email delivery:

```env
ALLOW_INSECURE_DEV_RESET_LINKS="true"
```

Keep that disabled in any shared, preview, or production environment.

## Docker Development

Start the local Docker stack:

```bash
docker compose up --build
```

Open `http://localhost:3001`.

What Docker does on startup:

- starts PostgreSQL in a dedicated container
- generates Prisma Client
- applies committed migrations
- resets an older pre-migration local dev schema only when `PRISMA_DEV_RESET_ON_P3005=true`
- runs Next.js in dev mode with live reload

Useful commands:

```bash
docker compose up --build
docker compose down
docker compose down -v
```

Use `docker compose down -v` only when you intentionally want to discard the local Docker database volume.

## Production Docker Image

Makerventory now includes a dedicated production image path in [Dockerfile.production](/Users/seanwotherspoon/GitHub/makerventory/Dockerfile.production).

Build the image:

```bash
docker build -f Dockerfile.production -t makerventory:prod .
```

Run the image:

```bash
docker run --rm -p 3000:3000 \
  -e DATABASE_URL="postgresql://..." \
  -e NEXTAUTH_URL="https://your-app.example.com" \
  -e AUTH_SECRET="replace-with-a-long-random-secret" \
  -e RESEND_API_KEY="re_..." \
  -e EMAIL_FROM="Makerventory <noreply@yourdomain.com>" \
  makerventory:prod
```

Optional migration-on-start:

```bash
docker run --rm -p 3000:3000 \
  -e DATABASE_URL="postgresql://..." \
  -e NEXTAUTH_URL="https://your-app.example.com" \
  -e AUTH_SECRET="replace-with-a-long-random-secret" \
  -e RUN_DB_MIGRATIONS="true" \
  makerventory:prod
```

Notes:

- `RUN_DB_MIGRATIONS=true` is useful for small self-managed deployments, but many hosted setups should run `npm run db:deploy` as a separate release step instead.
- the production image uses `next start`, not the dev server.
- the existing `Dockerfile` and `docker-compose.yml` remain dev-oriented on purpose.

## PWA Support

Makerventory now includes a basic installable PWA path:

- web app manifest via [manifest.ts](/Users/seanwotherspoon/GitHub/makerventory/app/manifest.ts)
- service worker registration via [pwa-registrar.tsx](/Users/seanwotherspoon/GitHub/makerventory/components/pwa/pwa-registrar.tsx)
- a minimal service worker in [sw.js](/Users/seanwotherspoon/GitHub/makerventory/public/sw.js)

The service worker only caches safe static assets such as icons, scripts, styles, and the manifest. It does not cache authenticated HTML pages or protected data responses.

Current PWA icon assets:

- `public/pwa-192.png`
- `public/pwa-512.png`
- `public/pwa-maskable-512.png`

Best-practice icon set to provide later if you want the most polished install experience:

- `192x192` PNG app icon
- `512x512` PNG app icon
- `512x512` maskable PNG icon with extra padding for Android launchers
- `180x180` Apple touch icon

The current setup uses existing Makerventory mark assets as the source for those icons.

## Required Services For Hosted Deployment

Recommended hosted stack:

- Vercel
- Neon Postgres
- Resend

Alternative stack:

- Railway for app + Postgres
- Resend for auth email delivery

You do not need any additional services to reach the first hosted milestone.

## Environment Variables

Makerventory expects the following server-side environment variables:

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | Yes | PostgreSQL connection string used by Prisma |
| `NEXTAUTH_URL` | Yes in hosted setups | Canonical public app URL used for auth callbacks and password reset links |
| `AUTH_SECRET` | Yes | Shared auth/session secret used by NextAuth and middleware |
| `RESEND_API_KEY` | Yes for hosted password reset | API key for Resend transactional email |
| `EMAIL_FROM` | Yes when using Resend | Verified sender identity for Makerventory auth email |
| `EMAIL_REPLY_TO` | Optional | Reply-to address for auth email |
| `ALLOW_INSECURE_DEV_RESET_LINKS` | Local dev only | Allows direct reset-link flash messages instead of email delivery |

Notes:

- `AUTH_SECRET` is the canonical secret name going forward.
- `NEXTAUTH_SECRET` is still supported as a fallback for compatibility, but new setups should use `AUTH_SECRET`.
- Hosted environments should always set `NEXTAUTH_URL` explicitly even if the platform provides a deployment URL.

## Transactional Email Setup

Makerventory now sends password reset email through a small provider abstraction backed by Resend.

### Resend Setup

1. Create a Resend account.
2. Verify a sending domain or single sender identity.
3. Set:

```env
RESEND_API_KEY="re_..."
EMAIL_FROM="Makerventory <noreply@yourdomain.com>"
EMAIL_REPLY_TO="support@yourdomain.com"
```

Behavior by environment:

- local dev without `RESEND_API_KEY`: password reset can use the insecure direct-link fallback only if `ALLOW_INSECURE_DEV_RESET_LINKS=true`
- hosted preview/production without `RESEND_API_KEY`: password reset fails with a clear operator-facing configuration message instead of silently pretending email was delivered

## Prisma And Database Workflow

### Development

Create migrations locally:

```bash
npm run db:migrate
```

### Hosted Deployments

Apply committed migrations:

```bash
npm run db:deploy
```

Hosted environments should use `db:deploy`, not `db:migrate`.

## CI

GitHub Actions is configured to run:

- `npm test`
- `npm run build`

Workflow file:

- [ci.yml](/Users/seanwotherspoon/GitHub/makerventory/.github/workflows/ci.yml)

CI uses placeholder build-time env values for auth and database configuration because the current regression suite does not require a live database.

## Deployment Paths

### Option A: Vercel + Neon + Resend

Recommended for the first hosted deployment.

1. Create a Neon Postgres database.
2. Create a Resend sender identity.
3. Create a Vercel project from this repo.
4. Configure these Vercel environment variables:

```env
DATABASE_URL="..."
NEXTAUTH_URL="https://your-app.vercel.app"
AUTH_SECRET="..."
RESEND_API_KEY="..."
EMAIL_FROM="Makerventory <noreply@yourdomain.com>"
EMAIL_REPLY_TO="support@yourdomain.com"
```

5. Run Prisma migrations against the hosted database:

```bash
npm run db:deploy
```

6. Trigger a fresh deployment.

Vercel notes:

- set `NEXTAUTH_URL` explicitly for production and preview if you want predictable password reset links
- use the Neon pooled connection string if recommended by your Neon project settings
- keep `AUTH_SECRET` stable across deployments

### Option B: Railway

Railway is viable if you want app hosting and database hosting in one place.

1. Create a Railway project.
2. Add a PostgreSQL service.
3. Add the Makerventory app service from this repo.
4. Configure:

```env
DATABASE_URL="..."
NEXTAUTH_URL="https://your-railway-domain"
AUTH_SECRET="..."
RESEND_API_KEY="..."
EMAIL_FROM="Makerventory <noreply@yourdomain.com>"
EMAIL_REPLY_TO="support@yourdomain.com"
```

5. Ensure your start/deploy workflow applies:

```bash
npm run db:deploy
```

Railway notes:

- confirm the public domain before enabling password reset
- ensure migrations run before or during the deploy step
- Railway Postgres backups depend on the plan and project setup, so confirm retention in the Railway dashboard

## Preview Deployment Flow

For a preview environment:

1. Provision a preview-safe database.
2. Set preview env vars, including a preview `NEXTAUTH_URL`.
3. Apply migrations.
4. Validate:

```bash
npm test
npm run build
curl https://your-preview-host/api/health
```

5. Confirm:

- sign-up works
- sign-in works
- password reset sends email
- imports can stage and review safely

## Production Deployment Flow

1. Merge only after CI passes.
2. Ensure production env vars are set.
3. Apply committed migrations with `npm run db:deploy`.
4. Deploy the app.
5. Run a post-deploy check:

- `GET /api/health`
- sign in with a real account
- request a password reset email
- confirm imports and dashboard render normally

## Recovery, Rollback, And Backups

### App Rollback

Application rollback is host-managed:

- Vercel: redeploy the last known-good deployment
- Railway: redeploy the previous release if available

### Database Rollback

Do not treat Prisma migrations as instant rollback.

The safe recovery path is:

1. restore from a known-good database backup
2. re-run `npm run db:deploy` only if the restored database is behind the expected migration level

### Backup Guidance

Neon:

- enable built-in backups/branching and confirm retention settings
- use protected branches or production branches for schema changes

Railway:

- confirm automatic backup availability and retention on your plan
- export logical backups regularly for independent recovery

### Restore Validation

At minimum, validate restore readiness by restoring into a temporary database and checking core tables:

- `Workspace`
- `User`
- `Printer`
- `ImportJob`
- `AuditEvent`

Do not assume backups are valid until you have performed a restore test.

## Operational Readiness

Makerventory already includes:

- structured JSON logging
- request correlation via `x-request-id`
- `/api/health` database-backed health checks

Recommended operator setup:

- use host log streaming or retention features
- connect runtime logs to a log sink such as Better Stack, Logtail, or the host’s built-in logging
- add an error monitoring service such as Sentry before public rollout if you want stack traces and release correlation

Current health endpoint:

```bash
curl https://your-host/api/health
```

## Data Strategy

- no demo inventory is injected in normal local or hosted flows
- each user creates their own account and workspace
- real inventory should enter through onboarding, manual entry, or staged imports

## Seed Strategy

The legacy demo-heavy seed path is no longer part of the expected operator workflow.

Use `npm run db:seed` only if you intentionally create a separate demo or QA environment around it.

## Test And Verification Commands

```bash
npm test
npm run build
npm run db:deploy
```

## Remaining Limits Before Public Rollout

- no browser-level end-to-end deployment smoke tests yet
- no database-backed integration suite for server actions yet
- no full external error-monitoring integration yet
- no multi-user workspace management yet

## Future Roadmap

- Add QR code labels for bins, spools, and printer components
- Track spool consumption and remaining grams from print history
- Log print history and outcomes per machine
- Integrate printer telemetry and job state polling
- Automate smart plug control and shutdown policies
- Surface recurring maintenance reminders
- Add filament drying schedules and desiccant refresh alerts
- Build analytics around material usage, waste, and cost

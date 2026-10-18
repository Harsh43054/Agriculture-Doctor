# Agriculture Doctor

A full-stack farming workspace built with **Next.js, TypeScript, Supabase, Gemini, and Open-Meteo**. It replaces the original static prototype's canned predictions and telemetry with authenticated records and external services.

## Features

- Email/password accounts, email confirmation, sign-out, and password recovery through Supabase Auth.
- Plant photographs assessed by Gemini, directly or through Vercel AI Gateway. Results explicitly describe uncertainty rather than inventing confidence percentages.
- Private image storage with short-lived signed URLs; images are decoded, resized, converted to JPEG, and stripped of metadata before processing.
- Field-labelled scan history and JSON export of the latest 100 assessments and soil readings.
- Soil journal with validated manual readings. Authenticated sensor software can use the same soil endpoint.
- City search, current weather, five-day forecasts, and weather-based field reminders from Open-Meteo.
- Row Level Security for user records and image paths. No Supabase service-role key is needed by the app.
- Atomic database quota of 10 AI analysis attempts per account per UTC day. Provider errors and non-plant photos consume an attempt.
- Responsive dashboard, loading states, clear errors, and no fabricated data when a service is unavailable.

## Run locally

Requires Node.js 22 or later and npm.

```sh
npm ci
cp .env.example .env.local
npm run dev
```

On PowerShell use `Copy-Item .env.example .env.local`. Fill in the Supabase project URL and its **publishable** key. Set `GEMINI_API_KEY` for local image analysis, or use `AI_GATEWAY_API_KEY`. Never put secret keys in variables prefixed `NEXT_PUBLIC_`.

The dashboard is at http://localhost:3000. Weather does not require an API key for Open-Meteo's free non-commercial tier. For commercial use, review the provider's licensing and switch to an appropriate plan.

## Supabase setup

1. Create a project and apply `supabase/migrations/202610180001_initial.sql` in its SQL editor. Alternatively, use `supabase link --project-ref YOUR_PROJECT_REF` and `supabase db push` after signing in with the official CLI.
2. Copy the project URL and publishable key into the environment variables below.
3. In Authentication → URL Configuration, set Site URL to the production application origin. Add that origin and `http://localhost:3000` to allowed redirect URLs. Avoid wildcard production redirects.
4. Email confirmation is expected. Configure a production SMTP provider before inviting real users; Supabase's built-in mailer is intended for limited testing.

The migration creates `scans`, `soil_readings`, `scan_usage`, a private `plant-images` bucket, owner-scoped policies, and `consume_scan_quota()`. It runs transactionally and is intended to be applied once. The quota table cannot be edited by clients; the SQL function uses a fixed empty search path and the authenticated caller's ID.

## Environment

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase HTTPS project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Browser-safe publishable key; RLS enforces access |
| `GEMINI_API_KEY` | Optional server-only direct Google API key |
| `GEMINI_MODEL` | Direct Google model; defaults to `gemini-2.5-flash` |
| `AI_GATEWAY_API_KEY` | Optional server-only Vercel AI Gateway key |
| `AI_GATEWAY_MODEL` | Gateway model; defaults to `google/gemini-2.5-flash` |
| `VERCEL_OIDC_TOKEN` | Automatically supplied by Vercel; do not manually commit or copy it |

A direct Gemini key takes precedence. Otherwise, the app uses Vercel AI Gateway with an explicit gateway key or the deployment's OIDC identity. Availability depends on the team's gateway access, model availability, and remaining credits. No paid credits are purchased by the application.

## Deploy on Vercel

Import the repository, choose the branch containing this application, and use the detected Next.js preset with the repository root directory. Add the two `NEXT_PUBLIC_SUPABASE_*` variables before building; Next.js embeds them at build time. For AI, use Vercel's OIDC integration or configure one of the optional server API keys. Deploy, then update Supabase's authentication URLs to the final production domain.

`vercel.json` uses the Next.js framework. The scan function has a 60-second maximum duration; image analysis has a 45-second upstream timeout. Uploads are capped at 3 MB to fit serverless request limits.

## API

Private endpoints require `Authorization: Bearer SUPABASE_ACCESS_TOKEN`. The backend verifies it with Supabase `getUser()` and passes the same user token to data and storage operations, preserving RLS. It never trusts an incoming `user_id`.

- `GET /api/health` reports configuration flags; it does not prove upstream availability.
- `GET /api/weather?city=Delhi` returns up to five location matches.
- `GET /api/weather?lat=28.61&lon=77.21` returns weather and five-day forecasts.
- `GET /api/scans` returns the latest 100 private scans with image links that expire after 15 minutes.
- `POST /api/scans` accepts multipart `image`, `field`, and optional `crop_hint`.
- `GET /api/soil` returns the latest 100 private readings.
- `POST /api/soil` accepts JSON `field`, `moisture` (0–100), `ph` (0–14), `temperature` (−30–80 °C), and optional `notes`.

For devices, obtain a normal authenticated session for the field account and refresh it using Supabase Auth. Never install a service-role key on a sensor. A device-specific provisioning and revocation service is outside this version.

## Verification

```sh
npm test
npm run build
npm run typecheck
npm audit
```

CI runs tests, a production build, and type checking on pushes and pull requests. Unit/API tests cover validation, file signatures, authentication boundaries, location encoding, error responses, and weather advice. Real Supabase row-isolation and quota checks can be run with `supabase/tests/rls.sql`; all of its test data is rolled back.

The Rollup package is mapped to its official WebAssembly implementation for compatibility with Windows Application Control. This does not disable OS protections.

## Limits

Photo assessment is general AI guidance, not a validated plant pathology classifier or laboratory diagnosis. Consult a local agronomist before treatment, especially for uncertain or severe symptoms. Photos are sent to Google directly or via Vercel AI Gateway, depending on server configuration. Weather readings are modelled forecasts; soil readings must be supplied by a person or an authenticated device.

History/export currently covers the latest 100 records. This version does not include account deletion, record editing/deletion, calibrated model accuracy, offline synchronization, or autonomous sensor onboarding. Before a broad public launch, add an account-data lifecycle process, production email delivery, abuse monitoring, and workload-appropriate service limits.

The original HTML/CSS/JavaScript prototype is retained under `legacy/` for reference and is not served by Next.js.

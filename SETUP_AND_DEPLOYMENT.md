# EduGenie Setup and Deployment Guide

## Included in this package

This archive contains the complete EduGenie web application source, Supabase migrations, Edge Functions, role-aware route protection, international school onboarding workflow, dependency lockfile, and deployment configuration.

The package intentionally excludes secrets, `node_modules`, build output, Git metadata, and temporary CLI caches.

## Requirements

Install Node.js 20 or newer and npm. The project uses Vite, React, TypeScript, Supabase, and the Supabase CLI.

## Local setup

Copy `.env.example` to `.env` and provide the Supabase publishable or anon key:

```bash
cp .env.example .env
npm ci
npm run dev
```

The frontend uses:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_PUBLISHABLE_KEY
```

The supplied template already points to the EduGenie Supabase project URL. Replace the placeholder key with the project’s publishable or anon key.

## Supabase database

The repository contains the complete ordered migration history in `supabase/migrations/`. The international onboarding migration is:

```text
20260905163200_international_school_onboarding.sql
```

It has already been applied to the configured EduGenie Supabase project. It adds organizations, ownership, onboarding state, academic years, terms, grading scales, learner stages, curricula, invites, domain verification, bulk import tracking, RLS policies, and the transactional `create_school_onboarding` RPC.

For a new Supabase project, link the project and apply the migrations with:

```bash
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push
```

## Edge Functions

The deployed functions are located under `supabase/functions/` and include:

- `ai-study-buddy`
- `coding-lesson`
- `elevenlabs-scribe-token`
- `evaluate-quiz`
- `generate-competition`
- `generate-lesson`
- `generate-quiz`
- `interswitch-payment`
- `student-progress`
- `text-to-speech`
- `translate`
- `voice-teach`

Deploy them with:

```bash
npx supabase functions deploy --project-ref YOUR_PROJECT_REF --use-api
```

All callable functions require authenticated JWT access. The shared security utilities are in `supabase/functions/_shared/http.ts`.

## Edge Function secrets

Configure provider secrets in Supabase:

```text
LOVABLE_API_KEY
OPENAI_API_KEY
ELEVENLABS_API_KEY
INTERSWITCH_MERCHANT_CODE
INTERSWITCH_PAY_ITEM_ID
INTERSWITCH_MAC_KEY
INTERSWITCH_MODE
```

Supabase automatically provides its own runtime values, including the project URL, anon key, and service-role key, to deployed Edge Functions.

## School onboarding

Open:

```text
/school/onboarding
```

The guided workflow supports:

1. Organization creation and school-owner assignment.
2. Legal school profile, country, regulatory authority, timezone, locale, and currency.
3. Academic year and term setup.
4. Curriculum framework and version foundation.
5. Learner stages and grading scale configuration.
6. Staff, learner, parent, and administrator invite links.
7. CSV import validation and import-row audit tracking.
8. Domain TXT verification through `_edugenie.<domain>`.
9. Completion state tracking and school workspace activation.

## Production checks

Before production launch:

```bash
npm run lint
npx tsc -b --pretty false
npm run build
```

Configure Supabase Auth redirect URLs for every deployed frontend origin. Configure custom SMTP before relying on email verification or invitation delivery. Configure storage policies and production payment credentials before enabling payments.

## Security notes

Never commit `.env`, provider API keys, Supabase service-role keys, payment MAC keys, or Personal Access Tokens. Revoke temporary deployment tokens after use. Keep the service-role key server-side only. The frontend must use the publishable or anon key.

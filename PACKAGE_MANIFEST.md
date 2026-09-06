# EduGenie Full Application Package

This archive contains the complete EduGenie application workspace as packaged on 2026-09-06.

## Included

The bundle includes the React/Vite frontend source, Supabase migrations and Edge Functions, public assets, generated `dist` preview output, `node_modules`, package manifests and lockfiles, TypeScript/Tailwind/Vite configuration, deployment scripts, GitHub workflows, tests, implementation documentation, hidden project configuration, and all application files present in the workspace.

No application source, migration, Edge Function, configuration file, test, public asset, build artifact, or dependency directory was intentionally omitted from this archive. The `.env.example` file is included; private credentials are not embedded.

## Run locally

```bash
npm install
npm run dev
```

Open the Vite URL shown in the terminal, normally `http://localhost:8080/`.

## Validate locally

```bash
npm test
npx tsc --noEmit
npm run lint
npm run build
npm run validate:production-readiness
```

## Configure production

Copy `.env.example` to `.env` and provide the public Supabase values for the frontend. Configure server-side secrets in the Supabase project or the protected GitHub production environment. Use `scripts/deploy-supabase.sh` or the manual `Deploy Supabase` GitHub workflow to apply migrations and deploy Edge Functions.

The archive contains dependencies and build output for completeness, although production CI should install dependencies from the lockfile and generate a clean build rather than relying on `node_modules` or `dist` from this archive.

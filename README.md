# ENA Submissions Register

A TypeScript/React (Next.js) app for tracking a building project's regulatory submissions
checklist across government agencies (URA, BCA, SCDF, PUB, and others), replacing an
earlier single-file HTML prototype (archived under `legacy-prototype/`).

## Stack

- Next.js (App Router) + TypeScript
- Supabase (Postgres, Auth, Storage)
- TanStack Query for data fetching/mutations

## Local development

1. Copy `.env.local.example` to `.env.local` and fill in your Supabase project's URL and
   anon key (Project Settings -> API Keys in the Supabase dashboard).
2. `npm install`
3. `npm run dev` and open http://localhost:3000

## Database schema

SQL migrations live in `supabase/migrations/`, applied via the Supabase SQL Editor or the
Supabase CLI (`npm run gen-types` regenerates `src/lib/supabase/database.types.ts` once a
project is linked).

## Checklist template

The full set of agencies, submissions, and checklist items lives in `src/template/` as
plain TypeScript (not the database) — see `src/template/agencies.ts`. Edit it and deploy
to change the template; every project automatically uses the current version.

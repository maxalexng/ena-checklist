# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## What this is

ENA Submissions Register: a Next.js 16 (App Router) + Supabase + TanStack Query app for tracking a Singapore building project's regulatory submissions checklist across agencies (URA, BCA, SCDF, PUB, NParks, …). It replaces a single-file HTML prototype archived in `legacy-prototype/`. Many modules say they mirror the prototype's behavior, so check that file when you need the original intent. Use Singapore (BCA/URA) conventions, not UK frameworks such as RIBA.

## Commands

```bash
npm run dev                                  # http://localhost:3000 (also .claude/launch.json "ena-checklist-dev")
npm run build
npm run lint                                 # eslint (flat config, eslint.config.mjs)
npm test                                     # Vitest, all src/**/*.test.ts
npx vitest run src/lib/fees/feeCalculator.test.ts   # single unit test file (add -t "name" for one test)
npm run test:e2e                             # Playwright; starts/reuses the dev server on :3000
npx playwright test e2e/fees.spec.ts         # single e2e spec (the "setup" auth project still runs first)
npm run gen-types                            # regenerate src/lib/supabase/database.types.ts from the linked Supabase project
```

Every feature ships with Vitest and/or Playwright coverage, and both suites must pass before work is reported as done.

### E2E specifics
- The tests run against the real Supabase project named in `.env.local`. They need `PLAYWRIGHT_TEST_EMAIL`/`PLAYWRIGHT_TEST_PASSWORD` (a dedicated test user) and `SUPABASE_SERVICE_ROLE_KEY`, which is used for seeding and cleanup.
- `e2e/auth.setup.ts` signs in **once** and saves `playwright/.auth/user.json`. Other specs reuse that session. Do not call `login()` per test, because it trips Supabase's auth rate limit.
- Specs create throwaway projects with `createTestProject()` and `uniqueE2eReference()` from `e2e/helpers.ts`, then delete them by reference. `createTestProject` reuses the app's own `createProject()` so the seeding can't drift from the app's. Tests run serially (`fullyParallel: false`).

## Architecture

**The template lives in code, not the database.** `src/template/` (agencies, stages, `STEP_ORDER`, default roles/presets, fee rates, overview sections) defines the checklist for every project. Changing the template means a code change and a deploy. `keys.ts` builds the flattened `STEPS` and derives stable ids: step key `${agencyId}__${sanitizedCode}`, item key `${stepKey}__${index}`. Item keys are stored in the DB, so **reordering or removing items in `agencies.ts` changes the identity of existing project data**. When you change template content, bump `TEMPLATE_VERSION` in `src/template/changelog.ts` and prepend a changelog entry (R<n> for large changes, R<n><letter> for small ones, and never edit old entries).

**Project data is DB rows reconciled against the template.** `createProject()` (`src/lib/projects/createProject.ts`) seeds a new project with one `checklist_items` row per template item, plus default roles and presets. When a project loads, `useProjectData` backfills any template items added since the project was created (`lib/checklist/reconcileItems.ts`). Saved step and item orders go through `reconcileOrder`, which drops stale ids and appends new ones (`lib/checklist/grouping.ts`, `itemOrder.ts`).

**Schema** (`supabase/migrations/`, applied manually via the SQL Editor or the CLI): anything ordered or queryable is normalized into its own table (checklist_items, item_responsible, milestones, project_roles, consultants, timeline_plan, *_files). Small per-project settings are JSONB columns on `projects` (dates, list presets, stage durations, fee calculator inputs). Those columns are patched through `merge_*` Postgres functions (RPC) so concurrent edits don't clobber each other. RLS is flat: any authenticated user can access everything. After adding a migration, rerun `npm run gen-types`.

**Data flow on the client.** `app/projects/[projectId]/page.tsx` is a thin server check. `ProjectShell` is a client component with tabs (Overview, Checklist, Timeline, Fees) plus the Roles panel. A single `useProjectData` query loads the whole project into one `ProjectChecklistData` shape, with items keyed by item key. Every mutation hook in `src/hooks/use*Mutations.ts` follows the pattern in `useChecklistMutations.ts`: write through the browser Supabase client, then invalidate and refetch the whole project. Controls users click rapidly also get an `optimisticUpdate` that patches the cache synchronously and rolls back on error. `e2e/fast-clicking.spec.ts` guards this behavior.

**Lock.** `projects.assignments_locked` gates editing (`LockFab`), and `useAutoRelock` relocks after 30s idle.

**Pure logic** lives in `src/lib/` (checklist dates, grouping, lettering, timeline, fee calculator) and is unit tested. Keep new calculation logic there rather than in components.

**Auth/session.** Next 16 renamed middleware to `src/proxy.ts`, which calls `lib/supabase/middleware.ts#updateSession`. Supabase clients: `lib/supabase/client.ts` (browser) and `server.ts` (server components/actions).

**Scripts** (`scripts/`, run with `tsx`, local only): `migrate-html-import.ts` imports a legacy prototype HTML file into a project and needs the service-role key. `check-schema.ts` is a one-off check that the schema is reachable with the anon key.

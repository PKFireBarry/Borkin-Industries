---
trigger: always_on
---

# Windsurf Rules for boorkin

These rules are mandatory for any AI assistant or automation operating on this repository. The objective is to eliminate blind edits by requiring context gathering, file reading, and verification before and after every change.

## Golden Rule
No blind edits. Always read the impacted files and surrounding context before making any change. If uncertainty remains after discovery, stop and ask for clarification.

## Pre-Edit Checklist (must complete)
- [ ] Understand the user request. Restate the goal and scope in 1–3 sentences.
- [ ] Identify all likely impacted areas.
  - Pages/routes in `app/`
  - Shared UI/components (commonly `components/`)
  - Data access in `lib/firebase/` (e.g., `bookings.ts`, `contractors.ts`)
  - Types/interfaces in `types/` (if present)
  - Configs: `package.json`, `tsconfig.json`, `next.config.ts`
- [ ] Search for relevant symbols and usage sites before editing.
  - Use broad then narrow queries (e.g., feature name, component name, function name).
  - Inspect call sites and providers (imports/exports) to understand data flow.
- [ ] Open and read full files for the edit target(s) and their dependencies.
  - View entire files, not partial snippets, for primary targets.
  - Also read adjacent utilities, hooks, and types that the code interacts with.
- [ ] Draft a minimal-change plan. Prefer surgical edits over refactors.
- [ ] Confirm the target file actually exists. If it doesn’t, propose the file layout first.

## Required Discovery Steps (how to read the codebase)
- [ ] Locate files by name and directory.
- [ ] Grep for functions/symbols being modified or referenced.
- [ ] Follow imports/exports to understand dependencies.
- [ ] For UI issues, read the rendering component and its parents up to the route boundary in `app/`.
- [ ] For data issues, read corresponding modules in `lib/firebase/` and any relevant types.
- [ ] For Next.js behavior, confirm whether a file is a Server or Client Component and the implications (e.g., hooks, async, data fetching).

## Edit Rules
- [ ] Make the smallest viable change that solves the problem.
- [ ] Preserve coding style and conventions (TypeScript, Tailwind, Radix UI, Sonner toasts).
- [ ] Do not introduce new dependencies without explicit user approval.
- [ ] Avoid noisy logging; prefer targeted logging during debugging and remove it unless requested.
- [ ] Security: never commit secrets. Use environment variables.
- [ ] If an edit spans multiple areas, sequence the changes and explain the order of operations.

## Post-Edit Verification (must run)
- [ ] Typecheck: `npx tsc --noEmit` (or `tsc --noEmit` if globally available)
- [ ] Lint: `npm run lint`
- [ ] Build: `npm run build`
- [ ] If the change affects runtime behavior, verify in dev: `npm run dev` and exercise the path.
- [ ] Summarize what changed and why it’s safe. Note any tradeoffs.

## When to Ask for Clarification
- [ ] Requirements conflict with existing behavior or product copy.
- [ ] Multiple plausible implementations with different UX/data implications.
- [ ] The change would require new infra, new dependencies, or significant refactors.
- [ ] Ambiguity in domain terms (e.g., booking vs gig vs availability).

## Repo-Specific Conventions
- **Framework**: Next.js (App Router), TypeScript, TailwindCSS.
- **Packages**: Radix UI, Sonner, Stripe, Clerk, Firebase.
- **Data access**: `lib/firebase/` contains Firestore/Stripe/etc. utilities (e.g., `bookings.ts`, `contractors.ts`). Prefer reusing these functions.
- **Availability/Bookings**: Check existing patterns (e.g., look at how bookings are fetched/overlaid in the contractor profile modal; reuse helpers like `getGigsForContractor()` before adding new queries).
- **App Directory**: All routes/pages live under `app/`. Confirm client/server component boundaries before adding hooks or async operations.

## PR/Change Documentation (minimum info to provide)
Include the following in commit description or PR body:
- Files read before editing (list).
- Searches performed (queries used).
- Summary of the change and rationale.
- Verification steps and results (typecheck, lint, build, manual checks).
- Any follow-ups or TODOs.

## Prohibited Without Approval
- Adding or upgrading dependencies.
- Changing build tooling or Next.js config.
- Large-scale refactors or renames.
- Introducing new environment variables.

## Example Minimal Workflow
1) Restate the request and scope.
2) Search for related symbols and open full files (targets + dependencies).
3) Propose a minimal change plan; call out risks.
4) Implement the change.
5) Run typecheck, lint, build; verify in dev if applicable.
6) Summarize and commit with the PR/Change Documentation items above.



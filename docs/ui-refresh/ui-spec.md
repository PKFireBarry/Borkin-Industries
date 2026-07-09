# UI Refresh Spec (Client + Contractor)

## Objective
- Preserve Borkin's cute, warm pet-care personality while making dashboard workflows faster, clearer, and more consistent for clients and contractors.
- Replace repeated one-off styling with reusable primitives so new pages can be built by composition instead of custom button/card/header code each time.

## Scope
- In scope: homepage UX (`app/page.tsx` + landing sections) and authenticated dashboard UX under `app/dashboard/**`.
- Priority order: homepage first, then client dashboard, then contractor dashboard.

## User Outcomes
- Client users can scan key status information quickly and complete core actions without hunting for CTAs.
- Contractor users can process gigs, availability, profile, and payments with lower cognitive load.
- Team can ship UI updates faster by reusing component variants.

## Phase 0 (Foundation)

### P0-1 Reusable actions
- Standardize all primary, secondary, and compact actions through `components/ui/button.tsx`.
- Required capabilities:
  - semantic variants (`default`, `outline`, `secondary`, `ghost`, `destructive`, `petCta`)
  - standardized sizes (`sm`, `default`, `lg`, `icon`, `pill`, `pillSm`)
  - optional loading state and icon slots

### P0-2 Shared page shell
- Standardize dashboard page wrappers through `app/dashboard/components/dashboard-shell.tsx`.
- Required capabilities:
  - `DashboardPageShell` for base background + page scaffolding
  - `DashboardPageHeader` for consistent sticky header/title/description/actions/meta
  - `DashboardPageContent` for width and spacing

### P0-3 First-page migration (pattern proving)
- Migrate homepage CTA surfaces (`components/Header.tsx` and `components/HeroSection.tsx`) to reusable button primitives.
- Keep behavior unchanged; reduce repeated class strings.

### P0-4 Dashboard proving page
- Migrate `app/dashboard/page.tsx` to new reusable primitives.
- Keep behavior unchanged; reduce repeated class strings.

### P0-5 Homepage section iteration protocol
- Work one homepage section at a time (hero, nav, what-we-stand-for, etc.) with owner validation between sections.
- For every section pass, run browser validation screenshots at:
  - iPhone 14 viewport
  - 1920x1080 desktop viewport
- Keep content intact unless explicitly requested; prioritize bold visual refactor of existing elements.
- Maintain screenshot hygiene by deleting superseded pass images for sections already approved; keep only latest approved snapshots per section.
- Services section exception: adding supportive explanatory content is allowed when needed to improve customer comprehension of service categories and care scope.

### P0-6 Contact section refinement requirements
- Match homepage container consistency (`max-w-7xl` section frame with `max-w-6xl` primary card shell pattern).
- Remove the top mini badge/pill above the `Contact Us` heading.
- Keep existing content while applying bold visual polish; avoid adding unrelated blocks.
- Correct email references to `borkinindustries@gmail.com`.
- Keep the cat image present for visual pacing but refactor framing to avoid awkward portrait cropping on desktop.
- Remove non-guaranteed response or support claims from contact surfaces (for example, fixed response-time promises or 24/7 support messaging).
- Keep cat image desktop-only and hide it on mobile for cleaner small-screen readability.
- Final contact direction (latest owner decision): remove cat image entirely from contact section and prioritize a text/form-first composition.

### P0-7 Footer section refinement requirements
- Reduce overall footer height significantly on mobile and desktop; avoid page-like vertical footprint.
- Remove redundant or non-applicable footer content (privacy link, duplicated terms links, quick-response/promissory cards, service-area line, and star-rating claims).
- Use brand logo image (`/logo.png`) for footer brand mark instead of icon placeholders.
- Keep a single clear terms entry point in footer quick links (`/terms`).
- Include concise business legal identity metadata in footer bottom bar (entity name, company type, Florida filing reference, filed date, active status).
- Latest owner direction: trim legal metadata to entity name + document number only (remove company type, filed date, and status).
- Latest owner direction: place copyright line as the absolute bottom-most footer row and set display year to `2026`.
- Latest owner direction: remove duplicate contact block from footer (contact details already present in section above).
- Latest owner direction: further reduce mobile height by rendering quick links in a denser multi-column row layout.

### P0-8 Homepage typography direction requirements
- Apply a Yoshi's Island-inspired playful, hand-drawn typography style only on homepage surfaces.
- Font stack direction locked by owner:
  - display/headlines: `Permanent Marker`
  - accents/buttons/links: `Permanent Marker`
  - readable body copy: `Fredoka`
- Keep dashboard/application typography unchanged outside homepage.
- Latest owner refinement: set homepage display text treatment to bold + italic (matching sign-in/sign-up handwritten feel).
- Follow-up owner refinement: replace navbar paw-in-square mark with the real logo image while preserving hover-spin behavior.
- Follow-up owner refinement: increase desktop homepage text sizing for non-heading text to improve readability while keeping mobile sizing unchanged.
- Follow-up owner refinement: restore the earlier hero floating pet-icon/bubble animation behavior (including randomized float rail and colored bubble set).
- Follow-up owner refinement: reduce heavy display-font blob effect on hero headline letters by improving spacing/edge definition.

## Acceptance Criteria
- No regressions in page behavior or navigation for migrated pages.
- Buttons on migrated pages use shared variants/sizes rather than one-off class combinations.
- Migrated pages use shared shell/container structure.
- Visual style remains playful, soft, and professional.
- Color-branding consistency is maintained using the locked five accent families (`red/pink`, `green`, `purple`, `yellow/amber`, `blue/indigo`) for colored UI treatments.

## Validation Flow
- We ship phase-by-phase.
- After each page migration, owner reviews and signs off before next page.

## Dashboard Page Iteration Rules (Operational)
- Owner can prioritize the currently active page out of queue order; task list must be updated to reflect this override.
- Each page pass is visual/UIUX only unless owner includes workflow logic changes in that pass.
- Preserve all existing content on the active page; improve hierarchy, readability, spacing, responsiveness, and interaction clarity.
- Required validation for every pass:
  - iPhone 14 screenshot
  - 1920x1080 screenshot
  - `npx tsc --noEmit`
- Keep artifacts tidy by removing superseded screenshots for the same page/pass lineage.
- Shared shell improvements (for example sidebar logout) are tracked separately from page surface redesign and landed when requested.

## Implemented Outcomes

### Client Dashboard (`/dashboard`)
- Shift dashboard from passive status board to continuation-first workflow surface, especially on mobile.
- Compress low-value stats into lightweight chips instead of dominant summary cards.
- Rebuild bookings area as a mobile-first horizontal swipe rail with centered snap behavior and fully tappable cards.
- Booking cards should deep-link into the exact booking detail context on `/dashboard/bookings` instead of routing generically to the list page.
- Surface recent messaging directly on the dashboard through a latest/unread conversation card.
- Surface a repeat-contractor shortcut through a go-to contractor card that prioritizes:
  - actionable booking when one exists (`pending` or `approved` only)
  - otherwise recent conversation if available
  - otherwise rebooking path via contractor profile/discovery
- Hide the generic dashboard page header on mobile when it adds no task value.
- Tighten all dashboard card typography and spacing for screens under roughly `640px`.

### Client Profile (`/dashboard/profile`)
- Rebuild view mode into a polished account summary with stronger hierarchy and grouped information cards.
- Preserve all existing fields while grouping them into meaningful sections:
  - personal information
  - location information
  - emergency contact
  - primary pet care provider
  - emergency pet clinic
- Mobile edit mode should behave like a guided multi-step card flow with one section visible at a time.
- Desktop edit mode should present all sections at once, but in a more intentional editorial/mosaic layout rather than a generic stacked form.
- Mobile edit flow supports both explicit navigation buttons and swipe navigation between sections.
- Final-step mobile save behavior must require an intentional save tap; advancing to the last card must not auto-submit.

### Client Payments (`/dashboard/payments`)
- Rebuild payments into a calmer client payment hub rather than a generic billing dashboard.
- Move the page onto the shared dashboard shell structure so spacing and page framing match the rest of the authenticated app.
- Make the top mobile section answer setup/readiness first:
  - whether payments are ready
  - whether a card is on file
  - total spent / completed bookings / latest completed charge as lightweight summary signals
- Treat missing Stripe customer or missing card as a setup state, not just an error state.
- Use paid booking records as the primary source for customer-facing payment summaries on this page instead of raw Stripe payment-intent values, so displayed charges align with completed booking totals.
- Recent payment activity on overview should:
  - show only the most recent three completed charges
  - use a centered swipe rail on mobile
  - deep-link into the exact booking detail context on `/dashboard/bookings`
- Payment history should remain a long list, but use a denser list treatment so heavy payment users can scan history without oversized stacked cards.
- Do not expose platform-fee breakdown to clients in payment history rows.
- Keep saved-card visuals branded and polished, but lighter and better integrated with the dashboard design system than the original faux-credit-card treatment.
- Related fix discovered during this pass: `app/dashboard/contractors/page.tsx` had a hook-order bug caused by a `useEffect` below an early return; move all hooks above conditional returns so contractor deep-link modal behavior is stable across desktop/mobile renders.

### Client Bookings (`/dashboard/bookings`)
- Move the bookings page onto the shared dashboard shell structure and hide the redundant `My Bookings` title on mobile.
- Preserve all booking data and actions, but compress the bookings list/tabs/cards significantly for mobile.
- New booking request flow should use a guided card-step modal on mobile with:
  - in-card close `X`
  - numbered progress dots
  - explicit back/next controls
  - compact service cards and compact calendar treatment
  - separate final confirmation step
  - no accidental auto-submit when arriving on the final step
  - lightweight success state after creation
- Booking detail flow should mirror the same card-step modal language on mobile and support direct jumping between sections through clickable numbered dots.
- Edit booking/services flow should reuse the same compact card-step modal conventions as the new booking flow instead of introducing a second modal style.
- Cancel booking confirmation should also follow the same rounded mobile modal shell and denser typography conventions rather than using an oversized generic alert dialog.
- Reusable-pattern gap identified during this pass:
  - step-card workflow modals are now being hand-built in multiple places
  - modal shell sizing, progress dots, bottom-nav behavior, and final-confirmation treatment should be standardized and eventually extracted instead of rebuilt per page

### Client Contractors (`/dashboard/contractors`)
- Replace the oversized marketing-style hero with a denser dashboard-style discovery header that keeps the page title visible on mobile without consuming the first third of the viewport.
- Search and filter controls should fit naturally within the first mobile screen:
  - tighter search input height
  - compact filter toggle
  - collapsible filter panel so unused controls do not permanently consume mobile space
- Contractor discovery cards should shift from large promotional tiles to denser profile-summary cards that prioritize:
  - avatar + name
  - location
  - review signal
  - short bio
  - offered service chips
  - visible `View Profile & Book` CTA
- Contractor profile modal should reuse the shared mobile modal-shell sizing pattern and move toward the same dense authenticated-dashboard card language used on bookings/profile/payments.
- Contractor availability date filtering should use the newer availability model rather than legacy `unavailableDates`-only logic so full-day daily-availability blocks are respected.
- Contractor profile modal on mobile should behave like a swipeable one-section-at-a-time flow rather than one long stacked profile scroll.
- Owner-approved mobile modal refinements from this pass:
  - remove step/dot header chrome when it wastes too much vertical space on small screens
  - keep explicit `Back` / `Next` navigation plus swipe gestures
  - keep the outer mobile shell proportionally stable across devices (`90vw` x `80svh`)
  - let long content scroll inside the active step region rather than resizing the whole shell

### Client Pets (`/dashboard/pets`)
- Move the pets page onto the shared dashboard shell structure and replace the old generic CRUD layout with denser authenticated-dashboard surfaces.
- Replace the old featured-pet hero treatment with a compact pet-summary surface that keeps top-of-page height lower while still showing:
  - total saved pets
  - animal-type breakdown chips
- On mobile, pet profiles should prefer a horizontal swipe rail over a long vertical stack so users with many pets do not need to scroll through an endless list.
- Pet cards should keep a consistent fixed height regardless of how much content an individual pet has, with action buttons anchored at the bottom of each card.
- Add and edit pet flows should use the same mobile swipeable step-card modal language used elsewhere in the dashboard:
  - stable percentage-based shell (`90vw` x `80svh`)
  - one-section-at-a-time mobile cards
  - explicit `Back` / `Next`
  - separate final confirm card
  - no auto-submit when reaching the last card
- Remove-pet confirmation should reuse the same modal shell sizing and general mobile dialog treatment as add/edit rather than a small one-off alert.

### Shared Messages (`/dashboard/messages`, `/dashboard/messages/[chatId]`)
- Replace the old minimal messages list with a real conversation hub that prioritizes thread rows over decorative header content.
- Message directory should avoid an infinitely growing page:
  - cap visible thread count per page
  - page older threads instead of extending the list forever
- Show unread state clearly in the directory and thread UI, but avoid extra summary cards that do not help users act.
- Message thread page should keep the conversation itself as the primary surface:
  - remove oversized page-level thread headers
  - keep back navigation available
  - use one bounded conversation container as the main screen surface
- Stale message threads should be handled gracefully:
  - validate thread availability before opening from the directory
  - avoid throwing users into the default Next.js dead-end screen for stale links
  - if a thread is no longer valid because its booking is gone, clean up the stale chat record automatically

## Client Cohesion Audit

### Strongest current baseline
- The most cohesive current client-side pages are:
  - `/dashboard/payments`
  - `/dashboard/contractors`
  - `/dashboard/pets`
  - `/dashboard/messages`
- These later passes now define the clearest direction for the client dashboard visual system.

### Baseline traits worth standardizing everywhere
- compact summary-first top surfaces instead of larger older hero/header treatments
- denser mobile card sizing and typography
- intentional use of the locked five accent families to differentiate section purpose
- bounded lists/rails instead of infinitely growing mobile stacks
- swipe rails with tracked dots when horizontal card scanning is the primary interaction
- fixed-height sibling cards when drifting action rows hurt consistency
- reduced instructional copy when the layout already teaches the interaction
- one primary action emphasis per page instead of multiple competing action styles

### Current client-side convergence gaps
- `/dashboard`
  - top-level shell/header treatment has now been tightened toward the later compact summary-first pattern
  - remaining work is mostly on finer internal consistency rather than page-level framing
- `/dashboard/profile`
  - page wrapper/header treatment has now been moved closer to the later compact shell language used elsewhere
  - remaining work is mostly on cross-page consistency details rather than missing top-level framing
- swipe-rail cues
  - earlier swipeable surfaces have now been updated to use tracked-dot support consistent with the later pets/messages thinking
- accent-role consistency
  - major page-level drift has been reduced, though smaller per-surface refinements may still remain

### Additional cohesion work completed after the first-pass redesigns
- Earlier client pages have now been brought closer to the later baseline by:
  - removing leftover duplicate shell/header treatments on pages where stronger in-page summary surfaces already existed
  - extending tracked-dot swipe cues to the earlier mobile rails
  - normalizing older client modal shells toward the now-preferred mobile percentage-based frame where appropriate (`90vw` x `80svh`)
  - reducing some remaining page-level drift between early and late client passes

### Next documentation goal
- Before contractor redesign work becomes the focus, treat the next client phase as a cohesion/convergence sweep rather than another first-pass redesign cycle.

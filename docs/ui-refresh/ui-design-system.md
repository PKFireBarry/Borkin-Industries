# UI Design System (Dashboard Refresh)

## Brand Direction
- Tone: friendly, caring, and modern.
- Visual language: soft gradients, rounded surfaces, gentle depth, clear hierarchy.
- Rule: playful accents should support usability, not compete with content.

## Foundation Tokens

### Color behavior
- Background: light gradient shells (`slate -> white -> blue`).
- Surfaces: white cards with subtle borders and low shadow.
- Accent: blue/indigo for primary action and active emphasis.
- Status chips:
  - success: green
  - info/approved: blue
  - pending/warn: amber/yellow
  - destructive/cancelled: red

### Accent Palette Lock
- Lock branded accent usage to these five families for homepage/UI refinement work:
  - `red/pink`
  - `green`
  - `purple`
  - `yellow/amber`
  - `blue/indigo`
- For colored sub-containers, badges, chips, icon blocks, and highlight treatments, prefer one of these five families.
- This is a guideline, not a hard requirement for every element; neutral surfaces are still preferred for readability.
- Avoid introducing new accent families (for example teal-only, orange-only, etc.) unless explicitly requested.
- When multiple colored elements appear together, keep distribution intentional and balanced across these five families.

### Shape + depth
- Radius:
  - cards: `rounded-xl` to `rounded-2xl`
  - actions: `rounded-md` base, `rounded-full` pill actions
- Elevation:
  - default: `shadow-sm`
  - hover: `shadow-lg` with subtle transition

### Motion
- Keep transitions short and readable (`duration-200` to `duration-300`).
- Prioritize informative motion (hover/focus/loading) over decorative motion in dashboards.

### Homepage Section Refinement Rules
- Refactor existing section elements instead of introducing unrelated new content blocks.
- Preserve existing copy unless explicitly directed to remove/update text.
- Use bold upgrades in composition, spacing, surfaces, and typography while staying inside current color/style direction.
- Validate each section visually on iPhone 14 and 1080p desktop before sign-off.
- Standardize section outer cards to a shared shell treatment where feasible (`rounded-[2rem]`, soft white border, translucent white fill, balanced shadow), adjusting internal element sizing to fit.
- Services page can include concise, informative support blocks (e.g., animal coverage summary) when source service data is otherwise sparse and UX clarity improves.

### Contact Section Pattern
- Use the same two-layer container rhythm as other homepage sections:
  - outer section wrapper (`max-w-7xl`)
  - primary content shell (`max-w-6xl`, `rounded-[2rem]`, translucent white, soft border, balanced shadow)
- Remove redundant pre-heading pills for this section when owner requests a cleaner top hierarchy.
- For portrait source imagery in side rails, prefer framed square presentation (`aspect-square` + `object-contain`) to preserve subject detail and avoid desktop crop artifacts.
- For desktop composition, image rail may be left-anchored with content rail opposite to preserve visual balance.
- On mobile, prioritize readability by removing decorative image rail when requested.
- If section balance degrades or overlap risk appears, remove decorative image rail entirely and maintain a cleaner single-column content shell.

### Footer Section Pattern
- Footer should remain compact and utility-first: quick scan in one viewport on mobile whenever possible.
- Preferred structure: three concise columns (brand, links, contact) plus a slim legal bottom bar.
- Legal/policy links should appear once per footer region to avoid duplicate navigation.
- Bottom bar may contain lightweight legal entity metadata in subdued text treatment.
- When contact details are immediately available in the preceding homepage section, omit duplicated contact rows from footer to preserve compactness.
- For dense mobile layouts, quick links may shift to a 3-column compact grid with reduced text sizing.
- Copyright should sit on the last visual row with a subtle top divider.

### Homepage Typography Pattern
- Scope stylized type treatments to homepage wrapper only; do not globally replace app/dashboard typography.
- Use home wrapper-scoped font variables for role-based typography:
  - display (`h1`, `h2`, `h3`): textured playful display family
  - accents (`button`, `a`): marker-style family
  - body (`p`, `li`, `small`): rounded readable companion family
- Preserve readability by keeping body copy in a cleaner family while reserving heavy display texture for headings.
- Keep nav brand mark logo-authentic (use real logo image) and preserve existing motion behaviors.
- For readability tuning, avoid forcing marker font onto all links globally; allow body links to inherit body family where legibility is priority.
- Desktop-only text scaling may be used for non-heading homepage copy to maintain mobile typography balance.

## Reusable Components

### `Button` (`components/ui/button.tsx`)
- Variants:
  - `default`: primary app action
  - `petCta`: high-emphasis CTA
  - `outline`: secondary actions
  - `secondary`, `ghost`, `destructive`
- Sizes:
  - `sm`, `default`, `lg`, `icon`, `pill`, `pillSm`
- Utility props:
  - `loading`, `loadingText`, `leftIcon`, `rightIcon`, `asChild`

### Dashboard shell (`app/dashboard/components/dashboard-shell.tsx`)
- `DashboardPageShell`: page-level background and min-height
- `DashboardPageHeader`: consistent title/description/actions/meta, optional sticky
- `DashboardPageContent`: shared max-width + horizontal/vertical spacing

## Desktop Dashboard Layout Pattern
- Desktop dashboard pages should use the shared shell instead of page-by-page width wrappers:
  - `DashboardPageShell`
  - `DashboardPageHeader`
  - `DashboardPageContent`
- Desktop content width should favor percentage-based padding over hard centered caps:
  - prefer `lg:px-[5%]`
  - avoid defaulting to `max-w-7xl` for dashboard internals when the page benefits from broader scan width
- Desktop dashboard layout should keep sidebar and main content as siblings in the same row:
  - parent layout: `lg:flex lg:flex-row`
  - sidebar: `lg:sticky lg:top-0 lg:shrink-0`
- When widening desktop pages, preserve mobile behavior first and only relax spacing/grid density at larger breakpoints.
- Prefer broader desktop grids when card scanning is the main task:
  - `lg:grid-cols-2`
  - `xl:grid-cols-3`
  - `2xl:grid-cols-4`
- Add bottom breathing room to longer desktop dashboard pages so content and pinned controls do not terminate against the viewport edge:
  - prefer `pb-8`
  - increase to `lg:pb-12` when the page has dense grids, chat regions, or modal-launch actions near the bottom

## Client Cohesion Baseline
- The strongest current client-side baseline comes from the later dashboard passes:
  - payments
  - contractors
  - pets
  - messages
- Earlier client pages should converge toward these later patterns instead of preserving their older intermediate styles.
- Default convergence priorities:
  - compact top-of-page summary surfaces instead of taller header/hero treatments
  - denser internal cards with clearer accent-family roles
  - bounded lists/rails instead of infinitely growing stacks where scanning is the primary task
  - fewer explanatory paragraphs when interaction is already obvious from the layout
  - one dominant primary action per page instead of multiple competing CTAs

## Usage Rules
- Do not recreate button visuals page-by-page unless a new variant is genuinely needed.
- Prefer `size="pill"` and `size="pillSm"` for rounded dashboard actions.
- For links styled as buttons, use `asChild` with `Link` when practical.
- New dashboards should start with `DashboardPageShell` + `DashboardPageContent`.

## Page Header Convergence Pattern
- Authenticated client pages should not use oversized marketing-style hero blocks.
- Preferred page-top rhythm:
  - one rounded summary shell near the top of the content area
  - concise eyebrow/status chip only when it adds context
  - one clear title
  - at most one short supporting sentence
  - one primary action when the page has a dominant next step
- Avoid repeating the same count/status in both the page header and the immediately following summary surface.
- If page purpose is already obvious, remove low-signal descriptive copy.
- Current client convergence targets: `/dashboard` and `/dashboard/profile` should move closer to this later-page rhythm.

## Summary Surface Pattern
- Use one compact summary surface near the top of a page to answer the most actionable questions first.
- Summary surfaces are preferred over large feature/hero cards when the page is an operational dashboard screen.
- Summary surfaces may contain:
  - total counts
  - unread or pending indicators
  - animal/type breakdown chips
  - setup/readiness state
- Summary surfaces should avoid:
  - duplicate restatement of page title
  - instructional copy the user can infer from the UI
  - multiple unrelated metrics that dilute the primary task

## Dashboard Iteration Protocol (Locked)
- Use `frontend-design` skill at the start of each page redesign pass.
- Work one page at a time: exactly one task is `in-progress`; all other pages remain `todo`.
- Preserve all existing user-facing content unless owner explicitly requests removal or rewrite.
- Do not edit non-active pages/components during a page pass.
- Every pass must be validated with screenshots at:
  - iPhone 14 viewport
  - 1920x1080 desktop viewport
- After each pass:
  - run `npx tsc --noEmit`
  - prune superseded screenshots for that page
  - keep page `in-progress` until owner sign-off
- Queue order is locked in `docs/ui-refresh/ui-tasks.md`, but owner may temporarily prioritize the page they are actively logged into.

## Cross-Role Navigation Requirements
- Dashboard sidebar/drawer remains role-aware and collapsible behavior stays intact.
- Add a clear `Log out` action at the bottom of dashboard navigation (desktop sidebar + mobile drawer) as a shared shell improvement.
- Treat nav logout as a shared layout change (`app/dashboard/layout.tsx`) and implement outside page-specific visual passes unless owner asks otherwise.

## Profile Page Pattern
- View mode should feel like a finished account summary, not a plain stacked form dump.
- Prefer one strong profile summary surface plus supporting detail cards with distinct accent families.
- Preserve all profile fields, but group them into meaningful sections: personal, location, emergency contact, primary pet care provider, emergency clinic.
- Mobile edit mode should use a guided card-step flow with one section visible at a time and clear previous/next progression.
- Desktop edit mode can expose the full form, but should still preserve section separation and stronger visual hierarchy.
- Save action may remain globally available in the sticky header, but mobile should also provide a final-step save CTA to match the step flow mental model.
- Current convergence note: the profile wrapper/header treatment should be brought closer to the compact later-page shell language used on payments/contractors/pets/messages.

## Dashboard Page Pattern
- Dashboard should answer continuation questions first, not just summarize counts:
  - what needs attention now
  - what booking is next
  - whether there is a recent conversation to continue
  - whether there is a trusted contractor to reuse
- On mobile, prefer a continuation-first order:
  - compact greeting strip
  - lightweight status chips
  - swipeable booking rail
  - recent messages
  - repeat/go-to contractor
  - pets
  - payment/setup
- For dashboard mobile surfaces under `640px`, aggressively reduce text size, padding, and secondary copy to avoid cramped cards.
- If a shared dashboard header only repeats the obvious page title, hide it on mobile.
- Booking summary cards on mobile may use horizontal swipe rails, but they must:
  - settle into centered snap positions
  - fit fully inside their visual container
  - remain fully tappable
  - preserve enough labeled information to understand the booking at a glance
- Dashboard booking shortcuts must deep-link to the exact booking detail context rather than a generic bookings list.
- Relationship shortcuts (repeat contractor/go-to contractor) should never surface canceled bookings as the primary active action.
- When a direct profile shortcut is used for contractors from the dashboard, route into a specific contractor context rather than dumping users into an unfiltered index.
- Current convergence note: dashboard still contains older header/summary treatments that should be tightened toward the later client-page baseline.

## Payments Page Pattern
- Payments should feel like a client readiness + history surface, not a back-office billing console.
- Keep the top section lightweight on mobile: setup state, primary action, and compact payment summary chips belong together in one container rather than being repeated in large stat cards below.
- If there is no saved payment method, show the setup prompt once in the primary top surface instead of duplicating the same state deeper on the page.
- Recent payment activity on mobile may use a horizontal swipe rail, but only for a small set of latest items (for example latest three) and each item must:
  - settle into centered snap positions
  - fit fully inside the rail container without clipping
  - deep-link into the exact booking detail context
  - use compact internal sizing once the overall card footprint is approved
- Payment history should prefer compact list rows over large stacked cards because history length can grow significantly for active clients.
- Client-facing payment history should not expose platform-fee breakdown.

## Contractors Discovery Pattern
- Keep the contractors-page header visible on mobile, but treat it like a compact discovery control surface rather than a full hero.
- Preferred mobile header rhythm:
  - short eyebrow/status chips
  - one concise title + supporting sentence
  - dense search row with inline clear action
  - compact filter toggle beside or below search depending on viewport width
- Filter controls may be collapsible when preserving top-of-screen space is more important than always-visible controls.
- If filters are collapsible, keep a compact toggle with active-filter count and a quick clear path when filters are active.
- Contractor list cards should default to a denser summary format on mobile:
  - avatar-first left rail
  - core identity/review/location at the top
  - short bio preview
  - service chips
  - compact service-range row
  - full-width CTA at the bottom
- Discovery cards should feel tappable and polished, but avoid oversized marketing-card image headers inside authenticated pages unless the page truly needs them.

## Pets Pattern
- Pets pages should avoid tall top-of-page feature cards when a compact summary surface can communicate the same information more efficiently.
- Preferred pets-page top summary on mobile:
  - one concise summary card
  - total saved pets
  - animal-type breakdown chips
  - no redundant instructional text when the interaction can be inferred from the UI itself
- Pet profile cards should keep a consistent fixed height across a rail/grid so action alignment does not drift when one pet has less information than another.
- Pet-card action rows should always remain pinned to the bottom edge of the card.

## Messages Pattern
- Shared messages pages should prioritize the conversation list and active thread over explanatory dashboard chrome.
- Inbox/header guidance:
  - keep the page title
  - only surface unread-summary information if it is actionable
  - avoid repeating total-thread counts in multiple places
  - remove descriptive text when the page purpose is already obvious from the layout
- Conversation directories should not grow infinitely:
  - cap visible rows per page
  - use pagination or another bounded history mechanism for older threads
- Active thread pages should treat the chat container itself as the main surface rather than stacking a second large page header above it.
- For stale threads:
  - validate availability before navigating from the conversation directory when possible
  - if a backing booking is gone, auto-clean the stale chat record instead of repeatedly surfacing a dead row
  - always provide a graceful fallback path back to the directory for direct stale links

## Accent-Family Usage Pattern
- The five-family accent palette should be used intentionally across related card groups and sub-surfaces:
  - `blue/indigo`
  - `purple`
  - `green/emerald`
  - `amber/yellow`
  - `pink/red`
- Use accent families to differentiate section purpose, not to color every element at once.
- Strong later-page example pattern:
  - overview / primary summary => blue/indigo
  - service/configuration => blue or green
  - availability / time / schedule => purple
  - review / confirmation / highlight => amber
  - health / destructive / risk / caution => red/pink
- Earlier pages with flatter neutral-only treatment should be gradually upgraded to this accent-role logic.

## Bounded List Pattern
- Any page whose primary content can grow indefinitely should default to a bounded presentation rather than an endless vertical stack.
- Preferred bounded patterns:
  - paginated list rows for directories/history
  - horizontal swipe rail for mobile card scanning
  - capped recent-items modules for dashboard overviews
- Use bounded treatments for:
  - messages directories
  - payment history overviews
  - pet profile browsing on mobile
  - dashboard recent activity surfaces

## Swipe Rail Pattern
- Mobile swipe rails should be used when users are scanning sibling cards rather than reading a linear feed.
- Swipe rails should:
  - center-snap each card
  - use explicit side padding so first/last cards do not feel clipped
  - remain fully tappable
  - include tracked dots whenever swiping is a primary interaction cue
- Dot rules:
  - no dots for a single card
  - one dot per card for 2-3 cards
  - compressed 3-dot tracking for 4+ cards
- Swipe rails should replace long stacked card lists on mobile when the same card template repeats and vertical scrolling becomes fatiguing.

## Fixed-Height Card Pattern
- When a set of sibling cards represents the same entity type, default to fixed-height cards if drifting action rows or inconsistent scan rhythm would hurt readability.
- Fixed-height cards should:
  - keep action rows pinned to the bottom
  - clamp supporting content as needed
  - preserve consistent outer height across the set
- Proven use:
  - pets mobile rail and pets desktop card grid

## Action-Footer Pattern
- Repeating bottom actions inside cards or modals should stay visually anchored.
- For content cards:
  - use `flex` column layout
  - make the middle detail region `flex-1`
  - push actions down with `mt-auto`
- For modals:
  - use a constrained vertical layout: outer wrapper `h-full min-h-0 flex flex-col`
  - make the scroll owner `min-h-0 flex-1 overflow-y-auto`
  - keep the action region as a dedicated bottom zone with `shrink-0`
  - avoid letting long content displace the primary/secondary actions out of view
  - do not rely on `overflow-y-auto` alone unless the parent chain is also height-constrained with `min-h-0`

## Instruction Copy Reduction Rule
- If a layout already teaches the interaction through structure, dots, or controls, remove the explanatory sentence.
- Prefer inference over explanation for:
  - swipe rails with visible dots
  - obvious card directories
  - well-labeled primary actions
- This keeps the later-page client style denser and more confident.

## Modal Sizing Pattern
- Mobile-first workflow modals should reuse one shell pattern instead of custom dialog sizing per page.
- Legacy mobile shell (keep only where percentage-based sizing is not appropriate yet):
  - `w-[calc(100vw-1rem)]`
  - `max-h-[calc(100svh-1rem)]`
  - `rounded-[1.75rem]`
  - `overflow-hidden`
  - `p-0`
- Preferred mobile shell for current client-side card-stack/detail modals:
  - `w-[90vw]`
  - `max-w-[90vw]`
  - `h-[80svh]`
  - `max-h-[80svh]`
  - `rounded-[1.75rem]`
  - `overflow-hidden`
  - `p-0`
  - use this when visible outer margin should remain available for easy backdrop dismissal on mobile
  - this is now the preferred baseline for client-side detail/edit/create flows unless a page has a concrete reason to use a different shell
- Preferred desktop modal shell:
  - keep the same shell treatment, then relax width/height with page-specific desktop max-width tiers and fixed desktop height
  - current `ModalShell` width map:
    - `lg` => `sm:max-w-lg lg:max-w-2xl`
    - `2xl` => `sm:max-w-2xl lg:max-w-4xl`
    - `4xl` => `sm:max-w-4xl lg:max-w-6xl`
  - desktop modal height baseline: `sm:h-[85vh]`
  - keep `sm:max-h-[95vh]` so the shell remains resilient on shorter laptop viewports
- Long modals should split into three zones:
  - fixed/in-shell header
  - dedicated scroll region (`min-h-0 flex-1 overflow-y-auto`)
  - anchored bottom navigation/action region
- Avoid split scroll ownership between outer dialog content and inner content wrappers.

## Desktop Modal Header Pattern
- Desktop modals should have exactly one visible desktop header treatment.
- Do not stack a visible `DialogHeader` on top of a custom internal desktop header.
- Preferred approaches:
  - use `ModalHeader` when one shared top header is sufficient
  - use a custom internal desktop banner when the modal body needs a stronger in-flow header treatment
- When using a custom visual desktop header:
  - keep `DialogTitle` and optional `DialogDescription` as `sr-only` elements for Radix accessibility
  - render the visual desktop header as an internal `hidden sm:block` surface
  - include eyebrow, title, optional description, and a top-right close button
- Desktop custom modal headers should follow the proven banner structure:
  - rounded gradient surface
  - `flex items-start justify-between`
  - close button: `h-10 w-10`, `rounded-full`, bordered white button with slate hover states
- If the modal already has an internal desktop close button, remove redundant desktop footer close actions unless the task requires both close and confirm controls.

## Desktop Modal Scroll Pattern
- Desktop modal content must live inside a constrained flex column before `overflow-y-auto` is expected to work.
- Required structure:
  - shell child: `flex h-full min-h-0 flex-col`
  - scroll body: `min-h-0 flex-1 overflow-y-auto`
  - bottom actions/footer: `shrink-0`
- This prevents the common desktop bug where the content region expands to fit its children and never becomes scrollable.
- When debugging a desktop modal that will not scroll, first inspect whether every parent between the shell and scroll region preserves `h-full` / `min-h-0` ownership.

## Mobile Card Density Pattern
- Default to the denser mobile sizing we established across bookings, payments, and profile rather than starting from oversized marketing-card proportions.
- Default mobile card rhythm:
  - outer card padding: `p-4` to `p-5`
  - supporting/internal card padding: `p-3` to `p-4`
  - icon bubbles: `h-9 w-9` or `h-10 w-10`
  - card radii: `rounded-[1.5rem]` to `rounded-[1.75rem]`
- Default mobile text rhythm:
  - micro label / eyebrow: `text-[10px]` to `text-[11px]`
  - supporting labels: `text-xs`
  - body/supporting copy: `text-sm`
  - section title: `text-base` on mobile, `sm:text-lg` when needed
  - dominant totals/amounts: prefer `text-lg` to `text-xl` on mobile before going larger
- Chips/badges in dense mobile cards should generally stay at `text-[10px]` to `text-xs` with reduced padding.

## Step Modal Pattern
- Use step-card modal flows for long multi-part authenticated tasks instead of one long stacked scroll when one-section-at-a-time focus improves usability.
- Current proven uses:
  - client profile edit
  - new booking request
  - booking details
  - edit booking/services
  - contractor profile mobile flow
- Required mobile step-flow behaviors:
  - explicit back/next controls for guided flows
  - swipe gestures may supplement explicit controls, but should not replace them
  - on step change, scroll the modal content region back to top
- Required desktop step-flow behavior for authenticated dashboard modals:
  - render all major sections inline on desktop when the task benefits from full-page review/editing
  - keep the one-step-at-a-time flow on mobile
  - preferred implementation: wrap each step section in `className={activeStep !== targetStep ? 'hidden sm:block' : ''}` so the section is mobile-gated but always present on desktop
  - business-logic gates still apply independently of step gating (for example, only show a services section when the booking status allows editing services)
- When all sections are visible on desktop, use a static desktop header title (for example `Edit your booking`) instead of a dynamic step label.
- Progress dots/header chrome are optional, not required, when they consume too much space relative to the available mobile viewport.
- For informational swipeable profile flows, removing step chrome is acceptable if the user can still clearly advance with `Next` and swipe gestures.
- For percentage-based mobile card stacks:
  - keep the active step surface inside a stable shell height
  - make the step content region `flex-1`
  - let long content scroll inside that active step region instead of resizing the shell per step
- When progress tracking is shown on mobile step flows:
  - use the compact circle + label treatment already established in booking request/details flows
  - keep number circles small (`h-8 w-8`)
  - keep labels at `text-[10px]`
  - do not let the tracker consume excessive vertical space before content begins
- When step tracking is hidden to preserve space:
  - keep top-right `X`
  - keep bottom `Back` / `Next`
  - keep swipe support if the surface is intended to feel card-driven
- Use a separate final confirmation step whenever the final action is high-importance or has shown accidental-submit risk.
- `MobileStepFooter` is mobile-first by default and should remain hidden on desktop unless the desktop workflow explicitly requires the same bottom navigation.
- Do not opt into `desktopVisible` for desktop flows that are meant to become inline scroll experiences.

## Detail Modal Navigation Pattern
- One-section-at-a-time detail modals on mobile should follow this hierarchy:
  - compact top header/title surface
  - optional compact progress circles when helpful
  - content card
  - anchored bottom `Back` / `Next`
  - separate secondary `Close` action below the main nav when needed
- Avoid mixing old desktop footer actions into mobile detail modals.
- Desktop footer/button regions should be hidden on mobile when the mobile action pattern already provides `Back` / `Next` / `Close`.
- Top-right close buttons on mobile detail modals should stay compact (`h-8 w-8` or `h-9 w-9`) and visually subordinate to the content.
- Do not place a submit action in the same primary control slot that just held `Next` on the previous step.
- For successful completion, prefer a lightweight in-card success moment before closing the modal.
- On desktop, detail/edit modals may switch from step navigation to inline scroll review.
- In that desktop mode:
  - remove redundant `DialogFooter` close regions when the top-right `X` is sufficient
  - keep `MobileStepFooter` mobile-only unless desktop step navigation is a deliberate product requirement
  - keep the close control in the desktop header/banner so it remains visible and predictable

## Desktop Pagination Pattern
- Desktop directories and history surfaces should prefer bounded, bottom-anchored pagination over infinitely growing stacks.
- Current proven uses:
  - client bookings list
  - client messages conversation list
- Preferred desktop behavior:
  - determine visible rows/cards from the available viewport height when the content surface is expected to fill the remaining page region
  - keep the list/grid container in a flex column
  - pin pagination to the bottom with `mt-auto` inside the bounded region
  - use conservative fit calculations so the last visible card does not clip under the pager
- Mobile may continue using simpler pagination or swipe-based browsing when that is already the established interaction model.

## Cancel Modal Pattern
- Confirmation/cancellation dialogs should follow the same rounded mobile modal shell instead of falling back to a generic large alert style.
- Keep cancellation dialogs compact on mobile:
  - smaller icon block
  - `text-xs` to `text-sm` body copy
  - rounded list/info blocks instead of oversized alert spacing
  - internal close `X` in the top-right

## Shared Pattern Gap
- Horizontal swipe summary/activity rails are now appearing in multiple dashboard surfaces (`/dashboard` bookings rail and `/dashboard/payments` recent activity rail).
- Do not continue rebuilding snap-width-padding behavior page by page.
- Before or during the next applicable pass, extract a reusable dashboard swipe-rail pattern/component with shared rules for:
  - centered snap behavior
  - rail side padding
  - card width constraints
  - mobile overflow handling
  - tappable slide treatment
  - desktop fallback layout
- For mobile rails with dots/progress indicators:
  - dots should track the actual active slide, not remain decorative only
  - if a rail has 1 item, show no dots
  - if a rail has 2 or 3 items, show one dot per item
  - if a rail has more than 3 items, compress to 3 dots:
    - first item => first dot active
    - last item => last dot active
    - any middle item => middle dot active
  - this compressed 3-dot behavior is preferred when the user only needs orientation, not exact item count disclosure
- Step-card workflow modals are also now repeating across authenticated surfaces.
- Do not continue rebuilding modal step headers, progress dots, close buttons, anchored bottom nav, and confirm-step behavior page by page.
- Extract or standardize a reusable authenticated step-modal pattern with shared rules for:
  - modal shell sizing
  - scroll-region ownership
  - mobile progress dots
  - anchored bottom nav
  - final confirmation step behavior
  - success-state treatment

## Extending The System
- If a new action style appears in 2+ places, add it to button variants instead of copying classes.
- If a page header layout repeats twice, move it into `DashboardPageHeader` props rather than inline JSX.

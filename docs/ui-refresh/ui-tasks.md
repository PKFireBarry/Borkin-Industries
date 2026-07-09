# UI Refresh Tasks

## Status Key
- `todo`
- `in-progress`
- `done`

## Phase 0 - Foundation
- [done] Create branch `feat/ui-refresh-client-contractor`
- [done] Upgrade shared `Button` API with reusable variants/sizes/loading/icon support
- [done] Add dashboard shell primitives (`DashboardPageShell`, `DashboardPageHeader`, `DashboardPageContent`)
- [done] Migrate homepage CTA surfaces (`components/Header.tsx`, `components/HeroSection.tsx`) to shared button variants/sizing
- [done] Refine homepage hero layout to single-container composition with mobile-first ordering (`components/HeroSection.tsx`)
- [done] Update hero logo treatment (logo-first on mobile, no logo card container, no "Pet-loved" badge text)
- [done] Increase visibility of animated hero background pet bubbles (opacity-only adjustment, no static bubble layer)
- [done] Remove hero trust-chip text row (`Certified Veterinary Technician`, `4+ Years Experience`, `Trusted by 11+ Families`)
- [done] Align hero wording to vet tech-led care language (`components/HeroSection.tsx`)
- [done] Capture per-pass visual validation screenshots for iPhone 14 and 1080p desktop (`artifacts/ui-review/*`)
- [done] Boldly refine homepage navigation to align with existing design language (`components/Header.tsx`)
- [done] Validate nav refinement in browser for iPhone 14 and 1080p desktop (`artifacts/ui-review/nav-*`)
- [done] Redesign mobile hamburger panel behavior (single close control, remove numeric link badges, content-height panel)
- [done] Unify desktop nav button sizing/shape to match mobile menu button language (`components/Header.tsx`)
- [done] Reflow desktop nav layout to centered middle group with consistent group spacing and responsive behavior (`components/Header.tsx`)
- [done] Redesign `What We Stand For` section with bold visual refactor while preserving core content (`components/About.tsx`)
- [done] Remove `Our Mission` pill from top of `What We Stand For` section (`components/About.tsx`)
- [done] Validate About section redesign in browser for iPhone 14 and 1080p desktop (`artifacts/ui-review/about-*`)
- [done] Remove About section stat chips (`4+ Years Experience`, `Certified Veterinary Technician`, `11+ Trusted Families`) per owner feedback
- [done] Integrate `Professional Care` and `Personal Touch` into primary content container with explicit section labeling (`Our Commitment` / `How We Care`)
- [done] Run About section pass-2 browser validation for iPhone 14 and 1080p desktop (`artifacts/ui-review/about-*-pass-2-*`)
- [done] Micro-pass: remove `How We Care` label and refine desktop reading flow with staged in-view reveal timing in text container (`components/About.tsx`)
- [done] Add subtle non-image motion accent near About text content to improve visual pacing (`components/About.tsx`)
- [done] Run About section pass-3 browser validation for iPhone 14 and 1080p desktop (`artifacts/ui-review/about-*-pass-3-*`)
- [done] Redesign `Meet the Founder` section with bold style enhancement while preserving content (`components/TeamSection.tsx`)
- [done] Remove `Our Leadership` label from top of founder section (`components/TeamSection.tsx`)
- [done] Align founder section outer card shell size/style with `What We Stand For` section standardization (`components/TeamSection.tsx`)
- [done] Prune superseded screenshot passes to keep artifact set lean (`artifacts/ui-review/`)
- [done] Run founder section browser validation for iPhone 14 and 1080p desktop (`artifacts/ui-review/team-*`)
- [done] Founder pass-2 updates: remove last name, remove star-rating block, move image to opposite side on desktop, replace/remove top photo badge duplication (`components/TeamSection.tsx`)
- [done] Founder pass-2 validation + screenshot cleanup (keep latest pass only) (`artifacts/ui-review/team-iphone14-pass-2.png`, `artifacts/ui-review/team-desktop-1080p-pass-2.png`)
- [done] Founder pass-3 fixes: preserve quote block, add section anchor for targeted visual checks (`#team`), and fix image framing so bottom is not clipped (`components/TeamSection.tsx`)
- [done] Founder pass-3 validation + cleanup (`artifacts/ui-review/team-iphone14-pass-3-fixed.png`, `artifacts/ui-review/team-desktop-1080p-pass-3-fixed.png`)
- [done] Redesign `Why Choose Our Pet Care Service` section with bold visual refactor while preserving content (`components/WhyChooseUs.tsx`)
- [done] Remove top `Why Choose Us` star pill and remove three stat containers (`Trusted Clients`, `Years in Veterinary Medicine`, `Hours as a Certified Vet Nurse`) from section
- [done] Standardize Why-section card shells to shared homepage container sizing/style (`rounded-[2rem]`, translucent white surface, soft border, balanced shadow)
- [done] Validate Why-section pass-1 on iPhone 14 + 1080p desktop (`artifacts/ui-review/why-iphone14-pass-1.png`, `artifacts/ui-review/why-desktop-1080p-pass-1.png`)
- [done] Why-section micro-pass: update scheduling icons (`Last-minute Requests` => exclamation style, `Flexible Cancellations` => stop/cancel style)
- [done] Add lightweight, low-motion visual character layer to Why section without changing content (decorative paw marks + service journey icon rail)
- [done] Why-section pass-2 validation and cleanup (`artifacts/ui-review/why-iphone14-pass-2-character.png`, `artifacts/ui-review/why-desktop-1080p-pass-2-character.png`)
- [done] Finalize and lock Why-section styling direction after owner sign-off
- [done] Redesign Services section from placeholder to production-grade layout with same max-width container system (`components/ServicesSection.tsx`)
- [done] Add concise customer-facing animal coverage summary block inferred from available services (`components/ServicesSection.tsx`)
- [done] Preserve all fetched service content while upgrading card hierarchy, readability, and iconography (`components/ServicesSection.tsx`)
- [done] Validate Services pass-1 in browser on iPhone 14 and 1080p desktop (`artifacts/ui-review/services-iphone14-pass-1.png`, `artifacts/ui-review/services-desktop-1080p-pass-1.png`)
- [done] Services micro-pass: remove low-signal duration chip, tighten card density, and reduce oversized grid feel while preserving all service entries/content
- [done] Expand animal support summary copy for clearer per-animal support expectations (`components/ServicesSection.tsx`)
- [done] Validate Services pass-2 + cleanup (`artifacts/ui-review/services-iphone14-pass-2-compact.png`, `artifacts/ui-review/services-desktop-1080p-pass-2-compact.png`)
- [done] Services pass-3: convert large card grid into compact list layout, remove per-service icons, and increase brand color presence across support + service rows (`components/ServicesSection.tsx`)
- [done] Validate Services pass-3 + cleanup (`artifacts/ui-review/services-iphone14-pass-3-list.png`, `artifacts/ui-review/services-desktop-1080p-pass-3-list.png`)
- [done] Lock brand accent palette rules in design/spec docs (use `red/pink`, `green`, `purple`, `yellow/amber`, `blue/indigo` for colored UI treatments)
- [done] Contact pass-1: align section container/shell sizing with homepage standard, remove top mini `Contact Us` pill, keep content intact, and refactor side image framing to square for better desktop composition (`components/Contact.tsx`)
- [done] Fix Contact email typo in `Email Us` CTA (`borkinindustries@gmail.com`) and mailto link (`components/Contact.tsx`)
- [done] Validate Contact pass-1 in browser for iPhone 14 + 1080p desktop (`artifacts/ui-review/contact-iphone14-pass-1.png`, `artifacts/ui-review/contact-desktop-1080p-pass-1.png`)
- [done] Contact pass-2: remove desktop dead-space by integrating the cat visual as an anchored floating panel beside top contact content (instead of its own full-height column), and deepen visual polish for CTA cards + section hierarchy while preserving all content (`components/Contact.tsx`)
- [done] Validate Contact pass-2 and prune superseded contact pass-1 artifacts (`artifacts/ui-review/contact-iphone14-pass-2-polish.png`, `artifacts/ui-review/contact-desktop-1080p-pass-2-polish.png`)
- [done] Contact pass-3: remove non-applicable support/response claims (`Quick Response`, `Free Initial Consultation`, `24/7 Emergency Support`), keep only email + phone + message form, hide cat image on mobile, and swap desktop rails so image is left and contact content is right (`components/Contact.tsx`)
- [done] Contact pass-3 color pass: reinforce locked five-family palette usage with intentional blue/green for direct contact actions and purple/pink for message action hierarchy (`components/Contact.tsx`)
- [done] Validate Contact pass-3 and prune superseded pass-2 artifacts (`artifacts/ui-review/contact-iphone14-pass-3-layout-cleanup.png`, `artifacts/ui-review/contact-desktop-1080p-pass-3-layout-cleanup.png`)
- [done] Contact pass-4 bugfix: remove desktop overlap between cat panel and `Send Us a Message` area by replacing absolute image anchoring with a fixed-width desktop grid rail layout (`components/Contact.tsx`)
- [done] Validate Contact pass-4 and prune superseded pass-3 artifacts (`artifacts/ui-review/contact-iphone14-pass-4-overlap-fix.png`, `artifacts/ui-review/contact-desktop-1080p-pass-4-overlap-fix.png`)
- [done] Contact pass-5: remove cat image entirely, keep only contact info + message form, remove unwanted gradient from `Send Message` button, and run cleanup polish without adding new content (`components/Contact.tsx`)
- [done] Validate Contact pass-5 and prune superseded pass-4 artifacts (`artifacts/ui-review/contact-iphone14-pass-5-no-cat.png`, `artifacts/ui-review/contact-desktop-1080p-pass-5-no-cat.png`)
- [done] Contact pass-6: remove duplicate `Get In Touch` subheading + supporting paragraph under `Contact Us`, tighten top spacing, and keep contact method cards as the immediate entry-point (`components/Contact.tsx`)
- [done] Validate Contact pass-6 and prune superseded pass-5 artifacts (`artifacts/ui-review/contact-iphone14-pass-6-remove-duplicate-heading.png`, `artifacts/ui-review/contact-desktop-1080p-pass-6-remove-duplicate-heading.png`)
- [done] Footer pass-1: refactor footer into compact three-column layout, replace icon badge with `/logo.png`, remove privacy link, remove bottom duplicated terms link, remove quick-response card, remove service area row, and remove 5-star claim (`components/Footer.tsx`)
- [done] Footer pass-2: add legal business metadata row (entity/type/document number/filed date/status) in bottom bar while keeping compact height and single terms link in quick links (`components/Footer.tsx`)
- [done] Validate Footer pass-2 and prune superseded pass-1 artifacts (`artifacts/ui-review/footer-iphone14-pass-2-legal-meta.png`, `artifacts/ui-review/footer-desktop-1080p-pass-2-legal-meta.png`)
- [done] Footer pass-3: remove footer contact block, reduce legal metadata to entity + doc number only, move copyright to bottom-most row (`© 2026`), and compress mobile quick links into 3-column dense layout (`components/Footer.tsx`)
- [done] Validate Footer pass-3 and prune superseded pass-2 artifacts (`artifacts/ui-review/footer-iphone14-pass-3-ultra-compact.png`, `artifacts/ui-review/footer-desktop-1080p-pass-3-ultra-compact.png`)
- [done] Homepage font pass-1: implement scoped Yoshi-inspired role-based type stack (`Rubik Dirt` display, `Permanent Marker` accents/buttons/links, `Fredoka` readable body) via homepage wrapper font variables (`app/layout.tsx`, `app/globals.css`, `app/page.tsx`)
- [done] Validate homepage font pass-1 on iPhone 14 + 1080p desktop (`artifacts/ui-review/home-font-iphone14-pass-1-yoshi-style.png`, `artifacts/ui-review/home-font-desktop-1080p-pass-1-yoshi-style.png`)
- [done] Homepage font/nav/hero pass-2: replace nav paw-square with spinning logo image, restore prior floating hero icon+bubble motion pattern, increase desktop non-heading copy scale, and improve hero display letter legibility (`components/Header.tsx`, `components/HeroSection.tsx`, `app/globals.css`)
- [done] Validate homepage pass-2 and prune superseded pass-1 font artifacts (`artifacts/ui-review/home-iphone14-pass-font-nav-hero-bubbles-fix.png`, `artifacts/ui-review/home-desktop-1080p-pass-font-nav-hero-bubbles-fix.png`)
- [done] Homepage font pass-3: replace `Rubik Dirt` display usage with `Permanent Marker` for clearer headline legibility while preserving body font split (`app/layout.tsx`, `app/globals.css`)
- [done] Validate homepage pass-3 and prune superseded pass-2 screenshots (`artifacts/ui-review/home-iphone14-pass-font-marker-display.png`, `artifacts/ui-review/home-desktop-1080p-pass-font-marker-display.png`)
- [done] Homepage font pass-4: apply bold + italic style to homepage display headings to match sign-in/sign-up handwritten vibe while leaving body copy unchanged (`app/globals.css`)
- [done] Validate homepage pass-4 and prune superseded pass-3 screenshots (`artifacts/ui-review/home-iphone14-pass-font-display-italic-bold.png`, `artifacts/ui-review/home-desktop-1080p-pass-font-display-italic-bold.png`)
- [done] Homepage brand text consistency pass: align footer brand spelling with navbar brand text (`Borkin Industries`) in logo alt, title, and copyright line (`components/Footer.tsx`)
- [done] Validate brand consistency pass and prune superseded pass-4 screenshots (`artifacts/ui-review/home-iphone14-pass-brand-name-sync.png`, `artifacts/ui-review/home-desktop-1080p-pass-brand-name-sync.png`)
- [done] Migrate first dashboard target page (`app/dashboard/page.tsx`) to new shared button variants/sizing
- [in-progress] Owner validation of phase 0 UI direction

## Phase 0.5 - Dashboard Redesign Prep (Lock Scope First)
- [done] Inventory all client and contractor dashboard pages/routes
- [done] Classify pages as shared vs client-only vs contractor-only
- [done] Lock redesign order in this document (single queue, one page at a time)
- [done] Confirm `frontend-design` skill usage for all redesign passes
- [done] Owner-priority override: start implementation with `client-01` (`/dashboard`) before shared queue

## Locked Working Rules (Do Not Skip)
- One active page at a time (`in-progress`), all others stay `todo`.
- If a page/element is shared by client + contractor, redesign once and reuse.
- Do not edit non-active pages during a pass.
- Every pass requires visual QA screenshots: iPhone 14 + 1920x1080 desktop.
- After each pass: remove superseded screenshots and run `npx tsc --noEmit`.
- Mark page task `done` only after owner sign-off.

## Locked Redesign Queue

## Shared Pages (Redesign Once For Both Roles)
- [done] `shared-01` `/dashboard/messages` (`app/dashboard/messages/page.tsx` + message list components)
- [done] `shared-02` `/dashboard/messages/[chatId]` (`app/dashboard/messages/[chatId]/page.tsx` + chat view components)

## Client Pages
- [done] `client-01` `/dashboard` (`app/dashboard/page.tsx`)
- [done] `client-02` `/dashboard/bookings` (`app/dashboard/bookings/page.tsx`, `app/dashboard/bookings/booking-list.tsx`, `app/dashboard/bookings/booking-request-form.tsx`)
- [done] `client-03` `/dashboard/contractors` (`app/dashboard/contractors/page.tsx`, `app/dashboard/contractors/contractor-profile-modal.tsx`)
- [done] `client-04` `/dashboard/pets` (`app/dashboard/pets/page.tsx`, `app/dashboard/pets/pet-management.tsx`)
- [done] `client-05` `/dashboard/profile` (`app/dashboard/profile/page.tsx`, `app/dashboard/profile/profile-form.tsx`)
- [done] `client-06` `/dashboard/payments` (`app/dashboard/payments/page.tsx`)

## Client Cohesion Sweep (Before Contractor Focus)
- [done] `client-polish-01` audit all client-side swipe rails and add tracked-dot behavior wherever swiping is a primary interaction cue
- [done] `client-polish-02` bring `/dashboard` top-of-page shell/header/summary treatment in line with the later compact client baseline
- [done] `client-polish-03` bring `/dashboard/profile` page wrapper/header treatment in line with the later compact client baseline
- [done] `client-polish-04` audit earlier client pages for accent-family role consistency against the later payments/contractors/pets/messages baseline
- [done] `client-polish-05` audit earlier client pages for unnecessary explanatory copy and remove low-signal instructional text where interaction is already obvious
- [done] `client-polish-06` audit repeated sibling card sets on client pages for fixed-height / bottom-pinned action alignment opportunities
- [todo] `client-polish-07` complete client-side cohesion sign-off before moving primary focus to contractor pages

## Contractor Pages
- [todo] `contractor-01` `/dashboard/contractor` (`app/dashboard/contractor/page.tsx`)
- [todo] `contractor-02` `/dashboard/contractor/gigs` (`app/dashboard/contractor/gigs/page.tsx`)
- [todo] `contractor-03` `/dashboard/contractor/availability` (`app/dashboard/contractor/availability/page.tsx`)
- [todo] `contractor-04` `/dashboard/contractor/profile` (`app/dashboard/contractor/profile/page.tsx`)
- [todo] `contractor-05` `/dashboard/contractor/payments` (`app/dashboard/contractor/payments/page.tsx`)
- [todo] `contractor-06` `/dashboard/contractor/reviews` (`app/dashboard/contractor/reviews/page.tsx`)
- [todo] `contractor-07` `/dashboard/contractor/apply` (`app/dashboard/contractor/apply/page.tsx`)

## Progress Checkpoints
- [todo] checkpoint-1: Shared pages approved
- [todo] checkpoint-2: Client first-pass redesigns approved
- [todo] checkpoint-2b: Client cohesion sweep approved
- [todo] checkpoint-3: Contractor pages approved

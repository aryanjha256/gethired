# Handoff

Short log of features shipped and caveats to know about. Newest on top.

## Email templates with per-recipient variables

- **What**: reusable email templates (Settings → Templates) with `{{variable}}`
  placeholders (`{{firstName}}`, `{{company}}`, `{{title}}`, `{{myName}}`,
  `{{signature}}`, etc.) that get resolved **per recipient** at send time — not
  once for the whole batch. Both existing send surfaces (the bulk "Send Email"
  dialog on `/contacts` and the `/emails` composer) gained a "Template" picker
  that pre-fills Subject/Body with the raw template text (still editable);
  choosing "None" preserves the old fully-manual behavior exactly.
- **New Settings → Sender Identity** page (`/settings/sender`): your display
  name + a signature block, stored in a singleton `app_settings` row, used only
  to resolve `{{myName}}`/`{{signature}}` — unrelated to `SMTP_FROM_NAME` (that's
  still just the SMTP transport's From header).
- **Files**:
  - `src/db/schema.ts` — new `templates` table (name/type/subject/body; `type`
    is free `text`, validated against `TEMPLATE_TYPES` at the app layer, same
    convention as `contacts.status`), new singleton `app_settings` table (fixed
    `id: "singleton"` PK — writes are always a single `insert().onConflictDoUpdate()`,
    no fetch-then-branch), and a nullable `emails.templateId` FK
    (`onDelete: "set null"` — deleting a template that was used to send doesn't
    break its log entry, just nulls the reference).
  - `src/lib/templates.ts` — the single source of truth for variables:
    `TEMPLATE_VARIABLES` (key/label/resolve), `renderTemplate(text, ctx)`
    (regex `{{key}}` replace, unknown keys left as-is), `TEMPLATE_TYPES`,
    `SAMPLE_TEMPLATE_CONTEXT` (fixed sample data for the editor's live preview).
    Plain TS, no directives — the same function resolves both the editor's
    preview and the real per-recipient substitution at send time, so they can't
    drift apart.
  - `src/app/(app)/contacts/actions.ts` — `sendContactEmails` now joins
    `companies` (for `{{company}}`, which it didn't fetch before), loads the
    `app_settings` singleton once (not per-contact), and renders subject/body
    per contact before sending/logging. Logs the **rendered** text per contact,
    not the raw template — the log should show what that specific person
    actually received. Gained an optional 4th `templateId` param, fully
    backward compatible (existing calls with no `{{...}}` in the text are a
    no-op through `renderTemplate`).
  - `src/app/(app)/settings/templates/` — `page.tsx` (list, plain `Card`s not
    `DataTable` — overkill for a short list), `template-form.tsx` (shared
    create/edit form: RHF for name/subject/body, plain `useState` for the type
    `Select` — this app has zero `Controller` usage anywhere, so followed the
    existing "local state merged in at submit" convention from
    `emails/compose-email.tsx` instead of introducing `Controller`; variable
    buttons insert `{{key}}` at the end of whichever field was last focused —
    no cursor/selection-range tracking, not worth it for short subject/body
    text; side-by-side live preview, no `Tabs` since that component has zero
    usage anywhere else yet), `new/page.tsx` + `[id]/edit/page.tsx` (this app's
    first dynamic route segment), `delete-template-button.tsx` (wraps the
    existing `alert-dialog.tsx`).
  - `src/app/(app)/settings/templates/actions.ts` — `createTemplate`/`updateTemplate`
    `redirect()` back to the list (matching this app's actual existing
    convention: mutate-then-navigate-to-a-fresh-route); `deleteTemplate` is the
    **only** one of the three that calls `revalidatePath` — it's triggered from
    the list page itself with no navigation, the first use of `revalidatePath`
    anywhere in this app.
  - `src/components/template-picker.tsx` — the shared `Select` used by both
    send surfaces (`"none"` sentinel value, not `""` — empty string as an item
    value is a footgun in select-like components generally).
  - `src/app/(app)/settings/settings-link-card.tsx` — extracted the repeated
    link-`Card` markup from `/settings` (was about to triple it with two new
    entries).
- **Setup required**: `npm run db:push` already run as part of this change
  (purely additive — two new tables, one nullable column, no data loss).
- **Explicitly deferred**: template `type` is purely organizational (no
  auto-selection based on `contact.status` or anything else); preview in the
  editor is against one fixed sample contact only, not a per-recipient preview
  list before sending; still plain text, no HTML templates; no template
  versioning or duplicate-send/cooldown prevention (already deferred earlier
  for a different reason, see the Contacts section below).

## Single-account auth gate (Clerk + Google OAuth, custom UI)

- **What**: the app is now single-tenant behind auth. Anyone can sign in via Google, but only the email in `ALLOWED_EMAIL` (`.env.local`) can actually reach the app — everyone else lands on a "not authorized" screen. No Clerk-branded UI anywhere (no `<SignIn>`/`<SignUp>`/`<UserButton>`); sign-in and the user menu are custom shadcn components driven by Clerk's headless hooks.
- **Why this shape**: checked this Clerk instance's live config (`/v1/environment` on its Frontend API) — `email_address` identification is off and `oauth_google` is the only enabled first factor. So "sign in" and "sign up" are the same Google button; Clerk auto-creates the account on first login. Gating happens *after* auth, not by restricting who can sign up.
- **This Next.js fork renamed `middleware.ts` to `proxy.ts`** (see `node_modules/next/dist/docs/.../proxy.md`) — that's why the gate lives in `src/proxy.ts`, not `middleware.ts`.
- **Files**:
  - `src/proxy.ts` — `clerkMiddleware` wrapping every route except `_next`/api/static. No session → redirect to `/sign-in`. Signed in → fetch the user via `clerkClient().users.getUser()` (this fork runs Proxy on the Node runtime, so a Backend API call here is fine) and check the email against `isAllowedEmail()`. Not allowed → redirect to `/not-authorized`. Visiting `/sign-in` while already signed in redirects to `/` or `/not-authorized` depending on the check.
  - `src/lib/auth.ts` — `isAllowedEmail(email)`, reads `ALLOWED_EMAIL` from env (case-insensitive compare).
  - `src/app/(auth)/sign-in/{page.tsx,sign-in-form.tsx}` — custom Card with a "Continue with Google" button. Uses `useSignIn` from **`@clerk/nextjs/legacy`** (this Clerk version, 7.x, defaults `useSignIn`/`useSignUp` to a new signals/"Future" API with a different shape — `signIn.sso()` instead of `signIn.authenticateWithRedirect()`; went with the legacy import since it's the well-documented, unambiguous classic flow).
  - `src/app/(auth)/sign-in/sso-callback/page.tsx` — mounts Clerk's `<AuthenticateWithRedirectCallback />` to complete the OAuth redirect.
  - `src/app/(auth)/not-authorized/{page.tsx,sign-out-button.tsx}` — same `Empty` component pattern as `not-found.tsx`, plus a sign-out button.
  - `src/components/user-menu.tsx` — avatar + dropdown (email label, sign out) in the app header, replacing Clerk's `<UserButton>`.
- **Route groups**: split `src/app` into `(app)` (the existing sidebar shell — Dashboard/Contacts/Emails/Import/Settings, unchanged URLs) and `(auth)` (bare centered layout, no sidebar) so the sign-in/not-authorized screens don't render inside the app chrome. Root `layout.tsx` now only holds providers (`ClerkProvider`/`ThemeProvider`/`TooltipProvider`/`Toaster`); the sidebar + header moved into `src/app/(app)/layout.tsx`. This is a pure directory move — no URLs changed — but double-check any hardcoded `@/app/...` import paths if you add more cross-page imports (one existing one, `compose-email.tsx` → `contacts/actions`, needed updating to `@/app/(app)/contacts/actions`).
- **Caveats**:
  - The email-allowlist check happens only in `proxy.ts`, not duplicated in Server Actions/DAL. Per Next's own auth guide, a Proxy matcher change or a Server Function moved to an unmatched route could silently lose this protection — worth adding a defense-in-depth check (e.g. a shared `requireAllowedUser()` called from actions) if this ever needs to be hardened further.
  - No custom session-token claims configured in the Clerk Dashboard, so the email check costs one Backend API call (`users.getUser`) per request to a protected route. Fine at single-user scale; if this matters later, add an `email` claim to the session token in Clerk's dashboard (Sessions → customize) and read it from `sessionClaims` instead.
  - `src/app/not-found.tsx` stayed at the root (outside both route groups), so it no longer renders with the sidebar/header — root `layout.tsx` lost that chrome in this change (see above). It still renders fine as a standalone centered `Empty` card, just without the app shell around it. Move it into `(app)` if the sidebar-visible 404 look matters more than a one-line handoff note.
  - `.env.local` already had Clerk keys but no `ALLOWED_EMAIL` — added `aryan.kumar@strideone.in`. `.env.example` documents the var with a placeholder (Clerk keys still aren't in `.env.example`, matching how it already was before this change).

## 404 page

- **What**: `src/app/not-found.tsx` — renders inside the existing root layout (so the sidebar/header still show), using the same `Empty` component pattern as the Import screen's pre-upload state, with a link back to the Dashboard. Standard App Router `not-found.js` convention, not the newer experimental `global-not-found.js` (that one's for apps with multiple root layouts, which this isn't).
  - **Superseded**: since the auth gate above moved the sidebar/header out of the root layout and into `(app)/layout.tsx`, this page no longer renders with the app chrome — see the caveats above.

## Contacts replace Companies as the primary outreach entity

- **Why**: cold outreach targets *people* (HR/recruiters), not companies — a company can have many contacts, and email is the real unique identifier, not company name. Everything that used to model "one company = one email" now models "many contacts, each optionally belonging to one company."
- **Setup required**: this changes the schema shape (not just adds columns), so run `npm run db:push` and **choose to drop/recreate `companies`/create `contacts` when prompted** — by agreement, existing test data in these tables is not being migrated, just reset.
- **Schema** (`src/db/schema.ts`):
  - `companies` is now a lookup/grouping entity only — dropped `email` and `status` (a company is never emailed directly, and outreach status is a per-contact thing now, not per-company).
  - New `contacts` table is the primary entity: `email` is `notNull().unique()` (the real identifier), plus `name`, `title`, `phone`, `companyId` (FK to `companies`, nullable), `status` (moved here from companies, default `"new"`), `notes`, `source`, `raw` JSON catch-all.
  - `emails.companyId` → `emails.contactId`.
- **Import** (`src/app/import/actions.ts`, now `approveContacts` instead of `approveCompanies`):
  - Field aliases split into contact fields (name/email/title/phone/notes) and company fields (company name/website/industry/location) — previously "Name" was treated as the *company's* name; now it's the *person's* name, and a company is only recognized via an explicit "Company"/"Organization"/"Employer"-style column.
  - Company matching is by **normalized name** (lowercased, common suffixes like "Inc."/"LLC"/"Corp" stripped, punctuation/whitespace collapsed) — curated HR lists commonly spell the same company differently across rows ("Acme" vs "Acme Inc."), so exact-string matching would silently create duplicate companies. This is best-effort, not fuzzy matching — genuinely different spellings that don't share a normalized form will still create separate companies.
  - Contacts are deduped by email via `onConflictDoNothing` — re-importing a sheet with a contact that already exists just skips that row (existing data isn't overwritten). Company info (website/industry/location) is only set when a company is first created, not merged in from later rows that mention the same company with more detail.
  - Returns `{ inserted, skippedNoEmail, skippedDuplicate }` instead of `{ inserted, skipped }`.
- **Pages**: `/companies` is gone; `/contacts` replaces it (same nav slot, renamed, new icon) — lists contacts with a `companyName` column (via a join), row selection, and the same "Send Email" dialog pattern as before (`src/app/contacts/actions.ts`'s `sendContactEmails`). The dialog no longer needs to warn about "no email on file" — every contact has one, by schema.
  - `/emails`'s recipient picker now lists contacts (label shows name, email, and company for context) instead of companies, and sends via `sendContactEmails`.
- **Explicitly deferred** (per discussion — these are real requirements but would have made this change too large to land at once):
  - Dynamic/merge-field email content (e.g. `{{company}}`, `{{contactName}}` in subject/body).
  - Preventing a duplicate *initial* outreach email to the same contact (with an eventual cooldown-based override, e.g. "allow re-sending after 45 days").
  - Threaded follow-ups (would need to capture and store each send's `Message-ID` to set `In-Reply-To`/`References` headers on the next email in the same thread).

## Test Email (Settings)

- **What**: `/settings` (the sidebar "Settings" link, which previously 404'd — no page existed for it yet) now has a landing page linking to `/settings/test-email`, a bare send-to-anyone form (To/Subject/Message) for verifying SMTP works, independent of Companies entirely. Not logged to the `emails` table — this is a throwaway smoke test, not outreach history.
- **Files**:
  - `src/app/settings/page.tsx` — minimal settings index (just one card linking to Test Email for now).
  - `src/app/settings/test-email/page.tsx` + `test-email-form.tsx` + `actions.ts` — the form and its `sendTestEmail(to, subject, body)` Server Action, a thin wrapper directly around `sendMail()` from `src/lib/mailer.ts` (no Companies/DB involved at all).
- **Caveats**:
  - Uses the same single global SMTP account as everything else — there's no way to test a *different* SMTP config from here without changing `.env.local`.
  - If email sending ever grows a second provider (e.g. Gmail API via OAuth scopes through Clerk), this page's only dependency is `sendMail()`'s signature (`{ to, subject, text }`) — swapping the implementation inside `mailer.ts` wouldn't require touching this page.

## Dedicated "Send Email" page (superseded — recipients are now Contacts, see above)

- **What**: new `/emails` page (own sidebar nav item, "Emails") — a full-page compose experience: search/multi-select recipients from any company that has an email on file, write a subject + message, and send. Independent of and in addition to the existing "Send Email" dialog on `/companies` (that one's still there for quickly emailing rows you've already selected in the table); this page is for composing from scratch without needing to go through Companies first.
- **Files**:
  - `src/app/emails/page.tsx` — Server Component, fetches `{ id, name, email }` for every company with a non-null email (`export const dynamic = "force-dynamic"`, same reasoning as `/companies`: must never serve a stale list).
  - `src/app/emails/compose-email.tsx` — the form. Recipient picker uses the shadcn `Combobox` in `multiple` mode for search/select, but renders the selected recipients as removable `Badge`s itself rather than using `Combobox`'s chips sub-components (`ComboboxChips`/`ComboboxChip`/`ComboboxChipRemove`) — those rely on some internal index/context wiring I couldn't fully verify was correct without the ability to check base-ui's live docs, so I opted for the version I could verify is correct. Revisit if a future feature calls for chips-inside-the-input specifically. Sending reuses the existing `sendCompanyEmails` Server Action from `/companies` unchanged — no logic duplicated.
  - `src/components/app-sidebar.tsx` — added the "Emails" nav item.
- **Caveats**:
  - Only companies with an email on file appear as selectable recipients (no way to email an ad-hoc address that isn't already a Company).
  - Same plain-text-only, sequential-send, single-global-SMTP-account caveats as the section below apply here too, since both paths go through the same `sendCompanyEmails` action.

## Send email to Companies (SMTP + app password) (superseded — this is now /contacts + sendContactEmails, see above)

- **What**: on `/companies`, select one or more rows and click "Send Email" to open a compose dialog (subject + message body, plain text). Sends individually to each selected company's email address (not one email CC'ing everyone) via a personal SMTP account + app password — no OAuth/Clerk email scopes involved, this is the "simple approach for now." Every send attempt (success or failure) is logged to a new `emails` table.
- **Setup required before this works**:
  1. Add `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM_NAME` to `.env.local` (see `.env.example` — defaults are filled in for Gmail). `SMTP_PASSWORD` is a Gmail **app password** (Google Account → Security → 2-Step Verification → App passwords), not your normal login password — app passwords require 2FA to be enabled on the account.
  2. Run `npm run db:push` again — the schema changed (new `email` column on `companies`, new `emails` table).
- **Files**:
  - `src/db/schema.ts` — added `email` (nullable text) to `companies`; new `emails` table logging every send attempt (`companyId`, `to`, `subject`, `body`, `status: "sent" | "failed"`, `error`, `createdAt`) — this is the data future follow-up/template features can build on.
  - `src/lib/mailer.ts` — `sendMail({ to, subject, text })`, a lazily-created pooled `nodemailer` SMTP transporter (reused across sends in the same process instead of reconnecting per email).
  - `src/app/companies/actions.ts` — `sendCompanyEmails(companyIds, subject, body)` Server Action. Re-fetches the companies by ID from the DB (doesn't trust client-supplied email strings), skips any with no email on file, sends **sequentially** (not `Promise.all`) to stay well under Gmail's SMTP rate limits, and logs each attempt regardless of outcome.
  - `src/app/companies/send-email-dialog.tsx` — the compose dialog (`react-hook-form`, no `zod`/resolver — the form is just two required text fields, didn't need schema validation glue for that). Shows the resolved recipient count and warns if some selected companies have no email and will be skipped.
  - `src/app/companies/companies-table.tsx` — turned on `enableRowSelection`, added an `email` column, and added the "Send Email" button (enabled once ≥1 row is selected) that opens the dialog.
  - `src/app/import/actions.ts` — added `email` to `FIELD_ALIASES` so future spreadsheet imports auto-populate it (aliases: "Email", "Email Address", "Contact Email", "Mail").
- **Caveats**:
  - Plain text only — no HTML/rich formatting, no attachments, no templates yet (that's the next feature).
  - Sequential sends mean a large selection will take a while (one SMTP round-trip per recipient) — fine at personal-CRM scale, would need rethinking (e.g. a background job/queue) at real bulk-email volume.
  - Selection doesn't auto-clear after sending, same as the existing Import-screen caveat below — `DataTable` still has no reset-selection API.
  - Single global SMTP account for the whole app (env vars, not per-user settings) — matches this being a personal tool; would need real per-user credential storage if this ever became multi-tenant.

## Database + Companies list (import → approve → persist) (superseded — /companies no longer exists, replaced by /contacts, see above)

- **What**: the Import screen's row selection (checkboxes) now feeds a real "Import to Companies" action. Selecting rows and clicking the button maps each row's columns onto a `companies` Postgres table (via Drizzle) and inserts them; a new `/companies` page (already in the sidebar) lists everything that's been approved so far, using the same `DataTable`.
- **Setup required before this works**:
  1. Copy `.env.example` to `.env.local` and fill in a real Postgres connection string.
  2. Run `npm run db:push` to create the `companies` table (or `npm run db:generate` first if you want a migration file instead of a direct push).
  3. `npm run db:studio` opens Drizzle Studio to browse the table if useful.
  - Note: `drizzle-kit` runs outside the Next.js runtime, so by itself it only auto-loads a plain `.env` file — not `.env.local`. `drizzle.config.ts` now calls `@next/env`'s `loadEnvConfig()` first to replicate Next's own `.env.local` loading, so `db:push`/`db:studio`/`db:generate` all see the same `DATABASE_URL` the app does.
- **Files**:
  - `drizzle.config.ts` — drizzle-kit config (schema path, Postgres dialect, reads `DATABASE_URL`)
  - `src/db/schema.ts` — `companies` table: fixed core columns (`name` required, `website`, `industry`, `location`, `status` defaulting to `"new"`, `notes`, `source`) plus a `raw` `jsonb` catch-all column for any imported spreadsheet columns that don't map to a known field
  - `src/db/index.ts` — Drizzle client singleton (reused across dev hot-reloads so we don't leak Postgres connections)
  - `src/app/import/actions.ts` — `approveCompanies(rows, source)` Server Action. Maps each row's column headers to a Company field by normalized-name matching (e.g. "Company Name"/"Organization" → `name`, "Website"/"URL" → `website`, etc.); anything unmatched goes into `raw`. Rows with no recognizable name column are skipped and reported back, not silently dropped.
  - `src/app/companies/page.tsx` + `companies-table.tsx` — Server Component fetches `companies` ordered by newest first and hands it to a small client component that defines the `ColumnDef`s (website renders as a link, status as a `Badge`) and renders `DataTable`. Marked `export const dynamic = "force-dynamic"` so it never serves a stale build-time cache of company data.
  - `src/components/data-table/data-table.tsx` — added an `onSelectedRowsChange` callback prop so a consumer (the Import page) can read which rows are currently checked, without `DataTable` needing to know anything about what happens with that selection.
  - Added a `<Toaster />` (sonner) to the root layout so `approveCompanies`'s result can surface as a toast.
  - `src/lib/spreadsheet.ts` — `serializeSpreadsheetRow()` converts any `Date` cells to ISO strings before a row crosses the Client → Server Action boundary. This Next.js version rejects non-plain-object arguments to Server Functions (`Date` included), so a row from a date-containing spreadsheet column would otherwise throw at the `approveCompanies` call. The Import page calls this right before invoking the action; `actions.ts`'s `ImportRow` type (`SerializedSpreadsheetCell`) no longer allows `Date` at all, so this can't regress silently.
  - `src/components/data-table/select-all-banner.tsx` — Gmail/Notion-style "select all across pages" prompt. The header checkbox only ever selects the current page (TanStack default); once a full page is checked, a banner offers "Select all N rows" (everything matching the current filters, not just this page) and, once that's done, "Clear selection". Purely additive — only renders when `enableRowSelection` is on, so it's a no-op for `/companies` (read-only, no selection).
- **Caveats**:
  - Column-to-field mapping is v1/best-effort auto-matching by normalized header name — no manual mapping UI yet. Revisit if imported sheets commonly use header names the aliases list doesn't cover (`src/app/import/actions.ts`'s `FIELD_ALIASES`).
  - After a successful import, the Import screen's row selection isn't automatically cleared (no reset API exposed on `DataTable` yet) — you can keep selecting/importing more rows or click "Upload another file" to start over.
  - `postgres` npm package + `pg`-style connection is used (not an edge/serverless HTTP driver), so this assumes a normal long-lived Postgres connection is reachable from wherever this runs.
  - `drizzle-kit` (dev-only migration CLI) currently pulls in a moderate, dev-only `esbuild` vulnerability transitively — accepted since it's never part of the production bundle.
  - Server Actions have a default payload size limit (~1MB) — approving an extremely large selection of rows at once could hit that; not handled specially yet.

## Spreadsheet import (preview only)

- **What**: `/import` page — upload a `.csv`/`.xlsx`/`.xls` file, it's parsed client-side and rendered as a sortable, filterable, paginated table. Added "Import" to the sidebar nav.
- **Files**:
  - `src/app/import/page.tsx` — the page (upload UI + state), builds `ColumnDef`s from the parsed column types
  - `src/lib/spreadsheet.ts` — `parseSpreadsheetFile(file)`, uses `xlsx` (SheetJS) to read the first sheet into `{ columns: { key, type }[], rows }`. `type` is inferred per column (`"string" | "number" | "date"`) by sampling cell values (real `Date` objects from Excel, or regex-matched numeric/date strings from CSV).
  - `src/components/data-table/` — reusable `DataTable<TData, TValue>` abstraction over TanStack Table + shadcn's `Table` primitive, split into focused modules instead of one large file:
    - `data-table.tsx` — table shell: state, column resolution, renders header/body/toolbar/pagination
    - `filter-fns.ts` — filter value types, the three custom filter functions (text/number/date) + `ColumnMeta`/`FilterFns` module augmentation
    - `sort-menu.tsx`, `filter-menu.tsx`, `view-menu.tsx` — the toolbar popovers (Sort, Filter, column-visibility "View")
    - `column-header.tsx` — the clickable sortable header cell
    - `date-picker.tsx` — `Popover` + `Calendar` date picker used by date filters (not a native `<input type="date">`)
    - `drag-handle.tsx`, `utils.ts` — shared grip handle + `getColumnLabel`/`reorder`/`useDragReorder` helpers
    - `select-column.tsx` — `createSelectColumn()`, the row-selection checkbox column
    - `index.ts` — barrel export, so `@/components/data-table` still resolves the same as before
  - Linear-style toolbar: a "Sort" button and a "Filter" button (each with a count badge) open a popover to add/edit/remove/reorder criteria — no inline per-column filter row. Both lists support drag-to-reorder via a grip handle (native HTML5 drag-and-drop, no new dependency). A "View" button toggles column visibility. Column headers stay clickable for sort (no icon shown until sorted or hovered, to stay uncluttered), synced to the same sort state as the Sort popover — plain click sorts by just that column, **Shift+click adds it to the existing multi-sort** (this is TanStack's default `isMultiSortEvent` behavior, unmodified); a tooltip on the header spells this out since it isn't otherwise discoverable.
  - Filtering is opt-in per column via `meta.filterVariant: "text" | "number" | "date"` on the `ColumnDef`; `DataTable` derives the right filter function and operator set (contains / =,>,<,between / is,before,after,between) automatically.
  - Row selection is opt-in via `<DataTable enableRowSelection />` (on for `/import`). Adds a checkbox column (header checkbox supports indeterminate state), highlights selected rows, and switches the pagination footer from "N rows" to "X of Y row(s) selected". Extended the shared `Checkbox` (`src/components/ui/checkbox.tsx`) with an `indeterminate` prop (dash icon + primary-color fill) since it's a generically useful state, not just for this table.
- **Caveats**:
  - The parsed preview itself still isn't persisted (parsed rows live in component state and vanish on refresh/navigation) — only rows you explicitly select and approve via "Import to Companies" (see the section above) get saved.
  - Only the first sheet of a workbook is read.
  - Column type inference is a best-effort heuristic (all non-empty cells in a column must match to count as number/date); mixed-type columns fall back to `"string"`.
  - `xlsx@0.18.5` (the npm-registry build) has two known unpatched vulns (prototype pollution, ReDoS) since SheetJS moved patched releases off npm to their own CDN. Accepted as low-risk since only the user uploads files to their own instance — revisit if this ever accepts files from anyone else.
  - Only one filter criterion per column at a time (matches TanStack's column-filter model); the Sort/Filter menus disable columns already in use to prevent duplicates.
  - Drag reorder uses the browser's native HTML5 drag-and-drop (`draggable`/`onDragStart`/`onDrop`) rather than a library like dnd-kit — no new dependency, but no touch-drag support and no drag preview styling beyond the browser default.

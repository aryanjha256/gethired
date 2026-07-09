# Handoff

Short log of features shipped and caveats to know about. Newest on top.

## Database + Companies list (import → approve → persist)

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

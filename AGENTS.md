# AGENTS.md

## Project Snapshot
- Stack: React + Vite, client-heavy workflow, localStorage persistence, no router.
- Entry point: `src/App.jsx`.
- Main navigation is manual via `PAGE_IDS` constants (`src/constants/pages.js` -> `src/constants/app.js`).
- Current key flows:
  - Stock take (`StockTakePage` + `TopSummary` + `StockTakeTable`)
  - Review (`ReviewPage`)
  - Voice capture/edit/apply (`StockVoicePage` + `useVoiceSession`)
  - Photo OCR/edit/confirm/send (`PhotoPage` + `usePhotoOrder`)
  - Automation queue simulation (`AutomationJobsPage` + `useAutomationJobs`)

## Folder Structure (Current)
- `src/Pages/` page containers (note: folder name is `Pages` with capital `P`).
- `src/components/` reusable UI pieces.
- `src/hooks/` flow/state hooks (`useStockTake`, `useVoiceSession`, `usePhotoOrder`, `useAutomationJobs`).
- `src/utils/` business logic, payload builders, storage, matching/parsing.
- `src/constants/` domain constants.
- `src/data/items.js` static catalog (includes `supplier`).

## Naming & Import Conventions
- Keep page ids/status/source literals centralized in `src/constants/app.js`.
- Prefer importing page ids from `src/constants/pages.js` (compatibility entry).
- Keep `Pages` imports consistent with actual folder casing (`./Pages/...`).
- Do not reintroduce scattered string literals for:
  - page ids
  - job statuses
  - entry statuses
  - source labels

## UI Rules (Do Not Drift)
- Preserve current dark-panel style and inline style approach (`src/utils/uiStyles.js` + local inline style).
- Reuse existing small shared components before adding new visuals:
  - `StatusBadge`, `VoiceTag`, `SectionTableHeader`, `PageActionBar`, `NoticePanel`.
- In `StockTakeTable`, keep row geometry stable:
  - header/row grid columns aligned
  - fixed row density (uniform padding/min-height)
  - In `StockTakeTable`, keep `VoiceTag` inline with the item name and preserve stable row height/alignment
  - Avoid deleting and recreating full page files unless a large structural refactor is explicitly requested.

## Expected Behavior by Flow
- Stock take:
  - quantity edits persist to localStorage
  - Enter key focuses next visible input
  - voice-filled marker remains visible
- Voice:
  - supports area-based capture, preview edits, and apply to stock
  - auto-apply mode updates quantities immediately
- Photo:
  - supports OCR/mock/text parse, manual correction, confirm/lock flow
  - confirmed payload can be copied and sent to automation queue
- Review:
  - copy full table / copy order
  - create automation jobs from stock table and suggested order
- Automation:
  - queue CRUD + run/simulate failure without backend orchestration

## Refactor Guardrails
- Preserve behavior and visual output unless task explicitly says otherwise.
- Prefer incremental edits; avoid rewriting full pages for small changes.
- Do not introduce router/context/typescript as part of routine refactors.
- Keep heavy flow logic in hooks; keep pages primarily as composition/render.
- When adding fields to domain objects (e.g., `supplier`), propagate through derived objects and automation payloads without breaking existing keys.

## Current Roadmap Priorities
1. Stabilize supplier-aware data propagation (already started via `items`, entries, and automation/photo payloads).
2. Add supplier-based order review/grouping (future `SupplierOrderReview`, not implemented yet).
3. Keep queue model compatible while preparing real automation execution later.
4. Continue UI consistency fixes (row alignment, spacing, badge placement) without redesign.

## Manual Validation Focus After Changes
- Stock row alignment and status border consistency.
- Voice tag alignment in stock table.
- Review -> automation job creation still works.
- Photo confirm/send still works.
- Automation jobs run/fail/reset still works.
- LocalStorage persistence for quantities/voice/queue remains intact.

# Staff Ticket Workspace UI Redesign Plan

**Date:** March 8, 2026  
**Goal:** Replace the CSS-module-based staff ticket workspace with a modern Tailwind + shadcn + framer-motion UI using 21st dev component patterns.

---

## Overview

The four visual zones (tabs, toolbar, queue summary, ticket cards) each get a 21st dev component counterpart. All backend logic (URL-driven filters, API fetch, pagination, state) is preserved exactly — only the presentation layer changes. The CSS modules `workspace.module.css` and `staff-workspace.module.css` are deleted after migration.

---

## Step 0 — Install `framer-motion`

Run `npm install framer-motion` inside `frontend/`. This is the only new dependency — `lucide-react`, `@radix-ui/react-tabs`, `@radix-ui/react-avatar`, `@radix-ui/react-slot`, `class-variance-authority`, and all shadcn UI components (`Card`, `Avatar`, `Button`, `Badge`, `Tabs`, `Input`, `Skeleton`) are already installed.

---

## Step 1 — Create `BadgeTabs` (Tabs for My / Unassigned / All)

**File:** `components/ui/badge-tabs.tsx` (new)

Adapted from `badge-tabs-21stdev-prompt.md`:
- Uses existing shadcn `Tabs`, `TabsList`, `TabsTrigger` from `tabs.tsx`.
- Adds `framer-motion` `layoutId` animated active-pill and `AnimatePresence` badge counters.
- **Controlled** component — accepts `value` and `onValueChange` props so the workspace drives tab state from URL params.
- Props: `items: BadgeTabItem[]` (value, label, badge count), `value`, `onValueChange`, `className`.
- Badge counts show: My Tickets count, Unassigned count, total count.
- No `content` prop — all tabs share the same ticket list, just filtered differently.

---

## Step 2 — Create `FilterDropdown` (Toolbar Dropdowns)

**File:** `components/ui/filter-dropdown.tsx` (new)

Adapted from `dropdown-01-21stdev-prompt.md`:
- **Stripped** full-page layout, dark/light toggle, grid background.
- **Kept** animated dropdown button + menu: `ChevronDown` rotation, `AnimatePresence` open/close, checkmark on selected item, staggered item entry.
- Reusable typed component with props: `label`, `options[]`, `value`, `onChange`, `groups?` (for Assignment optgroups), `className`.
- Styled with Tailwind + shadcn theme tokens for dark mode compatibility.

**Toolbar layout:**
- Search input: Tailwind-styled `<Input>` with `Search` icon from lucide-react.
- Four `FilterDropdown` instances: Status, Priority, Category, Assignment.
- Assignment dropdown uses grouped sections (Presets + Staff members).
- shadcn `Button` variant="outline" for "Reset Filters".
- Responsive grid: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3`.

---

## Step 3 — Create `QueueStats` (Stats Section)

**File:** `components/features/staff/workspace/QueueStats.tsx` (new)

Adapted from `stats-section-21stdev-prompt.md`:
- 3-column responsive grid (`grid-cols-1 sm:grid-cols-3 gap-4`).
- Each stat card: bordered rounded card, `lucide-react` directional icon, large value, label, description.
- Data mapping:
  - **Visible Tickets** — count, "Count for the current filter set and page"
  - **Unassigned** — count, "Tickets without an owner", `text-destructive` icon if > 0
  - **High Priority** — count, "Cases marked high priority", `text-destructive` icon if > 0
- Uses shadcn `Skeleton` when loading.

---

## Step 4 — Create `TicketCard` (Insurance Card adaptation)

**File:** `components/features/staff/workspace/TicketCard.tsx` (new, replaces `QueueTicketCard`)

Adapted from `insurance-card-21stdev-prompt.md`:
- Uses shadcn `Card`, `CardHeader`, `CardContent`, `CardFooter`, `Avatar`, `AvatarFallback`, `Button`, `Badge`.
- `framer-motion` for hover scale and entry animation.
- Data mapping from `StaffTicketQueueItem`:

| Insurance Card Zone        | Ticket Card Equivalent                                    |
| -------------------------- | --------------------------------------------------------- |
| Avatar + client name       | Assignee initials + display name                          |
| Expire date area           | `lastUpdatedAt` with `Clock` icon                         |
| QR code area               | **Removed** — replaced with ticket number + copy button   |
| InfoItem grid (6 items)    | Status, Priority, Category, Submitter Type, Email, Source |
| Vehicle info row           | Title / Description preview (truncated)                   |
| Footer button              | "Open Ticket" link button → `/staff/tickets/${id}`        |

- Badge variants: `destructive` for High priority, `default` for Medium, `outline` for Low; `default`/`secondary` for status; `secondary` for category.
- Copy-to-clipboard on ticket number.

---

## Step 5 — Redesign `QueueSkeleton`

**File:** Update `queue-states.tsx`

- Replace CSS-module skeleton with Tailwind + shadcn `Skeleton`.
- 3 stat card skeletons + 4 ticket card skeletons matching new layouts.
- Remove old `QueueTicketCard` and `QueueMobileCard` exports.

---

## Step 6 — Rewrite `StaffWorkspaceClient`

**File:** `StaffWorkspaceClient.tsx`

**Preserved entirely:**
- All hooks, derived state, handler functions, API fetch logic, URL-driven state management.

**Replaced JSX with:**
- `BadgeTabs` (controlled, with badge counts)
- Search `<Input>` + 4 `FilterDropdown` components + Reset `Button`
- `QueueStats` component
- `TicketCard` grid (2-column on md+)
- Pagination with shadcn `Button` prev/next
- **Removed** "Backend Test Path" section (dev testing artifact).
- **Removed** `import styles from "./workspace.module.css"`.

---

## Step 7 — Update `queue-ui.tsx`

- Keep all utility functions.
- Update `statusBadge`, `priorityBadge`, `categoryBadge` to return `{ label, variant }` objects for shadcn `Badge`.
- Add color helpers for stat icons.

---

## Step 8 — Delete CSS Modules

- **Delete** `workspace.module.css` (286 lines) — fully replaced.
- **Delete** `staff-workspace.module.css` (341 lines) — confirmed unused.

---

## File Summary

| Action      | File                                                            |
| ----------- | --------------------------------------------------------------- |
| **New**     | `frontend/components/ui/badge-tabs.tsx`                         |
| **New**     | `frontend/components/ui/filter-dropdown.tsx`                    |
| **New**     | `frontend/components/features/staff/workspace/QueueStats.tsx`   |
| **New**     | `frontend/components/features/staff/workspace/TicketCard.tsx`   |
| **Rewrite** | `frontend/components/features/staff/workspace/StaffWorkspaceClient.tsx` |
| **Rewrite** | `frontend/components/features/staff/workspace/queue-states.tsx` |
| **Update**  | `frontend/components/features/staff/workspace/queue-ui.tsx`     |
| **Delete**  | `frontend/components/features/staff/workspace/workspace.module.css` |
| **Delete**  | `frontend/components/features/staff/staff-workspace.module.css` |
| **Untouched** | `frontend/components/features/staff/ticket-detail/` (out of scope) |

---

## Decisions

- **Filter UI**: Compact animated filter dropdowns adapted from Dropdown 01
- **Skeleton**: Redesigned to match new card/stats layout using shadcn `Skeleton`
- **Backend Test Path section**: Removed (dev testing artifact)
- **Ticket cards layout**: 2-column grid on md+, single column on mobile
- **Dark mode**: Free with shadcn theme tokens
- **`badge-tabs.tsx` and `filter-dropdown.tsx`**: In `components/ui/` (reusable primitives)
- **`QueueStats` and `TicketCard`**: In `components/features/staff/workspace/` (domain-specific)

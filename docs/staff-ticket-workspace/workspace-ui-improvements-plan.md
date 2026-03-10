# Staff Ticket Workspace — UI Improvements Plan (Phase 2)

**Date:** March 8, 2026  
**Prerequisite:** Phase 1 redesign complete (Tailwind + shadcn + framer-motion scaffold).  
**Goal:** Polish the existing 21st dev component scaffold with semantic colors, richer animations, better visual hierarchy, and improved micro-interactions.

---

## Overview

Phase 1 delivered the structural migration from CSS modules to Tailwind/shadcn/framer-motion. Phase 2 targets **visual refinement** — semantic badge colors, relative timestamps, priority-accented cards, filter-chip UX, and smoother skeleton/loading states. All business logic and URL-driven state management remain untouched.

---

## File-by-File Changes

### 1. `queue-ui.tsx` — Semantic Colors & Helpers

**Current:** `BadgeInfo` returns `{ label, variant }`. Badges use only generic shadcn variants (`default`, `secondary`, `outline`, `destructive`).

**Changes:**
- Add optional `className` to `BadgeInfo` type: `{ label, variant, className? }`.
- `statusBadge()` — assign per-status semantic Tailwind colors:
  | Status          | className                                    |
  | --------------- | -------------------------------------------- |
  | Open            | `bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400` |
  | In Progress     | `bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400`             |
  | Pending Review  | `bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400`         |
  | Escalated       | `bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-400`     |
  | Resolved        | `bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400`         |
  | Closed          | `bg-gray-100 text-gray-800 dark:bg-gray-800/40 dark:text-gray-400`             |
  | Rejected        | `bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400`                 |
  | On Hold         | `bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400`     |
  - All variants set to `"outline"` so shadcn badge provides the shell and the className overrides fill/text.
- `priorityBadge()` — add `className` for each level:
  | Priority | className                                    |
  | -------- | -------------------------------------------- |
  | High     | `bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400`     |
  | Medium   | `bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400` |
  | Low      | `bg-slate-100 text-slate-800 dark:bg-slate-800/40 dark:text-slate-400`  |
- New helper — **`relativeTime(dateString)`**: returns human-readable relative timestamps ("2 hours ago", "3 days ago", "just now"). Used in `TicketCard` instead of `formatDateTime()`.
- New helper — **`priorityBorderColor(priority)`**: returns a Tailwind border-color class for the priority-accent left-border on ticket cards:
  | Priority | Class                |
  | -------- | -------------------- |
  | High     | `border-l-red-500`   |
  | Medium   | `border-l-amber-400` |
  | Low      | `border-l-slate-300` |

---

### 2. `TicketCard.tsx` — Priority Accent, Relative Time, Hover Lift

**Current:** Uniform `border-primary/10`, uses `formatDateTime()`, `whileHover: { scale: 1.015 }`.

**Changes:**
- **Priority left-border accent:** Add `border-l-4` + `priorityBorderColor(ticket.priority)` to the `<Card>` element. Gives an instant visual scan cue for urgency.
- **Title above badges:** Move `ticket.title` above the badge row for better reading hierarchy.
- **Relative time:** Replace `formatDateTime(ticket.lastUpdatedAt)` with `relativeTime(ticket.lastUpdatedAt)`.
- **Unassigned styling:** When `ticket.assignedStaff` is null, show avatar with dashed border (`border-dashed`) and muted text to visually distinguish unowned tickets.
- **Hover animation:** Replace `whileHover: { scale: 1.015 }` with `whileHover: { y: -2 }` (subtle lift, avoids layout jank from scale).
- **Open Ticket button:** Add `ArrowRight` icon (lucide) in the button for a clearer call-to-action. New import: `ArrowRight` from `lucide-react`.

---

### 3. `QueueStats.tsx` — Stat Icons, Animated Entry, Layout

**Current:** `MoveUpRight`/`MoveDownLeft` icons, no entry animation, value-above-label layout.

**Changes:**
- **Per-stat icons:** Replace directional arrows with meaningful icons:
  | Stat            | Icon              | Import                              |
  | --------------- | ----------------- | ----------------------------------- |
  | Visible Tickets | `Ticket`          | `lucide-react`                     |
  | Unassigned      | `UserX`           | `lucide-react`                     |
  | High Priority   | `AlertTriangle`   | `lucide-react`                     |
  - Add `icon?: React.ReactNode` to the `StatItem` interface.
- **Staggered entry animation:** Wrap each stat card in `motion.div` with staggered `initial/animate` (fade + slide-up, 0.1s delay between cards).
- **Label-above-value layout:** Show label first (small text), then large value, then description. Current layout puts the icon → value → description.
- **Hover effect:** Subtle `border-primary/30` on hover transition.

---

### 4. `badge-tabs.tsx` — Solid Pill, Backdrop Blur, Centered

**Current:** Translucent `bg-primary/10` pill, `bg-background/30` list background, left-aligned.

**Changes:**
- **Solid white pill:** Replace `bg-primary/10` with `bg-white dark:bg-white/10 shadow-sm` for a more defined active indicator.
- **Backdrop blur:** Add `backdrop-blur-sm` to `TabsList` for frosted glass effect against page background.
- **Centered layout:** Add `justify-center` to the tab list so tabs are centered in the bar.
- **Tighter gap:** Reduce `gap-2` to `gap-1` for a more compact tab strip.

---

### 5. `filter-dropdown.tsx` — Keyboard, Focus Ring, Active Highlight

**Current:** Only closes on outside click. No keyboard handling. No visual distinction when a filter is active.

**Changes:**
- **Escape key close:** Add `onKeyDown` listener for `Escape` to close the dropdown.
- **Focus-visible ring:** Add `focus-visible:ring-2 focus-visible:ring-ring` to the trigger button for keyboard navigation accessibility.
- **Active filter highlight:** When `value` is set (non-empty), tint the trigger button border and background (`border-primary/50 bg-primary/5`) so the user can see at a glance which filters are active.
- **Compact height:** Reduce trigger height from default to `h-9` for a tighter toolbar look.

---

### 6. `StaffWorkspaceClient.tsx` — Header, Filter Chips, Loading, Empty State, Pagination

**Current:** Plain `<h1>` header, no filter chip indicators, full `QueueSkeleton` during refresh, basic "No tickets found." empty state, text-heavy pagination.

**Changes:**
- **Header icon:** Add `LayoutDashboard` icon (lucide) next to the "Ticket Queue" heading for visual identity.
- **Active filter chips:** Below the filter dropdowns, render a row of removable pill badges showing the active filters (e.g., `Status: Open ✕`, `Priority: High ✕`). Include a "Clear all" button when 2+ filters are active. Chips use `Badge variant="secondary"` with an `X` (lucide) icon that resets that specific filter.
- **Loading overlay:** During a refresh (not the initial load), instead of flashing the full skeleton, keep the existing content visible and show a subtle overlay with `opacity-60` + `backdrop-blur-sm` over the card grid, with a centered `Loader2` spinner.
- **Empty state:** Replace plain text with a centered illustration using `Inbox` icon (lucide), a descriptive message, and a "Reset Filters" CTA button.
- **Compact pagination:** Replace "Previous"/"Next" text buttons with icon-only `ChevronLeft`/`ChevronRight` buttons with page indicator in between.
- **New imports:** `LayoutDashboard`, `ChevronLeft`, `ChevronRight`, `Inbox`, `X` from `lucide-react`; `motion` from `framer-motion`.

---

### 7. `queue-states.tsx` — Skeleton Matching New Layout

**Current:** Skeleton roughly matches Phase 1 card structure. No left-border accent or updated proportions.

**Changes:**
- **Left border accent:** Add `border-l-4 border-l-muted` to skeleton card to match the new priority left-border on real cards.
- **Smaller proportions:** Tighten avatar and badge skeleton sizes to match the updated real card layout more closely.
- **Info grid skeleton:** Update the 2-column skeleton grid to match the new label-above-value info items.

---

## Cross-Cutting Concerns

### `StaffTicketDetailClient.tsx` — Badge `className` Compatibility

After adding `className` to `BadgeInfo`, check that the ticket detail page (`StaffTicketDetailClient.tsx`) passes the `className` prop to `<Badge>` where it uses `statusBadge()` and `priorityBadge()`. This is a one-line addition per badge usage:

```tsx
<Badge variant={status.variant} className={status.className}>{status.label}</Badge>
```

---

## File Summary

| File                            | Scope                                                |
| ------------------------------- | ---------------------------------------------------- |
| `queue-ui.tsx`                  | Semantic badge colors, `relativeTime()`, `priorityBorderColor()` |
| `TicketCard.tsx`                | Priority left-border, relative time, hover lift, unassigned styling |
| `QueueStats.tsx`                | Stat icons, staggered animation, label-above-value   |
| `badge-tabs.tsx`                | Solid pill, backdrop blur, centered tabs              |
| `filter-dropdown.tsx`           | Escape close, focus ring, active filter highlight     |
| `StaffWorkspaceClient.tsx`      | Header icon, filter chips, loading overlay, empty state, pagination |
| `queue-states.tsx`              | Updated skeleton to match new card layout             |
| `StaffTicketDetailClient.tsx`   | Pass `className` on badge usages (compatibility)     |

---

## Decisions

- **Semantic colors via Tailwind `className`** rather than custom shadcn variants — avoids modifying the shared badge primitive, keeps overrides local.
- **`relativeTime()` is vanilla JS** — no `date-fns` or `dayjs` dependency, keeps bundle lean.
- **Filter chips** use existing shadcn `Badge` + `X` icon — no new primitives needed.
- **Loading overlay** (instead of full skeleton replacement) preserves user context during refreshes and feels more responsive.
- **Icon-only pagination** reduces toolbar noise — page numbers still shown as `Page X of Y`.
- **No color changes to filter-dropdown menu items** — only the trigger gets the active highlight tint so the dropdown interior stays neutral.

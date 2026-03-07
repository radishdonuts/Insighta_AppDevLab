# Staff Ticket Workspace Current Implementation

This document describes the current shadcn-first staff workspace as implemented today.

## Scope

Routes:
- `/staff`
- `/staff/tickets/[ticketId]`

Primary implementation areas:
- `frontend/components/features/staff/workspace`
- `frontend/components/features/staff/ticket-detail`

## Queue: `/staff`

The queue is implemented as a triage-first console.

Current structure:
- page header with queue positioning badges, title, and operational subtitle
- preset switch using `Tabs` for `My Tickets`, `Unassigned`, and `All`
- metric summary cards for visible tickets, unassigned visible tickets, and visible high-priority tickets
- desktop filter card with search, status, priority, category, assignment, and reset
- mobile filter entry point using a bottom `Sheet`
- desktop results in a `Table`
- mobile results in stacked compact ticket cards
- pagination block using shadcn `Pagination`

Current queue states:
- loading via `QueueSkeleton` and shadcn `Skeleton`
- request failure via `Alert`
- empty results via `Empty`
- normal results via desktop table or mobile cards

Current desktop table columns:
- ticket
- status
- priority
- category
- assignee
- updated
- source

Ticket cell content:
- ticket number
- title if present, otherwise description preview
- submitter type
- open-detail affordance

Source handling:
- queue source context is compressed with `sourceSummary`
- rendered as a compact outline `Badge`

Assignment handling:
- URL state remains the source of truth
- `assignedTo=<uuid>` is treated as explicit staff targeting
- preset assignments remain `mine`, `unassigned`, and `all`
- legacy `assignment=assigned` is canonicalized to the `all` queue view in the UI state

## Detail Workbench: `/staff/tickets/[ticketId]`

The detail page is implemented as a structured case workbench with action-first priority.

Current structure:
- top navigation back to queue
- ticket header card with title, ticket number, metadata, status badge, and priority badge
- two-column desktop layout
- stacked single-column mobile layout

Main content column:
- case summary card
- description card
- attachments card
- status history card

Action column:
- assignment card
- status update card
- current classification card
- NLP suggestion and review card

Current detail states:
- loading via `DetailSkeleton`
- request failure via `Alert`
- no attachments via `Empty`
- no history via `Empty`
- no NLP suggestion via `Empty`

Current summary coverage:
- ticket type
- category
- submitter type
- submitter identity or guest email
- assigned staff
- last updated timestamp

Current actions preserved:
- self-assign via `/assign`
- status update with optional remarks via `/status`
- NLP review option load and submission via `/nlp-review`

Current NLP presentation:
- applied category and priority shown separately from suggestion data
- source badges shown for category and priority origin
- suggested category and priority shown with decision status
- confidence shown as labeled outline badges
- review form uses shadcn fields, selects, textarea, and button actions

## Current shadcn Primitives in Use

Queue:
- `Alert`
- `Avatar`
- `Badge`
- `Button`
- `Card`
- `Empty`
- `Pagination`
- `Sheet`
- `Skeleton`
- `Table`
- `Tabs`

Detail:
- `Alert`
- `Avatar`
- `Badge`
- `Button`
- `Card`
- `Empty`
- `Field`
- `Select`
- `Separator`
- `Skeleton`
- `Textarea`

Supporting stack:
- Tailwind v4
- semantic design tokens
- `lucide-react` icons

## Verification Notes

Known current validation status:
- frontend build passes
- standalone `tsc --noEmit` is not a reliable workspace-only signal right now because the repo has stale `.next/types` references in `frontend/tsconfig.json`

This should be treated as existing repo-level TypeScript configuration debt, not a ticket workspace behavior mismatch.

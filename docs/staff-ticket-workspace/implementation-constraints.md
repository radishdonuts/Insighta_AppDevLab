# Staff Ticket Workspace Implementation Constraints

## Purpose

This document defines the guardrails for refining the staff workspace UI without breaking existing behavior.

## Backend and Route Constraints

Do not change:
- current routes
- current API endpoints
- current response shapes
- current mutation behavior
- database schema

In-scope routes:
- `/staff`
- `/staff/tickets/[ticketId]`

Preserve current endpoint usage:
- `/api/staff/tickets`
- `/api/staff/tickets/[ticketId]`
- `/api/staff/tickets/[ticketId]/assign`
- `/api/staff/tickets/[ticketId]/status`
- `/api/staff/tickets/[ticketId]/nlp-review`

Current implementation status:
- shadcn-first queue and detail workbench are already in place
- route structure remains unchanged
- API contract shape remains unchanged
- `lucide-react` is part of the current UI dependency stack

## Data That Must Remain Visible

### Queue

Must remain represented in the queue UI:
- ticket number
- submitter type
- description or equivalent short context
- status
- priority
- category
- assigned staff
- last updated timestamp
- category source
- priority source
- filters
- pagination state

### Detail

Must remain represented in the detail UI:
- ticket number
- title
- ticket type
- status
- priority
- description
- submitted time
- last updated time
- category name
- category source
- priority source
- submitter type
- submitter identity or guest email
- assigned staff
- NLP suggestion data
- attachments
- status history

### NLP Review

Must preserve visibility of:
- suggested category
- suggested priority
- confidence category
- confidence priority
- NLP source type
- whether suggestion was auto-applied
- correction controls for category, priority, and notes

## Interaction Constraints

Queue state must remain URL-driven:
- search
- status
- priority
- category
- assignment preset
- assigned staff
- page

Required actions that must remain functional:
- self-assign
- status update with remarks
- NLP correction save

## Technical Constraints

- Workspace refinements should stay shadcn-first.
- Keep Next.js App Router structure unchanged.
- Preserve staff auth gating and existing staff layout shell unless a separate effort redesigns navigation.
- Prefer refining the current shadcn composition rather than layering on more bespoke CSS.
- Use semantic Tailwind tokens and shadcn variants instead of hard-coded color classes.
- Treat the current queue/detail architecture as baseline unless a later plan explicitly replaces part of it.

## Verification Checklist

Behavior parity:
- queue filters still match existing backend behavior
- queue pagination still works
- detail page still loads all current data
- self-assign still updates the case state
- status update still accepts optional remarks
- NLP review still loads options and submits corrections
- attachments still open correctly
- image previews still render when supported
- status history still renders all current fields

Rendering parity:
- desktop queue is scannable and denser than current implementation
- mobile queue preserves all core information
- detail layout keeps actions above supporting evidence
- current applied values and NLP suggestions are clearly distinct

Engineering checks:
- frontend build passes
- newly added shadcn components compile with correct aliases

Known verification caveat:
- standalone `tsc --noEmit` is currently affected by stale `.next/types` references in `frontend/tsconfig.json`
- this should be tracked as repo-level TypeScript configuration debt unless a future plan explicitly fixes it

# Staff Ticket Workspace Context

This folder is the context-engineering hub for the staff ticket workspace.

In scope:
- `/staff`
- `/staff/tickets/[ticketId]`

The initial shadcn-first workspace redesign is already implemented. These docs now serve two purposes:
- document the current queue and detail workbench as shipped
- provide clean input for the next planning pass without re-auditing the codebase

Existing backend behavior, routes, API contracts, and displayed data remain preserved unless a separate implementation plan explicitly changes them.

Documents:
- `current-implementation.md` - current queue and detail workbench behavior, layout, and shadcn composition
- `ux-plan.md` - current UX model plus the next UX refinement targets
- `ui-plan.md` - current visual structure plus next UI polish targets
- `implementation-constraints.md` - backend, data, and technical guardrails that still apply
- `next-plan-inputs.md` - direct handoff material for the next workspace plan

Use this folder as the source of truth for future staff workspace planning and refinement.

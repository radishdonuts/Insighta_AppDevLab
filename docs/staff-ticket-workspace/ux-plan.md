# Staff Ticket Workspace UX Plan

## Current UX Model

The workspace is now implemented as a connected two-screen system:
- `/staff` is the triage queue
- `/staff/tickets/[ticketId]` is the case workbench

The current product intent remains:
- help staff identify what needs action now
- help staff understand ownership and urgency quickly
- keep assignment, status, and NLP review actions close to the case context

Primary users:
- staff
- admin acting as staff

This remains an operational workspace, not a browsing or reporting interface.

## Current Queue UX

The queue currently behaves as a command surface.

Current user flow:
- choose a queue preset
- adjust filters without leaving the page
- scan visible tickets for status, priority, category, ownership, and freshness
- open the dedicated detail page for one case

Current queue UX characteristics:
- URL query params remain the source of truth
- `My Tickets`, `Unassigned`, and `All` remain first-class presets
- search, status, priority, category, assignment, and page stay synchronized with the URL
- desktop uses a denser scan pattern than the prior oversized card layout
- mobile moves filters into a bottom sheet and uses stacked compact ticket cards

Current queue information order still aligns with the original intent:
1. Ticket identity
2. Status
3. Priority
4. Category
5. Assignment state
6. Last updated time
7. Short context
8. Source context

Current queue states are implemented for:
- loading
- empty
- error
- normal results
- filtered results

## Current Detail UX

The detail page currently behaves as an action-first workbench.

Current user flow:
- enter from the queue
- confirm the ticket identity and current state
- take assignment or status action
- review current classification
- review or correct NLP suggestion data
- inspect description, attachments, and status history as supporting evidence

Current detail UX characteristics:
- identity and state appear before supporting evidence
- assignment and status actions remain above attachments and history
- current applied category and priority are separated from NLP suggestion data
- supporting content stays below the main action area
- mobile keeps summary and actions above evidence-heavy sections

## Preserved Functional UX

The implemented workspace preserves:
- queue loading from `/api/staff/tickets`
- queue filters and pagination
- dedicated detail loading from `/api/staff/tickets/[ticketId]`
- self-assign behavior
- status update with optional remarks
- NLP review option loading
- NLP correction submission
- attachment linking and preview
- status history display

## Next UX Refinement Targets

The next planning pass should focus on refinement, not structural reinvention.

Queue UX questions to resolve:
- is the current scan density high enough for real staff throughput
- do summary cards improve triage or distract from the queue
- is preview text weighted correctly against ownership and urgency signals
- are mobile filter interactions efficient enough for repeated use

Detail UX questions to resolve:
- does the current action rail feel compact enough on smaller laptop heights
- is the difference between current classification and NLP suggestion immediate enough at a glance
- should attachments and history become denser or more progressively disclosed on mobile
- does the header card carry the right amount of context before the summary card begins

## UX Acceptance Criteria

- Staff can identify ticket urgency and ownership from the queue without opening each ticket.
- Staff can move from queue to detail in one direct action.
- Staff can assign or update a ticket without first scanning attachments or timelines.
- Staff can distinguish applied values from NLP-suggested values immediately.
- Mobile users retain all core actions and required data visibility.
- The next plan treats the current UX as baseline and proposes targeted improvements only where friction remains.

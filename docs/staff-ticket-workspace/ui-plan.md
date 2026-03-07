# Staff Ticket Workspace UI Plan

## Current Visual Direction

The implemented workspace follows this visual direction:
- modern ops console
- restrained and operational
- neutral surfaces with semantic status color
- denser than the older large-card workspace

This remains the right direction for follow-up work.

Avoid in future passes:
- marketing-style hero treatments
- oversized decorative shells
- glass-heavy styling as the dominant visual language
- gradients or effects that compete with ticket data

## Current shadcn Strategy

The workspace is already shadcn-first.

Current primary primitives:
- `Alert`
- `Avatar`
- `Badge`
- `Button`
- `Card`
- `Empty`
- `Field`
- `Input`
- `Pagination`
- `Select`
- `Separator`
- `Sheet`
- `Skeleton`
- `Table`
- `Tabs`
- `Textarea`

Current composition rules that should remain:
- use full card composition
- use semantic color tokens only
- keep custom styling focused on layout and page-specific structure
- prefer shadcn primitives over custom presentation markup

## Current Queue UI

### Page structure

The queue currently renders in this order:
- page header with positioning badges, title, and subtitle
- preset tabs
- metric summary cards
- filter card
- results section
- pagination footer

### Current desktop queue

Desktop primary pattern:
- `Table`

Current columns:
- Ticket
- Status
- Priority
- Category
- Assignee
- Updated
- Source

Current ticket cell treatment:
- ticket number as the strongest label
- secondary ticket title or truncated description
- submitter type beneath
- explicit open-detail affordance

Current desktop filters:
- search input
- status select
- priority select
- category select
- assignment control
- reset button

### Current mobile queue

Mobile pattern:
- filter entry button
- bottom `Sheet` for queue controls
- compact stacked `Card` ticket rows

Current mobile card order:
- ticket identity
- status and priority badges
- context preview
- category
- assignee
- updated timestamp
- source badge

### Current queue states

Current state components:
- loading via `Skeleton`
- failure via `Alert`
- empty via `Empty`
- normal results via `Table` or mobile `Card` list

## Current Detail Workbench UI

### Page structure

The detail workbench currently renders in this order:
- back navigation
- header card
- two-column content layout on desktop
- stacked card layout on mobile

### Current desktop detail layout

Main column:
- case summary
- description
- attachments
- status history

Action column:
- assignment
- status update
- current classification
- NLP suggestion and review

The current layout already expresses the intended action-first model.

### Current mobile detail layout

Current mobile order:
- header
- summary
- assignment
- status update
- current classification
- NLP review
- description
- attachments
- status history

### Current classification and NLP UI

Current visual separation:
- applied values are shown in their own classification area
- source badges are separate from suggested values
- suggestion values, confidence, and review controls share the NLP review card

This is structurally correct, but likely still a candidate for hierarchy and spacing refinement.

## Next UI Polish Targets

The next pass should focus on visual and interaction polish, not component-system replacement.

Queue targets:
- tighten table row density without hurting readability
- review the weight and spacing of metric cards
- tighten filter card spacing and alignment
- normalize badge prominence across status, priority, category, and source

Detail targets:
- tighten card spacing in the right rail
- strengthen hierarchy between summary, classification, and NLP review sections
- review header card weight versus summary card weight
- increase density in attachments and history lists

Cross-cutting targets:
- normalize section-title rhythm
- normalize muted-text contrast and readability
- reduce any redundant icon use
- ensure desktop and mobile feel like the same system, not two visual modes

## Styling Rules

- Use semantic shadcn tokens for surfaces, borders, and typography.
- Status color should communicate meaning without dominating the page.
- Priority should remain visually stronger than category.
- Category should stay informative but quieter.
- Source indicators should remain subtle and compact.
- Density should support triage and action, not browsing.
- Queue views should truncate aggressively; detail views should not.
- Buttons should remain operational controls, not CTA-style hero actions.

## Do Not Do

- Do not treat the next pass as a full visual reboot.
- Do not replace the desktop queue with oversized freeform cards.
- Do not hide assignment or status actions behind extra menus.
- Do not merge applied values and NLP suggestions into one ambiguous block.
- Do not introduce backend assumptions into visual decisions.

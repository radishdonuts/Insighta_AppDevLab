# Staff Ticket Workspace Next Plan Inputs

This document is the direct handoff input for the next planning pass.

The next plan should treat the current shadcn workspace as the baseline, not as a blank-slate redesign target.

## Goal for the Next Pass

Refine and polish the implemented workspace so it becomes more consistent, denser, and more operationally legible without changing backend behavior or rebuilding the information architecture from scratch.

## Known Inputs for the Next Plan

### Queue

Likely follow-up targets:
- tighten vertical density in the desktop table and filter region
- review whether metric cards earn their space at all screen sizes
- improve visual alignment between preset tabs, metrics, filters, and results
- review whether ticket preview text is balanced correctly against status and ownership signals
- confirm the table remains the right primary desktop pattern for high-volume triage

### Detail

Likely follow-up targets:
- refine hierarchy between the header card, case summary, and right-rail actions
- tighten spacing in the action column to reduce scroll pressure
- review whether the classification card and NLP review card should feel more distinct without adding visual noise
- improve attachment and history presentation density
- review mobile sequencing and section weight after real-device checks

### Cross-cutting UI consistency

Likely follow-up targets:
- normalize badge weight and variant meaning across queue and detail views
- normalize card header density and section title treatment
- confirm muted text usage is consistent and not overly soft for operational UI
- review icon usage so it supports scanability instead of decoration
- review empty-state language for consistency across queue and detail

## Non-goals for the Next Pass

Do not assume:
- route changes
- API changes
- schema changes
- new backend-derived analytics
- batch actions
- modal routing for detail
- workspace navigation redesign outside the current staff shell

## Decision Defaults for the Next Plan

Unless the next planning discussion overrides them, default to:
- keeping the current queue and detail route split
- keeping shadcn primitives as the primary composition layer
- preserving URL-driven queue state
- treating the next pass as a refinement pass, not a structural rewrite

## Acceptance Criteria for the Next Plan

The next plan should be considered ready only if it:
- starts from the current implemented workspace, not the old pre-build concept
- identifies concrete UX and UI improvements instead of re-describing the existing architecture
- preserves all current ticket data visibility and backend actions
- includes verification criteria for desktop, mobile, and operational states

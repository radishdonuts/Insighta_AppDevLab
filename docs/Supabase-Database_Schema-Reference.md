# Insighta – Supabase Database Schema Reference

> **Purpose**: This document describes every table, column, enum, function, and trigger in the Insighta Supabase project so that developers and AI assistants can understand the data model without needing direct database access.

---

## Table of Contents

1. [Enumerated Types](#enumerated-types)
2. [Tables](#tables)
   - [profiles](#profiles)
   - [guest_contacts](#guest_contacts)
   - [complaint_categories](#complaint_categories)
   - [nlp_intent_labels](#nlp_intent_labels)
   - [nlp_issue_type_labels](#nlp_issue_type_labels)
   - [nlp_issue_category_map](#nlp_issue_category_map)
   - [tickets](#tickets)
   - [ticket_nlp_analyses](#ticket_nlp_analyses)
   - [ticket_nlp_reviews](#ticket_nlp_reviews)
   - [attachments](#attachments)
   - [ticket_status_history](#ticket_status_history)
   - [ticket_access_tokens](#ticket_access_tokens)
   - [notifications](#notifications)
   - [feedback](#feedback)
   - [system_activity_logs](#system_activity_logs)
3. [Database Functions](#database-functions)
   - [sha256_hex](#sha256_hex)
   - [set_updated_at](#set_updated_at)
   - [set_last_updated_at](#set_last_updated_at)
   - [handle_new_user](#handle_new_user)
   - [guest_ticket_lookup](#guest_ticket_lookup)
4. [Triggers](#triggers)
5. [Relationships (ER Summary)](#relationships-er-summary)

---

## Schema Updates (2026-03-02)

The following schema changes were applied through repo migrations:

- `202603020001_001_nlp_input_foundation.sql`
- `202603020002_002_nlp_taxonomy.sql`
- `202603020003_003_nlp_history_and_review.sql`
- `202603020004_004_token_hash_normalization.sql`

### Tickets Table Additions

The `tickets` table now includes:

- `title text` (optional; max 120 chars via `tickets_title_len_chk`)
- `nlp_input_text text` (stored NLP input snapshot)
- `detected_intent_id uuid` FK → `nlp_intent_labels(id)`
- `issue_type_id uuid` FK → `nlp_issue_type_labels(id)`
- `nlp_confidence numeric(5,4)` (`tickets_nlp_confidence_chk`, range 0..1)
- `nlp_model_version text`
- `nlp_updated_at timestamptz`

Additional index:

- `tickets_nlp_pending_idx` partial index on `submitted_at desc`, for rows with missing NLP fields.

### New NLP Taxonomy Tables

- `nlp_intent_labels`
- `nlp_issue_type_labels`
- `nlp_issue_category_map`

These tables enforce closed-label NLP taxonomy and map issue types to complaint categories/default priority.

### New NLP Lifecycle Tables

- `ticket_nlp_analyses`
- `ticket_nlp_reviews`

These tables store model-run history (success/failure/skip, model metadata, raw output, applied state) and human correction feedback for retraining.

### Token Storage Hardening

`ticket_access_tokens.token_hash` was normalized to SHA-256 hashes for legacy rows where values were still raw `TRK-*` tokens.

## Enumerated Types

| Enum Name          | Purpose                                  | Values (confirmed from Supabase UI)                                         |
| ------------------ | ---------------------------------------- | --------------------------------------------------------------------------- |
| `user_role`        | Role assigned to a profile               | `Customer`, `Staff`, `Admin`                                                |
| `ticket_type`      | The type/channel of a ticket             | `Complaint`, `Feedback`                                                     |
| `ticket_status`    | Lifecycle status of a ticket             | `Under Review`, `In Progress`, `Pending Customer Response`, `Resolved`, `Closed` |
| `delivery_status`  | Notification delivery state              | `Pending`, `Sent`, `Failed`                                                 |
| `ticket_priority`  | Urgency level of a ticket                | `Low`, `Medium`, `High`                                                     |
| `sentiment_label`  | NLP-detected sentiment of the complaint  | `Negative`, `Neutral`, `Positive`                                           |

> All enums are `USER-DEFINED` PostgreSQL types in the `public` schema.

---

## Tables

### profiles

Mirrors Supabase Auth users. A row is auto-created via the `handle_new_user` trigger function whenever a new user signs up.

| Column         | Type                       | Nullable | Default                          | Notes                                          |
| -------------- | -------------------------- | -------- | -------------------------------- | ---------------------------------------------- |
| `id`           | `uuid`                     | **NO**   | `gen_random_uuid()`              | PK – also FK → `auth.users(id)`               |
| `email`        | `text`                     | **NO**   | —                                | Unique                                         |
| `first_name`   | `text`                     | YES      | —                                |                                                |
| `last_name`    | `text`                     | YES      | —                                |                                                |
| `role`         | `user_role`                | **NO**   | `'Customer'::user_role`          |                                                |
| `is_active`    | `boolean`                  | **NO**   | —                                |                                                |
| `created_at`   | `timestamptz`              | **NO**   | —                                |                                                |
| `last_login_at`| `timestamptz`              | YES      | —                                |                                                |

**Constraints**

- `profiles_pkey` – PRIMARY KEY (`id`)
- `profiles_id_fkey` – FOREIGN KEY (`id`) → `auth.users(id)`
- Unique on `email`

**RLS / Policies**

- Row Level Security should be **enabled** on `profiles`.
- Authenticated users should be allowed to read **their own** profile row (required for frontend middleware / RBAC checks).

```sql
alter table public.profiles enable row level security;

create policy "profiles_select_own"
on public.profiles
for select
to authenticated
using (id = auth.uid());
```

---

### guest_contacts

Stores email addresses of unauthenticated (guest) users who submit complaints.

| Column       | Type            | Nullable | Default             |
| ------------ | --------------- | -------- | ------------------- |
| `id`         | `uuid`          | **NO**   | `gen_random_uuid()` |
| `email`      | `text`          | **NO**   | —                   |
| `created_at` | `timestamptz`   | **NO**   | `now()`             |

**Constraints**

- `guest_contacts_pkey` – PRIMARY KEY (`id`)

---

### complaint_categories

Lookup table for complaint/ticket categories (e.g. "Claim Denial", "Billing", "Policy Cancellation").

| Column          | Type          | Nullable | Default             |
| --------------- | ------------- | -------- | ------------------- |
| `id`            | `uuid`        | **NO**   | `gen_random_uuid()` |
| `category_name` | `text`        | **NO**   | —                   |
| `is_active`     | `boolean`     | **NO**   | `true`              |
| `created_at`    | `timestamptz` | **NO**   | `now()`             |
| `updated_at`    | `timestamptz` | **NO**   | `now()`             |

**Constraints**

- `complaint_categories_pkey` – PRIMARY KEY (`id`)

**Triggers**

- `trg_complaint_categories_...` → calls `set_updated_at()` BEFORE UPDATE to auto-set `updated_at`.

---

### nlp_intent_labels

Closed taxonomy for normalized NLP intent labels.

Seeded labels include `Share Positive Feedback` (code: `share_positive_feedback`) for positive submissions.

| Column         | Type          | Nullable | Default             | Notes |
| -------------- | ------------- | -------- | ------------------- | ----- |
| `id`           | `uuid`        | **NO**   | `gen_random_uuid()` | PK |
| `code`         | `text`        | **NO**   | —                   | Unique stable key (snake_case) |
| `display_name` | `text`        | **NO**   | —                   | Canonical human-readable label |
| `is_active`    | `boolean`     | **NO**   | `true`              | Active labels are available for NLP mapping/review |
| `created_at`   | `timestamptz` | **NO**   | `now()`             | |
| `updated_at`   | `timestamptz` | **NO**   | `now()`             | |

**Constraints**

- `nlp_intent_labels_pkey` – PRIMARY KEY (`id`)
- Unique on `code`

---

### nlp_issue_type_labels

Closed taxonomy for normalized NLP issue-type labels.

Seeded labels include `Positive Feedback` (code: `positive_feedback`).

| Column         | Type          | Nullable | Default             | Notes |
| -------------- | ------------- | -------- | ------------------- | ----- |
| `id`           | `uuid`        | **NO**   | `gen_random_uuid()` | PK |
| `code`         | `text`        | **NO**   | —                   | Unique stable key (snake_case) |
| `display_name` | `text`        | **NO**   | —                   | Canonical human-readable label |
| `is_active`    | `boolean`     | **NO**   | `true`              | Active labels are available for NLP mapping/review |
| `created_at`   | `timestamptz` | **NO**   | `now()`             | |
| `updated_at`   | `timestamptz` | **NO**   | `now()`             | |

**Constraints**

- `nlp_issue_type_labels_pkey` – PRIMARY KEY (`id`)
- Unique on `code`

---

### nlp_issue_category_map

Maps each normalized NLP issue type to a default complaint category and optional default priority.

`positive_feedback` is mapped to complaint category `Positive Feedback` with default priority `Low`.

| Column             | Type              | Nullable | Default | Notes |
| ------------------ | ----------------- | -------- | ------- | ----- |
| `issue_type_id`    | `uuid`            | **NO**   | —       | PK, FK → `nlp_issue_type_labels(id)` |
| `category_id`      | `uuid`            | **NO**   | —       | FK → `complaint_categories(id)` |
| `default_priority` | `ticket_priority` | YES      | —       | Optional default priority for mapped issue type |
| `created_at`       | `timestamptz`     | **NO**   | `now()` | |

**Constraints**

- `nlp_issue_category_map_pkey` – PRIMARY KEY (`issue_type_id`)
- `nlp_issue_category_map_issue_type_id_fkey` → `nlp_issue_type_labels(id)`
- `nlp_issue_category_map_category_id_fkey` → `complaint_categories(id)`

---

### tickets

Central table storing every complaint or inquiry.

| Column               | Type              | Nullable | Default                         | Notes |
| -------------------- | ----------------- | -------- | ------------------------------- | ----- |
| `id`                 | `uuid`            | **NO**   | `gen_random_uuid()`             | PK |
| `ticket_number`      | `text`            | **NO**   | -                               | Unique human-readable reference (e.g. `TKT-00012`) |
| `ticket_type`        | `ticket_type`     | **NO**   | -                               | Enum (complaint, inquiry, etc.) |
| `title`              | `text`            | YES      | -                               | Optional short summary (`char_length <= 120`) |
| `description`        | `text`            | **NO**   | -                               | Free-text complaint body |
| `nlp_input_text`     | `text`            | YES      | -                               | Stable input snapshot used for NLP |
| `submitted_at`       | `timestamptz`     | **NO**   | `now()`                         | |
| `status`             | `ticket_status`   | **NO**   | `'Under Review'::ticket_status` | |
| `priority`           | `ticket_priority` | **NO**   | `'Medium'::ticket_priority`     | |
| `sentiment`          | `sentiment_label` | YES      | -                               | Current NLP sentiment applied to ticket |
| `detected_intent`    | `text`            | YES      | -                               | Compatibility text label for intent |
| `detected_intent_id` | `uuid`            | YES      | -                               | FK -> `nlp_intent_labels(id)` |
| `issue_type`         | `text`            | YES      | -                               | Compatibility text label for issue type |
| `issue_type_id`      | `uuid`            | YES      | -                               | FK -> `nlp_issue_type_labels(id)` |
| `nlp_confidence`     | `numeric(5,4)`    | YES      | -                               | Latest NLP confidence in range 0..1 |
| `nlp_model_version`  | `text`            | YES      | -                               | Model version used for latest applied analysis |
| `nlp_updated_at`     | `timestamptz`     | YES      | -                               | Timestamp of latest NLP update |
| `category_id`        | `uuid`            | **NO**   | -                               | FK -> `complaint_categories(id)` |
| `customer_id`        | `uuid`            | YES      | -                               | FK -> `profiles(id)` (logged-in submitter) |
| `guest_id`           | `uuid`            | YES      | -                               | FK -> `guest_contacts(id)` (guest submitter) |
| `assigned_staff_id`  | `uuid`            | YES      | -                               | FK -> `profiles(id)` (assigned staff) |
| `last_updated_at`    | `timestamptz`     | **NO**   | `now()`                         | Auto-updated via trigger |

**Constraints**

- `tickets_pkey` - PRIMARY KEY (`id`)
- Unique on `ticket_number`
- `tickets_category_id_fkey` -> `complaint_categories(id)`
- `tickets_customer_id_fkey` -> `profiles(id)`
- `tickets_guest_id_fkey` -> `guest_contacts(id)`
- `tickets_assigned_staff_id_fkey` -> `profiles(id)`
- `tickets_detected_intent_id_fkey` -> `nlp_intent_labels(id)`
- `tickets_issue_type_id_fkey` -> `nlp_issue_type_labels(id)`
- `tickets_title_len_chk` enforces `char_length(title) <= 120` when title is present
- `tickets_nlp_confidence_chk` enforces `0 <= nlp_confidence <= 1` when confidence is present

**Indexes**

- `tickets_nlp_pending_idx` on (`submitted_at desc`) where any NLP outputs are missing

**Triggers**

- `trg_tickets_last_updated_at` -> calls `set_last_updated_at()` BEFORE UPDATE to auto-set `last_updated_at`.

---
### ticket_nlp_analyses

Versioned NLP run log for each ticket enrichment attempt.

| Column               | Type            | Nullable | Default             | Notes |
| -------------------- | --------------- | -------- | ------------------- | ----- |
| `id`                 | `uuid`          | **NO**   | `gen_random_uuid()` | PK |
| `ticket_id`          | `uuid`          | **NO**   | —                   | FK → `tickets(id)` |
| `input_text`         | `text`          | **NO**   | —                   | NLP input snapshot for this run |
| `model_provider`     | `text`          | **NO**   | —                   | Provider used for inference |
| `model_name`         | `text`          | **NO**   | —                   | Model name |
| `model_version`      | `text`          | **NO**   | —                   | Model version |
| `prompt_version`     | `text`          | YES      | —                   | Prompt/template version |
| `sentiment`          | `sentiment_label` | YES    | —                   | Predicted sentiment |
| `detected_intent_id` | `uuid`          | YES      | —                   | FK → `nlp_intent_labels(id)` |
| `detected_intent_raw`| `text`          | YES      | —                   | Raw intent text returned by model |
| `issue_type_id`      | `uuid`          | YES      | —                   | FK → `nlp_issue_type_labels(id)` |
| `issue_type_raw`     | `text`          | YES      | —                   | Raw issue-type text returned by model |
| `priority`           | `ticket_priority` | YES    | —                   | Predicted/derived priority |
| `category_id`        | `uuid`          | YES      | —                   | FK → `complaint_categories(id)` |
| `category_name_raw`  | `text`          | YES      | —                   | Raw category text returned by model |
| `confidence`         | `numeric(5,4)`  | YES      | —                   | Confidence in range 0..1 |
| `raw_output`         | `jsonb`         | YES      | —                   | Stored model payload |
| `status`             | `text`          | **NO**   | —                   | `succeeded`, `failed`, or `skipped` |
| `error_message`      | `text`          | YES      | —                   | Error reason when failed/skipped |
| `is_applied`         | `boolean`       | **NO**   | `false`             | Whether output was applied to `tickets` |
| `created_at`         | `timestamptz`   | **NO**   | `now()`             | |
| `applied_at`         | `timestamptz`   | YES      | —                   | Applied timestamp |

**Constraints**

- `ticket_nlp_analyses_pkey` – PRIMARY KEY (`id`)
- `ticket_nlp_analyses_ticket_id_fkey` → `tickets(id)`
- `ticket_nlp_analyses_detected_intent_id_fkey` → `nlp_intent_labels(id)`
- `ticket_nlp_analyses_issue_type_id_fkey` → `nlp_issue_type_labels(id)`
- `ticket_nlp_analyses_category_id_fkey` → `complaint_categories(id)`
- `status` check: value is one of `succeeded`, `failed`, `skipped`
- `confidence` check: null or `0 <= confidence <= 1`

**Indexes**

- `ticket_nlp_analyses_ticket_idx` on (`ticket_id`, `created_at desc`)

---

### ticket_nlp_reviews

Human review/correction log for NLP outputs; supports future model retraining datasets.

| Column                    | Type              | Nullable | Default             | Notes |
| ------------------------- | ----------------- | -------- | ------------------- | ----- |
| `id`                      | `uuid`            | **NO**   | `gen_random_uuid()` | PK |
| `ticket_id`               | `uuid`            | **NO**   | —                   | FK → `tickets(id)` |
| `analysis_id`             | `uuid`            | YES      | —                   | FK → `ticket_nlp_analyses(id)` |
| `reviewer_id`             | `uuid`            | **NO**   | —                   | FK → `profiles(id)` |
| `corrected_sentiment`     | `sentiment_label` | YES      | —                   | Reviewer-corrected sentiment |
| `corrected_intent_id`     | `uuid`            | YES      | —                   | FK → `nlp_intent_labels(id)` |
| `corrected_issue_type_id` | `uuid`            | YES      | —                   | FK → `nlp_issue_type_labels(id)` |
| `corrected_priority`      | `ticket_priority` | YES      | —                   | Reviewer-corrected priority |
| `corrected_category_id`   | `uuid`            | YES      | —                   | FK → `complaint_categories(id)` |
| `notes`                   | `text`            | YES      | —                   | Optional reviewer notes |
| `created_at`              | `timestamptz`     | **NO**   | `now()`             | |

**Constraints**

- `ticket_nlp_reviews_pkey` – PRIMARY KEY (`id`)
- `ticket_nlp_reviews_ticket_id_fkey` → `tickets(id)`
- `ticket_nlp_reviews_analysis_id_fkey` → `ticket_nlp_analyses(id)` (`ON DELETE SET NULL`)
- `ticket_nlp_reviews_reviewer_id_fkey` → `profiles(id)`
- `ticket_nlp_reviews_corrected_intent_id_fkey` → `nlp_intent_labels(id)`
- `ticket_nlp_reviews_corrected_issue_type_id_fkey` → `nlp_issue_type_labels(id)`
- `ticket_nlp_reviews_corrected_category_id_fkey` → `complaint_categories(id)`

---

### attachments

Files uploaded alongside a ticket (stored in Supabase Storage; this table holds metadata).

| Column        | Type          | Nullable | Default             | Notes                                    |
| ------------- | ------------- | -------- | ------------------- | ---------------------------------------- |
| `id`          | `uuid`        | **NO**   | `gen_random_uuid()` | PK                                       |
| `ticket_id`   | `uuid`        | **NO**   | —                   | FK → `tickets(id)`                       |
| `file_name`   | `text`        | **NO**   | —                   | Original file name                       |
| `file_type`   | `text`        | YES      | —                   | MIME type                                |
| `file_path`   | `text`        | **NO**   | —                   | Path inside the Supabase Storage bucket  |
| `uploaded_at` | `timestamptz` | **NO**   | `now()`             |                                          |

**Constraints**

- `attachments_pkey` – PRIMARY KEY (`id`)
- `attachments_ticket_id_fkey` → `tickets(id)`

---

### ticket_status_history

Audit log of every status change on a ticket.

| Column              | Type            | Nullable | Default             | Notes                        |
| ------------------- | --------------- | -------- | ------------------- | ---------------------------- |
| `id`                | `uuid`          | **NO**   | `gen_random_uuid()` | PK                           |
| `ticket_id`         | `uuid`          | **NO**   | —                   | FK → `tickets(id)`           |
| `old_status`        | `ticket_status` | **NO**   | —                   |                              |
| `new_status`        | `ticket_status` | **NO**   | —                   |                              |
| `changed_by_user_id`| `uuid`          | **NO**   | —                   | FK → `profiles(id)`          |
| `changed_at`        | `timestamptz`   | **NO**   | `now()`             |                              |
| `remarks`           | `text`          | YES      | —                   | Optional note about the change |

**Constraints**

- `ticket_status_history_pkey` – PRIMARY KEY (`id`)
- `ticket_status_history_ticket_id_fkey` → `tickets(id)`
- `ticket_status_history_changed_by_user_id_fkey` → `profiles(id)`

---

### ticket_access_tokens

Allows unauthenticated (guest) users to view their ticket via a secret URL token. Tokens are stored **hashed** (SHA-256).

| Column       | Type          | Nullable | Default             | Notes                              |
| ------------ | ------------- | -------- | ------------------- | ---------------------------------- |
| `id`         | `uuid`        | **NO**   | `gen_random_uuid()` | PK                                 |
| `ticket_id`  | `uuid`        | **NO**   | —                   | FK → `tickets(id)`                 |
| `token_hash` | `text`        | **NO**   | —                   | SHA-256 hex digest of raw token; Unique |
| `created_at` | `timestamptz` | **NO**   | `now()`             |                                    |
| `expires_at` | `timestamptz` | YES      | —                   | NULL = never expires               |
| `used_at`    | `timestamptz` | YES      | —                   | Tracks last usage time             |

**Constraints**

- `ticket_access_tokens_pkey` – PRIMARY KEY (`id`)
- Unique on `token_hash`
- `ticket_access_tokens_ticket_id_fkey` → `tickets(id)`

---

### notifications

Log of all notifications sent (email, in-app, etc.) related to tickets.

| Column             | Type          | Nullable | Default             | Notes                           |
| ------------------ | ------------- | -------- | ------------------- | ------------------------------- |
| `id`               | `uuid`        | **NO**   | `gen_random_uuid()` | PK                              |
| `ticket_id`        | `uuid`        | **NO**   | —                   | FK → `tickets(id)`              |
| `recipient_email`  | `text`        | **NO**   | —                   |                                 |
| `notification_type`| `text`        | **NO**   | —                   | e.g. `status_change`, `created` |
| `message`          | `text`        | **NO**   | —                   | Notification body               |
| `sent_at`          | `timestamptz` | **NO**   | `now()`             |                                 |
| `delivery_status`  | `text`        | **NO**   | `'sent'`            | e.g. `sent`, `failed`           |

**Constraints**

- `notifications_pkey` – PRIMARY KEY (`id`)
- `notifications_ticket_id_fkey` → `tickets(id)`

---

### feedback

Customer satisfaction feedback about company service (not tied to a specific ticket).

| Column                 | Type          | Nullable | Default             | Notes                                  |
| ---------------------- | ------------- | -------- | ------------------- | -------------------------------------- |
| `id`                   | `uuid`        | **NO**   | `gen_random_uuid()` | PK                                     |
| `rating`      | `integer`                  | **NO**   | -       | CHECK: `1 <= rating <= 5`                |
| `comment`              | `text`        | YES      | �                   |                                        |
| `submitted_at`         | `timestamptz` | **NO**   | `now()`             |                                        |
| `submitted_by_user_id` | `uuid`        | YES      | -                   | FK -> `profiles(id)` (logged-in user)   |
| `submitted_by_guest_id`| `uuid`        | YES      | -                   | FK -> `guest_contacts(id)` (guest user) |

**Constraints**

- `feedback_pkey` � PRIMARY KEY (`id`)
- `feedback_submitted_by_user_id_fkey` -> `profiles(id)`
- `feedback_submitted_by_guest_id_fkey` -> `guest_contacts(id)`

---

### feedback_category_ratings

Per-category star ratings for each feedback entry.

| Column        | Type                       | Nullable | Default | Notes |
| ------------- | -------------------------- | -------- | ------- | ----- |
| `feedback_id` | `uuid`                     | **NO**   | -       | FK -> `feedback(id)` (`ON DELETE CASCADE`) |
| `category`    | `feedback_rating_category` | **NO**   | -       | Enum category key (7 required dimensions) |
| `rating`      | `integer`                  | **NO**   | -       | CHECK: `1 <= rating <= 5` |
| `created_at`  | `timestamptz`              | **NO**   | `now()` | Row timestamp |

**Constraints**

- Composite PK on (`feedback_id`, `category`)
- `feedback_category_ratings_feedback_id_fkey` -> `feedback(id)`

---
### system_activity_logs

General audit / activity log for the application.

| Column        | Type          | Nullable | Default             | Notes                                 |
| ------------- | ------------- | -------- | ------------------- | ------------------------------------- |
| `id`          | `uuid`        | **NO**   | `gen_random_uuid()` | PK                                    |
| `user_id`     | `uuid`        | YES      | —                   | FK → `profiles(id)` (nullable for system events) |
| `action`      | `text`        | **NO**   | —                   | e.g. `login`, `ticket_created`        |
| `entity_type` | `text`        | **NO**   | —                   | e.g. `ticket`, `profile`              |
| `entity_id`   | `uuid`        | YES      | —                   |                                       |
| `timestamp`   | `timestamptz` | **NO**   | `now()`             |                                       |
| `ip_address`  | `text`        | YES      | —                   |                                       |

**Constraints**

- `system_activity_logs_pkey` – PRIMARY KEY (`id`)
- `system_activity_logs_user_id_fkey` → `profiles(id)`

---

## Database Functions

### sha256_hex

| Property    | Value                                                |
| ----------- | ---------------------------------------------------- |
| **Schema**  | `public`                                             |
| **Language**| SQL                                                  |
| **Args**    | `input text`                                         |
| **Returns** | `text`                                               |
| **Security**| Invoker                                              |

**Definition**

```sql
select encode(digest(input, 'sha256'), 'hex');
```

> Requires the `pgcrypto` extension. Used to hash guest access tokens before storage/comparison.

---

### set_updated_at

| Property    | Value                        |
| ----------- | ---------------------------- |
| **Schema**  | `public`                     |
| **Language**| PL/pgSQL                     |
| **Args**    | *(none)*                     |
| **Returns** | `trigger`                    |
| **Security**| Invoker                      |

**Definition**

```plpgsql
begin
  new.updated_at = now();
  return new;
end;
```

> Used by the `complaint_categories` table trigger to auto-refresh `updated_at` on every UPDATE.

---

### set_last_updated_at

| Property    | Value                        |
| ----------- | ---------------------------- |
| **Schema**  | `public`                     |
| **Language**| PL/pgSQL                     |
| **Args**    | *(none)*                     |
| **Returns** | `trigger`                    |
| **Security**| Invoker                      |

**Definition**

```plpgsql
begin
  new.last_updated_at = now();
  return new;
end;
```

> Used by the `tickets` table trigger to auto-refresh `last_updated_at` on every UPDATE.

---

### handle_new_user

| Property    | Value                        |
| ----------- | ---------------------------- |
| **Schema**  | `public`                     |
| **Language**| PL/pgSQL                     |
| **Args**    | *(none)*                     |
| **Returns** | `trigger`                    |
| **Security**| Definer                      |

**Definition**

```plpgsql
begin
  insert into public.profiles (
    id,
    email,
    first_name,
    last_name,
    role,
    is_active,
    created_at,
    last_login_at
  )
  values (
    new.id,
    new.email,
    nullif(new.raw_user_meta_data->>'first_name', ''),
    nullif(new.raw_user_meta_data->>'last_name', ''),
    'Customer'::user_role,
    true,
    now(),
    null
  )
  on conflict (id) do update
    set email = excluded.email,
        first_name = excluded.first_name,
        last_name = excluded.last_name;

  return new;
end;
```

> Attached as a trigger on `auth.users` (AFTER INSERT). Automatically creates a `profiles` row when a new Supabase Auth user signs up. Reads `first_name` and `last_name` from the user's `raw_user_meta_data` JSON.

---

### guest_ticket_lookup

| Property    | Value                                                                                      |
| ----------- | ------------------------------------------------------------------------------------------ |
| **Schema**  | `public`                                                                                   |
| **Language**| PL/pgSQL                                                                                   |
| **Args**    | `p_token text`                                                                             |
| **Returns** | `TABLE(ticket_id uuid, ticket_number text, ticket_type text, submitted_at timestamptz, status text, priority text, category_name text, description text, last_updated_at timestamptz)` |
| **Security**| Definer                                                                                    |

**Definition**

```plpgsql
declare
  v_hash text;
begin
  -- 1) Hash the raw token from the guest URL.
  v_hash := public.sha256_hex(p_token);

  -- 2) Validate the token exists and is not expired.
  --    If this check fails, we return 0 rows (guest sees "invalid/expired link").
  if not exists (
    select 1
    from public.ticket_access_tokens t
    where t.token_hash = v_hash
      and (t.expires_at is null or t.expires_at > now())
  ) then
    return;
  end if;

  -- 3) Track usage: update used_at to "last used time"
  update public.ticket_access_tokens
    set used_at = now()
  where token_hash = v_hash;

  -- 4) Return ticket details (SAFE subset) + category name
  return query
  select
    tk.id,
    tk.ticket_number,
    tk.ticket_type::text,       -- cast enum to text for easy display
    tk.submitted_at,
    tk.status::text,            -- cast enum to text
    tk.priority::text,          -- cast enum to text
    cc.category_name,
    tk.description,
    tk.last_updated_at
  from public.ticket_access_tokens at
  join public.tickets tk on tk.id = at.ticket_id
  join public.complaint_categories cc on cc.id = tk.category_id
  where at.token_hash = v_hash
    and (at.expires_at is null or at.expires_at > now());
end;
```

> Called from the application when a guest accesses `/track?token=<raw_token>`. The raw token is hashed with `sha256_hex`, validated against `ticket_access_tokens`, and then the corresponding ticket details (with category name joined) are returned. Enum columns are cast to `text` for convenience. The function also updates `used_at` to track when the token was last accessed.

---

## Triggers

| Trigger Name                        | Table                  | Function              | Timing         | Event    | Orientation |
| ----------------------------------- | ---------------------- | --------------------- | -------------- | -------- | ----------- |
| `trg_complaint_categories_...`      | `complaint_categories` | `set_updated_at`      | BEFORE         | UPDATE   | ROW         |
| `trg_tickets_last_updated_at`       | `tickets`              | `set_last_updated_at` | BEFORE         | UPDATE   | ROW         |
| *(on `auth.users` – Supabase-managed)* | `auth.users`        | `handle_new_user`     | AFTER          | INSERT   | ROW         |

> The `handle_new_user` trigger is attached to the Supabase Auth `auth.users` table and is not visible in the public schema triggers list, but it is a `public` schema function called automatically on signup.

---

## Relationships (ER Summary)

```
auth.users
  └─── profiles (1:1 via id)
          ├─── tickets.customer_id (1:N)
          ├─── tickets.assigned_staff_id (1:N)
          ├─── ticket_status_history.changed_by_user_id (1:N)
          ├─── feedback.submitted_by_user_id (1:N)
          └─── system_activity_logs.user_id (1:N)

guest_contacts
  ├─── tickets.guest_id (1:N)
  └─── feedback.submitted_by_guest_id (1:N)

complaint_categories
  └─── tickets.category_id (1:N)

tickets
  ├─── attachments.ticket_id (1:N)
  ├─── ticket_status_history.ticket_id (1:N)
  ├─── ticket_access_tokens.ticket_id (1:N)
  ├─── notifications.ticket_id (1:N)
  └─── feedback_category_ratings.feedback_id (1:N)
```

### Key Design Decisions

- **Dual submitter model**: A ticket can be submitted by either a **logged-in user** (`customer_id` → `profiles`) or a **guest** (`guest_id` → `guest_contacts`). Exactly one should be non-null.
- **Token-based guest access**: Raw tokens are given to guests via email; only the SHA-256 hash is stored. The `guest_ticket_lookup` function handles validation, expiry checking, and usage tracking in one RPC call.
- **NLP enrichment**: The `sentiment`, `detected_intent`, and `issue_type` columns on `tickets` are populated asynchronously by the FastAPI NLP backend after submission.
- **Universal company feedback**: Feedback is not tied to a ticket. Category-level scores are stored in `feedback_category_ratings`.
- **Auto-timestamps**: `updated_at` and `last_updated_at` are managed by BEFORE UPDATE triggers, so application code does not need to set them manually.

- **Closed NLP taxonomy**: Canonical intent and issue-type labels are maintained in `nlp_intent_labels` and `nlp_issue_type_labels`, with category routing in `nlp_issue_category_map`.
- **NLP run traceability**: Every NLP attempt is stored in `ticket_nlp_analyses` with model metadata and status, while reviewer overrides are captured in `ticket_nlp_reviews`.



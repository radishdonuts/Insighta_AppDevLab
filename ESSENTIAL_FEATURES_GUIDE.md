# Insighta Essential Features Guide

This file explains which existing files to open if you need to present the required features without writing new code.

## 1. Malayan Insurance Background / Project Context

Open these files:

- `frontend/app/(public)/about/page.tsx`
- `frontend/components/ui/landing-page.tsx`
- `frontend/app/layout.tsx`

What to show:

- The app is already positioned as an AI-powered non-life insurance complaint ticketing system.
- The landing page explains the insurance complaint workflow.
- The About page explains the mission, complaint handling flow, and trust/security angle.

Important note:

- The current code says `Insighta` and `insurance`, not specifically `Malayan Insurance` yet.
- If your panel asks where the company background text is, show `frontend/app/(public)/about/page.tsx` first.

## 2. Database Connection

Open these files:

- `frontend/lib/supabase.ts`
- `frontend/utils/supabase/server.ts`
- `frontend/utils/supabase/client.ts`
- `frontend/README.md`

What to say:

- The project uses Supabase as the database and auth provider.
- Server-side database access uses the service role client in `frontend/lib/supabase.ts`.
- Session-aware auth access uses the cookie-based server client in `frontend/utils/supabase/server.ts`.
- Environment variables are documented in `frontend/README.md`.

Essential code to point at:

```ts
// frontend/lib/supabase.ts
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

return createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: { persistSession: false }
});
```

Why this matters:

- This is the actual database connection used by API routes and server utilities.
- It proves data is stored in the database, not only in local state.

## 3. Database Sessions

Open these files:

- `frontend/middleware.ts`
- `frontend/lib/auth/server.ts`
- `frontend/utils/supabase/server.ts`

What to show:

- The app uses Supabase auth sessions.
- Cookies are read on the server.
- Protected routes check the logged-in user and role before allowing access.

Essential code to point at:

```ts
// frontend/utils/supabase/server.ts
const cookieStore = await cookies();

return createServerClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          cookieStore.set(name, value, options);
        });
      },
    },
  }
);
```

What to explain:

- Session cookies are how the system remembers the logged-in user.
- `middleware.ts` redirects unauthenticated users to `/login`.
- Admin and staff routes are role-protected.

## 4. Login Page

Open these files:

- `frontend/app/(guest)/login/page.tsx`
- `frontend/app/(guest)/login/login-form-client.tsx`
- `frontend/app/(guest)/login/action.ts`

What to show:

- `page.tsx` loads the login form.
- `login-form-client.tsx` contains the UI and validation.
- `action.ts` performs the real login using Supabase.

Essential code to point at:

```ts
// frontend/app/(guest)/login/action.ts
const { error } = await supabase.auth.signInWithPassword({ email, password });
```

What to explain:

- The user enters email and password.
- The form sends the data to the server action.
- Supabase verifies the account.
- After login, the user is redirected based on role.

## 5. Registration Page

Open these files:

- `frontend/app/(guest)/register/page.tsx`
- `frontend/app/(guest)/register/register-form-client.tsx`
- `frontend/app/(guest)/register/action.ts`

What to show:

- The register form collects first name, last name, email, password, and confirm password.
- Validation is done in the client form and checked again in the server action.
- Supabase creates the account.

Essential code to point at:

```ts
// frontend/app/(guest)/register/action.ts
const { data, error } = await supabase.auth.signUp({
  email,
  password,
  options: {
    data: {
      first_name: firstName || undefined,
      last_name: lastName || undefined,
    },
  },
});
```

What to explain:

- Registration is connected to the database through Supabase Auth.
- User profile details are passed during sign-up.

## 6. Complaint Submission

Open these files:

- `frontend/app/(public)/submit/page.tsx`
- `frontend/app/api/tickets/route.ts`
- `frontend/app/api/categories/route.ts`

What to show:

- `submit/page.tsx` is the user complaint submission form.
- It validates guest email, title, description, category, and attachments.
- `api/tickets/route.ts` is the backend endpoint that stores the complaint in the database.

Essential code to point at:

```ts
// frontend/app/(public)/submit/page.tsx
const response = await fetch("/api/tickets", {
  method: "POST",
  body: payload,
});
```

```ts
// frontend/app/api/tickets/route.ts
const { data: insertedTicket, error: insertError } = await supabase
  .from("tickets")
  .insert({ ...insertPayload, ticket_number: ticketNumber })
  .select("id, ticket_number, status, priority, submitted_at")
  .single();
```

What to explain:

- The form collects the complaint.
- The API route validates it.
- The complaint is inserted into the `tickets` table.
- That is the proof that submission is stored in the database.

## 7. CRUD Features

Best files to open:

- Create: `frontend/app/api/tickets/route.ts`
- Read: `frontend/app/api/tickets/my/route.ts`
- Update: `frontend/lib/admin/categories.ts`
- Delete: no clear hard-delete route is exposed; the project mainly uses updates, status changes, and deactivation

Examples you can present:

### Create

- Complaint submission creates a ticket in the `tickets` table.
- Admin category creation creates a new row in `complaint_categories`.

```ts
// frontend/lib/admin/categories.ts
.from("complaint_categories")
.insert({
  category_name: input.categoryName,
  is_active: true,
})
```

### Read

- Customers can read their own tickets.

```ts
// frontend/app/api/tickets/my/route.ts
let query = supabase
  .from("tickets")
  .select(...)
  .eq("customer_id", userId)
```

### Update

- Admin can rename or activate/deactivate categories.

```ts
// frontend/lib/admin/categories.ts
.from("complaint_categories")
.update(updates)
.eq("id", categoryId)
```

### Delete

- I do not see a standard hard-delete flow in the current code.
- For presentation, say the app uses safe updates and deactivation instead of removing important records.

## 8. Admin Web Pages

Open these routes/files:

- `frontend/app/(admin)/admin/page.tsx`
- `frontend/app/(admin)/admin/overview/page.tsx`
- `frontend/app/(admin)/admin/categories/page.tsx`
- `frontend/app/(admin)/admin/staff/page.tsx`
- `frontend/app/(admin)/admin/analytics/page.tsx`
- `frontend/app/(admin)/admin/activity/page.tsx`

What to say:

- These are the admin-only pages.
- They support monitoring, category management, staff management, analytics, and logs.
- Access is protected by role checks in `frontend/middleware.ts` and `frontend/lib/auth/server.ts`.

## 9. User Web Pages

Open these routes/files:

- `frontend/app/(guest)/login/page.tsx`
- `frontend/app/(guest)/register/page.tsx`
- `frontend/app/(public)/submit/page.tsx`
- `frontend/app/(public)/track/page.tsx`
- `frontend/app/(customer)/tickets/page.tsx`

What to say:

- Guest users can register, log in, submit complaints, and track tickets.
- Logged-in customers can view their own tickets in `/tickets`.

## 10. Database Schema / Tables

Open these files:

- `supabase/migrations/202603020001_001_nlp_input_foundation.sql`
- `supabase/migrations/202603020002_002_nlp_taxonomy.sql`
- `supabase/migrations/202603020003_003_nlp_history_and_review.sql`
- `supabase/migrations/202603090001_014_ticket_messages.sql`
- `supabase/migrations/202603090002_015_ticket_notes.sql`

What to explain:

- The project keeps database structure in Supabase migration files.
- These SQL files are proof that the system uses a real database schema.
- The `tickets` table is one of the main data stores used by submission and tracking.

## 11. Best Demo Flow

If you only need the most essential files for your defense, open these in order:

1. `frontend/app/(public)/about/page.tsx`
2. `frontend/app/(guest)/login/login-form-client.tsx`
3. `frontend/app/(guest)/login/action.ts`
4. `frontend/app/(guest)/register/register-form-client.tsx`
5. `frontend/app/(guest)/register/action.ts`
6. `frontend/app/(public)/submit/page.tsx`
7. `frontend/app/api/tickets/route.ts`
8. `frontend/lib/supabase.ts`
9. `frontend/utils/supabase/server.ts`
10. `frontend/middleware.ts`

## 12. Short Script You Can Say

"For login and registration, we use Supabase authentication. The UI is in the guest pages, and the actual sign-in and sign-up logic is handled in server actions. For submission, the complaint form sends data to `/api/tickets`, and that route inserts the complaint into the `tickets` table. For database connection, we use the Supabase client through environment variables. For session handling, the app reads auth cookies on the server and protects admin and staff pages through middleware and role checks."

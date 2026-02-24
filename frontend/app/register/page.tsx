import Link from "next/link";

import { registerAction } from "@/app/register/action";

function readParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

export default function RegisterPage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const error = readParam(searchParams?.error);
  const next = readParam(searchParams?.next) || "/";

  return (
    <main style={{ maxWidth: 560, margin: "0 auto", padding: "2.5rem 1rem" }}>
      <h1 style={{ marginBottom: "0.5rem" }}>Register</h1>
      <p style={{ color: "#6b7280", marginBottom: "1rem" }}>
        Create a customer account. Staff accounts are provisioned by Admins from the Admin dashboard.
      </p>

      {error ? <p style={{ color: "#b91c1c", marginBottom: "0.75rem" }}>{error}</p> : null}

      <form action={registerAction} style={{ display: "grid", gap: "0.85rem" }}>
        <input type="hidden" name="next" value={next} />

        <div style={{ display: "grid", gap: "0.75rem", gridTemplateColumns: "1fr 1fr" }}>
          <label style={{ display: "grid", gap: "0.35rem" }}>
            <span>First name</span>
            <input
              name="firstName"
              type="text"
              autoComplete="given-name"
              style={{ padding: "0.65rem", border: "1px solid #d1d5db", borderRadius: 8 }}
            />
          </label>

          <label style={{ display: "grid", gap: "0.35rem" }}>
            <span>Last name</span>
            <input
              name="lastName"
              type="text"
              autoComplete="family-name"
              style={{ padding: "0.65rem", border: "1px solid #d1d5db", borderRadius: 8 }}
            />
          </label>
        </div>

        <label style={{ display: "grid", gap: "0.35rem" }}>
          <span>Email</span>
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            style={{ padding: "0.65rem", border: "1px solid #d1d5db", borderRadius: 8 }}
          />
        </label>

        <label style={{ display: "grid", gap: "0.35rem" }}>
          <span>Password</span>
          <input
            name="password"
            type="password"
            required
            minLength={6}
            autoComplete="new-password"
            style={{ padding: "0.65rem", border: "1px solid #d1d5db", borderRadius: 8 }}
          />
        </label>

        <label style={{ display: "grid", gap: "0.35rem" }}>
          <span>Confirm password</span>
          <input
            name="confirmPassword"
            type="password"
            required
            minLength={6}
            autoComplete="new-password"
            style={{ padding: "0.65rem", border: "1px solid #d1d5db", borderRadius: 8 }}
          />
        </label>

        <button
          type="submit"
          style={{
            padding: "0.75rem",
            borderRadius: 8,
            border: "none",
            background: "#2563eb",
            color: "#fff",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Create Account
        </button>
      </form>

      <p style={{ marginTop: "1rem", color: "#6b7280" }}>
        Already have an account? <Link href={`/login?next=${encodeURIComponent(next)}`}>Login</Link>
      </p>
    </main>
  );
}

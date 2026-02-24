import Link from "next/link";

import { loginAction } from "@/app/login/action";

function readParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

export default function LoginPage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const error = readParam(searchParams?.error);
  const message = readParam(searchParams?.message);
  const next = readParam(searchParams?.next) || "/";

  return (
    <main style={{ maxWidth: 520, margin: "0 auto", padding: "2.5rem 1rem" }}>
      <h1 style={{ marginBottom: "0.5rem" }}>Login</h1>
      <p style={{ color: "#6b7280", marginBottom: "1rem" }}>
        Sign in with your Supabase account to access protected pages.
      </p>

      {message ? (
        <p style={{ color: "#166534", marginBottom: "0.75rem" }}>{message}</p>
      ) : null}
      {error ? <p style={{ color: "#b91c1c", marginBottom: "0.75rem" }}>{error}</p> : null}

      <form action={loginAction} style={{ display: "grid", gap: "0.85rem" }}>
        <input type="hidden" name="next" value={next} />

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
            autoComplete="current-password"
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
          Sign In
        </button>
      </form>

      <p style={{ marginTop: "1rem", color: "#6b7280" }}>
        Need an account?{" "}
        <Link href={`/register?next=${encodeURIComponent(next)}`}>Register here</Link>
      </p>
    </main>
  );
}

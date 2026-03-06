"use client";

import { useState } from "react";

import type { AdminCreateStaffAccountResponse } from "@/types/admin-stats";
import styles from "@/app/(admin)/admin/admin.module.css";

type ApiErrorPayload = { error?: string; message?: string };

async function readApiError(response: Response) {
  try {
    const payload = (await response.json()) as ApiErrorPayload;
    return payload.message || payload.error || `Request failed (${response.status})`;
  } catch {
    return `Request failed (${response.status})`;
  }
}

export default function StaffRegistrationClient() {
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createResult, setCreateResult] = useState<AdminCreateStaffAccountResponse | null>(null);

  async function handleCreateStaffAccount(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = new FormData(event.currentTarget);
    const payload = {
      email: String(form.get("email") ?? "").trim(),
      firstName: String(form.get("firstName") ?? "").trim(),
      lastName: String(form.get("lastName") ?? "").trim(),
    };

    setCreateSubmitting(true);
    setCreateError(null);
    setCreateResult(null);

    try {
      const response = await fetch("/api/admin/staff-accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(await readApiError(response));
      }

      const result = (await response.json()) as AdminCreateStaffAccountResponse;
      setCreateResult(result);
      event.currentTarget.reset();
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Failed to create Staff account.");
    } finally {
      setCreateSubmitting(false);
    }
  }

  return (
    <main className={styles.page}>
      <section className={styles.headerCard}>
        <div className={styles.titleWrap}>
          <h1 className={styles.title}>Staff Registration</h1>
          <p className={styles.subtitle}>
            Create Staff accounts from this page. The system applies a default password of
            <strong> staff123</strong>.
          </p>
        </div>
      </section>

      <section className={styles.card}>
        <div className={styles.cardHeader}>
          <h2 className={styles.cardTitle}>Create Staff Account</h2>
          <p className={styles.cardSubtitle}>
            Public registration remains for customer accounts only.
          </p>
        </div>

        <form className={styles.formGrid} onSubmit={handleCreateStaffAccount}>
          <label className={styles.field} style={{ gridColumn: "1 / -1" }}>
            <span className={styles.fieldLabel}>Staff email</span>
            <input
              name="email"
              type="email"
              required
              autoComplete="email"
              className={styles.input}
              placeholder="staff.member@example.com"
            />
          </label>

          <label className={styles.field}>
            <span className={styles.fieldLabel}>First name</span>
            <input
              name="firstName"
              type="text"
              required
              autoComplete="given-name"
              className={styles.input}
            />
          </label>

          <label className={styles.field}>
            <span className={styles.fieldLabel}>Last name</span>
            <input
              name="lastName"
              type="text"
              required
              autoComplete="family-name"
              className={styles.input}
            />
          </label>

          <div className={styles.formActions} style={{ gridColumn: "1 / -1" }}>
            <button type="submit" className={styles.buttonPrimary} disabled={createSubmitting}>
              {createSubmitting ? "Creating..." : "Create Staff Account"}
            </button>
          </div>
        </form>

        {createError ? <p className={styles.errorText}>{createError}</p> : null}

        {createResult ? (
          <div className={styles.infoPanel}>
            <p className={styles.successText}>{createResult.message}</p>
            <p className={styles.metaText}>
              Account: {createResult.account.email} ({createResult.account.role})
            </p>
          </div>
        ) : null}
      </section>
    </main>
  );
}

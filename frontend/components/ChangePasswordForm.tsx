"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

import styles from "./change-password-form.module.css";

type ChangePasswordFormProps = {
  title: string;
  description: string;
  backHref: string;
  backLabel: string;
};

type FormStatus = {
  type: "success" | "error";
  message: string;
} | null;

type ApiErrorBody = {
  message?: unknown;
  error?: unknown;
};

async function readErrorMessage(response: Response) {
  try {
    const payload = (await response.json()) as ApiErrorBody;
    if (typeof payload.message === "string" && payload.message.trim()) {
      return payload.message;
    }
    if (typeof payload.error === "string" && payload.error.trim()) {
      return payload.error;
    }
  } catch {
    // ignore malformed JSON and fallback to generic copy
  }

  return "Could not update your password right now.";
}

export default function ChangePasswordForm({
  title,
  description,
  backHref,
  backLabel,
}: ChangePasswordFormProps) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<FormStatus>(null);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus(null);

    if (newPassword !== confirmPassword) {
      setStatus({
        type: "error",
        message: "New password and confirm password do not match.",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/account/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword,
          newPassword,
          confirmPassword,
        }),
      });

      if (!response.ok) {
        setStatus({
          type: "error",
          message: await readErrorMessage(response),
        });
        return;
      }

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setStatus({
        type: "success",
        message: "Password updated successfully.",
      });
    } catch {
      setStatus({
        type: "error",
        message: "Network error while updating password. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className={styles.pageWrap}>
      <section className={styles.card}>
        <header className={styles.header}>
          <h1 className={styles.title}>{title}</h1>
          <p className={styles.description}>{description}</p>
        </header>

        <form className={styles.form} onSubmit={onSubmit}>
          <label className={styles.field}>
            <span className={styles.label}>Current Password</span>
            <input
              type="password"
              autoComplete="current-password"
              required
              className={styles.input}
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
            />
          </label>

          <label className={styles.field}>
            <span className={styles.label}>New Password</span>
            <input
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              className={styles.input}
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
            />
          </label>

          <label className={styles.field}>
            <span className={styles.label}>Confirm New Password</span>
            <input
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              className={styles.input}
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
            />
          </label>

          <div className={styles.metaRow}>
            <p className={styles.passwordHint}>Use at least 8 characters.</p>
          </div>

          {status ? (
            <p className={`${styles.status} ${status.type === "success" ? styles.statusSuccess : styles.statusError}`}>
              {status.message}
            </p>
          ) : null}

          <div className={styles.actions}>
            <button type="submit" className={styles.submitBtn} disabled={isSubmitting}>
              {isSubmitting ? "Updating..." : "Update Password"}
            </button>
            <Link href={backHref} className={styles.backLink}>
              {backLabel}
            </Link>
          </div>
        </form>
      </section>
    </main>
  );
}

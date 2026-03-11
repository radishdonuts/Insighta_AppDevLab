"use client";

import React, { useMemo, useState, FormEvent } from "react";
import Link from "next/link";

import styles from "./feedback.module.css";
import BasicRating from "@/components/ui/rating-group";

const MAX_COMMENT_LENGTH = 500;

export const FEEDBACK_CATEGORIES = [
  {
    key: "overall_experience",
    label: "Overall Experience",
    description: "Rate your overall satisfaction with the service you received.",
  },
  {
    key: "speed_turnaround_time",
    label: "Speed / Turnaround Time",
    description: "Rate how quickly your concern or request was handled.",
  },
  {
    key: "communication_updates",
    label: "Communication / Updates",
    description: "Rate how clear, timely, and helpful the updates were.",
  },
  {
    key: "resolution_quality_fairness",
    label: "Resolution Quality / Fairness",
    description: "Rate how fair, appropriate, and effective the outcome was.",
  },
  {
    key: "ease_of_process",
    label: "Ease of Process (Forms, Requirements, & Portal)",
    description: "Rate how easy it was to submit, follow, and complete the process.",
  },
  {
    key: "staff_helpfulness_professionalism",
    label: "Staff Helpfulness / Professionalism",
    description: "Rate how respectful, helpful, and professional the staff were.",
  },
  {
    key: "platform_app_website_experience",
    label: "Platform / App / Website Experience",
    description: "Rate how easy and reliable the website or platform was to use.",
  },
] as const;

export type FeedbackCategoryKey = (typeof FEEDBACK_CATEGORIES)[number]["key"];

export type FeedbackRatings = Record<FeedbackCategoryKey, number>;

const EMPTY_RATINGS: FeedbackRatings = {
  overall_experience: 0,
  speed_turnaround_time: 0,
  communication_updates: 0,
  resolution_quality_fairness: 0,
  ease_of_process: 0,
  staff_helpfulness_professionalism: 0,
  platform_app_website_experience: 0,
};

export interface FeedbackData {
  ratings: FeedbackRatings;
  comment: string;
  guestEmail?: string;
}

export interface FeedbackFormProps {
  ticketId: string;
  subjectLabel?: string;
  submitterEmail?: string | null;
  onSubmit: (data: FeedbackData) => Promise<void>;
  initialData?: FeedbackData;
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

const STAR_COLOR = "#facc15";

function getStarColor(index: number): string {
  void index;
  return STAR_COLOR;
}

function StarIcon({
  filled,
  index,
  className = "",
}: {
  filled: boolean;
  index: number;
  className?: string;
}) {
  const starColor = getStarColor(index);

  return (
    <svg
      viewBox="0 0 24 24"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`${styles.starIcon} ${filled ? styles.starFilled : styles.starEmpty} ${className}`}
      aria-hidden
    >
      <polygon
        points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"
        fill={filled ? starColor : "#e2e8f0"}
        stroke={filled ? starColor : "#94a3b8"}
      />
    </svg>
  );
}

const CheckIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

export function FeedbackForm({ ticketId, subjectLabel, submitterEmail, onSubmit, initialData }: FeedbackFormProps) {
  const normalizedSubmitterEmail = typeof submitterEmail === "string" ? submitterEmail.trim().toLowerCase() : "";
  const isGuestFlow = !normalizedSubmitterEmail;
  const [ratings, setRatings] = useState<FeedbackRatings>(initialData?.ratings ?? EMPTY_RATINGS);
  const [comment, setComment] = useState(initialData?.comment ?? "");
  const [guestEmail, setGuestEmail] = useState(initialData?.guestEmail ?? "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(Boolean(initialData));
  const [error, setError] = useState<string | null>(null);

  const allRated = useMemo(() => FEEDBACK_CATEGORIES.every((entry) => (ratings[entry.key] ?? 0) >= 1), [ratings]);

  const overall = ratings.overall_experience || 0;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    const normalizedGuestEmail = guestEmail.trim().toLowerCase();

    if (isGuestFlow) {
      if (!normalizedGuestEmail) {
        setError("Email is required for guest feedback.");
        return;
      }
      if (!isValidEmail(normalizedGuestEmail)) {
        setError("Enter a valid email address.");
        return;
      }
    }

    if (!allRated) {
      setError("Please rate all categories before submitting.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await onSubmit({
        ratings,
        comment: comment.trim(),
        ...(isGuestFlow ? { guestEmail: normalizedGuestEmail } : {}),
      });
      setIsSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit feedback.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className={styles.container}>
        <div className={styles.successState}>
          <div className={styles.successIcon}>
            <CheckIcon />
          </div>
          <h3 className={styles.successTitle}>Thank you for your feedback!</h3>
          <p className={styles.successDesc}>Your ratings help us improve our service.</p>

          <div className={styles.successStars} aria-label={`Overall rated ${overall} out of 5 stars`}>
            {[1, 2, 3, 4, 5].map((star) => (
              <StarIcon key={star} index={star} filled={star <= overall} />
            ))}
          </div>

          <div className={styles.readOnlyList}>
            {FEEDBACK_CATEGORIES.map((entry) => (
              <div key={entry.key} className={styles.readOnlyRow}>
                <span>{entry.label}</span>
                <strong>{ratings[entry.key]} / 5</strong>
              </div>
            ))}
          </div>

          {comment ? <p className={styles.readOnlyComment}>"{comment}"</p> : null}
          <div className={`${styles.submitWrap} ${styles.successSubmitWrap}`}>
            <Link href="/" className={styles.btnPrimary}>
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <h3 className={styles.title}>Service Feedback</h3>
      <p className={styles.subtitle}>
        {subjectLabel
          ? `Please rate your experience with ${subjectLabel}. All categories are required.`
          : `Please rate your experience for ticket ${ticketId}. All categories are required.`}
      </p>
      {isGuestFlow ? (
        <div className={styles.formGroup}>
          <label htmlFor="feedback-email" className={styles.label}>
            Email Address
          </label>
          <p className={styles.commentHelper}>We use this to identify your feedback as a guest submission.</p>
          <input
            id="feedback-email"
            type="email"
            value={guestEmail}
            onChange={(e) => setGuestEmail(e.target.value)}
            placeholder="you@example.com"
            className={styles.input}
            autoComplete="email"
            disabled={isSubmitting}
            required
          />
        </div>
      ) : (
        <p className={styles.submitterText}>Submitting feedback as {normalizedSubmitterEmail}</p>
      )}

      <form onSubmit={handleSubmit}>
        <div className={styles.categoryList}>
          {FEEDBACK_CATEGORIES.map((entry, index) => {
            const selected = ratings[entry.key] ?? 0;
            const progressWidth = `${(selected / 5) * 100}%`;

            return (
              <div key={entry.key} className={styles.categoryRow}>
                <div className={styles.sectionTop}>
                  <div className={styles.sectionBadge}>{index + 1}</div>
                  <div className={styles.sectionBody}>
                    <p className={styles.categoryLabel}>{entry.label}</p>
                    <p className={styles.categoryDescription}>{entry.description}</p>
                  </div>
                </div>
                <div className={styles.starsContainer}>
                  <BasicRating
                    value={selected}
                    onValueChange={(star) => setRatings((prev) => ({ ...prev, [entry.key]: star }))}
                    disabled={isSubmitting}
                  />
                </div>
              </div>
            );
          })}
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="feedback-comment" className={styles.label}>
            Comments
            <span className={`${styles.charCount} ${comment.length > MAX_COMMENT_LENGTH - 50 ? styles.charCountWarn : ""}`}>
              {comment.length}/{MAX_COMMENT_LENGTH}
            </span>
          </label>
          <p className={styles.commentHelper}>Tell us what went well and what we can improve.</p>
          <textarea
            id="feedback-comment"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            maxLength={MAX_COMMENT_LENGTH}
            placeholder="Tell us what went well and what we can improve."
            className={styles.textarea}
            disabled={isSubmitting}
          />
        </div>

        <div className={styles.submitWrap}>
          <button type="submit" className={styles.btnPrimary} disabled={!allRated || isSubmitting}>
            {isSubmitting ? <><span className={styles.spinner} /> Submitting...</> : "Submit Feedback"}
          </button>
        </div>

        {error ? <div className={styles.errorText}>{error}</div> : null}
      </form>
    </div>
  );
}

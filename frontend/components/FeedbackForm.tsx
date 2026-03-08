"use client";

import React, { useMemo, useState, FormEvent } from "react";

import styles from "./feedback.module.css";

const MAX_COMMENT_LENGTH = 500;

export const FEEDBACK_CATEGORIES = [
  { key: "overall_experience", label: "Overall Experience" },
  { key: "speed_turnaround_time", label: "Speed / Turnaround Time" },
  { key: "communication_updates", label: "Communication / Updates" },
  { key: "resolution_quality_fairness", label: "Resolution Quality / Fairness" },
  { key: "ease_of_process", label: "Ease of Process (forms, requirements, portal)" },
  { key: "staff_helpfulness_professionalism", label: "Staff Helpfulness / Professionalism" },
  { key: "platform_app_website_experience", label: "Platform / App / Website Experience" },
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
}

export interface FeedbackFormProps {
  ticketId: string;
  subjectLabel?: string;
  onSubmit: (data: FeedbackData) => Promise<void>;
  initialData?: FeedbackData;
}

const StarIcon = ({ filled, className = "" }: { filled: boolean; className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={`${styles.starIcon} ${filled ? styles.starFilled : styles.starEmpty} ${className}`}
    aria-hidden
  >
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
);

const CheckIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

export function FeedbackForm({ ticketId, subjectLabel, onSubmit, initialData }: FeedbackFormProps) {
  const [ratings, setRatings] = useState<FeedbackRatings>(initialData?.ratings ?? EMPTY_RATINGS);
  const [hoverByCategory, setHoverByCategory] = useState<Partial<Record<FeedbackCategoryKey, number>>>({});
  const [comment, setComment] = useState(initialData?.comment ?? "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(Boolean(initialData));
  const [error, setError] = useState<string | null>(null);

  const allRated = useMemo(() => FEEDBACK_CATEGORIES.every((entry) => (ratings[entry.key] ?? 0) >= 1), [ratings]);

  const overall = ratings.overall_experience || 0;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!allRated) {
      setError("Please rate all categories before submitting.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await onSubmit({ ratings, comment: comment.trim() });
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
              <StarIcon key={star} filled={star <= overall} />
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

      <form onSubmit={handleSubmit}>
        <div className={styles.categoryList}>
          {FEEDBACK_CATEGORIES.map((entry) => {
            const selected = ratings[entry.key] ?? 0;
            const hover = hoverByCategory[entry.key] ?? 0;
            const display = hover || selected;

            return (
              <div key={entry.key} className={styles.categoryRow}>
                <p className={styles.categoryLabel}>{entry.label}</p>
                <div className={styles.starsContainer} role="radiogroup" aria-label={`${entry.label} rating out of 5`}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      className={styles.starBtn}
                      onClick={() => setRatings((prev) => ({ ...prev, [entry.key]: star }))}
                      onMouseEnter={() => setHoverByCategory((prev) => ({ ...prev, [entry.key]: star }))}
                      onMouseLeave={() => setHoverByCategory((prev) => ({ ...prev, [entry.key]: 0 }))}
                      aria-checked={selected === star}
                      role="radio"
                      aria-label={`${entry.label}: ${star} star${star === 1 ? "" : "s"}`}
                    >
                      <StarIcon filled={star <= display} />
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="feedback-comment" className={styles.label}>
            Additional Comments (Optional)
            <span className={`${styles.charCount} ${comment.length > MAX_COMMENT_LENGTH - 50 ? styles.charCountWarn : ""}`}>
              {comment.length}/{MAX_COMMENT_LENGTH}
            </span>
          </label>
          <textarea
            id="feedback-comment"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            maxLength={MAX_COMMENT_LENGTH}
            placeholder="Tell us what went well or how we can improve..."
            className={styles.textarea}
            disabled={isSubmitting}
          />
        </div>

        <button type="submit" className={styles.btnPrimary} disabled={!allRated || isSubmitting}>
          {isSubmitting ? <><span className={styles.spinner} /> Submitting...</> : "Submit Feedback"}
        </button>

        {error ? <div className={styles.errorText}>{error}</div> : null}
      </form>
    </div>
  );
}

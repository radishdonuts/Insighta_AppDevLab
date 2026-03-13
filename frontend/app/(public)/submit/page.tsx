"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronDown, Sparkles } from "lucide-react";
import { createClient as createSupabaseClient } from "@/utils/supabase/client";
import { FileUpload } from "@/components/FileUpload";
import styles from "@/components/features/guest/submit/submit.module.css";

const TITLE_MAX_LENGTH = 120;
const DESCRIPTION_MIN_LENGTH = 20;
const DESCRIPTION_MAX_LENGTH = 5000;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type CategoryOption = { id: string; name: string };
type CategoriesResponse = { ok?: boolean; categories?: Array<{ id?: unknown; name?: unknown }> };
type TicketCreateResponse = { error?: string; details?: string; accessToken?: string; ticket?: { id?: string; reference?: string } };
const NOT_SURE_CATEGORY = "__NOT_SURE__";

type SubmitValidationInput = {
  authUserId: string | null;
  guestEmail: string;
  title: string;
  description: string;
};

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.08,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45 } },
};

const stepVariants = {
  initial: { opacity: 0, y: 20, scale: 0.985 },
  animate: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.28 } },
  exit: { opacity: 0, y: -12, scale: 0.985, transition: { duration: 0.2 } },
};

function validateComplaintForm(input: SubmitValidationInput): Record<string, string> {
  const errors: Record<string, string> = {};
  const trimmedGuestEmail = input.guestEmail.trim();
  const trimmedTitle = input.title.trim();
  const trimmedDescription = input.description.trim();

  if (!input.authUserId) {
    if (!trimmedGuestEmail) {
      errors.guestEmail = "Email is required for guests. If you have an account, please log in to skip this step.";
    } else if (!EMAIL_REGEX.test(trimmedGuestEmail)) {
      errors.guestEmail = "Invalid email format.";
    }
  }

  if (!trimmedTitle) {
    errors.title = "Title is required.";
  } else if (trimmedTitle.length > TITLE_MAX_LENGTH) {
    errors.title = `Max ${TITLE_MAX_LENGTH} characters.`;
  }

  if (!trimmedDescription) {
    errors.description = "Description is required.";
  } else if (trimmedDescription.length < DESCRIPTION_MIN_LENGTH) {
    errors.description = `Min ${DESCRIPTION_MIN_LENGTH} characters.`;
  } else if (trimmedDescription.length > DESCRIPTION_MAX_LENGTH) {
    errors.description = `Max ${DESCRIPTION_MAX_LENGTH} characters.`;
  }

  return errors;
}

export default function SubmitPage() {
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseClient(), []);

  // Form State
  const [step, setStep] = useState(1);
  const [guestEmail, setGuestEmail] = useState("");
  const [title, setTitle] = useState("");
  const [categoryId, setCategoryId] = useState(NOT_SURE_CATEGORY);
  const [description, setDescription] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);

  // Validation State (touched fields)
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // Meta State
  const [authUserId, setAuthUserId] = useState<string | null>(null);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Success State
  const [successData, setSuccessData] = useState<{ trackingNumber: string; ticketId: string | null; isGuestToken: boolean } | null>(null);
  const [copied, setCopied] = useState(false);
  const categoryDropdownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadInitialData() {
      setLoadingInitial(true);
      const [authResult, categoriesResult] = await Promise.all([
        supabase.auth.getUser(),
        fetch("/api/categories", { cache: "no-store" }).catch(() => null),
      ]);
      if (cancelled) return;

      setAuthUserId(authResult.data.user?.id ?? null);
      // Skip email step if logged in
      if (authResult.data.user?.id) {
        setStep(2);
      }

      if (categoriesResult?.ok) {
        const payload = (await categoriesResult.json()) as CategoriesResponse;
        const nextCategories = (payload.categories ?? [])
          .map((entry) => {
            const id = typeof entry.id === "string" ? entry.id : null;
            const name = typeof entry.name === "string" ? entry.name : null;
            return id && name ? { id, name } : null;
          })
          .filter((e): e is CategoryOption => e !== null);
        setCategories(nextCategories);
      }
      setLoadingInitial(false);
    }
    void loadInitialData();
    return () => { cancelled = true; };
  }, [supabase]);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(event.target as Node)) {
        setIsCategoryOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsCategoryOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  // Validators
  const validationErrors = useMemo(
    () =>
      validateComplaintForm({
        authUserId,
        guestEmail,
        title,
        description,
      }),
    [authUserId, guestEmail, title, description]
  );

  const errors = useMemo(() => {
    const next: Record<string, string> = {};
    if (touched.guestEmail && validationErrors.guestEmail) next.guestEmail = validationErrors.guestEmail;
    if (touched.title && validationErrors.title) next.title = validationErrors.title;
    if (touched.description && validationErrors.description) next.description = validationErrors.description;
    return next;
  }, [touched, validationErrors]);

  const handleBlur = (field: string) => setTouched((t) => ({ ...t, [field]: true }));
  const categoryOptions = useMemo(
    () => [{ id: NOT_SURE_CATEGORY, name: "Others" }, ...categories],
    [categories]
  );
  const selectedCategoryLabel = categoryOptions.find((option) => option.id === categoryId)?.name ?? "Others";

  const nextStep = () => {
    if (step === 1 && !authUserId) {
      setTouched((t) => ({ ...t, guestEmail: true }));
      if (validationErrors.guestEmail) return;
    }
    if (step === 2) {
      setTouched((t) => ({ ...t, title: true, description: true }));
      if (validationErrors.title || validationErrors.description) return;
    }
    setIsCategoryOpen(false);
    setStep(s => s + 1);
  };

  const prevStep = () => {
    // Don't let logged-in users go back to guest email step
    if (step === 2 && authUserId) return;
    setIsCategoryOpen(false);
    setStep(s => Math.max(1, s - 1));
  };

  async function onSubmit() {
    if (isSubmitting) return;
    setSubmitError(null);

    const submitErrors = validateComplaintForm({
      authUserId,
      guestEmail,
      title,
      description,
    });
    if (submitErrors.guestEmail || submitErrors.title || submitErrors.description) {
      setTouched((t) => ({ ...t, guestEmail: true, title: true, description: true }));
      setSubmitError("Please fix the form errors before submitting.");
      return;
    }

    setIsSubmitting(true);

    const payload = new FormData();
    payload.set("title", title.trim());
    payload.set("description", description.trim());
    payload.set("ticketType", "Complaint");
    if (categoryId && categoryId !== NOT_SURE_CATEGORY) {
      payload.set("categoryId", categoryId);
    }

    if (!authUserId) {
      payload.set("guestEmail", guestEmail.trim().toLowerCase());
    }

    for (const file of files) {
      payload.append("attachments", file, file.name);
    }

    try {
      const response = await fetch("/api/tickets", {
        method: "POST",
        body: payload,
      });

      const data = (await response.json()) as TicketCreateResponse;

      if (!response.ok) {
        throw new Error(data.error || data.details || "Failed to submit complaint.");
      }

      const ticketId = data.ticket?.id;
      const token = data.accessToken;

      if (!ticketId) {
        throw new Error("Invalid response from server.");
      }

      // For authenticated users, no access token is returned — redirect to tickets
      const trackingNumber = token || data.ticket?.reference;
      if (!trackingNumber) {
        throw new Error("No tracking reference received. Please contact support.");
      }

      setSuccessData({
        trackingNumber,
        ticketId,
        isGuestToken: !!token,
      });
      setStep(5); // Success step
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Failed to submit complaint.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const copyToken = () => {
    if (successData) {
      navigator.clipboard.writeText(successData.trackingNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const renderStepProgress = () => {
    const steps = [
      { num: 1, label: "Your Details" },
      { num: 2, label: "Complaint" },
      { num: 3, label: "Attachments" },
      { num: 4, label: "Review" }
    ];

    return (
      <div className={styles.stepper} aria-label="Progress">
        <div className={styles.stepperProgress} style={{ width: `${((step - 1) / 3) * 75}%` }} />
        {steps.map(s => (
          <div key={s.num} className={`${styles.step} ${step === s.num ? styles.stepActive : ''} ${step > s.num ? styles.stepCompleted : ''}`}>
            <div className={styles.stepCircle}>{step > s.num ? "✓" : s.num}</div>
            <div className={styles.stepLabel}>{s.label}</div>
          </div>
        ))}
      </div>
    );
  };

  if (loadingInitial) {
    return (
      <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(15,23,42,0.08),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(14,165,233,0.18),_transparent_24%),linear-gradient(180deg,_#f8fbff_0%,_#eef5ff_42%,_#ffffff_100%)] text-slate-950">
      <section className="px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <div className="mx-auto w-full max-w-3xl">
          <div className={`${styles.card} ${styles.loadingCard}`}>
              <div className={`${styles.spinner} ${styles.spinnerAccent}`} />
              <p>Loading...</p>
            </div>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(15,23,42,0.08),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(14,165,233,0.18),_transparent_24%),linear-gradient(180deg,_#f8fbff_0%,_#eef5ff_42%,_#ffffff_100%)] text-slate-950">
      <section className="px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <div className="mx-auto w-full max-w-3xl">
          <motion.div
            className={styles.card}
            initial="hidden"
            animate="visible"
            variants={containerVariants}
          >

        {step < 5 && (
          <>
            <motion.header className={styles.header} variants={itemVariants}>
              <motion.div
                className={styles.headerPill}
                variants={itemVariants}
                whileHover={{ y: -1 }}
              >
                <Sparkles size={14} aria-hidden="true" />
                Guided Complaint Intake
              </motion.div>
              <motion.h1 variants={itemVariants}>Submit a Complaint</motion.h1>
              <motion.p variants={itemVariants}>We'll review your complaint and get back to you.</motion.p>
            </motion.header>
            <motion.div variants={itemVariants}>{renderStepProgress()}</motion.div>
          </>
        )}

        {submitError && step < 5 && (
          <motion.div
            className={`${styles.errorMessage} ${styles.submitErrorBox}`}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
            {submitError}
          </motion.div>
        )}

        <AnimatePresence mode="wait" initial={false}>
        {/* STEP 1: Details (Guest Only) */}
        {step === 1 && !authUserId && (
          <motion.div key="step-1" className="step-content" variants={stepVariants} initial="initial" animate="animate" exit="exit">
            <div className={styles.formGroup}>
              <label htmlFor="email" className={styles.label}>Email Address</label>
              <input
                id="email"
                type="email"
                value={guestEmail}
                onChange={e => setGuestEmail(e.target.value)}
                onBlur={() => handleBlur("guestEmail")}
                placeholder="you@example.com"
                className={`${styles.input} ${touched.guestEmail ? (errors.guestEmail ? styles.inputError : styles.inputValid) : ''}`}
              />
              {touched.guestEmail && errors.guestEmail && (
                <span className={styles.errorMessage}>{errors.guestEmail}</span>
              )}
            </div>
            <div className={styles.buttonGroup}>
              <button type="button" onClick={() => router.push("/")} className={styles.btnSecondary}>Cancel</button>
              <button type="button" onClick={nextStep} className={styles.btnPrimary}>Continue</button>
            </div>
          </motion.div>
        )}

        {/* STEP 2: Complaint Details */}
        {step === 2 && (
          <motion.div
            key="step-2"
            className="step-content"
            variants={stepVariants}
            initial="initial"
            animate="animate"
            exit="exit"
          >
            <motion.div variants={containerVariants} initial="hidden" animate="visible" className={styles.stepSection}>
            <motion.div className={styles.formGroup} variants={itemVariants}>
              <label htmlFor="categoryId" className={styles.label}>Category (optional)</label>
              <div className={styles.dropdownField} ref={categoryDropdownRef}>
                <motion.button
                  id="categoryId"
                  type="button"
                  whileTap={{ scale: 0.995 }}
                  onClick={() => setIsCategoryOpen((open) => !open)}
                  className={`${styles.input} ${styles.dropdownTrigger} ${isCategoryOpen ? styles.dropdownTriggerOpen : ""}`}
                  aria-haspopup="listbox"
                  aria-expanded={isCategoryOpen}
                >
                  <span className={styles.dropdownValue}>{selectedCategoryLabel}</span>
                  <motion.span
                    animate={{ rotate: isCategoryOpen ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                    className={styles.dropdownChevron}
                  >
                    <ChevronDown size={18} aria-hidden="true" />
                  </motion.span>
                </motion.button>

                <AnimatePresence>
                  {isCategoryOpen ? (
                    <motion.div
                      className={styles.dropdownMenu}
                      initial={{ opacity: 0, y: -8, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -8, scale: 0.97 }}
                      transition={{ duration: 0.16 }}
                      role="listbox"
                      aria-labelledby="categoryId"
                    >
                      {categoryOptions.map((option, index) => {
                        const selected = option.id === categoryId;
                        return (
                          <motion.button
                            key={option.id}
                            type="button"
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.16, delay: index * 0.025 }}
                            className={`${styles.dropdownOption} ${selected ? styles.dropdownOptionSelected : ""}`}
                            onClick={() => {
                              setCategoryId(option.id);
                              setIsCategoryOpen(false);
                            }}
                            role="option"
                            aria-selected={selected}
                          >
                            <span>{option.name}</span>
                            {selected ? <Check size={16} aria-hidden="true" /> : null}
                          </motion.button>
                        );
                      })}
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </div>
            </motion.div>

            <motion.div className={styles.formGroup} variants={itemVariants}>
              <label htmlFor="title" className={styles.label}>
                Title
                <span className={`${styles.charCount} ${title.length > TITLE_MAX_LENGTH ? styles.charCountWarn : ''}`}>
                  {TITLE_MAX_LENGTH - title.length}
                </span>
              </label>
              <input
                id="title"
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                onBlur={() => handleBlur("title")}
                placeholder="Brief summary of the issue"
                maxLength={TITLE_MAX_LENGTH}
                className={`${styles.input} ${touched.title ? (errors.title ? styles.inputError : styles.inputValid) : ''}`}
              />
              {touched.title && errors.title && <span className={styles.errorMessage}>{errors.title}</span>}
            </motion.div>

            <motion.div className={styles.formGroup} variants={itemVariants}>
              <label htmlFor="description" className={styles.label}>
                Description
                <span className={`${styles.charCount} ${description.length > DESCRIPTION_MAX_LENGTH - 100 ? styles.charCountWarn : ''}`}>
                  {description.length}/{DESCRIPTION_MAX_LENGTH}
                </span>
              </label>
              <textarea
                id="description"
                value={description}
                onChange={e => setDescription(e.target.value)}
                onBlur={() => handleBlur("description")}
                placeholder="Please describe your complaint in detail..."
                rows={6}
                maxLength={DESCRIPTION_MAX_LENGTH}
                className={`${styles.input} ${touched.description ? (errors.description ? styles.inputError : styles.inputValid) : ''}`}
                style={{ resize: "vertical" }}
              />
              {touched.description && errors.description && <span className={styles.errorMessage}>{errors.description}</span>}
            </motion.div>

            <motion.div className={styles.buttonGroup} variants={itemVariants}>
              <button type="button" onClick={prevStep} className={styles.btnSecondary}>Back</button>
              <button type="button" onClick={nextStep} className={styles.btnPrimary}>Continue</button>
            </motion.div>
            </motion.div>
          </motion.div>
        )}

        {/* STEP 3: Attachments */}
        {step === 3 && (
          <motion.div key="step-3" className="step-content" variants={stepVariants} initial="initial" animate="animate" exit="exit">
            <div className={styles.formGroup}>
              <label className={styles.label}>Supporting Documents (Optional)</label>
              <FileUpload files={files} onChange={setFiles} />
            </div>
            <div className={styles.buttonGroup}>
              <button type="button" onClick={prevStep} className={styles.btnSecondary}>Back</button>
              <button type="button" onClick={nextStep} className={styles.btnPrimary}>Continue</button>
            </div>
          </motion.div>
        )}

        {/* STEP 4: Review */}
        {step === 4 && (
          <motion.div key="step-4" className="step-content" variants={stepVariants} initial="initial" animate="animate" exit="exit">
            <div className={styles.summaryBox}>
              {!authUserId && (
                <div className={styles.summaryItem}>
                  <div className={styles.summaryLabel}>Email</div>
                  <div className={styles.summaryValue}>{guestEmail}</div>
                </div>
              )}
              <div className={styles.summaryItem}>
                <div className={styles.summaryLabel}>Category</div>
                <div className={styles.summaryValue}>
                  {categoryId === NOT_SURE_CATEGORY
                    ? "Others"
                    : (categories.find(c => c.id === categoryId)?.name ?? "Others")}
                </div>
              </div>
              <div className={styles.summaryItem}>
                <div className={styles.summaryLabel}>Title</div>
                <div className={styles.summaryValue}>{title}</div>
              </div>
              <div className={styles.summaryItem}>
                <div className={styles.summaryLabel}>Description</div>
                <div className={styles.summaryValue}>{description.substring(0, 150)}{description.length > 150 ? "..." : ""}</div>
              </div>
              <div className={styles.summaryItem}>
                <div className={styles.summaryLabel}>Attachments</div>
                <div className={styles.summaryValue}>{files.length} file(s)</div>
              </div>
            </div>

            <div className={styles.buttonGroup}>
              <button type="button" onClick={prevStep} className={styles.btnSecondary} disabled={isSubmitting}>Back</button>
              <button type="button" onClick={onSubmit} className={styles.btnPrimary} disabled={isSubmitting}>
                {isSubmitting ? <><span className={styles.spinner} /> Submitting...</> : "Submit Complaint"}
              </button>
            </div>
          </motion.div>
        )}

        {/* STEP 5: Success */}
        {step === 5 && successData && (
          <motion.div key="step-5" className={styles.successContainer} variants={stepVariants} initial="initial" animate="animate" exit="exit">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={styles.successIcon}>
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
              <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
            <h2 className={styles.successTitle}>Complaint Submitted</h2>
            <p className={styles.successDesc}>Your complaint has been successfully recorded.</p>

            <div className={styles.ticketRefBox}>
              <div className={styles.ticketRefLabel}>Tracking Number</div>
              <div className={styles.ticketRefValue}>{successData.trackingNumber}</div>
            </div>

            <div className={styles.tokenBox}>
              <input type="text" value={successData.trackingNumber} readOnly className={styles.tokenInput} />
              <button onClick={copyToken} className={styles.copyBtn}>{copied ? "Copied!" : "Copy Number"}</button>
            </div>

            <p className={styles.successNote}>
              {successData.isGuestToken ? (
                <>
                  Please save this tracking number. You will need it to track your ticket status at <Link href="/track" className={styles.inlineLink}>/track</Link>.
                </>
              ) : (
                <>
                  Your complaint has been submitted successfully. You can review it anytime in <Link href="/tickets" className={styles.inlineLink}>/tickets</Link>.
                </>
              )}
            </p>

            <div className={styles.buttonGroup}>
              <button onClick={() => { setStep(authUserId ? 2 : 1); setTitle(""); setDescription(""); setFiles([]); setGuestEmail(""); setCategoryId(NOT_SURE_CATEGORY); setSuccessData(null); }} className={styles.btnSecondary}>
                Submit Another
              </button>
              {successData.isGuestToken ? (
                <Link href={`/track?token=${successData.trackingNumber}`} className={`${styles.btnPrimary} ${styles.btnLink}`}>
                  Track Ticket
                </Link>
              ) : successData.ticketId ? (
                <Link href={`/tickets/${successData.ticketId}`} className={`${styles.btnPrimary} ${styles.btnLink}`}>
                  View Ticket
                </Link>
              ) : (
                <Link href="/tickets" className={`${styles.btnPrimary} ${styles.btnLink}`}>
                  My Tickets
                </Link>
              )}
            </div>
          </motion.div>
        )}
        </AnimatePresence>

          </motion.div>
        </div>
      </section>
    </main>
  );
}

"use client";

import { useEffect, useState, useRef, type FormEvent, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import AnimatedGlowingSearchBar from "@/components/ui/animated-glowing-search-bar";

type LookupResponse = {
  ok?: boolean;
  message?: string;
  ticket?: {
    id?: unknown;
    status?: unknown;
    guest_tracking_number?: unknown;
  };
};

type OtpSendResponse = {
  ok?: boolean;
  otpRequired?: boolean;
  maskedEmail?: string;
  message?: string;
};

type OtpVerifyResponse = {
  ok?: boolean;
  ticketId?: string;
  message?: string;
};

type TrackTicketLookupProps = {
  initialToken?: string;
};

type Step = "token" | "otp" | "redirecting";

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function extractToken(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return "";

  try {
    const url = new URL(trimmed);
    return asString(url.searchParams.get("token")) || trimmed;
  } catch {
    const match = trimmed.match(/[?&]token=([^&]+)/i);
    if (match?.[1]) {
      try {
        return decodeURIComponent(match[1]);
      } catch {
        return match[1];
      }
    }

    return trimmed;
  }
}

export default function TrackTicketLookup({ initialToken = "" }: TrackTicketLookupProps) {
  const router = useRouter();
  const tokenFormRef = useRef<HTMLFormElement>(null);
  const otpFormRef = useRef<HTMLFormElement>(null);
  const [tokenInput, setTokenInput] = useState(initialToken);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // OTP state
  const [step, setStep] = useState<Step>("token");
  const [resolvedToken, setResolvedToken] = useState("");
  const [maskedEmail, setMaskedEmail] = useState("");
  const [otpDigits, setOtpDigits] = useState(["", "", "", "", "", ""]);
  const otpInputsRef = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    const nextToken = asString(initialToken);
    if (!nextToken) return;
    setTokenInput(nextToken);
  }, [initialToken]);

  function handleTokenKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      tokenFormRef.current?.requestSubmit();
    }
  }

  // Step 1: Submit tracking number → request OTP
  async function onTokenSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSearching) return;

    const token = extractToken(tokenInput);
    if (!token) {
      setError("Enter your tracking number first.");
      return;
    }

    setError(null);
    setIsSearching(true);

    try {
      // First check if the user is logged in by trying authenticated lookup
      const accessCheck = await fetch(`/api/ticket/lookup?token=${encodeURIComponent(token)}`, {
        cache: "no-store",
      });
      const accessData = (await accessCheck.json()) as LookupResponse;

      if (accessCheck.ok && accessData.ok && accessData.ticket?.id) {
        // Try the authenticated route — if this succeeds, user is logged in → skip OTP
        const ticketId = asString(accessData.ticket.id);
        const trackingNumber = asString(accessData.ticket.guest_tracking_number) || token;

        if (ticketId) {
          const authCheck = await fetch(`/api/ticket/${encodeURIComponent(ticketId)}`, {
            cache: "no-store",
          });

          if (authCheck.status === 200) {
            // Authenticated user — redirect directly, no OTP needed
            router.push(`/tickets/${encodeURIComponent(ticketId)}?token=${encodeURIComponent(trackingNumber)}`);
            return;
          }

          if (authCheck.status === 403) {
            router.push("/no_access_ticket");
            return;
          }
        }
      }

      // Guest path — request OTP
      const otpResponse = await fetch("/api/ticket/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const otpData = (await otpResponse.json()) as OtpSendResponse;

      if (!otpResponse.ok || !otpData.ok) {
        throw new Error(asString(otpData.message) || "Failed to look up ticket.");
      }

      // If OTP is not required (customer ticket looked up via token), redirect via guest fallback
      if (otpData.otpRequired === false) {
        router.push(`/view/${encodeURIComponent(token)}?token=${encodeURIComponent(token)}`);
        return;
      }

      // Move to OTP step
      setResolvedToken(token);
      setMaskedEmail(asString(otpData.maskedEmail));
      setStep("otp");
      setOtpDigits(["", "", "", "", "", ""]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ticket lookup failed.");
    } finally {
      setIsSearching(false);
    }
  }

  // OTP digit input handlers
  function handleOtpChange(index: number, value: string) {
    // Only allow digits
    const digit = value.replace(/\D/g, "").slice(-1);
    const newDigits = [...otpDigits];
    newDigits[index] = digit;
    setOtpDigits(newDigits);

    // Auto-advance to next input  
    if (digit && index < 5) {
      otpInputsRef.current[index + 1]?.focus();
    }
  }

  function handleOtpKeyDown(index: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !otpDigits[index] && index > 0) {
      otpInputsRef.current[index - 1]?.focus();
    }
    if (e.key === "Enter") {
      e.preventDefault();
      otpFormRef.current?.requestSubmit();
    }
  }

  function handleOtpPaste(e: React.ClipboardEvent) {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;
    const newDigits = [...otpDigits];
    for (let i = 0; i < 6; i++) {
      newDigits[i] = pasted[i] || "";
    }
    setOtpDigits(newDigits);
    // Focus last filled or the next empty
    const focusIdx = Math.min(pasted.length, 5);
    otpInputsRef.current[focusIdx]?.focus();
  }

  // Step 2: Verify OTP
  async function onOtpSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSearching) return;

    const otp = otpDigits.join("");
    if (otp.length !== 6) {
      setError("Please enter the full 6-digit code.");
      return;
    }

    setError(null);
    setIsSearching(true);

    try {
      const response = await fetch("/api/ticket/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: resolvedToken, otp }),
      });
      const data = (await response.json()) as OtpVerifyResponse;

      if (!response.ok || !data.ok) {
        throw new Error(asString(data.message) || "OTP verification failed.");
      }

      setStep("redirecting");
      router.push(`/view/${encodeURIComponent(resolvedToken)}?token=${encodeURIComponent(resolvedToken)}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "OTP verification failed.");
    } finally {
      setIsSearching(false);
    }
  }

  // Resend OTP
  async function onResendOtp() {
    if (isSearching) return;
    setError(null);
    setIsSearching(true);

    try {
      const response = await fetch("/api/ticket/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: resolvedToken }),
      });
      const data = (await response.json()) as OtpSendResponse;

      if (!response.ok || !data.ok) {
        throw new Error(asString(data.message) || "Failed to resend OTP.");
      }

      setMaskedEmail(asString(data.maskedEmail));
      setOtpDigits(["", "", "", "", "", ""]);
      otpInputsRef.current[0]?.focus();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to resend OTP.");
    } finally {
      setIsSearching(false);
    }
  }

  // Go back to tracking number input  
  function onBackToToken() {
    setStep("token");
    setResolvedToken("");
    setMaskedEmail("");
    setOtpDigits(["", "", "", "", "", ""]);
    setError(null);
  }

  // ────────────────────── RENDER ──────────────────────

  if (step === "redirecting") {
    return (
      <div className="text-center">
        <p className="text-sm text-slate-500">Verified! Redirecting to your ticket...</p>
      </div>
    );
  }

  if (step === "otp") {
    return (
      <div>
        <button
          type="button"
          onClick={onBackToToken}
          className="mb-4 inline-flex items-center text-sm font-medium text-sky-600 hover:text-sky-700"
        >
          ← Back
        </button>

        <h3 className="mb-1 text-lg font-semibold text-slate-800">Verify your identity</h3>
        <p className="mb-6 text-sm leading-relaxed text-slate-500">
          A 6-digit verification code was sent to{" "}
          <span className="font-semibold text-slate-700">{maskedEmail}</span>.
          <br />
          Enter it below to view your ticket.
        </p>

        <form ref={otpFormRef} onSubmit={onOtpSubmit} className="space-y-4">
          <div className="flex justify-center gap-2" onPaste={handleOtpPaste}>
            {otpDigits.map((digit, idx) => (
              <input
                key={idx}
                ref={(el) => { otpInputsRef.current[idx] = el; }}
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={1}
                value={digit}
                onChange={(e) => handleOtpChange(idx, e.target.value)}
                onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                disabled={isSearching}
                className="h-12 w-12 rounded-xl border border-slate-300 bg-white text-center text-xl font-bold text-slate-800 shadow-sm transition-colors focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200 disabled:opacity-50"
              />
            ))}
          </div>

          {error ? (
            <p className="text-center text-sm font-medium text-red-700">{error}</p>
          ) : null}

          <div className="flex flex-col items-center gap-3">
            <button
              type="submit"
              disabled={isSearching || otpDigits.join("").length !== 6}
              className="mt-2 rounded-full bg-sky-600 px-7 py-3 text-sm font-semibold text-white transition-colors hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSearching ? "Verifying..." : "Verify"}
            </button>

            <button
              type="button"
              onClick={onResendOtp}
              disabled={isSearching}
              className="text-sm font-medium text-sky-600 hover:text-sky-700 disabled:opacity-50"
            >
              Resend code
            </button>
          </div>
        </form>
      </div>
    );
  }

  // Step: token input (default)
  return (
    <div>
      <h3 className="mb-1 text-lg font-semibold text-slate-800">Enter your ticket access token</h3>
      <p className="mb-6 text-sm leading-relaxed text-slate-500">
        Use your tracking number from the confirmation screen to check your ticket status.
      </p>

      <form ref={tokenFormRef} onSubmit={onTokenSubmit} className="space-y-4">
        <div className="flex flex-col items-center">
          <label className="mb-2 block text-sm font-medium text-slate-700">
            Tracking Number
          </label>
          <AnimatedGlowingSearchBar
            value={tokenInput}
            onChange={setTokenInput}
            onKeyDown={handleTokenKeyDown}
            placeholder="TRK-XXXX-XXXX-XXXX"
            disabled={isSearching}
          />
        </div>

        {error ? (
          <p className="text-center text-sm font-medium text-red-700">{error}</p>
        ) : null}

        <div className="flex justify-center">
          <button
            type="submit"
            disabled={isSearching}
            className="mt-2 rounded-full bg-sky-600 px-7 py-3 text-sm font-semibold text-white transition-colors hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSearching ? "Searching..." : "Search"}
          </button>
        </div>
      </form>
    </div>
  );
}

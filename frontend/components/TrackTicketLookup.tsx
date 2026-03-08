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

type TrackTicketLookupProps = {
  initialToken?: string;
};

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
  const formRef = useRef<HTMLFormElement>(null);
  const [tokenInput, setTokenInput] = useState(initialToken);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusResult, setStatusResult] = useState<{ trackingNumber: string; status: string } | null>(null);

  useEffect(() => {
    const nextToken = asString(initialToken);
    if (!nextToken) return;
    setTokenInput(nextToken);
  }, [initialToken]);

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      formRef.current?.requestSubmit();
    }
  }

  async function onSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSearching) return;

    const token = extractToken(tokenInput);
    if (!token) {
      setError("Enter your tracking number first.");
      return;
    }

    setError(null);
    setStatusResult(null);
    setIsSearching(true);

    try {
      const response = await fetch(`/api/ticket/lookup?token=${encodeURIComponent(token)}`, {
        cache: "no-store",
      });

      const data = (await response.json()) as LookupResponse;

      if (!response.ok || data.ok !== true) {
        throw new Error(asString(data.message) || "Ticket lookup failed.");
      }

      const status = asString(data.ticket?.status);
      if (!status) {
        throw new Error("Ticket lookup returned no status.");
      }

      const trackingNumber = asString(data.ticket?.guest_tracking_number) || token;
      const ticketId = asString(data.ticket?.id);

      if (ticketId) {
        const accessCheck = await fetch(`/api/ticket/${encodeURIComponent(ticketId)}`, {
          cache: "no-store",
        });

        if (accessCheck.status === 200) {
          router.push(`/tickets/${encodeURIComponent(ticketId)}?token=${encodeURIComponent(trackingNumber)}`);
          return;
        }

        if (accessCheck.status === 403) {
          router.push("/no_access_ticket");
          return;
        }
      }

      // Guest fallback route
      router.push(`/view/${encodeURIComponent(trackingNumber)}?token=${encodeURIComponent(trackingNumber)}`);
    } catch (lookupError) {
      setError(lookupError instanceof Error ? lookupError.message : "Ticket lookup failed.");
    } finally {
      setIsSearching(false);
    }
  }

  return (
    <div>
      <h3 className="mb-1 text-lg font-semibold text-slate-800">Enter your ticket access token</h3>
      <p className="mb-6 text-sm leading-relaxed text-slate-500">
        Use your tracking number from the confirmation screen to check your ticket status.
      </p>

      <form ref={formRef} onSubmit={onSearch} className="space-y-4">
        <div className="flex flex-col items-center">
          <label className="mb-2 block text-sm font-medium text-slate-700">
            Tracking Number
          </label>
          <AnimatedGlowingSearchBar
            value={tokenInput}
            onChange={setTokenInput}
            onKeyDown={handleKeyDown}
            placeholder="TRK-XXXX-XXXX-XXXX"
            disabled={isSearching}
          />
        </div>

        {error ? (
          <p className="text-center text-sm font-medium text-red-700">{error}</p>
        ) : null}

        {statusResult ? (
          <div className="mt-2 rounded-xl border border-blue-100 bg-blue-50 p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-blue-900">
              Tracking Number
            </p>
            <p className="mt-1 font-mono text-sm text-blue-700">
              {statusResult.trackingNumber}
            </p>
            <p className="mt-3 text-xs font-bold uppercase tracking-wide text-blue-900">
              Current Status
            </p>
            <p className="mt-1 text-lg font-bold text-slate-900">
              {statusResult.status}
            </p>
          </div>
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

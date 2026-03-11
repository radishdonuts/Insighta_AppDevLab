#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const INTERVAL_MS = 20_000;
const DEFAULT_LIMIT = 10;

function nowIso() {
  return new Date().toISOString();
}

function logLine(level, message) {
  console.log(`[${nowIso()}] [${level}] ${message}`);
}

function loadEnvFile(envPath) {
  if (!fs.existsSync(envPath)) return;
  const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const index = trimmed.indexOf("=");
    if (index <= 0) continue;
    const key = trimmed.slice(0, index).trim();
    let value = trimmed.slice(index + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

function resolveSecret() {
  return String(process.env.NLP_REPROCESS_SECRET || process.env.CRON_SECRET || "").trim();
}

function resolveBaseUrl() {
  return String(process.env.VALIDATION_API_BASE_URL || "http://127.0.0.1:3000").replace(/\/$/, "");
}

async function runOnce(input) {
  const response = await fetch(`${input.baseUrl}/api/nlp/jobs`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${input.secret}`,
    },
    body: JSON.stringify({ limit: DEFAULT_LIMIT }),
  });

  const text = await response.text();
  let payload = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = { rawText: text };
  }

  if (!response.ok) {
    const details =
      (payload && typeof payload === "object" && "error" in payload ? payload.error : null) || text || "unknown";
    throw new Error(`Worker call failed (${response.status}): ${details}`);
  }

  const claimed = payload?.claimed ?? 0;
  const succeeded = payload?.succeeded ?? 0;
  const failed = payload?.failed ?? 0;
  const applied = payload?.applied ?? 0;
  const reclaimed = payload?.reclaimedStaleLocks ?? 0;
  logLine(
    "PASS",
    `claimed=${claimed} succeeded=${succeeded} failed=${failed} applied=${applied} reclaimedStaleLocks=${reclaimed}`
  );
}

async function main() {
  loadEnvFile(path.resolve(process.cwd(), ".env"));

  const secret = resolveSecret();
  if (!secret) {
    throw new Error("Missing NLP_REPROCESS_SECRET or CRON_SECRET in frontend/.env.");
  }

  const baseUrl = resolveBaseUrl();
  logLine("INFO", `Starting local NLP worker loop at ${baseUrl}/api/nlp/jobs (interval: 20s).`);
  logLine("INFO", "Press Ctrl+C to stop.");

  process.on("SIGINT", () => {
    logLine("INFO", "Received SIGINT. Stopping worker loop.");
    process.exit(0);
  });
  process.on("SIGTERM", () => {
    logLine("INFO", "Received SIGTERM. Stopping worker loop.");
    process.exit(0);
  });

  // Run immediately once before waiting.
  try {
    await runOnce({ baseUrl, secret });
  } catch (error) {
    logLine("FAIL", error instanceof Error ? error.message : "Unknown worker error.");
  }

  setInterval(async () => {
    try {
      await runOnce({ baseUrl, secret });
    } catch (error) {
      logLine("FAIL", error instanceof Error ? error.message : "Unknown worker error.");
    }
  }, INTERVAL_MS);
}

main().catch((error) => {
  logLine("FAIL", error instanceof Error ? error.message : "Unknown fatal error.");
  process.exit(1);
});

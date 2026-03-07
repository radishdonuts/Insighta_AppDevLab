#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { performance } from "node:perf_hooks";
import { createClient } from "@supabase/supabase-js";

function loadEnvFile(envPath) {
  if (!fs.existsSync(envPath)) return;
  const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const i = trimmed.indexOf("=");
    if (i <= 0) continue;
    const key = trimmed.slice(0, i).trim();
    let value = trimmed.slice(i + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

function nowIso() {
  return new Date().toISOString();
}

function logStep(step, status, details = "") {
  console.log(`[${nowIso()}] [${status}] ${step}${details ? ` - ${details}` : ""}`);
}

async function postJson(url, body, headers = {}) {
  const started = performance.now();
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    body: JSON.stringify(body),
  });
  const elapsedMs = Math.round(performance.now() - started);
  const text = await response.text();
  let payload = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = { rawText: text };
  }
  return { response, payload, elapsedMs };
}

function percentile95(values) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.ceil(sorted.length * 0.95) - 1);
  return sorted[idx];
}

async function runNlpProbeLoop(baseUrl) {
  const probes = [
    "I was charged twice and need a refund. Please fix this billing issue.",
    "My delivery is delayed for two weeks and nobody updated me.",
    "Someone changed my policy details without permission. This might be fraud.",
  ];

  const latencies = [];
  let failures = 0;

  for (let i = 0; i < probes.length; i += 1) {
    const { response, payload, elapsedMs } = await postJson(`${baseUrl}/api/nlp`, {
      text: probes[i],
    });
    latencies.push(elapsedMs);

    const ok =
      response.ok &&
      typeof payload === "object" &&
      payload !== null &&
      (payload.categoryName ?? null) !== null &&
      (payload.priority ?? null) !== null;

    if (!ok) {
      failures += 1;
      logStep("probe.nlp", "FAIL", `#${i + 1} status=${response.status} latency=${elapsedMs}ms`);
    } else {
      logStep(
        "probe.nlp",
        "PASS",
        `#${i + 1} status=${response.status} latency=${elapsedMs}ms category=${payload.categoryName} priority=${payload.priority}`
      );
    }
  }

  const p95 = percentile95(latencies);
  logStep("probe.nlp.summary", failures === 0 ? "PASS" : "WARN", `p95=${p95}ms failures=${failures}/${probes.length}`);
  return { failures, p95 };
}

async function runQueueReadinessChecks(baseUrl) {
  const secret = process.env.NLP_REPROCESS_SECRET || process.env.CRON_SECRET || "";
  const headers = secret ? { Authorization: `Bearer ${secret}` } : {};
  const { response, payload, elapsedMs } = await postJson(`${baseUrl}/api/nlp/jobs`, { limit: 1 }, headers);

  if (response.ok) {
    logStep("probe.worker", "PASS", `status=${response.status} latency=${elapsedMs}ms claimed=${payload?.claimed ?? "?"}`);
  } else {
    logStep("probe.worker", "WARN", `status=${response.status} latency=${elapsedMs}ms auth/config may be missing`);
  }
}

async function runQueueMetricsCheck() {
  const url = process.env.SUPABASE_URL || "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  if (!url || !key) {
    logStep("probe.queue.db", "WARN", "SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY missing; skipped.");
    return;
  }

  const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const pending = await supabase
    .from("ticket_nlp_jobs")
    .select("id", { count: "exact", head: true })
    .in("status", ["pending", "failed", "processing"]);
  if (pending.error) {
    logStep("probe.queue.db", "WARN", pending.error.message);
    return;
  }

  const latest = await supabase
    .from("ticket_nlp_jobs")
    .select("id,status,attempt_count,locked_at,updated_at")
    .order("updated_at", { ascending: false })
    .limit(3);

  const count = pending.count ?? 0;
  logStep("probe.queue.db", "PASS", `active_jobs=${count} latest_rows=${Array.isArray(latest.data) ? latest.data.length : 0}`);
}

async function main() {
  loadEnvFile(path.resolve(process.cwd(), ".env"));
  const baseUrl = process.env.VALIDATION_API_BASE_URL || "http://127.0.0.1:3000";
  logStep("start", "INFO", `baseUrl=${baseUrl}`);

  const nlpResult = await runNlpProbeLoop(baseUrl);
  await runQueueReadinessChecks(baseUrl);
  await runQueueMetricsCheck();

  if (nlpResult.failures > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  logStep("fatal", "FAIL", error instanceof Error ? error.message : "Unknown error");
  process.exit(1);
});

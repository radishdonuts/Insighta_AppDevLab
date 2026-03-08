#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { setTimeout as sleep } from "node:timers/promises";
import { spawn } from "node:child_process";
import { createClient } from "@supabase/supabase-js";

let spawnedBackendProcess = null;

function loadEnvFile(envPath) {
  if (!fs.existsSync(envPath)) return;
  const raw = fs.readFileSync(envPath, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIndex = trimmed.indexOf("=");
    if (eqIndex <= 0) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    let value = trimmed.slice(eqIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

function now() {
  return new Date().toISOString();
}

function printStep(name, status, details) {
  console.log(`[${now()}] [${status}] ${name}${details ? ` - ${details}` : ""}`);
}

function mustHaveEnv(keys) {
  const missing = keys.filter((key) => !String(process.env[key] || "").trim());
  if (missing.length > 0) {
    throw new Error(`Missing required env keys: ${missing.join(", ")}`);
  }
}

async function fetchJson(url, init = {}) {
  const response = await fetch(url, init);
  const text = await response.text();
  let payload = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = { rawText: text };
  }
  return { response, payload };
}

async function checkNlpEndpoint(fastapiBase) {
  const healthUrl = `${fastapiBase.replace(/\/$/, "")}/health`;
  try {
    const health = await fetch(healthUrl, { method: "GET" });
    if (health.ok) return;
  } catch {
    // fallback below
  }

  const probeUrl = `${fastapiBase.replace(/\/$/, "")}/nlp/generate`;
  const probe = await fetchJson(probeUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text: "Claim denied despite complete documents. Please review urgently.",
      ticketId: "validation-probe",
      provider: "fastapi",
    }),
  });

  if (!probe.response.ok) {
    throw new Error(`NLP probe failed (${probe.response.status}).`);
  }
}

async function waitForHealth(fastapiBase, timeoutMs = 20000) {
  const deadline = Date.now() + timeoutMs;
  const healthUrl = `${fastapiBase.replace(/\/$/, "")}/health`;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(healthUrl, { method: "GET" });
      if (response.ok) return true;
    } catch {
      // keep waiting
    }
    await sleep(1000);
  }
  return false;
}

function isLocalFastApiUrl(fastapiBase) {
  try {
    const url = new URL(fastapiBase);
    return ["127.0.0.1", "localhost"].includes(url.hostname);
  } catch {
    return false;
  }
}

async function ensureNlpAvailable(fastapiBase) {
  try {
    await checkNlpEndpoint(fastapiBase);
    return null;
  } catch (initialError) {
    if (!isLocalFastApiUrl(fastapiBase)) {
      throw initialError;
    }

    const backendDir = path.resolve(process.cwd(), "..", "backend");
    if (!fs.existsSync(path.join(backendDir, "main.py"))) {
      throw initialError;
    }

    printStep("preflight.nlp", "WARN", "NLP endpoint unreachable; attempting to auto-start local FastAPI.");
    const child = spawn("python", ["-m", "uvicorn", "main:app", "--host", "127.0.0.1", "--port", "8000"], {
      cwd: backendDir,
      stdio: "pipe",
      windowsHide: true,
    });

    child.stdout.on("data", (chunk) => {
      const line = String(chunk).trim();
      if (line) printStep("backend", "INFO", line);
    });
    child.stderr.on("data", (chunk) => {
      const line = String(chunk).trim();
      if (line) printStep("backend", "INFO", line);
    });

    const ready = await waitForHealth(fastapiBase, 25000);
    if (!ready) {
      child.kill("SIGTERM");
      throw new Error("Auto-started FastAPI did not become healthy in time.");
    }

    await checkNlpEndpoint(fastapiBase);
    spawnedBackendProcess = child;
    return child;
  }
}

async function postTicket(apiBaseUrl, payload) {
  const form = new FormData();
  form.set("ticketType", "Complaint");
  form.set("guestEmail", payload.guestEmail);
  form.set("title", payload.title);
  form.set("description", payload.description);
  if (payload.categoryId) {
    form.set("categoryId", payload.categoryId);
  }

  return fetchJson(`${apiBaseUrl.replace(/\/$/, "")}/api/tickets`, {
    method: "POST",
    body: form,
  });
}

function isMissingColumnMessage(message, columnName) {
  const lower = String(message || "").toLowerCase();
  const col = columnName.toLowerCase();
  return lower.includes("column") && (lower.includes(`'${col}'`) || lower.includes(`tickets.${col}`) || lower.includes(col));
}

async function readTicketForValidation(supabase, ticketId) {
  const withSources = await supabase
    .from("tickets")
    .select("id, category_name, priority, category_source, priority_source, nlp_updated_at")
    .eq("id", ticketId)
    .maybeSingle();

  const message = withSources.error?.message || "";
  if (!withSources.error || (!isMissingColumnMessage(message, "category_source") && !isMissingColumnMessage(message, "priority_source"))) {
    return withSources;
  }

  return supabase
    .from("tickets")
    .select("id, category_name, priority, nlp_updated_at")
    .eq("id", ticketId)
    .maybeSingle();
}

async function pollForNlpApplied(supabase, ticketId, timeoutMs = 90000, intervalMs = 2000) {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const ticketResult = await readTicketForValidation(supabase, ticketId);

    const analysisResult = await supabase
      .from("ticket_nlp_analyses")
      .select("status, is_applied, error_message, created_at, category_name, priority")
      .eq("ticket_id", ticketId)
      .order("created_at", { ascending: false })
      .limit(1);

    const ticket = ticketResult.data || null;
    const analysis = analysisResult.data?.[0] || null;
    const categorySourceOk =
      !ticket || ticket.category_source === null || ticket.category_source === undefined || ticket.category_source === "nlp";
    const prioritySourceOk =
      !ticket || ticket.priority_source === null || ticket.priority_source === undefined || ticket.priority_source === "nlp";
    const ticketApplied =
      !!ticket &&
      categorySourceOk &&
      prioritySourceOk &&
      !!ticket.category_name &&
      !!ticket.priority &&
      !!ticket.nlp_updated_at &&
      !!analysis &&
      analysis.status === "succeeded" &&
      analysis.is_applied === true;

    if (ticketApplied) {
      return { ok: true, ticketApplied, ticket, analysis };
    }

    await sleep(intervalMs);
  }

  const lastTicket = await readTicketForValidation(supabase, ticketId);
  const lastAnalysis = await supabase
    .from("ticket_nlp_analyses")
    .select("status, is_applied, error_message, created_at, category_name, priority")
    .eq("ticket_id", ticketId)
    .order("created_at", { ascending: false })
    .limit(1);

  return {
    ok: false,
    ticketApplied: false,
    ticket: lastTicket.data || null,
    analysis: lastAnalysis.data?.[0] || null,
  };
}

async function runNegativeCase(apiBaseUrl, testCase) {
  const response = await fetchJson(`${apiBaseUrl.replace(/\/$/, "")}/api/tickets`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(testCase.body),
  });

  const statusOk = response.response.status === 400;
  const bodyText = JSON.stringify(response.payload || {});
  const messageOk = testCase.expectedSubstring
    ? bodyText.toLowerCase().includes(testCase.expectedSubstring.toLowerCase())
    : true;
  return { name: testCase.name, statusOk, messageOk, status: response.response.status, payload: response.payload };
}

async function cleanupValidationData(supabase, ticketIds, guestEmail) {
  for (const ticketId of ticketIds) {
    const attachmentRows = await supabase
      .from("attachments")
      .select("file_path")
      .eq("ticket_id", ticketId);
    if ((attachmentRows.data?.length || 0) > 0) {
      printStep("cleanup.attachments.storage", "WARN", `Ticket ${ticketId} has storage objects; manual cleanup may be required.`);
    }

    await supabase.from("attachments").delete().eq("ticket_id", ticketId);
    await supabase.from("ticket_access_tokens").delete().eq("ticket_id", ticketId);
    await supabase.from("ticket_nlp_analyses").delete().eq("ticket_id", ticketId);
    await supabase.from("tickets").delete().eq("id", ticketId);
  }

  const guest = await supabase.from("guest_contacts").select("id").eq("email", guestEmail).maybeSingle();
  const guestId = guest.data?.id;
  if (guestId) {
    const count = await supabase.from("tickets").select("id", { count: "exact", head: true }).eq("guest_id", guestId);
    if ((count.count || 0) === 0) {
      await supabase.from("guest_contacts").delete().eq("id", guestId);
    }
  }
}

async function main() {
  const envPath = path.resolve(process.cwd(), ".env");
  loadEnvFile(envPath);

  mustHaveEnv([
    "SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "FASTAPI_URL",
  ]);

  const apiBaseUrl = String(process.env.VALIDATION_API_BASE_URL || "http://127.0.0.1:3000");
  const fastapiBase = String(process.env.FASTAPI_URL);
  const supabaseUrl = String(process.env.SUPABASE_URL);
  const supabaseServiceRoleKey = String(process.env.SUPABASE_SERVICE_ROLE_KEY);
  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const runTag = `${Date.now()}`;
  const guestEmail = `validation.${runTag}@insighta.test`;
  const createdTicketIds = [];
  const failures = [];
  let backendProcess = null;

  printStep("preflight.env", "PASS", "Required env keys are present.");

  const categoriesProbe = await fetch(`${apiBaseUrl.replace(/\/$/, "")}/api/categories`, { method: "GET" });
  if (!categoriesProbe.ok) {
    throw new Error(`API probe failed (${categoriesProbe.status}). Is Next.js app running at ${apiBaseUrl}?`);
  }
  printStep("preflight.api", "PASS", `/api/categories reachable at ${apiBaseUrl}.`);

  backendProcess = await ensureNlpAvailable(fastapiBase);
  printStep("preflight.nlp", "PASS", `NLP endpoint reachable at ${fastapiBase}.`);

  const dbProbe = await supabase.from("tickets").select("id").limit(1);
  if (dbProbe.error) {
    throw new Error(`Supabase service-role query failed: ${dbProbe.error.message}`);
  }
  printStep("preflight.db", "PASS", "Supabase service-role query is valid.");

  try {
    const payloads = [
      {
        guestEmail,
        title: "Validation: claim denial needs urgent review",
        description:
          "My claim was denied even after I submitted complete supporting documents and receipts. This has direct financial impact and needs urgent correction.",
      },
      {
        guestEmail,
        title: "Validation: billing and payment dispute",
        description:
          "I was charged twice for the same policy period and support has not corrected the payment posting yet. Please investigate and resolve this billing issue quickly.",
      },
    ];

    let appliedResult = null;
    for (const payload of payloads) {
      const created = await postTicket(apiBaseUrl, payload);
      if (!created.response.ok) {
        failures.push(`Create ticket failed (${created.response.status}).`);
        printStep("create_ticket", "FAIL", `HTTP ${created.response.status}`);
        continue;
      }

      const ticketId = created.payload?.ticket?.id;
      if (!ticketId) {
        failures.push("Create ticket returned no ticket ID.");
        printStep("create_ticket", "FAIL", "No ticket ID in response.");
        continue;
      }

      createdTicketIds.push(ticketId);
      printStep("create_ticket", "PASS", `Ticket ${ticketId} created.`);

      const applied = await pollForNlpApplied(supabase, ticketId);
      if (applied.ok) {
        appliedResult = { ticketId, applied };
        printStep("nlp_prediction", "PASS", `Ticket ${ticketId} predicted and applied (${applied.analysis.category_name}, ${applied.analysis.priority}).`);
        break;
      }

      printStep(
        "nlp_prediction",
        "WARN",
        `Ticket ${ticketId} not predicted within timeout (latest status: ${applied.analysis?.status || "none"}).`
      );
    }

    if (!appliedResult) {
      failures.push("NLP labels were not applied to any created validation ticket.");
    }

    const negativeCases = [
      {
        name: "missing_title",
        body: {
          guestEmail,
          description: "This description has enough detail to pass minimum length validation.",
          ticketType: "Complaint",
        },
        expectedSubstring: "title is required",
      },
      {
        name: "short_description",
        body: {
          guestEmail,
          title: "Valid title",
          description: "Too short",
          ticketType: "Complaint",
        },
        expectedSubstring: "at least 20",
      },
      {
        name: "invalid_email",
        body: {
          guestEmail: "not-an-email",
          title: "Valid title",
          description: "This description has enough detail to pass minimum length validation.",
          ticketType: "Complaint",
        },
        expectedSubstring: "email",
      },
      {
        name: "invalid_category",
        body: {
          guestEmail,
          title: "Valid title",
          description: "This description has enough detail to pass minimum length validation.",
          ticketType: "Complaint",
          categoryId: "not-a-uuid",
        },
        expectedSubstring: "category is invalid",
      },
    ];

    for (const testCase of negativeCases) {
      const result = await runNegativeCase(apiBaseUrl, testCase);
      if (result.statusOk && result.messageOk) {
        printStep(`negative.${result.name}`, "PASS", "Returned expected validation error.");
      } else {
        failures.push(`Negative case failed: ${result.name} (status ${result.status}).`);
        printStep(`negative.${result.name}`, "FAIL", `Unexpected response status/body.`);
      }
    }
  } finally {
    try {
      await cleanupValidationData(supabase, createdTicketIds, guestEmail);
      printStep("cleanup", "PASS", `Removed ${createdTicketIds.length} ticket(s) and related rows.`);
    } catch (error) {
      failures.push(`Cleanup failed: ${error instanceof Error ? error.message : "unknown error"}`);
      printStep("cleanup", "FAIL", "Failed to clean validation artifacts.");
    }
  }

  if (backendProcess) {
    backendProcess.kill("SIGTERM");
    spawnedBackendProcess = null;
  }

  if (failures.length > 0) {
    printStep("summary", "FAIL", failures.join(" | "));
    process.exit(1);
  }

  printStep("summary", "PASS", "All validation checks passed.");
}

main().catch((error) => {
  if (spawnedBackendProcess) {
    spawnedBackendProcess.kill("SIGTERM");
    spawnedBackendProcess = null;
  }
  printStep("fatal", "FAIL", error instanceof Error ? error.message : "Unknown error.");
  process.exit(1);
});

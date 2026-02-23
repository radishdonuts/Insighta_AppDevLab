import { NextResponse } from "next/server";

import { getSupabaseServerClient } from "@/lib/supabase";

type CreateTicketRequest = {
  title?: string;
  description?: string;
  category?: string;
  priority?: "low" | "medium" | "high" | "urgent";
  customerName?: string;
  customerEmail?: string;
  policyNumber?: string;
};

type InsertResult = {
  success: boolean;
  data?: Record<string, unknown>;
  error?: string;
};

function normalizeText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function tryInsertTicket(
  ticketBody: CreateTicketRequest
): Promise<InsertResult> {
  const supabase = getSupabaseServerClient();

  const payloadVariants: Record<string, unknown>[] = [
    {
      title: ticketBody.title,
      description: ticketBody.description,
      category: ticketBody.category,
      priority: ticketBody.priority,
      customer_name: ticketBody.customerName,
      customer_email: ticketBody.customerEmail,
      policy_number: ticketBody.policyNumber
    },
    {
      title: ticketBody.title,
      description: ticketBody.description
    },
    {
      subject: ticketBody.title,
      description: ticketBody.description
    }
  ];

  let lastError: string | undefined;

  for (const variant of payloadVariants) {
    const sanitizedVariant = Object.fromEntries(
      Object.entries(variant).filter(([, value]) => value !== undefined && value !== "")
    );

    const { data, error } = await supabase
      .from("tickets")
      .insert(sanitizedVariant)
      .select("*")
      .single();

    if (!error) {
      return { success: true, data };
    }

    lastError = error.message;
  }

  return {
    success: false,
    error: lastError ?? "Unable to create ticket."
  };
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CreateTicketRequest;

    const title = normalizeText(body.title) || "Insurance Complaint";
    const description = normalizeText(body.description);
    const category = normalizeText(body.category) || undefined;
    const customerName = normalizeText(body.customerName) || undefined;
    const customerEmail = normalizeText(body.customerEmail) || undefined;
    const policyNumber = normalizeText(body.policyNumber) || undefined;
    const priority = body.priority;

    if (!description) {
      return NextResponse.json(
        { error: "Description is required." },
        { status: 400 }
      );
    }

    if (customerEmail && !isValidEmail(customerEmail)) {
      return NextResponse.json(
        { error: "Customer email is invalid." },
        { status: 400 }
      );
    }

    if (priority && !["low", "medium", "high", "urgent"].includes(priority)) {
      return NextResponse.json(
        { error: "Priority must be low, medium, high, or urgent." },
        { status: 400 }
      );
    }

    const result = await tryInsertTicket({
      title,
      description,
      category,
      priority,
      customerName,
      customerEmail,
      policyNumber
    });

    if (!result.success || !result.data) {
      return NextResponse.json(
        {
          error: "Failed to create ticket.",
          details: result.error
        },
        { status: 500 }
      );
    }

    const ticketRef =
      (result.data.ticket_number as string | undefined) ??
      (result.data.ticket_id as string | undefined) ??
      (result.data.reference as string | undefined) ??
      (result.data.id as string | undefined);

    return NextResponse.json(
      {
        message: "Ticket created successfully.",
        ticket: {
          id: result.data.id ?? null,
          reference: ticketRef ?? null,
          status: result.data.status ?? null,
          priority: result.data.priority ?? null,
          createdAt: result.data.created_at ?? null
        }
      },
      { status: 201 }
    );
  } catch {
    return NextResponse.json(
      { error: "Invalid request payload." },
      { status: 400 }
    );
  }
}

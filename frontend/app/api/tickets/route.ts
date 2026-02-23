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

type LookupResult = {
  success: boolean;
  data?: Record<string, unknown>[];
  error?: string;
};

function normalizeText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function mapTicket(ticket: Record<string, unknown>) {
  return {
    id: ticket.id ?? null,
    reference:
      (ticket.ticket_number as string | undefined) ??
      (ticket.ticket_id as string | undefined) ??
      (ticket.reference as string | undefined) ??
      (ticket.id as string | undefined) ??
      null,
    title:
      (ticket.title as string | undefined) ??
      (ticket.subject as string | undefined) ??
      null,
    description: (ticket.description as string | undefined) ?? null,
    category: (ticket.category as string | undefined) ?? null,
    status: (ticket.status as string | undefined) ?? null,
    priority: (ticket.priority as string | undefined) ?? null,
    customerName: (ticket.customer_name as string | undefined) ?? null,
    customerEmail: (ticket.customer_email as string | undefined) ?? null,
    policyNumber: (ticket.policy_number as string | undefined) ?? null,
    createdAt: (ticket.created_at as string | undefined) ?? null,
    updatedAt: (ticket.updated_at as string | undefined) ?? null
  };
}

async function tryLookupTickets(options: {
  reference?: string;
  ticketId?: string;
  customerEmail?: string;
  policyNumber?: string;
  limit: number;
}): Promise<LookupResult> {
  const supabase = getSupabaseServerClient();

  const referenceColumns = options.reference
    ? ["ticket_number", "ticket_id", "reference"]
    : [undefined];

  let lastError: string | undefined;

  for (const referenceColumn of referenceColumns) {
    let query = supabase
      .from("tickets")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(options.limit);

    if (options.ticketId) {
      query = query.eq("id", options.ticketId);
    }

    if (options.customerEmail) {
      query = query.eq("customer_email", options.customerEmail);
    }

    if (options.policyNumber) {
      query = query.eq("policy_number", options.policyNumber);
    }

    if (referenceColumn && options.reference) {
      query = query.eq(referenceColumn, options.reference);
    }

    const { data, error } = await query;

    if (!error) {
      if (data.length > 0) {
        return { success: true, data };
      }

      if (options.reference) {
        continue;
      }

      return { success: true, data };
    }

    lastError = error.message;
  }

  return {
    success: false,
    error: lastError ?? "Unable to lookup tickets."
  };
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

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);

    const reference = normalizeText(url.searchParams.get("reference")) || undefined;
    const ticketId = normalizeText(url.searchParams.get("ticketId")) || undefined;
    const customerEmail = normalizeText(url.searchParams.get("email")) || undefined;
    const policyNumber = normalizeText(url.searchParams.get("policyNumber")) || undefined;

    const limitParam = Number(url.searchParams.get("limit") ?? "10");
    const limit = Number.isFinite(limitParam)
      ? Math.max(1, Math.min(50, Math.floor(limitParam)))
      : 10;

    if (!reference && !ticketId && !customerEmail && !policyNumber) {
      return NextResponse.json(
        {
          error:
            "At least one query parameter is required: reference, ticketId, email, or policyNumber."
        },
        { status: 400 }
      );
    }

    if (customerEmail && !isValidEmail(customerEmail)) {
      return NextResponse.json(
        { error: "Email is invalid." },
        { status: 400 }
      );
    }

    const result = await tryLookupTickets({
      reference,
      ticketId,
      customerEmail,
      policyNumber,
      limit
    });

    if (!result.success || !result.data) {
      return NextResponse.json(
        {
          error: "Failed to fetch tickets.",
          details: result.error
        },
        { status: 500 }
      );
    }

    if (result.data.length === 0) {
      return NextResponse.json({ error: "Ticket not found." }, { status: 404 });
    }

    const tickets = result.data.map(mapTicket);

    return NextResponse.json({
      count: tickets.length,
      tickets
    });
  } catch {
    return NextResponse.json(
      { error: "Invalid request." },
      { status: 400 }
    );
  }
}

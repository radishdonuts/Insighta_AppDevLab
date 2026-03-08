import type { PaginatedResponse, PaginationMeta } from "@/types/api";
import type { TicketPriority, TicketStatus, TicketType } from "@/types/tickets";

export const STAFF_TICKET_TABS = ["my", "unassigned", "all"] as const;
export type StaffTicketTab = (typeof STAFF_TICKET_TABS)[number];

// "assigned" is kept as a read-only legacy value for backward URL compatibility.
export const STAFF_ASSIGNMENT_FILTERS = ["all", "mine", "assigned", "unassigned"] as const;
export type StaffAssignmentFilter = (typeof STAFF_ASSIGNMENT_FILTERS)[number];

export type StaffQueueFilters = {
  tab: StaffTicketTab;
  page: number;
  pageSize: number;
  status?: TicketStatus;
  priority?: TicketPriority;
  categoryId?: string;
  assignment: StaffAssignmentFilter;
  assignedTo?: string;
  q?: string;
};

export type StaffPersonSummary = {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  displayName: string;
};

export type StaffCategorySummary = {
  id: string;
  name: string;
};

export type TicketFieldSource = "user" | "nlp" | "human_intervention" | "default" | null;

export type StaffTicketQueueItem = {
  id: string;
  ticketNumber: string;
  ticketType: TicketType | string;
  title: string | null;
  status: TicketStatus | string;
  priority: TicketPriority | string;
  description: string;
  submittedAt: string;
  lastUpdatedAt: string;
  category: StaffCategorySummary | null;
  categorySource: TicketFieldSource;
  prioritySource: TicketFieldSource;
  assignedStaff: StaffPersonSummary | null;
  submitterType: "Customer" | "Guest" | "Unknown";
};

export type StaffTicketQueueResponse = PaginatedResponse<StaffTicketQueueItem> & {
  filters: StaffQueueFilters;
  categoryOptions: StaffCategorySummary[];
  staffOptions: StaffPersonSummary[];
};

export type StaffAttachmentMetadata = {
  id: string;
  fileName: string;
  fileType: string | null;
  filePath: string;
  signedUrl: string | null;
  uploadedAt: string;
};

export type StaffTicketStatusHistoryItem = {
  id: string;
  oldStatus: string;
  newStatus: string;
  changedAt: string;
  remarks: string | null;
  changedBy: StaffPersonSummary | null;
};

export type StaffTicketNote = {
  id: string;
  content: string;
  createdAt: string;
  author: StaffPersonSummary | null;
};

export type StaffTicketMessage = {
  id: string;
  content: string;
  senderType: string;
  createdAt: string;
  sender: StaffPersonSummary | null;
};

export type StaffTicketDetail = {
  id: string;
  ticketNumber: string;
  ticketType: TicketType | string;
  title: string | null;
  status: TicketStatus | string;
  priority: TicketPriority | string;
  description: string;
  submittedAt: string;
  lastUpdatedAt: string;
  categoryName: string | null;
  category: StaffCategorySummary | null;
  categoryId: string | null;
  categorySource: TicketFieldSource;
  prioritySource: TicketFieldSource;
  submitterType: "Customer" | "Guest" | "Unknown";
  submitter: StaffPersonSummary | null;
  guestEmail: string | null;
  assignedStaff: StaffPersonSummary | null;
  nlpSuggestion: {
    analysisId: string | null;
    status: string | null;
    isApplied: boolean;
    suggestedCategoryName: string | null;
    suggestedPriority: TicketPriority | string | null;
    confidenceCategory: number | null;
    confidencePriority: number | null;
    prioritySource: "ml" | "rule" | null;
    createdAt: string | null;
  } | null;
  attachments: StaffAttachmentMetadata[];
  statusHistory: StaffTicketStatusHistoryItem[];
};

export type StaffTicketDetailResponse = {
  ticket: StaffTicketDetail;
};

export type StaffNlpLabelOption = {
  id: string;
  displayName: string;
};

export type StaffNlpReviewOptionsResponse = {
  ticket: Pick<
    StaffTicketDetail,
    "id" | "priority" | "categoryName" | "categoryId"
  >;
  options: {
    priorities: string[];
    categories: StaffCategorySummary[];
  };
};

export type StaffNlpReviewRequest = {
  analysisId?: string;
  correctedPriority?: string | null;
  correctedCategoryName?: string | null;
  notes?: string;
};

export type StaffNlpReviewResponse = {
  message: string;
};

export type StaffTicketNotesResponse = {
  notes: StaffTicketNote[];
};

export type StaffTicketNoteCreateResponse = {
  message: string;
  note: unknown;
};

export type StaffTicketMessagesResponse = {
  messages: StaffTicketMessage[];
};

export type StaffTicketMessageCreateResponse = {
  message: string;
  data: unknown;
};

export type StaffStatusUpdateRequest = {
  status: TicketStatus | string;
  remarks?: string;
};

export type StaffStatusUpdateResponse = {
  message: string;
  ticket: Pick<StaffTicketDetail, "id" | "ticketNumber" | "status" | "lastUpdatedAt">;
  statusHistoryEntry?: StaffTicketStatusHistoryItem;
};

export type StaffAssignRequest = {
  action?: "self_assign";
};

export type StaffAssignResponse = {
  message: string;
  ticket: Pick<StaffTicketDetail, "id" | "ticketNumber" | "lastUpdatedAt"> & {
    assignedStaff: StaffPersonSummary | null;
  };
};

export type StaffQueueApiEnvelope = StaffTicketQueueResponse;
export type StaffPaginationMeta = PaginationMeta;

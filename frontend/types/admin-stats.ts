export type AdminStatsDateRange = {
  from: string;
  to: string;
  days: number;
};

export type AdminStatsBreakdownItem = {
  key: string;
  label: string;
  count: number;
  percentage: number;
};

export type AdminOverviewMetrics = {
  totalTickets: number;
  openInProgressTickets: number;
  resolvedTickets: number;
  unassignedTickets: number;
  createdToday: number;
  createdThisWeek: number;
};

export type AdminStatsOverviewResponse = {
  dateRange: AdminStatsDateRange;
  metrics: AdminOverviewMetrics;
  statusSnapshot: AdminStatsBreakdownItem[];
};

export type AdminTicketTrendPoint = {
  date: string;
  label: string;
  count: number;
};

export type AdminTicketsTrendsResponse = {
  dateRange: AdminStatsDateRange;
  granularity: "day";
  totalTickets: number;
  series: AdminTicketTrendPoint[];
};

export type AdminStatsBreakdownsResponse = {
  dateRange: AdminStatsDateRange;
  totalTickets: number;
  breakdowns: {
    status: AdminStatsBreakdownItem[];
    priority: AdminStatsBreakdownItem[];
    category: AdminStatsBreakdownItem[];
  };
};

export type AdminResolutionTrendPoint = {
  period: string;
  label: string;
  avgHours: number;
  ticketCount: number;
};

export type AdminResolutionTimeResponse = {
  dateRange: AdminStatsDateRange;
  granularity: "week" | "month";
  avgResolutionHours: number;
  totalResolvedTickets: number;
  series: AdminResolutionTrendPoint[];
};

export type AdminCreatedResolvedPoint = {
  period: string;
  label: string;
  created: number;
  resolved: number;
};

export type AdminCreatedResolvedResponse = {
  dateRange: AdminStatsDateRange;
  granularity: "week" | "month";
  series: AdminCreatedResolvedPoint[];
};

export type AdminCreateStaffAccountRequest = {
  email: string;
  firstName: string;
  lastName: string;
};

export type AdminCreateStaffAccountResponse = {
  message: string;
  account: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: "Staff";
    isActive: boolean;
  };
};

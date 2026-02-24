// TODO(feature/staff-ticket-workspace): Replace with shared API types from RBAC/integration branch once available.
export type PaginationMeta = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type PaginatedResponse<T> = {
  data: T[];
  pagination: PaginationMeta;
};

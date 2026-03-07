import type { ChangeEvent } from "react";

import styles from "./workspace-ui.module.css";

type Option = {
  value: string;
  label: string;
};

type StaffOption = {
  id: string;
  displayName: string;
};

type AssignmentSelection =
  | { kind: "preset"; value: "all" | "mine" | "unassigned" }
  | { kind: "staff"; value: string };

type FilterToolbarProps = {
  searchValue: string;
  status: string;
  priority: string;
  categoryId: string;
  assignmentSelection: AssignmentSelection;
  statusOptions: Option[];
  priorityOptions: Option[];
  categoryOptions: Option[];
  staffOptions: StaffOption[];
  selectedStaffName?: string;
  isUpdating: boolean;
  onSearchChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  onPriorityChange: (value: string) => void;
  onCategoryChange: (value: string) => void;
  onAssignmentChange: (next: AssignmentSelection) => void;
  onReset: () => void;
};

function assignmentValue(selection: AssignmentSelection): string {
  return selection.kind === "preset" ? `preset:${selection.value}` : `staff:${selection.value}`;
}

export default function FilterToolbar({
  searchValue,
  status,
  priority,
  categoryId,
  assignmentSelection,
  statusOptions,
  priorityOptions,
  categoryOptions,
  staffOptions,
  selectedStaffName,
  isUpdating,
  onSearchChange,
  onStatusChange,
  onPriorityChange,
  onCategoryChange,
  onAssignmentChange,
  onReset,
}: FilterToolbarProps) {
  function handleAssignmentChange(event: ChangeEvent<HTMLSelectElement>) {
    const value = event.target.value;
    if (value.startsWith("staff:")) {
      onAssignmentChange({ kind: "staff", value: value.slice("staff:".length) });
      return;
    }

    const preset = value.replace("preset:", "");
    if (preset === "mine" || preset === "unassigned" || preset === "all") {
      onAssignmentChange({ kind: "preset", value: preset });
    }
  }

  return (
    <section className={styles.toolbar} aria-label="Ticket filters">
      {selectedStaffName ? (
        <div className={styles.toolbarContext}>
          <span className={styles.assignedChip} title={selectedStaffName}>
            Assigned to: {selectedStaffName}
          </span>
        </div>
      ) : null}

      <div className={styles.toolbarGrid}>
        <label className={`${styles.field} ${styles.searchField}`}>
          <span className={styles.fieldLabel}>Search</span>
          <input
            type="search"
            className={styles.input}
            placeholder="Ticket number or description"
            value={searchValue}
            onChange={(event) => onSearchChange(event.target.value)}
          />
        </label>

        <label className={styles.field}>
          <span className={styles.fieldLabel}>Status</span>
          <select className={styles.select} value={status} onChange={(event) => onStatusChange(event.target.value)}>
            <option value="">All</option>
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className={styles.field}>
          <span className={styles.fieldLabel}>Priority</span>
          <select className={styles.select} value={priority} onChange={(event) => onPriorityChange(event.target.value)}>
            <option value="">All</option>
            {priorityOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <div className={styles.field}>
          <span className={styles.fieldLabel}>Category</span>
          <select className={styles.select} value={categoryId} onChange={(event) => onCategoryChange(event.target.value)}>
            <option value="">All</option>
            {categoryOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.field}>
          <span className={styles.fieldLabel}>Assignment</span>
          <select
            className={styles.select}
            value={assignmentValue(assignmentSelection)}
            onChange={handleAssignmentChange}
            aria-label="Assignment preset or staff filter"
          >
            <optgroup label="Presets">
              <option value="preset:all">All</option>
              <option value="preset:mine">Mine</option>
              <option value="preset:unassigned">Unassigned</option>
            </optgroup>
            {staffOptions.length > 0 ? (
              <optgroup label="Staff members">
                {staffOptions.map((staff) => (
                  <option key={staff.id} value={`staff:${staff.id}`}>
                    {staff.displayName}
                  </option>
                ))}
              </optgroup>
            ) : null}
          </select>
        </div>

        <div className={styles.toolbarActionsCell}>
          {isUpdating ? (
            <span className={styles.updatingInline} role="status" aria-live="polite">
              <span className={styles.spinner} aria-hidden="true" />
              Updating...
            </span>
          ) : null}
          <button type="button" className={styles.resetButton} onClick={onReset} aria-label="Reset filters">
            Reset
          </button>
        </div>
      </div>
    </section>
  );
}

import styles from "./workspace-ui.module.css";

type HeaderTab = {
  id: "my" | "unassigned" | "all";
  label: string;
};

type WorkspaceHeaderProps = {
  title: string;
  subtitle: string;
  activeTab: HeaderTab["id"];
  onTabChange: (tab: HeaderTab["id"]) => void;
};

const TABS: HeaderTab[] = [
  { id: "my", label: "My Tickets" },
  { id: "unassigned", label: "Unassigned" },
  { id: "all", label: "All" },
];

export default function WorkspaceHeader({ title, subtitle, activeTab, onTabChange }: WorkspaceHeaderProps) {
  return (
    <header className={styles.workspaceHeader}>
      <div className={styles.headerRow}>
        <div className={styles.headerText}>
          <h1 className={styles.title}>{title}</h1>
          <p className={styles.subtitle}>{subtitle}</p>
        </div>

        <div className={styles.tabRow} aria-label="Ticket queue presets">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              aria-pressed={activeTab === tab.id}
              className={`${styles.tabButton} ${activeTab === tab.id ? styles.tabButtonActive : ""}`}
              onClick={() => onTabChange(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>
    </header>
  );
}

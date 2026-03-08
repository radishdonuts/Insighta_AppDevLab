"use client";

import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

// Color palette
const COLORS = {
  primary: "#2563eb",
  secondary: "#0ea5e9",
  success: "#10b981",
  warning: "#f59e0b",
  danger: "#ef4444",
  gray: "#64748b",
  purple: "#8b5cf6",
  pink: "#ec4899",
};

const STATUS_COLORS: Record<string, string> = {
  "Under Review": "#f59e0b",
  "In Progress": "#2563eb",
  "Pending Customer Response": "#8b5cf6",
  Resolved: "#10b981",
  Closed: "#64748b",
};

const PRIORITY_COLORS: Record<string, string> = {
  Low: "#10b981",
  Medium: "#f59e0b",
  High: "#ef4444",
};

const CHART_COLORS = [
  "#2563eb",
  "#0ea5e9",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
  "#64748b",
  "#06b6d4",
  "#84cc16",
  "#f97316",
  "#a855f7",
];

export type TimeSeriesDataPoint = {
  label: string;
  date: string;
  count: number;
};

export type CreatedResolvedDataPoint = {
  label: string;
  created: number;
  resolved: number;
};

export type BreakdownDataPoint = {
  key: string;
  label: string;
  count: number;
  percentage: number;
};

export type ResolutionTrendPoint = {
  label: string;
  period: string;
  avgHours: number;
};

type CustomTooltipProps = {
  active?: boolean;
  payload?: Array<{ value: number; name?: string; dataKey?: string; color?: string }>;
  label?: string;
};

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;

  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #e2e8f0",
        borderRadius: "8px",
        padding: "0.6rem 0.8rem",
        boxShadow: "0 4px 12px rgba(15, 23, 42, 0.1)",
        fontSize: "0.85rem",
      }}
    >
      <p style={{ margin: 0, color: "#0f172a", fontWeight: 600 }}>{label}</p>
      {payload.map((entry, index) => (
        <p
          key={index}
          style={{ margin: "0.25rem 0 0", color: entry.color || "#475569" }}
        >
          {entry.name || entry.dataKey}: {entry.value.toLocaleString()}
        </p>
      ))}
    </div>
  );
}

// Line Chart for Tickets Over Time
export function TicketsOverTimeChart({
  data,
  granularity = "daily",
}: {
  data: TimeSeriesDataPoint[];
  granularity?: "daily" | "weekly";
}) {
  if (!data.length) {
    return (
      <div style={{ color: "#64748b", fontSize: "0.88rem", padding: "2rem", textAlign: "center" }}>
        No ticket data available for the selected period.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 12, fill: "#64748b" }}
          tickLine={{ stroke: "#e2e8f0" }}
          axisLine={{ stroke: "#e2e8f0" }}
        />
        <YAxis
          tick={{ fontSize: 12, fill: "#64748b" }}
          tickLine={{ stroke: "#e2e8f0" }}
          axisLine={{ stroke: "#e2e8f0" }}
          allowDecimals={false}
        />
        <Tooltip content={<CustomTooltip />} />
        <Line
          type="monotone"
          dataKey="count"
          name="Tickets"
          stroke={COLORS.primary}
          strokeWidth={2.5}
          dot={{ fill: COLORS.primary, strokeWidth: 0, r: 4 }}
          activeDot={{ r: 6, fill: COLORS.primary, stroke: "#fff", strokeWidth: 2 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

// Grouped Bar Chart for Created vs Resolved
export function CreatedVsResolvedChart({
  data,
}: {
  data: CreatedResolvedDataPoint[];
}) {
  if (!data.length) {
    return (
      <div style={{ color: "#64748b", fontSize: "0.88rem", padding: "2rem", textAlign: "center" }}>
        No comparison data available for the selected period.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 12, fill: "#64748b" }}
          tickLine={{ stroke: "#e2e8f0" }}
          axisLine={{ stroke: "#e2e8f0" }}
        />
        <YAxis
          tick={{ fontSize: 12, fill: "#64748b" }}
          tickLine={{ stroke: "#e2e8f0" }}
          axisLine={{ stroke: "#e2e8f0" }}
          allowDecimals={false}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend wrapperStyle={{ fontSize: "0.85rem" }} />
        <Bar
          dataKey="created"
          name="Created"
          fill={COLORS.primary}
          radius={[4, 4, 0, 0]}
        />
        <Bar
          dataKey="resolved"
          name="Resolved"
          fill={COLORS.success}
          radius={[4, 4, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

// Horizontal Bar Chart for Status Distribution
export function StatusDistributionChart({
  data,
}: {
  data: BreakdownDataPoint[];
}) {
  if (!data.length) {
    return (
      <div style={{ color: "#64748b", fontSize: "0.88rem", padding: "2rem", textAlign: "center" }}>
        No status data available.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
        <XAxis
          type="number"
          tick={{ fontSize: 12, fill: "#64748b" }}
          tickLine={{ stroke: "#e2e8f0" }}
          axisLine={{ stroke: "#e2e8f0" }}
          allowDecimals={false}
        />
        <YAxis
          type="category"
          dataKey="label"
          tick={{ fontSize: 12, fill: "#64748b" }}
          tickLine={{ stroke: "#e2e8f0" }}
          axisLine={{ stroke: "#e2e8f0" }}
          width={75}
        />
        <Tooltip
          content={({ active, payload, label }) => {
            if (!active || !payload?.length) return null;
            const item = data.find((d) => d.label === label);
            return (
              <div
                style={{
                  background: "#fff",
                  border: "1px solid #e2e8f0",
                  borderRadius: "8px",
                  padding: "0.6rem 0.8rem",
                  boxShadow: "0 4px 12px rgba(15, 23, 42, 0.1)",
                  fontSize: "0.85rem",
                }}
              >
                <p style={{ margin: 0, color: "#0f172a", fontWeight: 600 }}>{label}</p>
                <p style={{ margin: "0.25rem 0 0", color: "#475569" }}>
                  {payload[0].value?.toLocaleString()} tickets ({item?.percentage.toFixed(1)}%)
                </p>
              </div>
            );
          }}
        />
        <Bar dataKey="count" radius={[0, 4, 4, 0]}>
          {data.map((entry) => (
            <Cell
              key={entry.key}
              fill={STATUS_COLORS[entry.label] || COLORS.gray}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// Donut Chart for Priority Distribution
export function PriorityDonutChart({
  data,
}: {
  data: BreakdownDataPoint[];
}) {
  if (!data.length || data.every((d) => d.count === 0)) {
    return (
      <div style={{ color: "#64748b", fontSize: "0.88rem", padding: "2rem", textAlign: "center" }}>
        No priority data available.
      </div>
    );
  }

  const total = data.reduce((sum, d) => sum + d.count, 0);

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "1rem" }}>
      <ResponsiveContainer width={180} height={180}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={50}
            outerRadius={75}
            paddingAngle={2}
            dataKey="count"
            nameKey="label"
          >
            {data.map((entry) => (
              <Cell
                key={entry.key}
                fill={PRIORITY_COLORS[entry.label] || COLORS.gray}
              />
            ))}
          </Pie>
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const item = payload[0].payload as BreakdownDataPoint;
              return (
                <div
                  style={{
                    background: "#fff",
                    border: "1px solid #e2e8f0",
                    borderRadius: "8px",
                    padding: "0.6rem 0.8rem",
                    boxShadow: "0 4px 12px rgba(15, 23, 42, 0.1)",
                    fontSize: "0.85rem",
                  }}
                >
                  <p style={{ margin: 0, color: "#0f172a", fontWeight: 600 }}>{item.label}</p>
                  <p style={{ margin: "0.25rem 0 0", color: "#475569" }}>
                    {item.count.toLocaleString()} ({item.percentage.toFixed(1)}%)
                  </p>
                </div>
              );
            }}
          />
        </PieChart>
      </ResponsiveContainer>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        {data.map((entry) => (
          <div key={entry.key} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <div
              style={{
                width: "12px",
                height: "12px",
                borderRadius: "3px",
                background: PRIORITY_COLORS[entry.label] || COLORS.gray,
              }}
            />
            <span style={{ fontSize: "0.85rem", color: "#334155" }}>
              {entry.label}: {entry.count.toLocaleString()} ({entry.percentage.toFixed(1)}%)
            </span>
          </div>
        ))}
        <div style={{ marginTop: "0.25rem", fontSize: "0.8rem", color: "#64748b" }}>
          Total: {total.toLocaleString()}
        </div>
      </div>
    </div>
  );
}

// Bar Chart for Category Breakdown
export function CategoryBreakdownChart({
  data,
  maxItems,
}: {
  data: BreakdownDataPoint[];
  maxItems?: number;
}) {
  const visible = maxItems ? data.slice(0, maxItems) : data;

  if (!visible.length) {
    return (
      <div style={{ color: "#64748b", fontSize: "0.88rem", padding: "2rem", textAlign: "center" }}>
        No category data available.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={Math.max(280, visible.length * 35)}>
      <BarChart
        data={visible}
        layout="vertical"
        margin={{ top: 5, right: 30, left: 120, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
        <XAxis
          type="number"
          tick={{ fontSize: 12, fill: "#64748b" }}
          tickLine={{ stroke: "#e2e8f0" }}
          axisLine={{ stroke: "#e2e8f0" }}
          allowDecimals={false}
        />
        <YAxis
          type="category"
          dataKey="label"
          tick={{ fontSize: 11, fill: "#64748b" }}
          tickLine={{ stroke: "#e2e8f0" }}
          axisLine={{ stroke: "#e2e8f0" }}
          width={115}
        />
        <Tooltip
          content={({ active, payload, label }) => {
            if (!active || !payload?.length) return null;
            const item = visible.find((d) => d.label === label);
            return (
              <div
                style={{
                  background: "#fff",
                  border: "1px solid #e2e8f0",
                  borderRadius: "8px",
                  padding: "0.6rem 0.8rem",
                  boxShadow: "0 4px 12px rgba(15, 23, 42, 0.1)",
                  fontSize: "0.85rem",
                }}
              >
                <p style={{ margin: 0, color: "#0f172a", fontWeight: 600 }}>{label}</p>
                <p style={{ margin: "0.25rem 0 0", color: "#475569" }}>
                  {payload[0].value?.toLocaleString()} tickets ({item?.percentage.toFixed(1)}%)
                </p>
              </div>
            );
          }}
        />
        <Bar dataKey="count" radius={[0, 4, 4, 0]}>
          {visible.map((entry, index) => (
            <Cell key={entry.key} fill={CHART_COLORS[index % CHART_COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// Line Chart for Resolution Time Trend
export function ResolutionTimeTrendChart({
  data,
}: {
  data: ResolutionTrendPoint[];
}) {
  if (!data.length) {
    return (
      <div style={{ color: "#64748b", fontSize: "0.88rem", padding: "2rem", textAlign: "center" }}>
        No resolution time data available for the selected period.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 12, fill: "#64748b" }}
          tickLine={{ stroke: "#e2e8f0" }}
          axisLine={{ stroke: "#e2e8f0" }}
        />
        <YAxis
          tick={{ fontSize: 12, fill: "#64748b" }}
          tickLine={{ stroke: "#e2e8f0" }}
          axisLine={{ stroke: "#e2e8f0" }}
          allowDecimals={false}
          label={{
            value: "Hours",
            angle: -90,
            position: "insideLeft",
            style: { textAnchor: "middle", fill: "#64748b", fontSize: 12 },
          }}
        />
        <Tooltip
          content={({ active, payload, label }) => {
            if (!active || !payload?.length) return null;
            return (
              <div
                style={{
                  background: "#fff",
                  border: "1px solid #e2e8f0",
                  borderRadius: "8px",
                  padding: "0.6rem 0.8rem",
                  boxShadow: "0 4px 12px rgba(15, 23, 42, 0.1)",
                  fontSize: "0.85rem",
                }}
              >
                <p style={{ margin: 0, color: "#0f172a", fontWeight: 600 }}>{label}</p>
                <p style={{ margin: "0.25rem 0 0", color: "#475569" }}>
                  Avg Resolution: {payload[0].value}h
                </p>
              </div>
            );
          }}
        />
        <Line
          type="monotone"
          dataKey="avgHours"
          name="Avg Resolution Time (hours)"
          stroke={COLORS.secondary}
          strokeWidth={2.5}
          dot={{ fill: COLORS.secondary, strokeWidth: 0, r: 4 }}
          activeDot={{ r: 6, fill: COLORS.secondary, stroke: "#fff", strokeWidth: 2 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

// Summary Stats Cards
export function StatsSummaryCard({
  label,
  value,
  trend,
  trendLabel,
}: {
  label: string;
  value: string | number;
  trend?: "up" | "down" | "neutral";
  trendLabel?: string;
}) {
  const trendColor =
    trend === "up" ? "#10b981" : trend === "down" ? "#ef4444" : "#64748b";

  return (
    <div
      style={{
        background: "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)",
        border: "1px solid #dbe2ef",
        borderRadius: "14px",
        padding: "1rem",
        display: "flex",
        flexDirection: "column",
        gap: "0.25rem",
      }}
    >
      <span style={{ color: "#475569", fontSize: "0.85rem" }}>{label}</span>
      <span style={{ color: "#0f172a", fontWeight: 800, fontSize: "1.5rem", lineHeight: 1.1 }}>
        {typeof value === "number" ? value.toLocaleString() : value}
      </span>
      {trendLabel && (
        <span style={{ color: trendColor, fontSize: "0.78rem" }}>{trendLabel}</span>
      )}
    </div>
  );
}

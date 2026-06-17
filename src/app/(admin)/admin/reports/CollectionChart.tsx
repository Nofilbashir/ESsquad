"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

interface ChartRow {
  label: string;
  Expected: number;
  Collected: number;
}

interface Props {
  data: ChartRow[];
}

function formatK(value: number): string {
  if (value >= 1000) return `${(value / 1000).toFixed(0)}k`;
  return `${value}`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const collected = payload.find((p: { dataKey: string }) => p.dataKey === "Collected")?.value ?? 0;
  const expected = payload.find((p: { dataKey: string }) => p.dataKey === "Expected")?.value ?? 0;
  const pct = expected > 0 ? Math.round((collected / expected) * 100) : 0;

  return (
    <div className="rounded-xl border bg-card shadow-lg px-4 py-3 text-sm min-w-[160px]" style={{ borderColor: "var(--border)" }}>
      <p className="font-semibold text-foreground mb-2">{label}</p>
      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <span className="inline-block h-2 w-2 rounded-sm" style={{ background: "#6366f1" }} />
            Collected
          </span>
          <span className="font-semibold tabular-nums text-foreground">Rs. {collected.toLocaleString("en-PK")}</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <span className="inline-block h-2 w-2 rounded-sm bg-slate-300" />
            Expected
          </span>
          <span className="tabular-nums text-muted-foreground">Rs. {expected.toLocaleString("en-PK")}</span>
        </div>
        <div className="pt-1.5 mt-1 border-t flex items-center justify-between" style={{ borderColor: "var(--border)" }}>
          <span className="text-xs text-muted-foreground">Collection rate</span>
          <span className="text-xs font-bold tabular-nums text-foreground">{pct}%</span>
        </div>
      </div>
    </div>
  );
}

export default function CollectionChart({ data }: Props) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-5 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: "#6366f1" }} />
          Collected
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-sm bg-slate-300" />
          Expected
        </span>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <BarChart
          data={data}
          margin={{ top: 4, right: 4, left: -8, bottom: 4 }}
          barCategoryGap="28%"
          barGap={3}
        >
          <defs>
            <linearGradient id="gradCollected" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6366f1" stopOpacity={1} />
              <stop offset="100%" stopColor="#818cf8" stopOpacity={0.75} />
            </linearGradient>
            <linearGradient id="gradExpected" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#94a3b8" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#94a3b8" stopOpacity={0.12} />
            </linearGradient>
          </defs>

          <CartesianGrid strokeDasharray="2 4" stroke="var(--border)" vertical={false} opacity={0.6} />

          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: "#94a3b8", fontWeight: 500 }}
            axisLine={false}
            tickLine={false}
            dy={6}
          />
          <YAxis
            tickFormatter={formatK}
            tick={{ fontSize: 11, fill: "#94a3b8" }}
            axisLine={false}
            tickLine={false}
            width={52}
          />

          <Tooltip content={<CustomTooltip />} cursor={false} />

          <Bar dataKey="Expected" fill="url(#gradExpected)" radius={[20, 20, 0, 0]}>
            {data.map((_, i) => <Cell key={i} />)}
          </Bar>
          <Bar dataKey="Collected" fill="url(#gradCollected)" radius={[20, 20, 0, 0]}>
            {data.map((entry, i) => (
              <Cell
                key={i}
                fill={entry.Collected >= entry.Expected ? "#10b981" : "url(#gradCollected)"}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

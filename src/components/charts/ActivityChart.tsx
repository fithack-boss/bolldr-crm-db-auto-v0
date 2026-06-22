"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";

export function ActivityChart({
  data,
}: {
  data: { date: string; calls: number; emails: number; meetings: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="gCalls" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#3369ff" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#3369ff" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#64748b" }} />
        <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#64748b" }} />
        <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Area type="monotone" dataKey="calls" stroke="#3369ff" fill="url(#gCalls)" strokeWidth={2} />
        <Area type="monotone" dataKey="emails" stroke="#a78bfa" fillOpacity={0} strokeWidth={2} />
        <Area type="monotone" dataKey="meetings" stroke="#22c55e" fillOpacity={0} strokeWidth={2} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

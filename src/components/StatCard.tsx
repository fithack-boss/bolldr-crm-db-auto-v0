export function StatCard({
  label,
  value,
  sublabel,
  icon,
  accent = "text-slate-800",
}: {
  label: string;
  value: string | number;
  sublabel?: string;
  icon?: string;
  accent?: string;
}) {
  return (
    <div className="card p-4">
      <div className="flex items-start justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</span>
        {icon && <span className="text-lg">{icon}</span>}
      </div>
      <div className={`mt-2 text-2xl font-bold ${accent}`}>{value}</div>
      {sublabel && <div className="mt-1 text-xs text-slate-400">{sublabel}</div>}
    </div>
  );
}

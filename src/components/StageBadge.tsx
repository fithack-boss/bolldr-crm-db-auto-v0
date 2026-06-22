import type { Stage } from "@prisma/client";
import { stageLabel, stageColor } from "@/lib/constants";

export function StageBadge({ stage }: { stage: Stage }) {
  const color = stageColor(stage);
  return (
    <span
      className="badge"
      style={{ backgroundColor: `${color}1a`, color }}
    >
      <span className="mr-1 h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
      {stageLabel(stage)}
    </span>
  );
}

import type { Stage, InteractionType, Role } from "@prisma/client";

// Ordered pipeline stages with display labels and colors used across the UI.
export const STAGES: { value: Stage; label: string; color: string }[] = [
  { value: "NEW", label: "New Lead", color: "#94a3b8" },
  { value: "CONTACTED", label: "Contacted", color: "#38bdf8" },
  { value: "QUALIFIED", label: "Qualified", color: "#818cf8" },
  { value: "MEETING", label: "Meeting Booked", color: "#a78bfa" },
  { value: "PROPOSAL", label: "Proposal Sent", color: "#fbbf24" },
  { value: "NEGOTIATION", label: "Negotiation", color: "#fb923c" },
  { value: "WON", label: "Closed Won", color: "#22c55e" },
  { value: "LOST", label: "Closed Lost", color: "#ef4444" },
];

export const STAGE_VALUES = STAGES.map((s) => s.value);

export function stageLabel(stage: Stage): string {
  return STAGES.find((s) => s.value === stage)?.label ?? stage;
}

export function stageColor(stage: Stage): string {
  return STAGES.find((s) => s.value === stage)?.color ?? "#94a3b8";
}

export const INTERACTION_TYPES: { value: InteractionType; label: string; icon: string }[] = [
  { value: "CALL", label: "Call", icon: "📞" },
  { value: "EMAIL", label: "Email", icon: "✉️" },
  { value: "MEETING", label: "Meeting", icon: "🤝" },
  { value: "WHATSAPP", label: "WhatsApp", icon: "💬" },
  { value: "NOTE", label: "Note", icon: "📝" },
  { value: "TASK", label: "Task", icon: "✅" },
];

export function interactionLabel(type: InteractionType): string {
  return INTERACTION_TYPES.find((t) => t.value === type)?.label ?? type;
}

export function interactionIcon(type: InteractionType): string {
  return INTERACTION_TYPES.find((t) => t.value === type)?.icon ?? "•";
}

export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: "Administrator",
  SALES: "Sales Rep",
};

// Prospect verticals — mirrors the "Industria" field in the Bolldr CRM (Notion).
export const INDUSTRIES = [
  "Odontología",
  "Salud y Estética",
  "Contadores",
  "Bienestar y Spa",
  "Pilates y Fitness",
  "Centro Cultural",
  "Educación",
  "Tecnología",
  "Inmobiliaria",
  "Otro",
] as const;

// Services a prospect is interested in — mirrors the "Intereses" multi-select
// in the Bolldr CRM (Notion).
export const INTERESTS = [
  "Página Web",
  "SEO",
  "Redes Sociales",
  "Branding",
  "Fotografía",
  "Video",
  "Google Ads",
  "E-Commerce",
  "Automatización IA",
  "Análisis de Datos",
  "Consultoría",
] as const;

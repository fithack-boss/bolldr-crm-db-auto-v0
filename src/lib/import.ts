import type { Stage } from "@prisma/client";
import { STAGE_VALUES, INDUSTRIES, INTERESTS } from "@/lib/constants";

// Logic for transforming arbitrary CSV / Excel rows into our canonical Contact
// shape. Spreadsheets from different sources name their columns differently, so
// we map a broad set of header aliases onto first-class fields and stash
// anything unrecognized into the `extra` JSON bag (lossless import).
//
// The alias table covers both English headers and the Spanish column names used
// by the Bolldr CRM in Notion (Nombre del Cliente, Industria, Estado de Llamada,
// Teléfono, Celular, WhatsApp, Página Web, Intereses, Notas de Llamada …), so an
// export of that database imports cleanly.

export type RawRow = Record<string, unknown>;

export interface MappedContact {
  firstName: string;
  lastName?: string;
  company?: string;
  jobTitle?: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  website?: string;
  source?: string;
  stage?: Stage;
  industry?: string;
  interests?: string[];
  dealValue?: number;
  city?: string;
  country?: string;
  notes?: string;
  extra: Record<string, unknown>;
}

// Fields that hold plain strings and can be filled by the generic mapper.
type StringField =
  | "firstName"
  | "lastName"
  | "company"
  | "jobTitle"
  | "email"
  | "phone"
  | "whatsapp"
  | "website"
  | "source"
  | "city"
  | "country"
  | "notes";

// Header alias -> canonical field. Keys are normalized (diacritics removed,
// lowercased, stripped of spaces / punctuation) before lookup.
const FIELD_ALIASES: Record<string, StringField | "name" | "stage" | "dealValue" | "industry" | "interests"> = {
  // Name
  firstname: "firstName",
  first: "firstName",
  fname: "firstName",
  givenname: "firstName",
  lastname: "lastName",
  last: "lastName",
  lname: "lastName",
  surname: "lastName",
  familyname: "lastName",
  fullname: "name",
  name: "name",
  nombre: "name",
  // Company — in the Bolldr CRM the "Nombre del Cliente" is the business name.
  company: "company",
  companyname: "company",
  organization: "company",
  organisation: "company",
  account: "company",
  business: "company",
  empresa: "company",
  negocio: "company",
  cliente: "company",
  nombredelcliente: "company",
  nombredelnegocio: "company",
  // Job title
  jobtitle: "jobTitle",
  title: "jobTitle",
  position: "jobTitle",
  role: "jobTitle",
  cargo: "jobTitle",
  // Email
  email: "email",
  emailaddress: "email",
  mail: "email",
  workemail: "email",
  correo: "email",
  // Phone
  phone: "phone",
  phonenumber: "phone",
  mobile: "phone",
  mobilenumber: "phone",
  tel: "phone",
  telephone: "phone",
  contactnumber: "phone",
  telefono: "phone",
  celular: "phone",
  // WhatsApp (own field)
  whatsapp: "whatsapp",
  wa: "whatsapp",
  // Website
  website: "website",
  web: "website",
  url: "website",
  paginaweb: "website",
  sitioweb: "website",
  pagina: "website",
  // Source
  source: "source",
  leadsource: "source",
  channel: "source",
  fuente: "source",
  origen: "source",
  // Stage / call status
  stage: "stage",
  status: "stage",
  pipelinestage: "stage",
  dealstage: "stage",
  estado: "stage",
  estadodellamada: "stage",
  // Industry
  industry: "industry",
  industria: "industry",
  sector: "industry",
  rubro: "industry",
  vertical: "industry",
  // Interests
  interests: "interests",
  interest: "interests",
  intereses: "interests",
  interes: "interests",
  servicios: "interests",
  // Deal value
  dealvalue: "dealValue",
  value: "dealValue",
  amount: "dealValue",
  revenue: "dealValue",
  budget: "dealValue",
  valor: "dealValue",
  presupuesto: "dealValue",
  // Location
  city: "city",
  town: "city",
  ciudad: "city",
  country: "country",
  pais: "country",
  // Notes
  notes: "notes",
  note: "notes",
  comment: "notes",
  comments: "notes",
  description: "notes",
  remarks: "notes",
  notas: "notes",
  notasdellamada: "notes",
  observaciones: "notes",
  // Note: "Resumen del Perfil" (profile summary) is intentionally left
  // unmapped so the call notes ("Notas de Llamada") always win the single
  // `notes` field; the profile summary is preserved in `extra`.
};

const NAME_KEYS = new Set(["fullname", "name", "nombre"]);

function normalizeKey(key: string): string {
  return key
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // strip accents/diacritics
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function parseStage(value: unknown): Stage | undefined {
  if (value == null) return undefined;
  const v = String(value).toUpperCase().replace(/[^A-Z]/g, "");
  // Direct enum match.
  const direct = STAGE_VALUES.find((s) => s === v);
  if (direct) return direct;
  // Strip accents for reliable Spanish matching.
  const text = String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  // Spanish (Bolldr "Estado de Llamada") phrasings first.
  if (/sin ?llamar/.test(text)) return "NEW";
  if (/no contest|devoluci|no respon/.test(text)) return "CONTACTED";
  if (/contactad/.test(text)) return "CONTACTED";
  if (/ganad|cerrad.*gan/.test(text)) return "WON";
  if (/perdid|cerrad.*perd/.test(text)) return "LOST";
  // English / generic phrasings.
  if (/(won|closed.?won|client|customer)/.test(text)) return "WON";
  if (/(lost|dead|closed.?lost|unqualified)/.test(text)) return "LOST";
  if (/negotiat/.test(text)) return "NEGOTIATION";
  if (/proposal|quote/.test(text)) return "PROPOSAL";
  if (/meeting|demo|appointment/.test(text)) return "MEETING";
  if (/qualif/.test(text)) return "QUALIFIED";
  if (/contact|reached|follow/.test(text)) return "CONTACTED";
  if (/new|lead|prospect/.test(text)) return "NEW";
  return undefined;
}

function parseNumber(value: unknown): number | undefined {
  if (value == null || value === "") return undefined;
  const n = Number(String(value).replace(/[^0-9.\-]/g, ""));
  return Number.isFinite(n) ? n : undefined;
}

function str(value: unknown): string | undefined {
  if (value == null) return undefined;
  const s = String(value).trim();
  return s.length ? s : undefined;
}

// Canonicalize an industry string against the known Bolldr verticals. Falls back
// to the trimmed raw value so nothing is lost if it's a new/unknown vertical.
function parseIndustry(value: unknown): string | undefined {
  const s = str(value);
  if (!s) return undefined;
  const norm = normalizeKey(s);
  const match = INDUSTRIES.find((i) => normalizeKey(i) === norm);
  return match ?? s;
}

// Split a free-form interests cell on common separators and canonicalize each
// entry against the known Bolldr services (keeping unknown ones as typed).
function parseInterests(value: unknown): string[] {
  const s = str(value);
  if (!s) return [];
  const parts = s.split(/[,;|/\n]+/).map((p) => p.trim()).filter(Boolean);
  const out: string[] = [];
  for (const p of parts) {
    const norm = normalizeKey(p);
    const match = INTERESTS.find((i) => normalizeKey(i) === norm);
    const val = match ?? p;
    if (!out.includes(val)) out.push(val);
  }
  return out;
}

// Transform a single raw spreadsheet row into a MappedContact, or null if there
// is no usable name/identifier in the row.
export function mapRow(row: RawRow): MappedContact | null {
  const result: MappedContact = { firstName: "", extra: {} };
  let fullNameValue: string | undefined;

  for (const [rawKey, rawValue] of Object.entries(row)) {
    if (rawValue == null || String(rawValue).trim() === "") continue;
    const norm = normalizeKey(rawKey);

    if (NAME_KEYS.has(norm)) {
      if (!fullNameValue) fullNameValue = String(rawValue).trim();
      continue;
    }

    const field = FIELD_ALIASES[norm];
    if (!field || field === "name") {
      // Unrecognized column — preserve it.
      result.extra[rawKey] = rawValue;
      continue;
    }

    switch (field) {
      case "stage": {
        const s = parseStage(rawValue);
        if (s) result.stage = s;
        else result.extra[rawKey] = rawValue;
        break;
      }
      case "dealValue": {
        const n = parseNumber(rawValue);
        if (n != null) result.dealValue = n;
        break;
      }
      case "industry": {
        const ind = parseIndustry(rawValue);
        if (ind) result.industry = ind;
        break;
      }
      case "interests": {
        const list = parseInterests(rawValue);
        if (list.length) result.interests = [...(result.interests ?? []), ...list];
        break;
      }
      default: {
        // Generic string field. Don't clobber an already-filled field (e.g.
        // both Teléfono and Celular map to phone) — keep the first, preserve
        // the rest in the lossless extra bag.
        const key = field as StringField;
        if (result[key]) {
          result.extra[rawKey] = rawValue;
        } else {
          const s = str(rawValue);
          if (s !== undefined) result[key] = s;
        }
      }
    }
  }

  // Split a full name into first/last when we don't already have them.
  if (fullNameValue && !result.firstName) {
    const parts = fullNameValue.split(/\s+/);
    result.firstName = parts.shift() ?? "";
    if (parts.length && !result.lastName) result.lastName = parts.join(" ");
  }

  // Fall back to email local-part or company if no name was found.
  if (!result.firstName) {
    if (result.company) result.firstName = result.company;
    else if (result.email) result.firstName = result.email.split("@")[0];
  }

  if (!result.firstName) return null; // unusable row
  return result;
}

export function mapRows(rows: RawRow[]): MappedContact[] {
  const mapped: MappedContact[] = [];
  for (const row of rows) {
    const m = mapRow(row);
    if (m) mapped.push(m);
  }
  return mapped;
}

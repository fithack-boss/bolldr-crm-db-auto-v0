import type { Stage } from "@prisma/client";
import { STAGE_VALUES } from "@/lib/constants";

// Logic for transforming arbitrary CSV / Excel rows into our canonical Contact
// shape. Spreadsheets from different sources name their columns differently, so
// we map a broad set of header aliases onto first-class fields and stash
// anything unrecognized into the `extra` JSON bag (lossless import).

export type RawRow = Record<string, unknown>;

export interface MappedContact {
  firstName: string;
  lastName?: string;
  company?: string;
  jobTitle?: string;
  email?: string;
  phone?: string;
  source?: string;
  stage?: Stage;
  dealValue?: number;
  city?: string;
  country?: string;
  notes?: string;
  extra: Record<string, unknown>;
}

// Header alias -> canonical field. Keys are normalized (lowercase, no spaces /
// punctuation) before lookup.
const FIELD_ALIASES: Record<string, keyof MappedContact> = {
  firstname: "firstName",
  first: "firstName",
  fname: "firstName",
  givenname: "firstName",
  lastname: "lastName",
  last: "lastName",
  lname: "lastName",
  surname: "lastName",
  familyname: "lastName",
  fullname: "firstName", // handled specially below
  name: "firstName", // handled specially below
  company: "company",
  companyname: "company",
  organization: "company",
  organisation: "company",
  account: "company",
  business: "company",
  jobtitle: "jobTitle",
  title: "jobTitle",
  position: "jobTitle",
  role: "jobTitle",
  email: "email",
  emailaddress: "email",
  mail: "email",
  workemail: "email",
  phone: "phone",
  phonenumber: "phone",
  mobile: "phone",
  mobilenumber: "phone",
  tel: "phone",
  telephone: "phone",
  contactnumber: "phone",
  whatsapp: "phone",
  source: "source",
  leadsource: "source",
  channel: "source",
  stage: "stage",
  status: "stage",
  pipelinestage: "stage",
  dealstage: "stage",
  dealvalue: "dealValue",
  value: "dealValue",
  amount: "dealValue",
  revenue: "dealValue",
  budget: "dealValue",
  city: "city",
  town: "city",
  country: "country",
  notes: "notes",
  note: "notes",
  comment: "notes",
  comments: "notes",
  description: "notes",
  remarks: "notes",
};

const NAME_KEYS = new Set(["fullname", "name"]);

function normalizeKey(key: string): string {
  return key.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function parseStage(value: unknown): Stage | undefined {
  if (value == null) return undefined;
  const v = String(value).toUpperCase().replace(/[^A-Z]/g, "");
  // Direct enum match.
  const direct = STAGE_VALUES.find((s) => s === v);
  if (direct) return direct;
  // Fuzzy match common phrasings.
  const text = String(value).toLowerCase();
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

// Transform a single raw spreadsheet row into a MappedContact, or null if there
// is no usable name/identifier in the row.
export function mapRow(row: RawRow): MappedContact | null {
  const result: MappedContact = { firstName: "", extra: {} };
  let fullNameValue: string | undefined;

  for (const [rawKey, rawValue] of Object.entries(row)) {
    if (rawValue == null || String(rawValue).trim() === "") continue;
    const norm = normalizeKey(rawKey);

    if (NAME_KEYS.has(norm)) {
      fullNameValue = String(rawValue).trim();
      continue;
    }

    const field = FIELD_ALIASES[norm];
    if (!field) {
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
      default:
        (result as unknown as Record<string, unknown>)[field] = str(rawValue);
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
    if (result.email) result.firstName = result.email.split("@")[0];
    else if (result.company) result.firstName = result.company;
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

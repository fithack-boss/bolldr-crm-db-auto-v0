import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { mapRows, type RawRow } from "@/lib/import";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Admin-only endpoint that accepts a CSV or Excel file, transforms each row into
// our canonical Contact shape, and appends (or updates) the master table.
export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Expected multipart form-data" }, { status: 400 });
  }

  const file = form.get("file");
  const ownerId = (form.get("ownerId") as string) || null;
  const dedupe = form.get("dedupe") === "on" || form.get("dedupe") === "true";

  if (!file || typeof file === "string") {
    return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
  }

  const filename = (file as File).name || "upload";
  const buffer = Buffer.from(await (file as File).arrayBuffer());

  // SheetJS reads CSV, XLS and XLSX. For CSV we decode the bytes as UTF-8
  // ourselves (passing type:"string"), otherwise SheetJS falls back to a legacy
  // codepage and mangles accented Spanish headers/values (e.g. "Teléfono" →
  // "TelÃ©fono"). Binary Excel files carry their own encoding, so read those as
  // a buffer.
  const isCsv = /\.csv$/i.test(filename) || (file as File).type === "text/csv";
  let rows: RawRow[];
  try {
    const wb = isCsv
      ? XLSX.read(new TextDecoder("utf-8").decode(buffer), { type: "string" })
      : XLSX.read(buffer, { type: "buffer" });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    if (!sheet) throw new Error("empty workbook");
    rows = XLSX.utils.sheet_to_json<RawRow>(sheet, { defval: "", raw: false });
  } catch {
    return NextResponse.json({ error: "Could not parse file. Upload a valid CSV or Excel file." }, { status: 400 });
  }

  const mapped = mapRows(rows);
  if (mapped.length === 0) {
    return NextResponse.json({ error: "No usable rows found. Make sure the first row contains column headers." }, { status: 400 });
  }

  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const m of mapped) {
    const data = {
      firstName: m.firstName,
      lastName: m.lastName || null,
      company: m.company || null,
      jobTitle: m.jobTitle || null,
      email: m.email || null,
      phone: m.phone || null,
      whatsapp: m.whatsapp || null,
      website: m.website || null,
      source: m.source || "Import",
      stage: m.stage || "NEW",
      industry: m.industry || null,
      interests: m.interests ?? [],
      dealValue: m.dealValue ?? 0,
      city: m.city || null,
      country: m.country || null,
      notes: m.notes || null,
      extra: (Object.keys(m.extra).length ? m.extra : undefined) as Prisma.InputJsonValue | undefined,
      ownerId,
    };

    // Optional de-duplication by email or phone.
    let existing = null;
    if (dedupe && (m.email || m.phone)) {
      existing = await prisma.contact.findFirst({
        where: {
          OR: [
            ...(m.email ? [{ email: m.email }] : []),
            ...(m.phone ? [{ phone: m.phone }] : []),
          ],
        },
      });
    }

    if (existing) {
      await prisma.contact.update({
        where: { id: existing.id },
        data: {
          // Don't clobber an existing assignment unless one was provided.
          ...data,
          ownerId: ownerId ?? existing.ownerId,
        },
      });
      updated++;
    } else {
      await prisma.contact.create({ data });
      created++;
    }
  }

  await prisma.importBatch.create({
    data: {
      userId: session.user.id,
      filename,
      rowsTotal: rows.length,
      rowsCreated: created,
      rowsUpdated: updated,
      rowsSkipped: skipped,
    },
  });

  return NextResponse.json({
    ok: true,
    filename,
    rowsTotal: rows.length,
    mapped: mapped.length,
    created,
    updated,
    skipped,
  });
}

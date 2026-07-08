"use server";

import { db } from "@/db";
import { companies } from "@/db/schema";
import type { SerializedSpreadsheetCell } from "@/lib/spreadsheet";

type ImportRow = Record<string, SerializedSpreadsheetCell>;

const FIELD_ALIASES = {
  name: ["name", "company", "companyname", "organization", "org"],
  website: ["website", "url", "site", "domain", "web"],
  industry: ["industry", "sector", "category"],
  location: ["location", "city", "address", "region", "country"],
  status: ["status", "stage"],
  notes: ["notes", "note", "comment", "comments", "description"],
} as const;

type MappedField = keyof typeof FIELD_ALIASES;

function normalizeKey(key: string) {
  return key.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function toText(value: SerializedSpreadsheetCell): string | undefined {
  if (value === null || value === "") return undefined;
  return String(value);
}

function mapRow(row: ImportRow) {
  const mapped: Partial<Record<MappedField, string>> = {};
  const raw: Record<string, SerializedSpreadsheetCell> = {};

  for (const [key, value] of Object.entries(row)) {
    const normalized = normalizeKey(key);
    const field = (Object.keys(FIELD_ALIASES) as MappedField[]).find((candidate) =>
      (FIELD_ALIASES[candidate] as readonly string[]).includes(normalized)
    );
    const text = toText(value);

    if (field && !mapped[field] && text !== undefined) {
      mapped[field] = text;
    } else {
      raw[key] = value;
    }
  }

  return { mapped, raw };
}

export async function approveCompanies(rows: ImportRow[], source?: string) {
  let skipped = 0;

  const values = rows.flatMap((row) => {
    const { mapped, raw } = mapRow(row);
    if (!mapped.name) {
      skipped++;
      return [];
    }
    return [
      {
        name: mapped.name,
        website: mapped.website ?? null,
        industry: mapped.industry ?? null,
        location: mapped.location ?? null,
        status: mapped.status ?? "new",
        notes: mapped.notes ?? null,
        source: source ?? null,
        raw,
      },
    ];
  });

  if (values.length > 0) {
    await db.insert(companies).values(values);
  }

  return { inserted: values.length, skipped };
}

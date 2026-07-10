"use server";

import { db } from "@/db";
import { companies, contacts } from "@/db/schema";
import type { SerializedSpreadsheetCell } from "@/lib/spreadsheet";

type ImportRow = Record<string, SerializedSpreadsheetCell>;

// A curated cold-outreach list is one row per *person* — the same company
// name commonly shows up spelled differently across rows ("Acme", "Acme
// Inc."), so company matching is done on a normalized form, not exact text.
const CONTACT_FIELD_ALIASES = {
  name: ["name", "fullname", "contactname", "personname", "hrname"],
  email: ["email", "emailaddress", "contactemail", "mail"],
  title: ["title", "role", "position", "jobtitle", "designation"],
  phone: ["phone", "phonenumber", "mobile", "contactnumber", "mobilenumber"],
  notes: ["notes", "note", "comment", "comments", "description"],
} as const;

const COMPANY_FIELD_ALIASES = {
  name: ["company", "companyname", "organization", "org", "employer"],
  website: ["website", "url", "site", "domain", "web"],
  industry: ["industry", "sector", "category"],
  location: ["location", "city", "address", "region", "country"],
} as const;

type ContactField = keyof typeof CONTACT_FIELD_ALIASES;
type CompanyField = keyof typeof COMPANY_FIELD_ALIASES;

const COMPANY_SUFFIX_PATTERN = /\b(incorporated|inc|llc|ltd|limited|corporation|corp|co)\.?\s*$/i;

function normalizeKey(key: string) {
  return key.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function normalizeCompanyName(name: string) {
  return name
    .toLowerCase()
    .replace(COMPANY_SUFFIX_PATTERN, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function toText(value: SerializedSpreadsheetCell): string | undefined {
  if (value === null || value === "") return undefined;
  return String(value);
}

function mapRow(row: ImportRow) {
  const contactFields: Partial<Record<ContactField, string>> = {};
  const companyFields: Partial<Record<CompanyField, string>> = {};
  const raw: Record<string, SerializedSpreadsheetCell> = {};

  for (const [key, value] of Object.entries(row)) {
    const normalized = normalizeKey(key);
    const text = toText(value);

    const contactField = (Object.keys(CONTACT_FIELD_ALIASES) as ContactField[]).find(
      (candidate) => (CONTACT_FIELD_ALIASES[candidate] as readonly string[]).includes(normalized),
    );
    if (contactField && !contactFields[contactField] && text !== undefined) {
      contactFields[contactField] = text;
      continue;
    }

    const companyField = (Object.keys(COMPANY_FIELD_ALIASES) as CompanyField[]).find(
      (candidate) => (COMPANY_FIELD_ALIASES[candidate] as readonly string[]).includes(normalized),
    );
    if (companyField && !companyFields[companyField] && text !== undefined) {
      companyFields[companyField] = text;
      continue;
    }

    raw[key] = value;
  }

  return { contactFields, companyFields, raw };
}

export async function approveContacts(rows: ImportRow[], source?: string) {
  let skippedNoEmail = 0;

  const pending = rows.flatMap((row) => {
    const { contactFields, companyFields, raw } = mapRow(row);
    if (!contactFields.email) {
      skippedNoEmail++;
      return [];
    }
    return [
      {
        email: contactFields.email,
        name: contactFields.name ?? null,
        title: contactFields.title ?? null,
        phone: contactFields.phone ?? null,
        notes: contactFields.notes ?? null,
        companyName: companyFields.name,
        companyWebsite: companyFields.website ?? null,
        companyIndustry: companyFields.industry ?? null,
        companyLocation: companyFields.location ?? null,
        raw,
      },
    ];
  });

  // Find-or-create companies by normalized name — dedupes both against what's
  // already in the DB and against other rows in this same import.
  const existingCompanies = await db.select().from(companies);
  const companyIdByNormalizedName = new Map<string, string>();
  for (const company of existingCompanies) {
    companyIdByNormalizedName.set(normalizeCompanyName(company.name), company.id);
  }

  const companyIdForRow: (string | null)[] = [];
  for (const item of pending) {
    if (!item.companyName) {
      companyIdForRow.push(null);
      continue;
    }

    const normalized = normalizeCompanyName(item.companyName);
    if (!normalized) {
      companyIdForRow.push(null);
      continue;
    }

    let companyId = companyIdByNormalizedName.get(normalized);
    if (!companyId) {
      const [created] = await db
        .insert(companies)
        .values({
          name: item.companyName,
          website: item.companyWebsite,
          industry: item.companyIndustry,
          location: item.companyLocation,
          source: source ?? null,
        })
        .returning({ id: companies.id });
      companyId = created.id;
      companyIdByNormalizedName.set(normalized, companyId);
    }
    companyIdForRow.push(companyId);
  }

  const contactValues = pending.map((item, index) => ({
    name: item.name,
    email: item.email,
    title: item.title,
    phone: item.phone,
    companyId: companyIdForRow[index],
    notes: item.notes,
    source: source ?? null,
    raw: item.raw,
  }));

  let inserted: { id: string }[] = [];
  if (contactValues.length > 0) {
    inserted = await db
      .insert(contacts)
      .values(contactValues)
      .onConflictDoNothing({ target: contacts.email })
      .returning({ id: contacts.id });
  }

  return {
    inserted: inserted.length,
    skippedNoEmail,
    skippedDuplicate: contactValues.length - inserted.length,
  };
}

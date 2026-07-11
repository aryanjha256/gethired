import {
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export const contactStatusEnum = pgEnum("contact_status", [
  "new",
  "contacted",
  "followed_up",
  "replied",
  "interviewing",
  "no_opening",
  "bounced",
  "closed",
]);

export const templateTypeEnum = pgEnum("template_type", [
  "initial",
  "follow_up",
  "thank_you",
  "custom",
]);

export const emailStatusEnum = pgEnum("email_status", [
  "queued",
  "sending",
  "sent",
  "failed",
]);

// A company is a lookup/grouping entity only — we never email a company
// directly, we email the people (contacts) who work there.
export const companies = pgTable("companies", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  // The primary company-identity signal: the part of a contact's email after
  // "@", lowercased. Distinct from `website` (free text, comes from a
  // spreadsheet column, not guaranteed to even be a bare domain) — this is
  // derived straight from contacts.email, which is already notNull/unique.
  // Null for companies matched via the free-text name fallback only (e.g.
  // every contact there used a free/generic email provider). Unique so it
  // doubles as the find-or-create key at import time; Postgres allows
  // multiple NULLs through a unique constraint, so companies with no
  // reliable domain don't collide with each other.
  domain: text("domain").unique(),
  website: text("website"),
  industry: text("industry"),
  location: text("location"),
  notes: text("notes"),
  source: text("source"),
  raw: jsonb("raw").$type<Record<string, unknown>>(),
  // Set whenever any contact at this company is marked "no_opening" — starts
  // a company-wide cooldown on fresh "initial" outreach (see
  // appSettings.retryCooldownDays). Overwritten by a later no_opening from a
  // different contact; never cleared back to null once the cooldown elapses,
  // since eligibility is just computed from this timestamp at send time.
  noOpeningAt: timestamp("no_opening_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type Company = typeof companies.$inferSelect;
export type NewCompany = typeof companies.$inferInsert;

// The primary outreach entity. Email is the real unique identifier (per-person,
// not per-company) — a company can have many contacts.
export const contacts = pgTable("contacts", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name"),
  email: text("email").notNull().unique(),
  title: text("title"),
  phone: text("phone"),
  companyId: uuid("company_id").references(() => companies.id),
  status: contactStatusEnum("status").notNull().default("new"),
  notes: text("notes"),
  source: text("source"),
  raw: jsonb("raw").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type Contact = typeof contacts.$inferSelect;
export type NewContact = typeof contacts.$inferInsert;

// Reusable email templates with {{variable}} placeholders — resolved per
// recipient at send time by src/lib/templates.ts. `type` drives the
// enqueue-time status-sequence eligibility check in contacts/actions.ts.
export const templates = pgTable("templates", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  type: templateTypeEnum("type").notNull().default("custom"),
  subject: text("subject").notNull(),
  body: text("body").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type Template = typeof templates.$inferSelect;
export type NewTemplate = typeof templates.$inferInsert;

// Singleton row (fixed id) holding sender identity used to resolve template
// variables like {{myName}}/{{signature}} — unrelated to SMTP_FROM_NAME, which
// is only the transport-level From header.
export const appSettings = pgTable("app_settings", {
  id: text("id").primaryKey().default("singleton"),
  senderName: text("sender_name"),
  signature: text("signature"),
  // Days before a "no_opening" company-wide cooldown lifts (see
  // companies.noOpeningAt). Configurable since there's no obviously "right"
  // value.
  retryCooldownDays: integer("retry_cooldown_days").notNull().default(45),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type AppSettings = typeof appSettings.$inferSelect;

export const emails = pgTable("emails", {
  id: uuid("id").primaryKey().defaultRandom(),
  contactId: uuid("contact_id").references(() => contacts.id),
  templateId: uuid("template_id").references(() => templates.id, {
    onDelete: "set null",
  }),
  to: text("to").notNull(),
  subject: text("subject").notNull(),
  body: text("body").notNull(),
  status: emailStatusEnum("status").notNull().default("queued"),
  error: text("error"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type EmailLog = typeof emails.$inferSelect;
export type NewEmailLog = typeof emails.$inferInsert;

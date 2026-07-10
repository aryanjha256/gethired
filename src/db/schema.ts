import { jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

// A company is a lookup/grouping entity only — we never email a company
// directly, we email the people (contacts) who work there.
export const companies = pgTable("companies", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  website: text("website"),
  industry: text("industry"),
  location: text("location"),
  notes: text("notes"),
  source: text("source"),
  raw: jsonb("raw").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
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
  status: text("status").notNull().default("new"),
  notes: text("notes"),
  source: text("source"),
  raw: jsonb("raw").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Contact = typeof contacts.$inferSelect;
export type NewContact = typeof contacts.$inferInsert;

// Reusable email templates with {{variable}} placeholders — resolved per
// recipient at send time by src/lib/templates.ts. `type` is a free-text field
// validated against TEMPLATE_TYPES at the app layer, matching the existing
// `contacts.status` convention (no pg enum type used anywhere in this schema).
export const templates = pgTable("templates", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  type: text("type").notNull().default("custom"),
  subject: text("subject").notNull(),
  body: text("body").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
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
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type AppSettings = typeof appSettings.$inferSelect;

export const emails = pgTable("emails", {
  id: uuid("id").primaryKey().defaultRandom(),
  contactId: uuid("contact_id").references(() => contacts.id),
  templateId: uuid("template_id").references(() => templates.id, { onDelete: "set null" }),
  to: text("to").notNull(),
  subject: text("subject").notNull(),
  body: text("body").notNull(),
  status: text("status").notNull(), // "sent" | "failed"
  error: text("error"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type EmailLog = typeof emails.$inferSelect;
export type NewEmailLog = typeof emails.$inferInsert;

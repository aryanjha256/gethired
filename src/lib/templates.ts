export interface TemplateContext {
  contact: { name: string; email: string; title: string };
  companyName: string;
  sender: { name: string; signature: string };
}

function firstNameOf(name: string): string {
  return name.trim().split(/\s+/)[0] ?? "";
}

export const TEMPLATE_VARIABLES: {
  key: string;
  label: string;
  resolve: (ctx: TemplateContext) => string;
}[] = [
  { key: "firstName", label: "First name", resolve: (ctx) => firstNameOf(ctx.contact.name) },
  { key: "fullName", label: "Full name", resolve: (ctx) => ctx.contact.name },
  { key: "email", label: "Email", resolve: (ctx) => ctx.contact.email },
  { key: "title", label: "Job title", resolve: (ctx) => ctx.contact.title },
  { key: "company", label: "Company", resolve: (ctx) => ctx.companyName },
  { key: "myName", label: "Your name", resolve: (ctx) => ctx.sender.name },
  { key: "signature", label: "Signature", resolve: (ctx) => ctx.sender.signature },
];

export function renderTemplate(text: string, ctx: TemplateContext): string {
  return text.replace(/\{\{\s*(\w+)\s*\}\}/g, (match, key: string) => {
    const variable = TEMPLATE_VARIABLES.find((v) => v.key === key);
    return variable ? variable.resolve(ctx) : match;
  });
}

export const TEMPLATE_TYPES: { value: string; label: string }[] = [
  { value: "initial", label: "Initial Outreach" },
  { value: "follow_up", label: "Follow-up" },
  { value: "thank_you", label: "Thank You" },
  { value: "custom", label: "Custom" },
];

export function templateTypeLabel(value: string): string {
  return TEMPLATE_TYPES.find((t) => t.value === value)?.label ?? value;
}

export const SAMPLE_TEMPLATE_CONTEXT: TemplateContext = {
  contact: { name: "Jane Doe", email: "jane@example.com", title: "Engineering Manager" },
  companyName: "Acme Inc.",
  sender: { name: "(your name)", signature: "(your signature)" },
};

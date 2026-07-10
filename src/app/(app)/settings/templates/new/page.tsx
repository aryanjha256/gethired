import { TemplateForm } from "../template-form";

export default function NewTemplatePage() {
  return (
    <div className="flex flex-1 flex-col gap-4 p-6">
      <div>
        <h1 className="font-heading text-lg font-medium tracking-tight">New Template</h1>
      </div>
      <TemplateForm mode="create" />
    </div>
  );
}

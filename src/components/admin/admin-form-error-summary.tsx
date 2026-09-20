export type AdminFormErrorItem = {
  fieldId: string;
  label: string;
  message: string;
};

export function AdminFormErrorSummary({
  errors,
  title = "Check the highlighted fields."
}: {
  errors: AdminFormErrorItem[];
  title?: string;
}) {
  if (errors.length === 0) return null;

  return (
    <div role="alert" className="rounded-lg border border-coral-700/20 bg-coral-100 px-4 py-3 text-sm text-coral-700">
      <p className="font-bold">{title}</p>
      <ul className="mt-2 list-disc space-y-1 pl-5 font-semibold">
        {errors.map((error) => (
          <li key={error.fieldId}>
            <a href={`#${error.fieldId}`} className="underline decoration-2 underline-offset-2 hover:no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-700/40">
              {error.label}: {error.message}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

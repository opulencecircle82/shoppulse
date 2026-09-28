"use client";

export type BuilderPane = "edit" | "preview";

/** Phone-only switch for the App Builder / Website Builder: on a wide screen the
 * editor and the live preview sit side by side, but a phone only has room for one,
 * so the owner flips between them here. */
export default function BuilderPaneToggle({
  pane,
  onChange,
}: {
  pane: BuilderPane;
  onChange: (pane: BuilderPane) => void;
}) {
  const options: { id: BuilderPane; label: string }[] = [
    { id: "edit", label: "Edit" },
    { id: "preview", label: "Live Preview" },
  ];

  return (
    <div
      role="tablist"
      aria-label="Builder view"
      className="flex shrink-0 gap-1 border-b border-slate-200 bg-slate-50 p-2 md:hidden"
    >
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          role="tab"
          aria-selected={pane === option.id}
          onClick={() => onChange(option.id)}
          className={`flex-1 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
            pane === option.id
              ? "bg-brand-blue text-white shadow-md shadow-brand-blue/25"
              : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

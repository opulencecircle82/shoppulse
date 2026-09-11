import type { ReactNode } from "react";

export default function PhoneFrame({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="w-[220px] shrink-0">
      <p className="mb-2 text-center text-[11px] font-medium text-slate-400">
        {label}
      </p>
      <div className="overflow-hidden rounded-[24px] border-4 border-slate-700 bg-black shadow-2xl">
        {children}
      </div>
    </div>
  );
}

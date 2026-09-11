"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

const DAY_CODES = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
const WEEKDAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];
const MONTH_LABELS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function toIso(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;
}

/** Only lets the customer pick a date the shop is actually open — days
 * outside business_days are disabled rather than just soft-warned,
 * since the shop's working hours are already known up front. */
export default function AvailabilityCalendar({
  businessDays,
  businessHoursOpen,
  businessHoursClose,
  selectedDate,
  onSelect,
}: {
  businessDays: string[];
  businessHoursOpen: string | null;
  businessHoursClose: string | null;
  selectedDate: string;
  onSelect: (isoDate: string) => void;
}) {
  const [viewMonth, setViewMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const year = viewMonth.getFullYear();
  const month = viewMonth.getMonth();
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (Date | null)[] = [
    ...Array(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => new Date(year, month, i + 1)),
  ];

  return (
    <div className="rounded-xl bg-white/5 p-3">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setViewMonth(new Date(year, month - 1, 1))}
          className="rounded-full p-1 text-slate-400 hover:text-white"
          aria-label="Previous month"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <p className="text-sm font-semibold text-white">
          {MONTH_LABELS[month]} {year}
        </p>
        <button
          type="button"
          onClick={() => setViewMonth(new Date(year, month + 1, 1))}
          className="rounded-full p-1 text-slate-400 hover:text-white"
          aria-label="Next month"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-2 grid grid-cols-7 gap-1 text-center text-[10px] font-medium text-slate-400">
        {WEEKDAY_LABELS.map((label, i) => (
          <span key={i}>{label}</span>
        ))}
      </div>

      <div className="mt-1 grid grid-cols-7 gap-1">
        {cells.map((date, i) => {
          if (!date) return <span key={i} />;

          const iso = toIso(date);
          const isPast = date < today;
          const isOpenDay = businessDays.includes(DAY_CODES[date.getDay()]);
          const disabled = isPast || !isOpenDay;
          const isSelected = iso === selectedDate;

          return (
            <button
              key={i}
              type="button"
              disabled={disabled}
              onClick={() => onSelect(iso)}
              className={`aspect-square rounded-lg text-xs font-medium transition-colors ${
                isSelected
                  ? "bg-brand-blue text-white"
                  : disabled
                    ? "text-slate-600"
                    : "text-slate-300 hover:bg-brand-blue/10"
              }`}
            >
              {date.getDate()}
            </button>
          );
        })}
      </div>

      {businessHoursOpen && businessHoursClose && (
        <p className="mt-2 text-[11px] text-slate-400">
          Open {businessHoursOpen} – {businessHoursClose} on available days
        </p>
      )}
    </div>
  );
}

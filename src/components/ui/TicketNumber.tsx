import { formatJobNumber } from "@/lib/jobNumber";

/**
 * The ticket number as a small monospace chip, for the dark technician app.
 * (The owner's table and the customer's cards write it inline instead, in
 * their own colours.)
 */
export default function TicketNumber({
  jobNumber,
  id,
  className = "",
}: {
  jobNumber: number | null | undefined;
  id?: string;
  className?: string;
}) {
  return (
    <span
      className={`inline-block rounded-md bg-white/10 px-1.5 py-0.5 font-mono text-[10px] font-bold tracking-wide text-slate-300 ${className}`}
    >
      {formatJobNumber(jobNumber, id)}
    </span>
  );
}

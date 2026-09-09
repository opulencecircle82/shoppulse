import Link from "next/link";

export default function SupportPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-brand-slate px-6 text-center">
      <h1 className="text-3xl font-bold text-slate-900">Support</h1>
      <p className="mt-2 max-w-md text-sm text-slate-500">
        Need help? Reach us at{" "}
        <a
          href="mailto:support@shoppulse.com"
          className="font-medium text-brand-blue hover:text-blue-400"
        >
          support@shoppulse.com
        </a>
        .
      </p>
      <Link
        href="/"
        className="mt-6 text-sm font-medium text-brand-blue hover:text-blue-400"
      >
        ← Back to home
      </Link>
    </main>
  );
}

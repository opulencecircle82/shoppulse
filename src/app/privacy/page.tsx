import Link from "next/link";

export default function PrivacyPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-brand-slate px-6 text-center">
      <h1 className="text-3xl font-bold text-white">Privacy Policy</h1>
      <p className="mt-2 max-w-md text-sm text-slate-400">
        Our privacy policy is being finalized and will be published here
        shortly.
      </p>
      <Link
        href="/"
        className="mt-6 text-sm font-medium text-brand-emerald hover:text-emerald-400"
      >
        ← Back to home
      </Link>
    </main>
  );
}

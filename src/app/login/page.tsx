import Link from "next/link";
import GoogleSignInButton from "@/components/auth/GoogleSignInButton";
import CurvedLinesBackground from "@/components/ui/CurvedLinesBackground";

export default function LoginPage() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-brand-slate px-6 py-16">
      <CurvedLinesBackground />
      <div className="relative z-10 w-full max-w-md rounded-3xl bg-brand-slate-light/50 p-8 shadow-2xl shadow-black/40">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-blue text-white font-bold">
            SP
          </span>
          <span className="text-lg font-semibold tracking-tight text-slate-900">
            ShopPulse
          </span>
        </Link>

        <h1 className="mt-6 text-2xl font-bold text-slate-900">Welcome back</h1>
        <p className="mt-1 text-sm text-slate-500">
          Log in to your ShopPulse dashboard.
        </p>

        <div className="mt-8">
          <GoogleSignInButton label="Continue with Google" />
        </div>

        <p className="mt-6 text-center text-sm text-slate-500">
          Don&apos;t have an account?{" "}
          <Link
            href="/signup"
            className="font-medium text-brand-blue hover:text-blue-400"
          >
            Get started free
          </Link>
        </p>
      </div>
    </main>
  );
}

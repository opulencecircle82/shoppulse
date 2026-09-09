import Link from "next/link";
import GoogleSignInButton from "@/components/auth/GoogleSignInButton";

export default function SignupPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-brand-slate px-6 py-16">
      <div className="w-full max-w-md rounded-3xl bg-brand-slate-light/50 p-8 shadow-2xl shadow-black/40">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-emerald text-brand-slate font-bold">
            SP
          </span>
          <span className="text-lg font-semibold tracking-tight text-white">
            ShopPulse
          </span>
        </Link>

        <h1 className="mt-6 text-2xl font-bold text-white">
          Create your free account
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          1 Owner + 1 Tech seat free forever. No credit card required.
        </p>

        <div className="mt-8">
          <GoogleSignInButton label="Sign up with Google" />
        </div>

        <p className="mt-6 text-center text-sm text-slate-400">
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-medium text-brand-emerald hover:text-emerald-400"
          >
            Log in
          </Link>
        </p>
      </div>
    </main>
  );
}

import Link from "next/link";
import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { getSessionUser, safeRedirectPath } from "@/lib/auth";
import { signupAction } from "@/lib/auth-actions";

export const metadata = {
  title: "Sign Up"
};

type SignupPageProps = {
  searchParams?: Promise<{
    error?: string;
    next?: string;
  }>;
};

export default async function SignupPage({ searchParams }: SignupPageProps) {
  const params = await searchParams;
  const nextPath = safeRedirectPath(params?.next);
  const sessionUser = await getSessionUser();

  if (sessionUser) {
    redirect(nextPath);
  }

  return (
    <section className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-md items-center">
      <div className="w-full rounded-2xl bg-white p-6 shadow-soft">
        <Link href="/" className="text-xl font-bold text-ocean-900">
          Terumbu.eco
        </Link>
        <h1 className="mt-8 text-3xl font-bold tracking-normal text-ocean-900">Create your Ocean Hero profile</h1>
        {params?.error === "invalid" ? (
          <p className="mt-4 rounded-xl border border-coral-500/20 bg-coral-100 px-4 py-3 text-sm font-semibold text-coral-700">
            Enter a name, email, and password with at least 8 characters.
          </p>
        ) : null}
        {params?.error === "exists" ? (
          <p className="mt-4 rounded-xl border border-coral-500/20 bg-coral-100 px-4 py-3 text-sm font-semibold text-coral-700">
            An account already exists for that email.
          </p>
        ) : null}
        <form action={signupAction} className="mt-6 grid gap-4">
          <input type="hidden" name="next" value={nextPath} />
          <label className="grid gap-2 text-sm font-semibold text-ocean-900">
            Name
            <input className="rounded-xl border border-ocean-900/14 px-4 py-3 outline-none focus:border-coral-500" type="text" name="name" autoComplete="name" required />
          </label>
          <label className="grid gap-2 text-sm font-semibold text-ocean-900">
            Email
            <input className="rounded-xl border border-ocean-900/14 px-4 py-3 outline-none focus:border-coral-500" type="email" name="email" autoComplete="email" required />
          </label>
          <label className="grid gap-2 text-sm font-semibold text-ocean-900">
            Password
            <input className="rounded-xl border border-ocean-900/14 px-4 py-3 outline-none focus:border-coral-500" type="password" name="password" autoComplete="new-password" minLength={8} required />
          </label>
          <Button type="submit" className="mt-2">
            Sign Up
          </Button>
        </form>
        <p className="mt-5 text-sm text-ocean-900/62">
          Already have an account?{" "}
          <Link href="/login" className="font-bold text-coral-700">
            Login
          </Link>
        </p>
      </div>
    </section>
  );
}

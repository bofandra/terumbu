import Link from "next/link";
import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { getDefaultAuthenticatedPath, getSessionUser, safeRedirectPath } from "@/lib/auth";
import { loginAction } from "@/lib/auth-actions";

export const metadata = {
  title: "Login"
};

type LoginPageProps = {
  searchParams?: Promise<{
    error?: string;
    loggedOut?: string;
    next?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const nextPath = safeRedirectPath(params?.next, "");
  const sessionUser = await getSessionUser();

  if (sessionUser && !params?.loggedOut) {
    redirect(nextPath || (await getDefaultAuthenticatedPath(sessionUser.id)));
  }

  return (
    <section className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-md items-center">
      <div className="w-full rounded-2xl bg-white p-6 shadow-soft">
        <Link href="/" className="text-xl font-bold text-ocean-900">
          Terumbu.eco
        </Link>
        <h1 className="mt-8 text-3xl font-bold tracking-normal text-ocean-900">Welcome back</h1>

        {params?.error === "invalid" ? (
          <p className="mt-4 rounded-xl border border-coral-500/20 bg-coral-100 px-4 py-3 text-sm font-semibold text-coral-700">
            Email or password is incorrect.
          </p>
        ) : null}

        {params?.loggedOut ? (
          <p className="mt-4 rounded-xl border border-kelp-500/20 bg-kelp-100 px-4 py-3 text-sm font-semibold text-kelp-700">
            You have been logged out.
          </p>
        ) : null}

        <form action={loginAction} className="mt-6 grid gap-4">
          <input type="hidden" name="next" value={nextPath} />
          <label className="grid gap-2 text-sm font-semibold text-ocean-900">
            Email
            <input
              className="rounded-xl border border-ocean-900/14 px-4 py-3 outline-none focus:border-coral-500"
              type="email"
              name="email"
              autoComplete="email"
              required
            />
          </label>
          <label className="grid gap-2 text-sm font-semibold text-ocean-900">
            Password
            <input
              className="rounded-xl border border-ocean-900/14 px-4 py-3 outline-none focus:border-coral-500"
              type="password"
              name="password"
              autoComplete="current-password"
              required
            />
          </label>
          <Button type="submit" className="mt-2">
            Login
          </Button>
        </form>
        <p className="mt-5 text-sm text-ocean-900/62">
          New to Terumbu?{" "}
          <Link href="/signup" className="font-bold text-coral-700">
            Create an account
          </Link>
        </p>
      </div>
    </section>
  );
}

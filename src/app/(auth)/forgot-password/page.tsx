import Link from "next/link";
import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { getDefaultAuthenticatedPath, getSessionUser } from "@/lib/auth";
import { requestPasswordResetAction } from "@/lib/auth-actions";

export const metadata = {
  title: "Forgot Password"
};

export const dynamic = "force-dynamic";

type ForgotPasswordPageProps = {
  searchParams?: Promise<{
    sent?: string;
  }>;
};

export default async function ForgotPasswordPage({ searchParams }: ForgotPasswordPageProps) {
  const params = await searchParams;
  const sessionUser = await getSessionUser();

  if (sessionUser) {
    redirect(await getDefaultAuthenticatedPath(sessionUser.id));
  }

  return (
    <section className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-md items-center">
      <div className="w-full rounded-lg bg-white p-6 shadow-soft">
        <Link href="/" className="text-xl font-bold text-ocean-900">
          Terumbu.eco
        </Link>
        <h1 className="mt-8 text-3xl font-bold tracking-normal text-ocean-900">Reset password</h1>

        {params?.sent ? (
          <p className="mt-4 rounded-lg border border-kelp-500/20 bg-kelp-100 px-4 py-3 text-sm font-semibold text-kelp-700">
            If that email has access, a reset link has been sent.
          </p>
        ) : null}

        <form action={requestPasswordResetAction} className="mt-6 grid gap-4">
          <label className="grid gap-2 text-sm font-semibold text-ocean-900">
            Email
            <input
              className="rounded-lg border border-ocean-900/14 px-4 py-3 outline-none focus:border-coral-500"
              type="email"
              name="email"
              autoComplete="email"
              required
            />
          </label>
          <Button type="submit" className="mt-2">
            Send Reset Link
          </Button>
        </form>
        <Link href="/login" className="mt-5 inline-flex text-sm font-bold text-coral-700 hover:text-coral-500">
          Back to login
        </Link>
      </div>
    </section>
  );
}

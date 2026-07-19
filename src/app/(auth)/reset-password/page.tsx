import Link from "next/link";

import { Button, ButtonLink } from "@/components/ui/button";
import { completePasswordResetAction } from "@/lib/auth-actions";
import { readAuthToken } from "@/lib/auth-tokens";

export const metadata = {
  title: "Reset Password"
};

export const dynamic = "force-dynamic";

type ResetPasswordPageProps = {
  searchParams?: Promise<{
    error?: string;
    token?: string;
  }>;
};

const errorMessages: Record<string, string> = {
  invalid: "This link is invalid or expired.",
  password_length: "Choose a password with at least 8 characters.",
  password_match: "Both password fields must match."
};

export default async function ResetPasswordPage({ searchParams }: ResetPasswordPageProps) {
  const params = await searchParams;
  const token = String(params?.token ?? "").trim();
  const record = token ? await readAuthToken(token, ["account_setup", "password_reset"]) : null;
  const errorMessage = params?.error ? errorMessages[params.error] : null;
  const isSetup = record?.purpose === "account_setup";

  return (
    <section className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-md items-center">
      <div className="w-full rounded-lg bg-white p-6 shadow-soft">
        <Link href="/" className="text-xl font-bold text-ocean-900">
          Terumbu.eco
        </Link>
        <h1 className="mt-8 text-3xl font-bold tracking-normal text-ocean-900">
          {isSetup ? "Set up account" : "Reset password"}
        </h1>

        {errorMessage ? (
          <p className="mt-4 rounded-lg border border-coral-500/20 bg-coral-100 px-4 py-3 text-sm font-semibold text-coral-700">
            {errorMessage}
          </p>
        ) : null}

        {!record ? (
          <div className="mt-6 grid gap-4">
            <p className="rounded-lg border border-ocean-900/10 bg-ocean-50 px-4 py-3 text-sm font-semibold text-ocean-900/68">
              Request a fresh reset link to continue.
            </p>
            <ButtonLink href="/forgot-password" tone="secondary">
              Request Reset Link
            </ButtonLink>
          </div>
        ) : (
          <form action={completePasswordResetAction} className="mt-6 grid gap-4">
            <input type="hidden" name="token" value={token} />
            <p className="rounded-lg border border-ocean-900/10 bg-ocean-50 px-4 py-3 text-sm font-semibold text-ocean-900/68">
              {record.email}
            </p>
            <label className="grid gap-2 text-sm font-semibold text-ocean-900">
              New password
              <input
                className="rounded-lg border border-ocean-900/14 px-4 py-3 outline-none focus:border-coral-500"
                type="password"
                name="password"
                autoComplete="new-password"
                minLength={8}
                required
              />
            </label>
            <label className="grid gap-2 text-sm font-semibold text-ocean-900">
              Confirm password
              <input
                className="rounded-lg border border-ocean-900/14 px-4 py-3 outline-none focus:border-coral-500"
                type="password"
                name="confirmPassword"
                autoComplete="new-password"
                minLength={8}
                required
              />
            </label>
            <Button type="submit" className="mt-2">
              Save Password
            </Button>
          </form>
        )}
      </div>
    </section>
  );
}

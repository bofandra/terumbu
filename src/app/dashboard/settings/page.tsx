import { eq } from "drizzle-orm";

import { Button } from "@/components/ui/button";
import { db } from "@/db/client";
import { profiles, users } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { changePasswordAction, updateAccountAction } from "@/lib/auth-actions";

export const metadata = {
  title: "Account Settings"
};

type SettingsPageProps = {
  searchParams?: Promise<{
    saved?: string;
    error?: string;
  }>;
};

function RequiredMark() {
  return (
    <span className="font-bold text-coral-700" aria-hidden="true">
      *
    </span>
  );
}

const passwordHelpText = "Use at least 8 characters. Uppercase letters and numbers are optional under the current policy.";

export default async function SettingsPage({ searchParams }: SettingsPageProps) {
  const params = await searchParams;
  const sessionUser = await requireUser("/dashboard/settings");
  const [account] = await db
    .select({
      name: users.name,
      email: users.email,
      displayName: profiles.displayName,
      location: profiles.location,
      bio: profiles.bio,
      isPublic: profiles.isPublic
    })
    .from(users)
    .leftJoin(profiles, eq(profiles.userId, users.id))
    .where(eq(users.id, sessionUser.id))
    .limit(1);

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <header>
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-coral-700">Account</p>
        <h1 className="mt-2 text-3xl font-bold tracking-normal text-ocean-900">Settings</h1>
        <p className="mt-2 text-ocean-900/62">{account?.email}</p>
      </header>

      {params?.saved ? (
        <p className="mt-6 rounded-xl border border-kelp-500/20 bg-kelp-100 px-4 py-3 text-sm font-semibold text-kelp-700">
          Settings saved.
        </p>
      ) : null}
      {params?.error ? (
        <p className="mt-6 rounded-xl border border-coral-500/20 bg-coral-100 px-4 py-3 text-sm font-semibold text-coral-700">
          Please check the highlighted account details.
        </p>
      ) : null}

      <section className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <form action={updateAccountAction} className="min-w-0 rounded-2xl border border-ocean-900/10 bg-white p-6 shadow-soft">
          <h2 className="text-xl font-bold tracking-normal text-ocean-900">Profile</h2>
          <div className="mt-5 grid gap-4">
            <label className="grid min-w-0 gap-2 text-sm font-semibold text-ocean-900">
              <span>
                Name <RequiredMark />
              </span>
              <input name="name" defaultValue={account?.name ?? ""} className="w-full min-w-0 rounded-xl border border-ocean-900/14 px-4 py-3 outline-none focus:border-coral-500" required />
            </label>
            <label className="grid min-w-0 gap-2 text-sm font-semibold text-ocean-900">
              <span>
                Display name <RequiredMark />
              </span>
              <input name="displayName" defaultValue={account?.displayName ?? ""} className="w-full min-w-0 rounded-xl border border-ocean-900/14 px-4 py-3 outline-none focus:border-coral-500" required />
            </label>
            <label className="grid min-w-0 gap-2 text-sm font-semibold text-ocean-900">
              Location
              <input name="location" defaultValue={account?.location ?? ""} className="w-full min-w-0 rounded-xl border border-ocean-900/14 px-4 py-3 outline-none focus:border-coral-500" />
            </label>
            <label className="grid min-w-0 gap-2 text-sm font-semibold text-ocean-900">
              Bio
              <textarea name="bio" defaultValue={account?.bio ?? ""} className="min-h-28 w-full min-w-0 rounded-xl border border-ocean-900/14 px-4 py-3 outline-none focus:border-coral-500" />
            </label>
          </div>
          <Button type="submit" className="mt-6">
            Save Profile
          </Button>
        </form>

        <form action={changePasswordAction} className="min-w-0 rounded-2xl border border-ocean-900/10 bg-white p-6 shadow-soft">
          <h2 className="text-xl font-bold tracking-normal text-ocean-900">Password</h2>
          <p id="password-requirements" className="mt-2 text-sm font-semibold leading-6 text-ocean-900/58">
            {passwordHelpText}
          </p>
          <div className="mt-5 grid gap-4">
            <label className="grid min-w-0 gap-2 text-sm font-semibold text-ocean-900">
              <span>
                Current password <RequiredMark />
              </span>
              <input name="currentPassword" type="password" className="w-full min-w-0 rounded-xl border border-ocean-900/14 px-4 py-3 outline-none focus:border-coral-500" required />
            </label>
            <label className="grid min-w-0 gap-2 text-sm font-semibold text-ocean-900">
              <span>
                New password <RequiredMark />
              </span>
              <input
                name="nextPassword"
                type="password"
                minLength={8}
                aria-describedby="password-requirements"
                className="w-full min-w-0 rounded-xl border border-ocean-900/14 px-4 py-3 outline-none focus:border-coral-500"
                required
              />
            </label>
            <label className="grid min-w-0 gap-2 text-sm font-semibold text-ocean-900">
              <span>
                Confirm new password <RequiredMark />
              </span>
              <input
                name="confirmPassword"
                type="password"
                minLength={8}
                aria-describedby="password-requirements"
                className="w-full min-w-0 rounded-xl border border-ocean-900/14 px-4 py-3 outline-none focus:border-coral-500"
                required
              />
            </label>
          </div>
          <Button type="submit" tone="secondary" className="mt-6">
            Change Password
          </Button>
        </form>
      </section>

    </main>
  );
}

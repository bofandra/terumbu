import { eq } from "drizzle-orm";

import { Button } from "@/components/ui/button";
import { db } from "@/db/client";
import { impactPassports, profiles, users } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { changePasswordAction, updateAccountAction } from "@/lib/auth-actions";
import { getNotificationPreferences } from "@/lib/queries";
import { updateNotificationPreferencesAction } from "@/lib/retention-actions";

export const metadata = {
  title: "Account Settings"
};

type SettingsPageProps = {
  searchParams?: Promise<{
    saved?: string;
    error?: string;
  }>;
};

export default async function SettingsPage({ searchParams }: SettingsPageProps) {
  const params = await searchParams;
  const sessionUser = await requireUser("/dashboard/settings");
  const [account, preferences] = await Promise.all([
    db
      .select({
        name: users.name,
        email: users.email,
        displayName: profiles.displayName,
        location: profiles.location,
        bio: profiles.bio,
        isPublic: profiles.isPublic,
        publicSlug: impactPassports.publicSlug,
        passportVisibility: impactPassports.visibility
      })
      .from(users)
      .leftJoin(profiles, eq(profiles.userId, users.id))
      .leftJoin(impactPassports, eq(impactPassports.userId, users.id))
      .where(eq(users.id, sessionUser.id))
      .limit(1)
      .then((rows) => rows[0]),
    getNotificationPreferences(sessionUser.id)
  ]);

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
        <form action={updateAccountAction} className="rounded-2xl border border-ocean-900/10 bg-white p-6 shadow-soft">
          <h2 className="text-xl font-bold tracking-normal text-ocean-900">Profile</h2>
          <div className="mt-5 grid gap-4">
            <label className="grid gap-2 text-sm font-semibold text-ocean-900">
              Name
              <input name="name" defaultValue={account?.name ?? ""} className="rounded-xl border border-ocean-900/14 px-4 py-3 outline-none focus:border-coral-500" required />
            </label>
            <label className="grid gap-2 text-sm font-semibold text-ocean-900">
              Display name
              <input name="displayName" defaultValue={account?.displayName ?? ""} className="rounded-xl border border-ocean-900/14 px-4 py-3 outline-none focus:border-coral-500" required />
            </label>
            <label className="grid gap-2 text-sm font-semibold text-ocean-900">
              Location
              <input name="location" defaultValue={account?.location ?? ""} className="rounded-xl border border-ocean-900/14 px-4 py-3 outline-none focus:border-coral-500" />
            </label>
            <label className="grid gap-2 text-sm font-semibold text-ocean-900">
              Bio
              <textarea name="bio" defaultValue={account?.bio ?? ""} className="min-h-28 rounded-xl border border-ocean-900/14 px-4 py-3 outline-none focus:border-coral-500" />
            </label>
            <label id="privacy" className="grid scroll-mt-24 gap-2 text-sm font-semibold text-ocean-900">
              Impact Passport visibility
              <select
                name="passportVisibility"
                defaultValue={account?.passportVisibility ?? "private"}
                className="rounded-xl border border-ocean-900/14 px-4 py-3 outline-none focus:border-coral-500"
              >
                <option value="private">Private</option>
                <option value="link">Link-only</option>
                <option value="public">Public</option>
              </select>
            </label>
          </div>
          <Button type="submit" className="mt-6">
            Save Profile
          </Button>
        </form>

        <form action={changePasswordAction} className="rounded-2xl border border-ocean-900/10 bg-white p-6 shadow-soft">
          <h2 className="text-xl font-bold tracking-normal text-ocean-900">Password</h2>
          <div className="mt-5 grid gap-4">
            <label className="grid gap-2 text-sm font-semibold text-ocean-900">
              Current password
              <input name="currentPassword" type="password" className="rounded-xl border border-ocean-900/14 px-4 py-3 outline-none focus:border-coral-500" required />
            </label>
            <label className="grid gap-2 text-sm font-semibold text-ocean-900">
              New password
              <input name="nextPassword" type="password" minLength={8} className="rounded-xl border border-ocean-900/14 px-4 py-3 outline-none focus:border-coral-500" required />
            </label>
          </div>
          <Button type="submit" tone="secondary" className="mt-6">
            Change Password
          </Button>
        </form>
      </section>

      <section id="notifications" className="mt-6 scroll-mt-24 rounded-2xl border border-ocean-900/10 bg-white p-6 shadow-soft">
        <h2 className="text-xl font-bold tracking-normal text-ocean-900">Notifications and reports</h2>
        <p className="mt-2 text-sm leading-6 text-ocean-900/62">
          Choose which retention messages Terumbu keeps in your dashboard and which monthly summaries can be queued for email.
        </p>
        <form action={updateNotificationPreferencesAction} className="mt-5 grid gap-4 md:grid-cols-2">
          {[
            ["campaignUpdates", "Campaign updates", preferences.campaignUpdates],
            ["evidenceAlerts", "Evidence alerts", preferences.evidenceAlerts],
            ["expeditionReminders", "Expedition reminders", preferences.expeditionReminders],
            ["academyUpdates", "Academy updates", preferences.academyUpdates],
            ["monthlyImpactReport", "Monthly report records", preferences.monthlyImpactReport],
            ["monthlyImpactEmail", "Monthly email summaries", preferences.monthlyImpactEmail]
          ].map(([name, label, enabled]) => (
            <label key={name as string} className="flex items-center justify-between gap-4 rounded-xl border border-ocean-900/10 bg-sand-50 px-4 py-3 text-sm font-bold text-ocean-900">
              <span>{label as string}</span>
              <input name={name as string} type="checkbox" defaultChecked={Boolean(enabled)} className="size-5 accent-coral-500" />
            </label>
          ))}
          <div className="md:col-span-2">
            <Button type="submit">Save Notification Preferences</Button>
          </div>
        </form>
      </section>
    </main>
  );
}

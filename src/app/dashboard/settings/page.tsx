import { eq } from "drizzle-orm";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { db } from "@/db/client";
import { profiles, users } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { changePasswordAction, updateAccountAction } from "@/lib/auth-actions";
import { getPreferredLocale } from "@/lib/user-preferences";

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

export default async function SettingsPage({ searchParams }: SettingsPageProps) {
  const params = await searchParams;
  const sessionUser = await requireUser("/dashboard/settings");
  const [accountRows, locale] = await Promise.all([
    db
      .select({
        name: users.name,
        email: users.email,
        displayName: profiles.displayName,
        location: profiles.location,
        bio: profiles.bio
      })
      .from(users)
      .leftJoin(profiles, eq(profiles.userId, users.id))
      .where(eq(users.id, sessionUser.id))
      .limit(1),
    getPreferredLocale()
  ]);
  const account = accountRows[0];
  const labels =
    locale === "id"
      ? {
          eyebrow: "Akun",
          title: "Pengaturan akun",
          subtitle: "Kelola identitas profil dan keamanan login. Preferensi dampak dan passport tetap dikelola dari area My Impact.",
          saved: "Pengaturan tersimpan.",
          error: "Periksa kembali detail akun yang ditandai.",
          profile: "Profil",
          profileBody: "Informasi ini digunakan pada dashboard dan area profil yang relevan.",
          name: "Nama",
          displayName: "Nama tampilan",
          location: "Lokasi",
          bio: "Bio",
          saveProfile: "Simpan Profil",
          password: "Kata sandi",
          passwordBody: "Ubah kata sandi hanya jika kamu ingin memperbarui kredensial login.",
          passwordHelp: "Gunakan minimal 8 karakter. Huruf besar dan angka bersifat opsional sesuai kebijakan saat ini.",
          currentPassword: "Kata sandi saat ini",
          newPassword: "Kata sandi baru",
          confirmPassword: "Konfirmasi kata sandi baru",
          changePassword: "Ubah Kata Sandi",
          impactSettings: "Pengaturan dampak & passport",
          impactSettingsBody: "Untuk melihat Impact Passport, atribusi outcome, dan kontrol yang terkait dampak, gunakan halaman My Impact.",
          openImpact: "Buka My Impact",
          required: "wajib"
        }
      : {
          eyebrow: "Account",
          title: "Account settings",
          subtitle: "Manage your profile identity and login security. Impact and passport preferences remain in the My Impact area.",
          saved: "Settings saved.",
          error: "Please check the highlighted account details.",
          profile: "Profile",
          profileBody: "This information is used across the dashboard and relevant profile surfaces.",
          name: "Name",
          displayName: "Display name",
          location: "Location",
          bio: "Bio",
          saveProfile: "Save Profile",
          password: "Password",
          passwordBody: "Change your password only when you want to update your login credential.",
          passwordHelp: "Use at least 8 characters. Uppercase letters and numbers are optional under the current policy.",
          currentPassword: "Current password",
          newPassword: "New password",
          confirmPassword: "Confirm new password",
          changePassword: "Change Password",
          impactSettings: "Impact & passport settings",
          impactSettingsBody: "For Impact Passport, outcome attribution, and impact-related controls, use the My Impact page.",
          openImpact: "Open My Impact",
          required: "required"
        };

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <header>
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-coral-700">{labels.eyebrow}</p>
        <h1 className="mt-2 text-3xl font-bold tracking-normal text-ocean-900">{labels.title}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-ocean-900/62">{labels.subtitle}</p>
        <p className="mt-2 text-sm font-semibold text-ocean-900/54">{account?.email}</p>
      </header>

      {params?.saved ? (
        <p className="mt-6 rounded-xl border border-kelp-500/20 bg-kelp-100 px-4 py-3 text-sm font-semibold text-kelp-700">
          {labels.saved}
        </p>
      ) : null}
      {params?.error ? (
        <p className="mt-6 rounded-xl border border-coral-500/20 bg-coral-100 px-4 py-3 text-sm font-semibold text-coral-700">
          {labels.error}
        </p>
      ) : null}

      <section className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <form action={updateAccountAction} className="min-w-0 rounded-2xl border border-ocean-900/10 bg-white p-6 shadow-soft">
          <h2 className="text-xl font-bold tracking-normal text-ocean-900">{labels.profile}</h2>
          <p className="mt-2 text-sm leading-6 text-ocean-900/58">{labels.profileBody}</p>
          <div className="mt-5 grid gap-4">
            <label className="grid min-w-0 gap-2 text-sm font-semibold text-ocean-900">
              <span>
                {labels.name} <RequiredMark /> <span className="sr-only">({labels.required})</span>
              </span>
              <input name="name" defaultValue={account?.name ?? ""} className="w-full min-w-0 rounded-xl border border-ocean-900/14 px-4 py-3 outline-none focus:border-coral-500" required />
            </label>
            <label className="grid min-w-0 gap-2 text-sm font-semibold text-ocean-900">
              <span>
                {labels.displayName} <RequiredMark /> <span className="sr-only">({labels.required})</span>
              </span>
              <input name="displayName" defaultValue={account?.displayName ?? ""} className="w-full min-w-0 rounded-xl border border-ocean-900/14 px-4 py-3 outline-none focus:border-coral-500" required />
            </label>
            <label className="grid min-w-0 gap-2 text-sm font-semibold text-ocean-900">
              {labels.location}
              <input name="location" defaultValue={account?.location ?? ""} className="w-full min-w-0 rounded-xl border border-ocean-900/14 px-4 py-3 outline-none focus:border-coral-500" />
            </label>
            <label className="grid min-w-0 gap-2 text-sm font-semibold text-ocean-900">
              {labels.bio}
              <textarea name="bio" defaultValue={account?.bio ?? ""} className="min-h-28 w-full min-w-0 rounded-xl border border-ocean-900/14 px-4 py-3 outline-none focus:border-coral-500" />
            </label>
          </div>
          <Button type="submit" className="mt-6">
            {labels.saveProfile}
          </Button>
        </form>

        <div className="grid content-start gap-6">
          <form action={changePasswordAction} className="min-w-0 rounded-2xl border border-ocean-900/10 bg-white p-6 shadow-soft">
            <h2 className="text-xl font-bold tracking-normal text-ocean-900">{labels.password}</h2>
            <p className="mt-2 text-sm leading-6 text-ocean-900/58">{labels.passwordBody}</p>
            <p id="password-requirements" className="mt-2 text-sm font-semibold leading-6 text-ocean-900/58">
              {labels.passwordHelp}
            </p>
            <div className="mt-5 grid gap-4">
              <label className="grid min-w-0 gap-2 text-sm font-semibold text-ocean-900">
                <span>
                  {labels.currentPassword} <RequiredMark /> <span className="sr-only">({labels.required})</span>
                </span>
                <input name="currentPassword" type="password" className="w-full min-w-0 rounded-xl border border-ocean-900/14 px-4 py-3 outline-none focus:border-coral-500" required />
              </label>
              <label className="grid min-w-0 gap-2 text-sm font-semibold text-ocean-900">
                <span>
                  {labels.newPassword} <RequiredMark /> <span className="sr-only">({labels.required})</span>
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
                  {labels.confirmPassword} <RequiredMark /> <span className="sr-only">({labels.required})</span>
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
              {labels.changePassword}
            </Button>
          </form>

          <aside className="rounded-2xl border border-ocean-900/10 bg-ocean-50 p-5">
            <h2 className="text-lg font-bold text-ocean-900">{labels.impactSettings}</h2>
            <p className="mt-2 text-sm leading-6 text-ocean-900/62">{labels.impactSettingsBody}</p>
            <Link href="/dashboard/impact" className="mt-4 inline-flex text-sm font-bold text-coral-700 hover:text-coral-500">
              {labels.openImpact}
            </Link>
          </aside>
        </div>
      </section>
    </main>
  );
}

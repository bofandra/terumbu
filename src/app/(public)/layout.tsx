import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getDefaultAuthenticatedPath, getSessionUser } from "@/lib/auth";
import { getPreferredDisplayCurrency, getPreferredLocale } from "@/lib/user-preferences";

export default async function PublicLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const [user, locale, displayCurrency] = await Promise.all([
    getSessionUser(),
    getPreferredLocale(),
    getPreferredDisplayCurrency()
  ]);
  const dashboardHref = user ? await getDefaultAuthenticatedPath(user.id) : null;

  return (
    <>
      <a href="#main-content" className="sr-only focus:not-sr-only fixed left-4 top-4 z-[100] rounded-lg bg-white px-4 py-3 font-bold text-ocean-900 shadow-lg focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-sky-700">{locale === "id" ? "Lewati ke konten utama" : "Skip to main content"}</a>
      <SiteHeader
        locale={locale}
        displayCurrency={displayCurrency}
        user={
          user
            ? {
                displayName: user.displayName ?? user.name ?? user.email,
                email: user.email,
                heroLevel: user.heroLevel,
                dashboardHref: dashboardHref ?? "/dashboard"
              }
            : null
        }
      />
      <main id="main-content" tabIndex={-1}>{children}</main>
      <SiteFooter locale={locale} />
    </>
  );
}

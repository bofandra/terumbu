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
      <main>{children}</main>
      <SiteFooter />
    </>
  );
}

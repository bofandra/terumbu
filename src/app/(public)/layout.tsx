import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getDefaultAuthenticatedPath, getSessionUser } from "@/lib/auth";

export default async function PublicLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const user = await getSessionUser();
  const dashboardHref = user ? await getDefaultAuthenticatedPath(user.id) : null;

  return (
    <>
      <SiteHeader
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

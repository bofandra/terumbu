import { ShieldAlert } from "lucide-react";

import { ButtonLink } from "@/components/ui/button";
import { getDefaultAuthenticatedPath, getSessionUser, safeRedirectPath } from "@/lib/auth";

export const metadata = {
  title: "Access Restricted"
};

type ForbiddenPageProps = {
  searchParams?: Promise<{
    next?: string;
  }>;
};

export default async function ForbiddenPage({ searchParams }: ForbiddenPageProps) {
  const params = await searchParams;
  const requestedPath = safeRedirectPath(params?.next, "/dashboard");
  const user = await getSessionUser();
  const homePath = user ? await getDefaultAuthenticatedPath(user.id) : "/login";
  const loginPath = `/login?next=${encodeURIComponent(requestedPath)}`;

  return (
    <main className="flex min-h-screen items-center justify-center bg-sand-50 px-4">
      <section className="max-w-md rounded-2xl bg-white p-8 text-center shadow-soft">
        <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-coral-100 text-coral-700">
          <ShieldAlert size={24} aria-hidden="true" />
        </div>
        <p className="mt-5 text-sm font-bold uppercase tracking-[0.16em] text-coral-700">403</p>
        <h1 className="mt-3 text-3xl font-bold tracking-normal text-ocean-900">Access restricted</h1>
        <p className="mt-3 text-sm leading-6 text-ocean-900/68">
          {user
            ? "Your account is signed in, but it does not have permission to open this Terumbu workspace area."
            : "Sign in with an account that has permission to open this Terumbu workspace area."}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <ButtonLink href={homePath} tone="secondary">
            Go To My Workspace
          </ButtonLink>
          {!user ? <ButtonLink href={loginPath}>Login</ButtonLink> : null}
        </div>
      </section>
    </main>
  );
}

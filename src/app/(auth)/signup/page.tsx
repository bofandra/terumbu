import { redirect } from "next/navigation";

import { getDefaultAuthenticatedPath, getSessionUser, safeRedirectPath } from "@/lib/auth";

export const metadata = {
  title: "Registration Closed"
};

type SignupPageProps = {
  searchParams?: Promise<{
    next?: string;
  }>;
};

function closedRegistrationLoginPath(nextPath: string) {
  const params = new URLSearchParams({ registration: "closed" });

  if (nextPath) {
    params.set("next", nextPath);
  }

  return `/login?${params.toString()}`;
}

export default async function SignupPage({ searchParams }: SignupPageProps) {
  const params = await searchParams;
  const nextPath = safeRedirectPath(params?.next, "");
  const sessionUser = await getSessionUser();

  if (sessionUser) {
    redirect(nextPath || (await getDefaultAuthenticatedPath(sessionUser.id)));
  }

  redirect(closedRegistrationLoginPath(nextPath));
}

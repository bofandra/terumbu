import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

type PageProps = { searchParams?: Promise<{ workspace?: string }> };

export default async function AdminPaymentsRedirectPage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};
  redirect(params.workspace === "bookings" ? "/admin/expeditions/payments" : "/admin/campaigns/payments");
}

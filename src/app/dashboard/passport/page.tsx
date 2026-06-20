import { PassportPreview } from "@/components/passport-preview";
import { requireUser } from "@/lib/auth";
import { getDashboardData } from "@/lib/queries";

export const metadata = {
  title: "Impact Passport"
};

export const dynamic = "force-dynamic";

export default async function DashboardPassportPage() {
  const user = await requireUser("/dashboard/passport");
  const data = await getDashboardData(user.id);

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <p className="text-sm font-bold uppercase tracking-[0.16em] text-coral-700">Impact Passport</p>
      <h1 className="mt-2 text-3xl font-bold tracking-normal text-ocean-900">Your verified record</h1>
      <div className="mt-8">{data.passportPreview ? <PassportPreview passport={data.passportPreview} /> : null}</div>
    </main>
  );
}

export const metadata = {
  title: "Privacy Policy"
};

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
      <h1 className="text-4xl font-bold tracking-normal text-ocean-900">Privacy Policy</h1>
      <div className="mt-6 space-y-5 text-sm leading-7 text-ocean-900/70">
        <p>Terumbu stores account, donation, booking, course, certificate, and Impact Passport data in PostgreSQL to operate user and partner workflows.</p>
        <p>Private dashboard data is available only to authenticated users and authorized operational roles. Public Impact Passport data is shown only when the user chooses public or link-only visibility.</p>
        <p>Operational email, analytics, storage, and payment integrations use provider credentials configured by environment for the active deployment.</p>
      </div>
    </main>
  );
}

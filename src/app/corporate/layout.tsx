import Link from "next/link";

export default function CorporateLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="min-h-screen bg-[#f7f9f4]">
      <aside className="fixed inset-y-0 left-0 hidden w-72 border-r border-ocean-900/10 bg-white px-5 py-6 xl:block">
        <Link href="/" className="text-xl font-bold text-ocean-900">
          Terumbu.eco
        </Link>
        <p className="mt-2 text-sm font-semibold text-ocean-900/56">Corporate workspace</p>
        <nav className="mt-8 grid gap-1">
          {["Overview", "Programs", "Projects", "Funding", "Employees", "Evidence", "Reports", "Settings"].map((item) => (
            <Link key={item} href="/corporate/dashboard" className="rounded-xl px-3 py-3 text-sm font-semibold text-ocean-900/68 hover:bg-ocean-50 hover:text-ocean-900">
              {item}
            </Link>
          ))}
        </nav>
      </aside>
      <div className="xl:pl-72">{children}</div>
    </div>
  );
}


import Link from "next/link";

import { requireUser } from "@/lib/auth";

const corporateNav = [
  { label: "Overview", href: "/corporate/dashboard" },
  { label: "Programs", href: "/corporate/programs" },
  { label: "Projects", href: "/corporate/projects" },
  { label: "Funding", href: "/corporate/funding" },
  { label: "Employees", href: "/corporate/employees" },
  { label: "Evidence", href: "/corporate/evidence" },
  { label: "Reports", href: "/corporate/reports" },
  { label: "Settings", href: "/corporate/settings" }
];

export default async function CorporateLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const user = await requireUser("/corporate/dashboard");
  const displayName = user.displayName ?? user.name ?? user.email;

  return (
    <div className="min-h-screen bg-[#f7f9f4]">
      <aside className="fixed inset-y-0 left-0 hidden w-72 border-r border-ocean-900/10 bg-white px-5 py-6 xl:block">
        <Link href="/" className="text-xl font-bold text-ocean-900">
          Terumbu.eco
        </Link>
        <p className="mt-2 text-sm font-semibold text-ocean-900/56">Corporate workspace</p>
        <p className="mt-1 truncate text-sm font-bold text-ocean-900">{displayName}</p>
        <nav className="mt-8 grid gap-1">
          {corporateNav.map((item) => (
            <Link key={item.href} href={item.href} className="rounded-xl px-3 py-3 text-sm font-semibold text-ocean-900/68 hover:bg-ocean-50 hover:text-ocean-900">
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
      <div className="xl:pl-72">{children}</div>
    </div>
  );
}

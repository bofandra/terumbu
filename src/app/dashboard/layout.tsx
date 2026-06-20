import { Bell, Home, Settings, UserCircle } from "lucide-react";
import Link from "next/link";

const dashboardNav = ["Overview", "My Impact", "Corals", "Donations", "Expeditions", "Academy", "Passport"];

export default function DashboardLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="min-h-screen bg-sand-50">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-ocean-900/10 bg-white px-4 py-5 lg:block">
        <Link href="/" className="text-xl font-bold text-ocean-900">
          Terumbu.eco
        </Link>
        <nav className="mt-8 grid gap-1">
          {dashboardNav.map((item) => (
            <Link key={item} href="/dashboard" className="rounded-xl px-3 py-3 text-sm font-semibold text-ocean-900/68 hover:bg-ocean-50 hover:text-ocean-900">
              {item}
            </Link>
          ))}
        </nav>
      </aside>
      <div className="lg:pl-64">
        <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-ocean-900/10 bg-white/92 px-4 backdrop-blur sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <Home size={19} aria-hidden="true" className="text-coral-500" />
            <p className="font-bold text-ocean-900">Dashboard / Overview</p>
          </div>
          <div className="flex items-center gap-2">
            <button aria-label="Notifications" className="flex size-10 items-center justify-center rounded-full hover:bg-ocean-50">
              <Bell size={19} aria-hidden="true" />
            </button>
            <button aria-label="Settings" className="flex size-10 items-center justify-center rounded-full hover:bg-ocean-50">
              <Settings size={19} aria-hidden="true" />
            </button>
            <button aria-label="Profile" className="flex size-10 items-center justify-center rounded-full hover:bg-ocean-50">
              <UserCircle size={21} aria-hidden="true" />
            </button>
          </div>
        </header>
        {children}
      </div>
    </div>
  );
}


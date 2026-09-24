import Link from "next/link";
import { CreditCard, FileCheck2, Images, MapPinned, ShieldCheck, ShipWheel, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

export type AdminDomainNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

export const adminDonationNavItems: AdminDomainNavItem[] = [
  { href: "/admin/campaigns", label: "Donations", icon: FileCheck2 },
  { href: "/admin/campaigns/payments", label: "Payments", icon: CreditCard },
  { href: "/admin/campaigns/evidence", label: "Activity", icon: ShieldCheck },
  { href: "/admin/campaigns/impact-sites", label: "Impact sites", icon: MapPinned }
];

export const adminExpeditionNavItems: AdminDomainNavItem[] = [
  { href: "/admin/expeditions", label: "Expeditions", icon: ShipWheel },
  { href: "/admin/expeditions/payments", label: "Payments", icon: CreditCard },
  { href: "/admin/expeditions/media", label: "Traveler media", icon: Images }
];

function activeHrefForItems(items: AdminDomainNavItem[], active: string) {
  return items
    .filter((item) => active === item.href || active.startsWith(`${item.href}/`))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;
}

export function AdminDomainNav({ items, active }: { items: AdminDomainNavItem[]; active: string }) {
  if (items.length <= 1) {
    return null;
  }

  const activeHref = activeHrefForItems(items, active);

  return (
    <nav className="overflow-x-auto rounded-lg border border-ocean-900/10 bg-white p-1 shadow-soft" aria-label="Admin domain sections">
      <div className="flex min-w-max gap-1">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = item.href === activeHref;

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "inline-flex min-h-10 items-center gap-2 rounded-md px-3 text-sm font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kelp-500 focus-visible:ring-offset-2",
                isActive ? "bg-ocean-900 text-white" : "text-ocean-900/68 hover:bg-ocean-50 hover:text-ocean-900"
              )}
            >
              <Icon className="size-4 shrink-0" aria-hidden="true" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

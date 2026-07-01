import { PartnerShell } from "@/components/partner-shell";

export default function PartnerLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <PartnerShell>{children}</PartnerShell>;
}

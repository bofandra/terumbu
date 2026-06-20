export default function AuthLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <main className="min-h-screen bg-ocean-900 px-4 py-10 text-ocean-900 sm:px-6 lg:px-8">{children}</main>;
}


import Link from "next/link";

import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Sign Up"
};

export default function SignupPage() {
  return (
    <section className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-md items-center">
      <div className="w-full rounded-2xl bg-white p-6 shadow-soft">
        <Link href="/" className="text-xl font-bold text-ocean-900">
          Terumbu.eco
        </Link>
        <h1 className="mt-8 text-3xl font-bold tracking-normal text-ocean-900">Create your Ocean Hero profile</h1>
        <form className="mt-6 grid gap-4">
          <label className="grid gap-2 text-sm font-semibold text-ocean-900">
            Name
            <input className="rounded-xl border border-ocean-900/14 px-4 py-3 outline-none focus:border-coral-500" type="text" />
          </label>
          <label className="grid gap-2 text-sm font-semibold text-ocean-900">
            Email
            <input className="rounded-xl border border-ocean-900/14 px-4 py-3 outline-none focus:border-coral-500" type="email" />
          </label>
          <label className="grid gap-2 text-sm font-semibold text-ocean-900">
            Password
            <input className="rounded-xl border border-ocean-900/14 px-4 py-3 outline-none focus:border-coral-500" type="password" />
          </label>
          <Button type="button" className="mt-2">
            Sign Up
          </Button>
        </form>
        <p className="mt-5 text-sm text-ocean-900/62">
          Already have an account?{" "}
          <Link href="/login" className="font-bold text-coral-700">
            Login
          </Link>
        </p>
      </div>
    </section>
  );
}


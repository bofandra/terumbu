import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Expedition Checkout"
};

export default function ExpeditionCheckoutPage() {
  return (
    <main className="min-h-screen bg-sand-50 px-4 py-12 sm:px-6 lg:px-8">
      <section className="mx-auto max-w-2xl rounded-2xl bg-white p-6 shadow-soft">
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-coral-700">Booking</p>
        <h1 className="mt-3 text-3xl font-bold tracking-normal text-ocean-900">Reserve expedition seats</h1>
        <p className="mt-3 text-ocean-900/68">
          Availability, participant requirements, payment, and booking records will be wired into the expedition model.
        </p>
        <form className="mt-6 grid gap-4">
          <input className="rounded-xl border border-ocean-900/14 px-4 py-3" placeholder="Departure date" />
          <input className="rounded-xl border border-ocean-900/14 px-4 py-3" placeholder="Participants" />
          <Button type="button">Continue Booking</Button>
        </form>
      </section>
    </main>
  );
}


import { Award, Leaf, MapPinned, Waves } from "lucide-react";

const items = [
  { label: "Donations", value: "12", icon: Leaf },
  { label: "Corals", value: "25", icon: Waves },
  { label: "Field hours", value: "18", icon: MapPinned },
  { label: "Certificates", value: "4", icon: Award }
];

export function PassportPreview() {
  return (
    <div className="grid gap-5 lg:grid-cols-[0.75fr_1.25fr]">
      <div className="rounded-2xl bg-ocean-900 p-6 text-white shadow-soft">
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-coral-300">Impact Passport</p>
        <div className="mt-8 flex items-center gap-4">
          <div className="flex size-16 items-center justify-center rounded-full bg-coral-500 text-xl font-bold">RA</div>
          <div>
            <h3 className="text-2xl font-bold tracking-normal">Raka Aditya</h3>
            <p className="mt-1 text-sm text-white/68">Ocean Hero, Level 7</p>
          </div>
        </div>
        <div className="mt-8 h-3 overflow-hidden rounded-full bg-white/14">
          <div className="h-full w-[72%] rounded-full bg-coral-500" />
        </div>
        <p className="mt-3 text-sm text-white/72">7,250 / 10,000 XP to Ocean Champion</p>
      </div>

      <div className="rounded-2xl border border-ocean-900/10 bg-white p-5 shadow-soft">
        <div className="grid gap-3 sm:grid-cols-2">
          {items.map((item) => {
            const Icon = item.icon;

            return (
              <div key={item.label} className="rounded-xl border border-ocean-900/10 bg-sand-50 p-4">
                <Icon className="text-coral-500" size={22} aria-hidden="true" />
                <p className="mt-4 text-2xl font-bold tracking-normal text-ocean-900">{item.value}</p>
                <p className="mt-1 text-sm font-medium text-ocean-900/62">{item.label}</p>
              </div>
            );
          })}
        </div>
        <div className="mt-5 rounded-xl border border-dashed border-ocean-900/20 p-4">
          <p className="font-bold text-ocean-900">Latest verified activity</p>
          <p className="mt-2 text-sm leading-6 text-ocean-900/68">
            Joined Raja Ampat coral monitoring and added 6 field evidence photos to the passport timeline.
          </p>
        </div>
      </div>
    </div>
  );
}


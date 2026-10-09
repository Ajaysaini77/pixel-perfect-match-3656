import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { BookOpen, ChevronRight, MapPin, Package, Search, Store } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ListingCard } from "@/components/ListingCard";
import { Results, ViewToggle } from "@/components/Results";
import { rankListings, type Category } from "@/lib/data";
import { getState, useListings, useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Padosi — Trusted tutors, rentals & live vendors near you" },
      { name: "description", content: "Search your neighbourhood for trusted tutors, things to borrow and street vendors who are live right now." },
      { property: "og:title", content: "Padosi — Trusted help near you" },
      { property: "og:description", content: "Tutors, resources and live vendors ranked by neighbourhood trust." },
    ],
  }),
  component: Home,
});

const CATS: { c: Category; title: string; sub: string; icon: typeof Package; tone: string }[] = [
  { c: "resource", title: "Resources", sub: "Borrow or rent", icon: Package, tone: "bg-cat-resource/12 text-cat-resource" },
  { c: "tutor", title: "Tutors", sub: "Learn a skill", icon: BookOpen, tone: "bg-cat-tutor/12 text-cat-tutor" },
  { c: "vendor", title: "Live vendors", sub: "Out on the street", icon: Store, tone: "bg-cat-vendor/12 text-cat-vendor" },
];

function Home() {
  const nav = useNavigate();
  const area = useStore((s) => s.area);
  const listings = useListings();
  const ranked = useMemo(() => rankListings(listings), [listings]);
  const [q, setQ] = useState("");
  const [view, setView] = useState<"list" | "map">("list");

  useEffect(() => {
    if (!getState().onboarded) nav({ to: "/welcome" });
  }, [nav]);

  const near = ranked.filter((l) => l.km <= 1.5).slice(0, 8);
  const liveCount = ranked.filter((l) => l.vendor?.live).length;

  return (
    <div className="space-y-6">
      <div>
        <p className="inline-flex items-center gap-1 text-sm text-muted-foreground"><MapPin className="h-4 w-4 text-primary" />{area}</p>
        <h1 className="mt-1 text-[28px] font-extrabold leading-tight md:text-4xl">Who's good around here?</h1>
      </div>

      <form onSubmit={(e) => { e.preventDefault(); nav({ to: "/browse", search: { q, cat: "all", view: "list" } }); }} className="relative">
        <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Try 'maths tutor' or '3D printer'" className="h-14 rounded-2xl bg-card pl-12 text-base shadow-card" />
      </form>

      <div className="grid grid-cols-3 gap-3">
        {CATS.map(({ c, title, sub, icon: Icon, tone }) => (
          <Link key={c} to="/browse" search={{ cat: c, q: "", view: "list" }} className="flex flex-col gap-3 rounded-3xl border bg-card p-3 shadow-card transition-transform active:scale-95 md:flex-row md:items-center md:p-5">
            <span className={cn("grid h-12 w-12 place-items-center rounded-2xl", tone)}><Icon className="h-6 w-6" /></span>
            <span className="min-w-0">
              <span className="block text-sm font-bold leading-tight md:text-base">{title}</span>
              <span className="block text-[11px] text-muted-foreground md:text-sm">{c === "vendor" ? `${liveCount} live now` : sub}</span>
            </span>
          </Link>
        ))}
      </div>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xl font-bold">Near you</h2>
          <Link to="/browse" search={{ cat: "all", q: "", view: "list" }} className="inline-flex items-center text-sm font-semibold text-primary">See all <ChevronRight className="h-4 w-4" /></Link>
        </div>
        <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 pb-2 md:-mx-6 md:px-6">
          {near.map((l) => <ListingCard key={l.id} listing={l} variant="compact" />)}
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-xl font-bold">Top trusted</h2>
          <ViewToggle view={view} onChange={setView} />
        </div>
        <Results listings={ranked} view={view} />
      </section>
    </div>
  );
}

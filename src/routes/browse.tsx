import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { CategoryTabs, type CatFilter } from "@/components/CategoryTabs";
import { Results, ViewToggle } from "@/components/Results";
import { rankListings } from "@/lib/data";
import { useListings } from "@/lib/store";

interface BrowseSearch {
  cat: CatFilter;
  q: string;
  view: "list" | "map";
}

export const Route = createFileRoute("/browse")({
  validateSearch: (s: Record<string, unknown>): BrowseSearch => ({
    cat: ["resource", "tutor", "vendor"].includes(s.cat as string) ? (s.cat as CatFilter) : "all",
    q: typeof s.q === "string" ? s.q : "",
    view: s.view === "map" ? "map" : "list",
  }),
  head: () => ({
    meta: [
      { title: "Explore — Padosi" },
      { name: "description", content: "Browse trusted tutors, rentable items and live vendors in your area, on a list or map." },
      { property: "og:title", content: "Explore your neighbourhood — Padosi" },
      { property: "og:description", content: "Browse trusted tutors, rentals and live vendors on a list or map." },
    ],
  }),
  component: Browse,
});

function Browse() {
  const { cat, q, view } = Route.useSearch();
  const nav = useNavigate({ from: "/browse" });
  const listings = useListings();
  const results = useMemo(() => {
    const term = q.toLowerCase().trim();
    return rankListings(listings).filter((l) => {
      if (cat !== "all" && l.category !== cat) return false;
      if (!term) return true;
      const hay = [l.name, l.description, l.owner, ...(l.tutor?.subjects ?? []), ...(l.vendor?.sells ?? [])].join(" ").toLowerCase();
      return term.split(/\s+/).some((w) => hay.includes(w));
    });
  }, [listings, cat, q]);

  const set = (p: Partial<BrowseSearch>) => nav({ search: (prev) => ({ ...prev, ...p }), replace: true });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-extrabold md:text-3xl">Explore</h1>
      <div className="relative">
        <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
        <Input value={q} onChange={(e) => set({ q: e.target.value })} placeholder="Search tutors, items, vendors" className="h-14 rounded-2xl bg-card pl-12 text-base" />
      </div>
      <CategoryTabs value={cat} onChange={(c) => set({ cat: c })} />
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{results.length} results · sorted by trust & distance</p>
        <ViewToggle view={view} onChange={(v) => set({ view: v })} />
      </div>
      <Results listings={results} view={view} />
    </div>
  );
}

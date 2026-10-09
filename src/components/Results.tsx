import { lazy, Suspense, useCallback, useState } from "react";
import { ClientOnly } from "@tanstack/react-router";
import { List, Map as MapIcon } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { NEIGHBOURHOOD, type RankedListing } from "@/lib/data";
import { cn } from "@/lib/utils";
import { ListingCard } from "./ListingCard";
import { BottomSheet } from "./BottomSheet";

const MapView = lazy(() => import("./MapView"));
const RADII = [1, 2, 5];

export function ViewToggle({ view, onChange }: { view: "list" | "map"; onChange: (v: "list" | "map") => void }) {
  return (
    <div className="inline-flex rounded-full border bg-card p-1">
      {(["list", "map"] as const).map((v) => (
        <button key={v} onClick={() => onChange(v)} aria-pressed={view === v} className={cn("inline-flex h-9 items-center gap-1.5 rounded-full px-4 text-sm font-semibold capitalize", view === v ? "bg-primary text-primary-foreground" : "text-muted-foreground")}>
          {v === "list" ? <List className="h-4 w-4" /> : <MapIcon className="h-4 w-4" />} {v}
        </button>
      ))}
    </div>
  );
}

export function Results({ listings, view }: { listings: RankedListing[]; view: "list" | "map" }) {
  const [radiusIdx, setRadiusIdx] = useState(1);
  const [selected, setSelected] = useState<string | null>(null);
  const radius = RADII[radiusIdx];
  const inRadius = listings.filter((l) => l.km <= radius);
  const sel = inRadius.find((l) => l.id === selected);
  const onSelect = useCallback((id: string | null) => setSelected(id), []);

  if (view === "list") {
    if (!listings.length) return <p className="py-12 text-center text-muted-foreground">Nothing matches yet. Try another search.</p>;
    return (
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {listings.map((l) => <ListingCard key={l.id} listing={l} />)}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border bg-card p-4">
        <div className="mb-3 flex items-center justify-between text-sm">
          <span className="font-semibold">Search radius</span>
          <span className="font-bold text-primary">{radius} km · {inRadius.length} found</span>
        </div>
        <Slider min={0} max={2} step={1} value={[radiusIdx]} onValueChange={(v) => setRadiusIdx(v[0])} aria-label="Radius" />
        <div className="mt-2 flex justify-between text-xs text-muted-foreground">{RADII.map((r) => <span key={r}>{r} km</span>)}</div>
      </div>
      <div className="flex gap-3 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1"><i className="h-2.5 w-2.5 rounded-full bg-cat-resource" />Resources</span>
        <span className="inline-flex items-center gap-1"><i className="h-2.5 w-2.5 rounded-full bg-cat-tutor" />Tutors</span>
        <span className="inline-flex items-center gap-1"><i className="h-2.5 w-2.5 rounded-full bg-cat-vendor" />Vendors</span>
        <span className="inline-flex items-center gap-1"><i className="h-2.5 w-2.5 rounded-full bg-live" />Live</span>
      </div>
      <div className="relative h-[62vh] min-h-[420px] overflow-hidden rounded-3xl border">
        <ClientOnly fallback={<div className="h-full w-full animate-pulse bg-muted" />}>
          <Suspense fallback={<div className="h-full w-full animate-pulse bg-muted" />}>
            <MapView listings={inRadius} center={NEIGHBOURHOOD} radiusKm={radius} selectedId={selected} onSelect={onSelect} />
          </Suspense>
        </ClientOnly>
        <BottomSheet open={!!sel} onClose={() => setSelected(null)}>
          {sel && <ListingCard listing={sel} className="border-0 shadow-none" />}
        </BottomSheet>
      </div>
    </div>
  );
}

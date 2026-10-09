import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { CalendarDays, LogOut, Moon, Star, Store } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { ListingImage } from "@/components/ListingImage";
import { CategoryTag } from "@/components/CategoryTag";
import { setState, useListings, useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "My profile — Padosi" },
      { name: "description", content: "Your bookings, reviews, listings and settings on Padosi." },
      { property: "og:title", content: "My profile — Padosi" },
      { property: "og:description", content: "Your bookings, reviews, listings and settings on Padosi." },
    ],
  }),
  component: Profile,
});

const TABS = ["Bookings", "Reviews", "Listings", "Settings"] as const;

function Profile() {
  const [tab, setTab] = useState<(typeof TABS)[number]>("Bookings");
  const s = useStore((x) => x);
  const listings = useListings();
  const byId = useMemo(() => Object.fromEntries(listings.map((l) => [l.id, l])), [listings]);

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div className="flex items-center gap-4">
        <div className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-primary text-2xl font-bold text-primary-foreground">{s.loggedIn ? "A" : "?"}</div>
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-extrabold">{s.loggedIn ? "Neighbour" : "Guest"}</h1>
          <p className="truncate text-sm text-muted-foreground">{s.loggedIn ? `+91 ${s.phone}` : "Not logged in"} · {s.area}</p>
        </div>
      </div>
      {!s.loggedIn && <Button asChild className="h-12 w-full rounded-2xl"><Link to="/login">Log in with phone</Link></Button>}

      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)} className={cn("h-10 shrink-0 rounded-full border px-4 text-sm font-semibold", tab === t ? "border-primary bg-primary text-primary-foreground" : "bg-card")}>{t}</button>
        ))}
      </div>

      {tab === "Bookings" && (
        <div className="space-y-3">
          {s.bookings.length === 0 && <Empty text="No bookings yet." />}
          {s.bookings.map((b) => {
            const l = byId[b.listingId];
            if (!l) return null;
            return (
              <div key={b.id} className="rounded-2xl border bg-card p-3">
                <Link to="/listing/$id" params={{ id: l.id }} className="flex gap-3">
                  <ListingImage src={l.photos[0]} alt={l.name} category={l.category} className="h-16 w-16 shrink-0 rounded-xl" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{l.name}</p>
                    <p className="mt-0.5 inline-flex items-center gap-1 text-xs text-muted-foreground"><CalendarDays className="h-3.5 w-3.5" />{b.kind === "demo" ? "Demo class" : "Borrow"} · {b.date}{b.time ? `, ${b.time}` : ""}</p>
                    <span className={cn("mt-1 inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold", b.status === "completed" ? "bg-live/15 text-live" : "bg-accent text-accent-foreground")}>{b.status === "completed" ? "Completed" : "Upcoming"}</span>
                  </div>
                </Link>
                <div className="mt-3 flex justify-end gap-2">
                  {b.status === "upcoming" && (
                    <Button variant="outline" className="h-10 rounded-full" onClick={() => { setState((st) => ({ bookings: st.bookings.map((x) => (x.id === b.id ? { ...x, status: "completed" } : x)) })); toast.success("Marked as completed"); }}>Mark completed</Button>
                  )}
                  {b.status === "completed" && !b.reviewed && (
                    <Button asChild className="h-10 rounded-full"><Link to="/review/$bookingId" params={{ bookingId: b.id }}>Write a review</Link></Button>
                  )}
                  {b.reviewed && <span className="text-sm text-muted-foreground">Reviewed ✓</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {tab === "Reviews" && (
        <div className="space-y-3">
          {s.reviews.length === 0 && <Empty text="Reviews unlock after a completed booking." />}
          {s.reviews.map((r) => (
            <div key={r.id} className="rounded-2xl border bg-card p-4">
              <p className="font-semibold">{byId[r.listingId]?.name}</p>
              <div className="mt-1 flex">{Array.from({ length: 5 }).map((_, i) => <Star key={i} className={cn("h-4 w-4", i < r.rating ? "fill-star text-star" : "text-muted")} />)}</div>
              <p className="mt-2 text-sm">{r.text}</p>
            </div>
          ))}
        </div>
      )}

      {tab === "Listings" && (
        <div className="space-y-3">
          <Link to="/vendor" className="flex items-center gap-3 rounded-2xl border bg-card p-4">
            <Store className="h-6 w-6 text-primary" />
            <div className="min-w-0 flex-1"><p className="font-semibold">Vendor dashboard</p><p className="text-sm text-muted-foreground">{byId[s.myVendorId]?.name}</p></div>
          </Link>
          {s.myListings.map((l) => (
            <Link key={l.id} to="/listing/$id" params={{ id: l.id }} className="flex items-center gap-3 rounded-2xl border bg-card p-4">
              <div className="min-w-0 flex-1"><p className="truncate font-semibold">{l.name}</p><CategoryTag category={l.category} /></div>
            </Link>
          ))}
          <Button asChild variant="outline" className="h-12 w-full rounded-2xl"><Link to="/provider">+ Add a listing</Link></Button>
        </div>
      )}

      {tab === "Settings" && (
        <div className="divide-y rounded-2xl border bg-card">
          <label className="flex items-center gap-3 p-4">
            <Moon className="h-5 w-5" /><span className="flex-1 font-medium">Dark mode</span>
            <Switch checked={s.theme === "dark"} onCheckedChange={(v) => setState({ theme: v ? "dark" : "light" })} />
          </label>
          <Link to="/welcome" className="flex items-center gap-3 p-4 font-medium">Change area ({s.area})</Link>
          {s.loggedIn && (
            <button onClick={() => { setState({ loggedIn: false, phone: "" }); toast("Logged out"); }} className="flex w-full items-center gap-3 p-4 font-medium text-destructive"><LogOut className="h-5 w-5" />Log out</button>
          )}
        </div>
      )}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">{text}</p>;
}

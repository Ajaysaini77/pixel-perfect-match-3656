import { createFileRoute, Link, notFound, useNavigate, useRouter } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowLeft, BadgeCheck, CalendarDays, Clock, MapPin, ShieldCheck, Star, Trophy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerFooter } from "@/components/ui/drawer";
import { Progress } from "@/components/ui/progress";
import { TrustRing } from "@/components/TrustRing";
import { ListingImage } from "@/components/ListingImage";
import { CategoryTag, LiveBadge } from "@/components/CategoryTag";
import { navigateUrl } from "@/components/ListingCard";
import { formatAgo, formatKm, LISTINGS, priceLabel, rankListings, trustBreakdown } from "@/lib/data";
import { setState, uid, useListings, useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/listing/$id")({
  validateSearch: (s: Record<string, unknown>): { action?: boolean } => ({ action: s.action === true || s.action === "true" ? true : undefined }),
  loader: ({ params }) => {
    const l = LISTINGS.find((x) => x.id === params.id);
    return { name: l?.name ?? "Listing", description: l?.description ?? "" };
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: `${loaderData?.name ?? "Listing"} — Padosi` },
      { name: "description", content: loaderData?.description || "See trust score, reviews and availability on Padosi." },
      { property: "og:title", content: `${loaderData?.name ?? "Listing"} — Padosi` },
      { property: "og:description", content: loaderData?.description || "See trust score, reviews and availability on Padosi." },
    ],
  }),
  component: Detail,
});

const SLOTS = ["9:00 am", "11:00 am", "4:00 pm", "5:00 pm", "6:00 pm", "7:00 pm"];

function Detail() {
  const { id } = Route.useParams();
  const { action } = Route.useSearch();
  const router = useRouter();
  const nav = useNavigate();
  const listings = useListings();
  const loggedIn = useStore((s) => s.loggedIn);
  const l = useMemo(() => rankListings(listings).find((x) => x.id === id), [listings, id]);
  const [photo, setPhoto] = useState(0);
  const [open, setOpen] = useState(!!action && l?.category !== "vendor");
  const [date, setDate] = useState<Date | undefined>();
  const [slot, setSlot] = useState<string>();
  const [days, setDays] = useState(1);

  if (!l) {
    if (listings.length) throw notFound();
    return null;
  }
  const cat = l.category;
  const price = priceLabel(l);

  const confirm = () => {
    if (!date) return;
    if (!loggedIn) {
      toast("Log in to confirm your booking");
      nav({ to: "/login" });
      return;
    }
    setState((s) => ({
      bookings: [
        { id: uid(), listingId: l.id, kind: cat === "tutor" ? "demo" : "borrow", date: date.toISOString().slice(0, 10), time: slot, status: "upcoming", reviewed: false },
        ...s.bookings,
      ],
    }));
    setOpen(false);
    toast.success(cat === "tutor" ? "Demo class requested!" : "Borrow request sent!", { description: `${l.owner} usually replies in ${trustBreakdown(l)[3].detail}.` });
  };

  return (
    <div className="mx-auto max-w-3xl">
      <div className="relative -mx-4 md:mx-0">
        <ListingImage src={l.photos[photo]} alt={l.name} category={cat} className="h-72 w-full md:h-96 md:rounded-3xl" />
        <button onClick={() => router.history.back()} aria-label="Back" className="absolute left-4 top-4 grid h-11 w-11 place-items-center rounded-full bg-card/90 shadow-card">
          <ArrowLeft className="h-5 w-5" />
        </button>
        {l.photos.length > 1 && (
          <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-2">
            {l.photos.map((_, i) => (
              <button key={i} onClick={() => setPhoto(i)} aria-label={`Photo ${i + 1}`} className={cn("h-2 rounded-full transition-all", i === photo ? "w-6 bg-card" : "w-2 bg-card/60")} />
            ))}
          </div>
        )}
      </div>
      {l.photos.length > 1 && (
        <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto">
          {l.photos.map((p, i) => (
            <button key={p} onClick={() => setPhoto(i)} className={cn("shrink-0 overflow-hidden rounded-xl border-2", i === photo ? "border-primary" : "border-transparent")}>
              <ListingImage src={p} alt="" category={cat} className="h-16 w-20" />
            </button>
          ))}
        </div>
      )}

      <div className="mt-4 flex items-start gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <CategoryTag category={cat} />
            {l.verified && <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary"><BadgeCheck className="h-4 w-4" />Verified</span>}
            {l.vendor && <LiveBadge live={l.vendor.live} />}
          </div>
          <h1 className="mt-2 text-2xl font-extrabold leading-tight">{l.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">by {l.owner}</p>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1"><Star className="h-4 w-4 fill-star text-star" /><b className="text-foreground">{l.rating}</b> ({l.reviewCount} reviews)</span>
            <span className="inline-flex items-center gap-1"><MapPin className="h-4 w-4" />{formatKm(l.km)} away</span>
          </div>
        </div>
        <TrustRing score={l.score} size={72} />
      </div>

      <p className="mt-4 leading-relaxed">{l.description}</p>

      {l.vendor && (
        <Section title="Right now">
          <div className="grid grid-cols-2 gap-3">
            <Stat label="Status" value={l.vendor.live ? "Live now" : "Offline"} accent={l.vendor.live} />
            <Stat label="Last updated" value={formatAgo(l.vendor.lastUpdatedMins)} />
          </div>
          <h4 className="mt-4 text-sm font-semibold">What they sell</h4>
          <div className="mt-2 flex flex-wrap gap-2">{l.vendor.sells.map((s) => <span key={s} className="rounded-full bg-muted px-3 py-1.5 text-sm">{s}</span>)}</div>
        </Section>
      )}

      {l.tutor && (
        <>
          <Section title="Subjects">
            <div className="flex flex-wrap gap-2">{l.tutor.subjects.map((s) => <span key={s} className="rounded-full bg-primary-soft px-3 py-1.5 text-sm font-medium text-primary">{s}</span>)}</div>
            <p className="mt-3 text-sm"><b className="text-lg">₹{l.tutor.feePerClass}</b> <span className="text-muted-foreground">per class · first demo free</span></p>
          </Section>
          <Section title="Results & proof">
            <ul className="space-y-2">
              {l.tutor.outcomes.map((o) => (
                <li key={o} className="flex items-start gap-3 rounded-2xl bg-accent/60 p-3 text-sm text-accent-foreground"><Trophy className="mt-0.5 h-4 w-4 shrink-0" />{o}</li>
              ))}
            </ul>
          </Section>
        </>
      )}

      {l.resource && (
        <Section title="Item details">
          <div className="grid grid-cols-2 gap-3">
            <Stat label="Condition" value={l.resource.condition} />
            <Stat label="Rent" value={l.resource.rentPerDay === 0 ? "Free" : `₹${l.resource.rentPerDay}/day`} accent={l.resource.rentPerDay === 0} />
            <Stat label="Deposit" value={`₹${l.resource.deposit}`} />
            <Stat label="Pickup" value={l.resource.pickup} />
          </div>
        </Section>
      )}

      <Section title="Why this trust score?">
        <div className="space-y-4">
          {trustBreakdown(l).map((b) => (
            <div key={b.label}>
              <div className="mb-1.5 flex justify-between text-sm"><span className="font-medium">{b.label}</span><span className="text-muted-foreground">{b.detail}</span></div>
              <Progress value={b.value} className="h-2" />
            </div>
          ))}
        </div>
      </Section>

      <Section title="Availability">
        <p className="inline-flex items-center gap-2"><Clock className="h-4 w-4 text-primary" />{l.availability}</p>
      </Section>

      <Section title={`Reviews (${l.reviewCount})`}>
        <div className="space-y-3">
          {l.reviews.map((r) => (
            <div key={r.id} className="rounded-2xl border bg-card p-4">
              <div className="flex flex-wrap items-center gap-2">
                <b className="text-sm">{r.author}</b>
                {r.verifiedBooking && <span className="inline-flex items-center gap-1 rounded-full bg-primary-soft px-2 py-0.5 text-[11px] font-semibold text-primary"><ShieldCheck className="h-3 w-3" />Verified booking</span>}
                <span className="ml-auto text-xs text-muted-foreground">{r.date}</span>
              </div>
              <div className="mt-1 flex">{Array.from({ length: 5 }).map((_, i) => <Star key={i} className={cn("h-3.5 w-3.5", i < r.rating ? "fill-star text-star" : "text-muted")} />)}</div>
              <p className="mt-2 text-sm">{r.text}</p>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">Only neighbours with a completed booking can leave a review.</p>
      </Section>

      <div className="fixed inset-x-0 bottom-0 z-[1100] border-t bg-background/95 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          <div className="min-w-0 flex-1">
            {price ? <p className="truncate text-lg font-bold">{price}</p> : <p className="truncate text-sm font-semibold">{l.vendor?.live ? "Out on the street now" : `Last seen ${formatAgo(l.vendor?.lastUpdatedMins ?? 0)}`}</p>}
            <p className="truncate text-xs text-muted-foreground">{formatKm(l.km)} · trust {l.score}</p>
          </div>
          {cat === "vendor" ? (
            <Button asChild size="lg" className="h-14 rounded-2xl px-8 text-base"><a href={navigateUrl(l.lat, l.lng)} target="_blank" rel="noreferrer">Navigate</a></Button>
          ) : (
            <Button size="lg" className="h-14 rounded-2xl px-6 text-base" onClick={() => setOpen(true)}>{cat === "tutor" ? "Book a demo class" : "Request to borrow"}</Button>
          )}
        </div>
      </div>

      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent className="z-[1200]">
          <div className="mx-auto w-full max-w-md overflow-y-auto">
            <DrawerHeader>
              <DrawerTitle className="font-display text-xl">{cat === "tutor" ? "Book a demo class" : "Request to borrow"}</DrawerTitle>
              <DrawerDescription>{l.name}</DrawerDescription>
            </DrawerHeader>
            <div className="px-4">
              <p className="mb-2 inline-flex items-center gap-2 text-sm font-semibold"><CalendarDays className="h-4 w-4" />{cat === "tutor" ? "Pick a date" : "Pickup date"}</p>
              <Calendar mode="single" selected={date} onSelect={setDate} disabled={{ before: new Date() }} className="mx-auto rounded-2xl border" />
              {cat === "tutor" ? (
                <>
                  <p className="mb-2 mt-4 text-sm font-semibold">Pick a time</p>
                  <div className="grid grid-cols-3 gap-2">
                    {SLOTS.map((s) => (
                      <button key={s} onClick={() => setSlot(s)} className={cn("h-11 rounded-xl border text-sm font-medium", slot === s ? "border-primary bg-primary text-primary-foreground" : "bg-card")}>{s}</button>
                    ))}
                  </div>
                </>
              ) : (
                l.resource && (
                  <>
                    <p className="mb-2 mt-4 text-sm font-semibold">For how many days?</p>
                    <div className="flex items-center gap-3">
                      <Button variant="outline" size="icon" className="h-11 w-11 rounded-xl" onClick={() => setDays(Math.max(1, days - 1))}>−</Button>
                      <span className="w-8 text-center text-lg font-bold">{days}</span>
                      <Button variant="outline" size="icon" className="h-11 w-11 rounded-xl" onClick={() => setDays(days + 1)}>+</Button>
                      <span className="ml-auto text-sm text-muted-foreground">Total ₹{l.resource.rentPerDay * days} + ₹{l.resource.deposit} deposit</span>
                    </div>
                  </>
                )
              )}
            </div>
            <DrawerFooter>
              <Button size="lg" className="h-14 rounded-2xl text-base" disabled={!date || (cat === "tutor" && !slot)} onClick={confirm}>
                {cat === "tutor" ? "Confirm demo" : "Send request"}
              </Button>
              <Link to="/profile" className="text-center text-sm text-muted-foreground">View my bookings</Link>
            </DrawerFooter>
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-6 border-t pt-6">
      <h2 className="mb-3 text-lg font-bold">{title}</h2>
      {children}
    </section>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-2xl bg-muted p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn("mt-0.5 font-semibold", accent && "text-live")}>{value}</p>
    </div>
  );
}

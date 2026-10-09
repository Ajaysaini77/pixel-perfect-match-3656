import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, BookOpen, Camera, CheckCircle2, IdCard, Package, PartyPopper, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { NEIGHBOURHOOD, type Category, type Listing } from "@/lib/data";
import { setState, uid } from "@/lib/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/provider")({
  head: () => ({
    meta: [
      { title: "Become a provider — Padosi" },
      { name: "description", content: "List an item to lend, offer tutoring, or put your street stall on the Padosi map." },
      { property: "og:title", content: "Become a provider — Padosi" },
      { property: "og:description", content: "Lend, teach or sell to your neighbours on Padosi." },
    ],
  }),
  component: Provider,
});

const TYPES: { c: Category; title: string; sub: string; icon: typeof Package }[] = [
  { c: "resource", title: "Lend or rent an item", sub: "3D printer, drill, keyboard…", icon: Package },
  { c: "tutor", title: "Teach a skill", sub: "Maths, music, coding, yoga…", icon: BookOpen },
  { c: "vendor", title: "I'm a street vendor", sub: "Show customers where you are", icon: Store },
];

function Provider() {
  const [step, setStep] = useState(0);
  const [type, setType] = useState<Category>("tutor");
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [price, setPrice] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [idDoc, setIdDoc] = useState<string>();
  const [selfie, setSelfie] = useState<string>();

  const readFiles = (files: FileList | null, cb: (urls: string[]) => void) => {
    if (!files) return;
    cb(Array.from(files).map((f) => URL.createObjectURL(f)));
  };

  const publish = () => {
    const l: Listing = {
      id: `my-${uid()}`,
      category: type,
      name,
      owner: "You",
      photos,
      description: desc || "New on Padosi.",
      lat: NEIGHBOURHOOD.lat + 0.001,
      lng: NEIGHBOURHOOD.lng - 0.001,
      verified: true,
      rating: 0,
      reviewCount: 0,
      trust: { verifiedId: true, completedBookings: 0, repeatCustomers: 0, responseMins: 30 },
      availability: "Flexible",
      reviews: [],
      ...(type === "tutor" && { tutor: { subjects: [name], feePerClass: Number(price) || 0, outcomes: ["New tutor — results coming soon"] } }),
      ...(type === "resource" && { resource: { condition: "Good" as const, rentPerDay: Number(price) || 0, deposit: 500, pickup: NEIGHBOURHOOD.name } }),
      ...(type === "vendor" && { vendor: { sells: [desc || name], live: false, lastUpdatedMins: 0 } }),
    };
    // Blob photo URLs don't survive reloads; keep only for this session.
    setState((s) => ({ myListings: [...s.myListings, { ...l, photos: [] }] }));
    setStep(4);
  };

  const steps = ["Type", "Details", "Verify"];

  if (step === 4)
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center text-center">
        <span className="grid h-24 w-24 place-items-center rounded-full bg-primary-soft text-primary"><PartyPopper className="h-12 w-12" /></span>
        <h1 className="mt-6 text-3xl font-extrabold">You're live!</h1>
        <p className="mt-2 text-muted-foreground">Neighbours can now find “{name}”. Complete bookings and collect reviews to grow your trust score.</p>
        <div className="mt-8 w-full space-y-2">
          {type === "vendor" && <Button asChild size="lg" className="h-14 w-full rounded-2xl"><Link to="/vendor">Open vendor dashboard</Link></Button>}
          <Button asChild size="lg" variant={type === "vendor" ? "outline" : "default"} className="h-14 w-full rounded-2xl"><Link to="/profile">See my listings</Link></Button>
          <Button variant="ghost" className="h-12 w-full" onClick={() => { setStep(0); setName(""); setDesc(""); setPrice(""); setPhotos([]); setIdDoc(undefined); setSelfie(undefined); }}>Add another</Button>
        </div>
      </div>
    );

  return (
    <div className="mx-auto max-w-md">
      <div className="flex items-center gap-3">
        {step > 0 && <button onClick={() => setStep(step - 1)} aria-label="Back" className="grid h-11 w-11 place-items-center rounded-full bg-muted"><ArrowLeft className="h-5 w-5" /></button>}
        <h1 className="text-2xl font-extrabold">Become a provider</h1>
      </div>
      <div className="mt-4 flex gap-2">
        {steps.map((s, i) => (
          <div key={s} className="flex-1">
            <div className={cn("h-1.5 rounded-full", i <= step ? "bg-primary" : "bg-muted")} />
            <p className={cn("mt-1 text-xs", i === step ? "font-semibold text-foreground" : "text-muted-foreground")}>{s}</p>
          </div>
        ))}
      </div>

      {step === 0 && (
        <div className="mt-6 space-y-3">
          {TYPES.map(({ c, title, sub, icon: Icon }) => (
            <button key={c} onClick={() => setType(c)} className={cn("flex w-full items-center gap-4 rounded-2xl border-2 bg-card p-4 text-left", type === c ? "border-primary" : "border-transparent shadow-card")}>
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-primary-soft text-primary"><Icon className="h-6 w-6" /></span>
              <span className="min-w-0"><b className="block">{title}</b><span className="text-sm text-muted-foreground">{sub}</span></span>
            </button>
          ))}
          <Button size="lg" className="mt-4 h-14 w-full rounded-2xl text-base" onClick={() => setStep(1)}>Continue</Button>
        </div>
      )}

      {step === 1 && (
        <form className="mt-6 space-y-4" onSubmit={(e) => { e.preventDefault(); if (name.trim()) setStep(2); }}>
          <div className="space-y-2">
            <Label htmlFor="n">{type === "tutor" ? "What do you teach?" : type === "resource" ? "Item name" : "Stall name"}</Label>
            <Input id="n" value={name} onChange={(e) => setName(e.target.value)} className="h-12 rounded-xl" placeholder={type === "tutor" ? "Spoken English" : type === "resource" ? "Sewing machine" : "Anil's Fruit Cart"} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="d">{type === "vendor" ? "What do you sell?" : "Description"}</Label>
            <Textarea id="d" value={desc} onChange={(e) => setDesc(e.target.value)} className="min-h-24 rounded-xl" />
          </div>
          {type !== "vendor" && (
            <div className="space-y-2">
              <Label htmlFor="p">{type === "tutor" ? "Fee per class (₹)" : "Rent per day (₹, 0 = free)"}</Label>
              <Input id="p" inputMode="numeric" value={price} onChange={(e) => setPrice(e.target.value.replace(/\D/g, ""))} className="h-12 rounded-xl" />
            </div>
          )}
          <div className="space-y-2">
            <Label>Photos</Label>
            <div className="flex flex-wrap gap-2">
              {photos.map((p) => <img key={p} src={p} alt="" className="h-20 w-20 rounded-xl object-cover" />)}
              <label className="grid h-20 w-20 cursor-pointer place-items-center rounded-xl border-2 border-dashed text-muted-foreground">
                <Camera className="h-6 w-6" />
                <input type="file" accept="image/*" multiple className="sr-only" onChange={(e) => readFiles(e.target.files, (u) => setPhotos((p) => [...p, ...u]))} />
              </label>
            </div>
          </div>
          <Button type="submit" size="lg" disabled={!name.trim()} className="h-14 w-full rounded-2xl text-base">Continue</Button>
        </form>
      )}

      {step === 2 && (
        <div className="mt-6 space-y-4">
          <p className="text-sm text-muted-foreground">Verification earns you the Verified badge and +25 trust points. Your ID is never shown to others.</p>
          <UploadBox icon={IdCard} title="Government ID" sub="Aadhaar, PAN or driving licence" done={!!idDoc} onFile={(f) => setIdDoc(f)} />
          <UploadBox icon={Camera} title="A clear photo of you" sub="So neighbours know who to expect" done={!!selfie} onFile={(f) => setSelfie(f)} />
          <Button size="lg" disabled={!idDoc || !selfie} className="h-14 w-full rounded-2xl text-base" onClick={publish}>Submit & go live</Button>
        </div>
      )}
    </div>
  );
}

function UploadBox({ icon: Icon, title, sub, done, onFile }: { icon: typeof Camera; title: string; sub: string; done: boolean; onFile: (url: string) => void }) {
  return (
    <label className={cn("flex cursor-pointer items-center gap-4 rounded-2xl border-2 border-dashed bg-card p-4", done && "border-solid border-primary")}>
      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-muted">{done ? <CheckCircle2 className="h-6 w-6 text-primary" /> : <Icon className="h-6 w-6" />}</span>
      <span className="min-w-0 flex-1"><b className="block">{title}</b><span className="text-sm text-muted-foreground">{done ? "Uploaded" : sub}</span></span>
      <input type="file" accept="image/*" className="sr-only" onChange={(e) => e.target.files?.[0] && onFile(URL.createObjectURL(e.target.files[0]))} />
    </label>
  );
}

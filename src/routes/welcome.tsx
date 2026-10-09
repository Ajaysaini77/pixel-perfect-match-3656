import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { LocateFixed, MapPin } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { setState } from "@/lib/store";
import welcome from "@/assets/welcome.jpg";

export const Route = createFileRoute("/welcome")({
  head: () => ({
    meta: [
      { title: "Welcome to Padosi" },
      { name: "description", content: "Google shows who exists. Padosi shows who's actually good, right in your neighbourhood." },
      { property: "og:title", content: "Welcome to Padosi" },
      { property: "og:description", content: "Find trusted tutors, things to borrow and live vendors nearby." },
    ],
  }),
  component: Welcome,
});

function Welcome() {
  const nav = useNavigate();
  const [manual, setManual] = useState(false);
  const [area, setArea] = useState("");
  const [busy, setBusy] = useState(false);

  const done = (a: string) => {
    setState({ area: a, onboarded: true });
    nav({ to: "/login" });
  };

  const allow = () => {
    if (!navigator.geolocation) return setManual(true);
    setBusy(true);
    navigator.geolocation.getCurrentPosition(
      () => { setBusy(false); toast.success("Location found"); done("Green Park Colony"); },
      () => { setBusy(false); toast("Couldn't get location — enter your area instead"); setManual(true); },
      { timeout: 8000 },
    );
  };

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col px-6 pb-8 pt-6">
      <span className="font-display text-2xl font-extrabold text-primary">padosi</span>
      <img src={welcome} alt="Neighbours helping each other" className="mx-auto my-6 aspect-square w-full max-w-xs rounded-[2rem] object-cover" />
      <h1 className="text-3xl font-extrabold leading-tight">Google shows who exists.<br /><span className="text-primary">Padosi shows who's good.</span></h1>
      <p className="mt-3 text-muted-foreground">Tutors, things to borrow and live street vendors — ranked by real trust from your neighbours.</p>
      <div className="mt-auto space-y-3 pt-8">
        {!manual ? (
          <>
            <Button size="lg" className="h-14 w-full rounded-2xl text-base" onClick={allow} disabled={busy}>
              <LocateFixed className="h-5 w-5" /> {busy ? "Finding you…" : "Allow location"}
            </Button>
            <Button variant="ghost" size="lg" className="h-12 w-full rounded-2xl" onClick={() => setManual(true)}>
              Enter your area instead
            </Button>
          </>
        ) : (
          <form onSubmit={(e) => { e.preventDefault(); if (area.trim()) done(area.trim()); }} className="space-y-3">
            <div className="relative">
              <MapPin className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
              <Input autoFocus value={area} onChange={(e) => setArea(e.target.value)} placeholder="e.g. Green Park, Koramangala" className="h-14 rounded-2xl pl-12 text-base" />
            </div>
            <Button type="submit" size="lg" className="h-14 w-full rounded-2xl text-base" disabled={!area.trim()}>Continue</Button>
          </form>
        )}
      </div>
    </div>
  );
}

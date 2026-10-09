import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Camera, Star } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { setState, uid, useListings, useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/review/$bookingId")({
  head: () => ({
    meta: [
      { title: "Write a review — Padosi" },
      { name: "description", content: "Rate your completed booking to help neighbours." },
      { property: "og:title", content: "Write a review — Padosi" },
      { property: "og:description", content: "Rate your completed booking to help neighbours." },
    ],
  }),
  component: ReviewPage,
});

function ReviewPage() {
  const { bookingId } = Route.useParams();
  const nav = useNavigate();
  const booking = useStore((s) => s.bookings.find((b) => b.id === bookingId));
  const listings = useListings();
  const l = listings.find((x) => x.id === booking?.listingId);
  const [rating, setRating] = useState(0);
  const [text, setText] = useState("");
  const [photo, setPhoto] = useState<string>();

  if (!booking || !l || booking.status !== "completed" || booking.reviewed)
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <h1 className="text-2xl font-extrabold">Review not available</h1>
        <p className="mt-2 text-muted-foreground">You can review only after a completed booking, once.</p>
        <Button asChild className="mt-6 h-12 rounded-2xl"><Link to="/profile">My bookings</Link></Button>
      </div>
    );

  const submit = () => {
    setState((s) => ({
      reviews: [{ id: uid(), listingId: l.id, rating, text, photo, date: new Date().toISOString() }, ...s.reviews],
      bookings: s.bookings.map((b) => (b.id === bookingId ? { ...b, reviewed: true } : b)),
    }));
    toast.success("Thanks! Your review is tagged as a verified booking.");
    nav({ to: "/profile" });
  };

  return (
    <div className="mx-auto max-w-md space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">How was it?</p>
        <h1 className="text-2xl font-extrabold">{l.name}</h1>
      </div>
      <div className="flex justify-center gap-2">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} onClick={() => setRating(n)} aria-label={`${n} stars`} className="grid h-14 w-14 place-items-center">
            <Star className={cn("h-10 w-10", n <= rating ? "fill-star text-star" : "text-muted-foreground")} />
          </button>
        ))}
      </div>
      <Textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Tell your neighbours what was good (or not)…" className="min-h-32 rounded-2xl" />
      <label className="flex cursor-pointer items-center gap-3 rounded-2xl border-2 border-dashed p-4 text-sm text-muted-foreground">
        {photo ? <img src={photo} alt="" className="h-14 w-14 rounded-xl object-cover" /> : <Camera className="h-6 w-6" />}
        {photo ? "Photo added" : "Add a photo (optional)"}
        <input type="file" accept="image/*" className="sr-only" onChange={(e) => e.target.files?.[0] && setPhoto(URL.createObjectURL(e.target.files[0]))} />
      </label>
      <Button size="lg" disabled={!rating || text.trim().length < 3} onClick={submit} className="h-14 w-full rounded-2xl text-base">Post review</Button>
    </div>
  );
}

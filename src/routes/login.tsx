import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { setState } from "@/lib/store";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Log in — Padosi" },
      { name: "description", content: "Log in to Padosi with your phone number." },
      { property: "og:title", content: "Log in — Padosi" },
      { property: "og:description", content: "Log in to Padosi with your phone number." },
    ],
  }),
  component: Login,
});

function Login() {
  const nav = useNavigate();
  const [phone, setPhone] = useState("");
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [otp, setOtp] = useState("");
  const valid = /^\d{10}$/.test(phone);

  const verify = () => {
    // UI-only: any 6-digit code works.
    setState({ loggedIn: true, phone, onboarded: true });
    toast.success("You're in!");
    nav({ to: "/" });
  };

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col px-6 py-6">
      <button onClick={() => (step === "otp" ? setStep("phone") : nav({ to: "/welcome" }))} className="grid h-11 w-11 place-items-center rounded-full bg-muted" aria-label="Back">
        <ArrowLeft className="h-5 w-5" />
      </button>
      {step === "phone" ? (
        <form className="mt-8 flex flex-1 flex-col" onSubmit={(e) => { e.preventDefault(); if (valid) { setStep("otp"); toast("OTP sent (demo: any 6 digits)"); } }}>
          <h1 className="text-3xl font-extrabold">Your phone number</h1>
          <p className="mt-2 text-muted-foreground">We'll send a one-time code to verify it's you.</p>
          <div className="mt-8 flex gap-2">
            <div className="grid h-14 w-16 place-items-center rounded-2xl border bg-card font-semibold">+91</div>
            <Input inputMode="numeric" autoFocus value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))} placeholder="98765 43210" className="h-14 flex-1 rounded-2xl text-lg tracking-wide" />
          </div>
          <Button type="submit" size="lg" disabled={!valid} className="mt-auto h-14 rounded-2xl text-base">Send OTP</Button>
          <Button type="button" variant="ghost" className="mt-2 h-12" onClick={() => nav({ to: "/" })}>Skip for now</Button>
        </form>
      ) : (
        <div className="mt-8 flex flex-1 flex-col">
          <h1 className="text-3xl font-extrabold">Enter the code</h1>
          <p className="mt-2 text-muted-foreground">Sent to +91 {phone}</p>
          <div className="mt-8">
            <InputOTP maxLength={6} value={otp} onChange={setOtp} autoFocus>
              <InputOTPGroup>
                {[0, 1, 2, 3, 4, 5].map((i) => <InputOTPSlot key={i} index={i} className="h-14 w-12 text-lg" />)}
              </InputOTPGroup>
            </InputOTP>
          </div>
          <button className="mt-4 self-start text-sm font-semibold text-primary" onClick={() => toast("Code resent")}>Resend code</button>
          <Button size="lg" disabled={otp.length !== 6} onClick={verify} className="mt-auto h-14 rounded-2xl text-base">Verify & continue</Button>
        </div>
      )}
    </div>
  );
}

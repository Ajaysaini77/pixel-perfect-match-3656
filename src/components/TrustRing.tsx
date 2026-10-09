import { cn } from "@/lib/utils";

export function trustTone(score: number) {
  return score >= 70 ? "text-trust-high" : score >= 45 ? "text-trust-mid" : "text-trust-low";
}

export function TrustRing({ score, size = 44, className }: { score: number; size?: number; className?: string }) {
  const stroke = size > 60 ? 6 : 4;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className={cn("relative shrink-0", trustTone(score), className)} style={{ width: size, height: size }} aria-label={`Trust score ${score} out of 100`}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className="stroke-muted" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} stroke="currentColor" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - score / 100)} />
      </svg>
      <span className={cn("absolute inset-0 grid place-items-center font-display font-bold text-foreground", size > 60 ? "text-xl" : "text-xs")}>{score}</span>
    </div>
  );
}

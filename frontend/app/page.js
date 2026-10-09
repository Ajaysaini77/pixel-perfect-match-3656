"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, ArrowRight, BadgeCheck, Check, ChevronDown,
  Home, LocateFixed, Map as MapIcon, MapPin, MessageCircle, Moon, Plus,
  KeyRound, Lock, LogOut, Search, ShieldCheck, Star, Sun, UserRound, Wrench, X, Zap
} from "lucide-react";

const MapView = dynamic(() => import("../components/MapView"), { ssr: false });
const API = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

/* ---------- constants (data that used to be repeated inside JSX) ---------- */
const categoryMeta = {
  resource: { label: "Resources", icon: Wrench, tint: "#FFF1D6", color: "#A16207", desc: "Borrow, share, save" },
  vendor: { label: "Live vendors", icon: Zap, tint: "#FCE7D5", color: "#C2410C", desc: "Find what's open now" },
};
const EMPTY_FORM = { type: "resource", name: "", category: "", title: "", description: "", price: "" };
const TABS = [{ id: "home", label: "Home", icon: Home }, { id: "map", label: "Map", icon: MapIcon }, { id: "add", label: "Add", icon: Plus }, { id: "profile", label: "Profile", icon: UserRound }];
const LINKS = [["home", "Home"], ["map", "Map"], ["profile", "Profile"]];
const FILTERS = [["all", "For you"], ["resource", "Resources"], ["vendor", "Live vendors"]];
const RADII = [1, 2, 5];
const FIELDS = [["name", "Your name"], ["category", "Category"], ["title", "Listing title"], ["price", "Price / rate"]];
const TRUST_ROWS = [["ID verified", "idVerified"], ["Completed bookings", "completedBookings"], ["Repeat customers", "repeatCustomers"]];
const STATS = [["12", "Listings"], ["4.8★", "Rating"], ["3", "Requests"]];
const sub = "muted mt-1 text-sm text-slate-500";
const authFetch = (path, body) => fetch(`${API}/api/auth/${path}`, { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify(body) });

/* ---------- small components ---------- */
function TrustRing({ score = 0, size = 48 }) {
  const radius = 18, circumference = 2 * Math.PI * radius;
  return <div className="relative shrink-0" style={{ width: size, height: size }}>
    <svg viewBox="0 0 44 44" className="h-full w-full -rotate-90">
      <circle cx="22" cy="22" r={radius} fill="none" stroke="#E2E8F0" strokeWidth="4" />
      <circle cx="22" cy="22" r={radius} fill="none" stroke={score >= 85 ? "#0F9D8A" : score >= 70 ? "#F5A524" : "#94A3B8"} strokeWidth="4" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={circumference * (1 - score / 100)} />
    </svg>
    <span className="absolute inset-0 flex items-center justify-center text-xs font-bold">{score}</span>
  </div>;
}

function CategoryCard({ type, onClick }) {
  const meta = categoryMeta[type], Icon = meta.icon;
  return <button onClick={onClick} className="surface group flex min-h-[112px] items-center gap-3 rounded-2xl border border-slate-100 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-teal-200 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 sm:p-5">
    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl" style={{ background: meta.tint, color: meta.color }}><Icon size={22} /></span>
    <span><span className="block font-bold">{meta.label}</span><span className="muted mt-1 block text-xs text-slate-500">{meta.desc}</span></span>
  </button>;
}

function ListingCard({ item, onOpen, compact = false }) {
  const meta = categoryMeta[item.type] || categoryMeta.resource; // fallback: unknown types no longer crash the card
  return <button onClick={() => onOpen(item)} className={`surface group flex w-full gap-3 rounded-2xl border border-slate-100 bg-white p-3 text-left shadow-sm transition hover:shadow-md ${compact ? "min-w-[280px] max-w-[320px]" : ""}`}>
    <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-xl bg-slate-100 sm:h-32 sm:w-32">
      <img src={item.image} alt="" className="h-full w-full object-cover transition group-hover:scale-105" />
      {item.live && <span className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-white/95 px-2 py-1 text-[10px] font-bold text-amber-700 shadow"><span className="live-pulse h-2 w-2 rounded-full bg-amber-500" />LIVE NOW</span>}
    </div>
    <div className="min-w-0 flex-1 py-0.5">
      <div className="flex items-start justify-between gap-2"><span className="truncate text-sm font-bold sm:text-base">{item.name}</span><TrustRing score={item.trustScore} size={42} /></div>
      <p className="muted mt-1 truncate text-xs text-slate-500">{item.title}</p>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <span className="rounded-full px-2 py-1 text-[10px] font-semibold" style={{ background: meta.tint, color: meta.color }}>{item.category}</span>
        {item.verified && <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-semibold text-emerald-700"><BadgeCheck size={12} /> Verified</span>}
      </div>
      <div className="mt-2 flex items-center gap-3 text-xs text-slate-500"><span className="flex items-center gap-1"><Star size={13} className="fill-amber-400 text-amber-400" /><b className="text-slate-700">{item.rating || "New"}</b> <span>({item.reviewCount})</span></span><span className="flex items-center gap-1"><MapPin size={12} />{item.distanceKm} km</span></div>
    </div>
  </button>;
}

function BottomNav({ active, setActive, onAdd }) {
  return <nav className="surface fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t border-slate-200 bg-white/95 px-2 pb-[max(env(safe-area-inset-bottom),8px)] pt-2 backdrop-blur md:hidden">
    {TABS.map(({ id, label, icon: Icon }) => <button key={id} onClick={() => id === "add" ? onAdd() : setActive(id)} className={`flex min-h-12 flex-col items-center justify-center gap-1 text-[11px] font-semibold ${active === id ? "text-teal-700" : "text-slate-400"}`}><Icon size={20} />{label}</button>)}
  </nav>;
}

function ProgressRow({ label, value }) {
  return <div className="mb-3"><div className="mb-1 flex justify-between text-xs"><span className="muted text-slate-500">{label}</span><b>{value}%</b></div><div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-teal-600" style={{ width: `${value}%` }} /></div></div>;
}

const BackBtn = ({ onClick, label }) => <button onClick={onClick} className="mb-4 flex items-center gap-2 text-sm font-bold text-teal-700"><ArrowLeft size={17} /> {label}</button>;

/* ---------- page ---------- */
export default function Page() {
  const router = useRouter();
  const resultsRef = useRef(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState("home");
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const [radius, setRadius] = useState(2);
  const [dark, setDark] = useState(false);
  const [step, setStep] = useState(1);
  const [form, setForm] = useState(EMPTY_FORM);
  const [success, setSuccess] = useState(false);
  const [toast, setToast] = useState("");
  const [user, setUser] = useState(null);
  const [auth, setAuth] = useState({ mode: "login", step: "creds", email: "", password: "", otp: "", error: "", busy: false, wait: 0 });

  useEffect(() => { document.documentElement.classList.toggle("dark", dark); }, [dark]);

  useEffect(() => { // restore session from the httpOnly cookie
    fetch(`${API}/api/auth/me`, { credentials: "include" }).then(r => r.ok ? r.json() : null).then(d => d && setUser(d)).catch(() => {});
  }, []);

  useEffect(() => { // resend countdown
    if (auth.wait <= 0) return;
    const t = setTimeout(() => setAuth(a => ({ ...a, wait: a.wait - 1 })), 1000);
    return () => clearTimeout(t);
  }, [auth.wait]);

  useEffect(() => {
    fetch(`${API}/api/listings`)
      .then(r => { if (!r.ok) throw new Error("API unavailable"); return r.json(); })
      .then(data => setItems(data.items || []))
      .catch(() => setToast("Can't reach FastAPI yet. Start the backend on port 8000."))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return items.filter(item => {
      const matchesFilter = filter === "all" || item.type === filter;
      const matchesRadius = item.distanceKm <= radius;
      const searchableText = `${item.name} ${item.category} ${item.title} ${item.description} ${item.price}`.toLowerCase();
      return matchesFilter && matchesRadius && (!query || searchableText.includes(query));
    });
  }, [items, filter, radius, search]);
  const submitSearch = event => {
    event.preventDefault();
    setFilter("all");
    setRadius(5);
    setActive("home");
    requestAnimationFrame(() => resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };
  const clearSearch = () => setSearch("");
  const openListing = item => { setSelected(item); setActive("detail"); };
  const nav = page => { setSelected(null); setActive(page); };
  const openAdd = () => { setStep(1); setSuccess(false); nav("add"); };
  const notify = message => { setToast(message); setTimeout(() => setToast(""), 3000); };
  const setField = key => e => setForm(f => ({ ...f, [key]: e.target.value }));

  const patchAuth = p => setAuth(a => ({ ...a, ...p }));
  async function authCall(path, body, onOk) {
    patchAuth({ busy: true, error: "" });
    try {
      const r = await authFetch(path, body);
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(typeof data.detail === "string" ? data.detail : "Check your details and try again.");
      onOk(data);
    } catch (e) { patchAuth({ error: e.message === "Failed to fetch" ? "Can't reach the server. Is FastAPI running?" : e.message }); }
    finally { patchAuth({ busy: false }); }
  }
  const submitCreds = e => { e.preventDefault(); authCall(auth.mode, { email: auth.email, password: auth.password }, () => patchAuth({ step: "otp", otp: "", wait: 30 })); };
  const submitOtp = e => { e.preventDefault(); authCall("verify-otp", { email: auth.email, otp: auth.otp }, d => { setUser(d); patchAuth({ step: "creds", password: "", otp: "" }); nav("profile"); notify("Signed in"); }); };
  const resendOtp = () => authCall("resend-otp", { email: auth.email }, () => patchAuth({ wait: 30 }));
  const logout = async () => { await fetch(`${API}/api/auth/logout`, { method: "POST", credentials: "include" }).catch(() => {}); setUser(null); nav("home"); notify("Signed out"); };

  async function submitListing() {
    try {
      const response = await fetch(`${API}/api/listings`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      if (!response.ok) throw new Error();
      const data = await response.json();
      setItems(prev => [data.item, ...prev]);
      setSuccess(true);
    } catch { notify("Could not submit. Check that FastAPI is running."); }
  }

  const topbar = <header className="surface sticky top-0 z-20 border-b border-slate-100 bg-white/90 backdrop-blur">
    <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
      <button onClick={() => nav("home")} className="flex items-center gap-2"><span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-teal-600 text-white"><MapPin size={22} /></span><span className="text-xl font-black tracking-tight">Padosi<span className="text-teal-600">.</span><span className="muted ml-2 hidden text-xs font-medium text-slate-400 sm:inline">Good things live nearby</span></span></button>
      <div className="hidden items-center gap-1 md:flex">
        {LINKS.map(([id, label]) => <button key={id} onClick={() => nav(id)} className={`rounded-full px-4 py-2 text-sm font-semibold ${active === id ? "bg-teal-50 text-teal-700" : "text-slate-500 hover:bg-slate-50"}`}>{label}</button>)}
        <button onClick={openAdd} className="ml-2 flex items-center gap-2 rounded-full bg-teal-600 px-4 py-2 text-sm font-bold text-white hover:bg-teal-700"><Plus size={16} /> Add listing</button>
      </div>
      <div className="flex items-center gap-2">
        <button aria-label={user ? "Account" : "Sign in"} onClick={() => nav(user ? "profile" : "login")} className="flex h-10 items-center gap-2 rounded-full bg-teal-600 px-3 text-sm font-bold text-white hover:bg-teal-700 sm:px-4">{user ? <UserRound size={16} /> : <Lock size={16} />}<span className="hidden sm:inline">{user ? "Account" : "Sign in"}</span></button>
        <button aria-label="Toggle dark mode" onClick={() => setDark(v => !v)} className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-700">{dark ? <Sun size={18} /> : <Moon size={18} />}</button>
      </div>
    </div>
  </header>;

  const home = <>
    <section className="rounded-3xl bg-gradient-to-br from-teal-800 to-teal-600 p-5 text-white shadow-sm sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-teal-100">Your neighbourhood, made useful</p>
          <h1 className="mt-2 max-w-xl text-3xl font-black leading-tight sm:text-4xl">Find good things nearby.</h1>
          <p className="mt-2 max-w-lg text-sm leading-6 text-teal-50">Discover useful items and local businesses around you.</p>
        </div>
        <button onClick={() => nav("map")} className="flex items-center gap-2 rounded-full bg-white/15 px-3 py-2 text-xs font-bold text-white transition hover:bg-white/25"><LocateFixed size={15} /> Meerut <ChevronDown size={14} /></button>
      </div>
      <form onSubmit={submitSearch} role="search" className="mt-5 flex min-h-12 items-center gap-3 rounded-2xl bg-white px-4 text-slate-500 shadow-sm focus-within:ring-2 focus-within:ring-teal-200">
        <Search size={19} aria-hidden="true" />
        <input aria-label="Search nearby listings" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search items, services, or vendors" className="min-w-0 flex-1 bg-transparent py-3 text-sm text-slate-800 outline-none placeholder:text-slate-400" />
        {search && <button type="button" aria-label="Clear search" onClick={clearSearch} className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><X size={17} /></button>}
        <button type="submit" className="rounded-xl bg-teal-700 px-4 py-2 text-sm font-bold text-white transition hover:bg-teal-800">Search</button>
      </form>
    </section>
    <section className="mt-7">
      <div className="mb-3 flex items-end justify-between gap-3"><div><h2 className="text-xl font-black">Explore nearby</h2><p className={sub}>Choose a category to get started.</p></div><button onClick={() => router.push("/resources")} className="shrink-0 text-sm font-bold text-teal-700 hover:text-teal-900">All resources <ArrowRight size={15} className="inline" /></button></div>
      <div className="grid grid-cols-2 gap-3 sm:max-w-xl">{Object.keys(categoryMeta).map(type => <CategoryCard key={type} type={type} onClick={() => {
        if (type === "resource") {
          router.push("/resources");
          return;
        }
        setFilter(type);
        setActive("home");
        requestAnimationFrame(() => resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
      }} />)}</div>
    </section>
    <section ref={resultsRef} className="mt-8 scroll-mt-24">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-xl font-black">{search.trim() ? "Search results" : "Near you"}</h2><p className={sub}>{filtered.length} {filtered.length === 1 ? "listing" : "listings"} {search.trim() ? `for “${search.trim()}”` : "to discover"}</p></div><button onClick={() => { setFilter("all"); setRadius(5); setSearch(""); }} className="text-sm font-bold text-teal-700 hover:text-teal-900">See all <ArrowRight size={15} className="inline" /></button></div>
      <div className="mb-4 flex gap-2 overflow-x-auto pb-1">{FILTERS.map(([id, label]) => <button key={id} onClick={() => setFilter(id)} className={`shrink-0 rounded-full px-4 py-2 text-xs font-bold transition ${filter === id ? "bg-teal-700 text-white" : "surface border border-slate-200 bg-white text-slate-600 hover:border-teal-200 hover:text-teal-700"}`}>{label}</button>)}</div>
      <div className="grid gap-3 md:grid-cols-2">
        {filtered.map(item => <ListingCard key={item.id} item={item} onOpen={openListing} />)}
        {!loading && !filtered.length && <div className="surface col-span-full rounded-2xl bg-white p-8 text-center"><Search className="mx-auto text-slate-400" /><p className="mt-2 font-bold">{search.trim() ? "No results found" : "No matches nearby"}</p><p className="muted mt-1 text-sm text-slate-500">{search.trim() ? "Try another keyword or browse all listings." : "Try increasing your search area."}</p><button className="mt-3 text-sm font-bold text-teal-700" onClick={() => { setFilter("all"); setSearch(""); setRadius(5); }}>Clear filters</button></div>}
      </div>
    </section>
  </>;




  const mapPage = <section>
    <div className="mb-4 flex items-center justify-between"><div><h1 className="text-2xl font-black">Explore the map</h1><p className={sub}>Find your next neighbourhood discovery.</p></div><button onClick={() => notify("Using demo location: Meerut")} className="rounded-full bg-teal-50 px-3 py-2 text-xs font-bold text-teal-700"><LocateFixed size={14} className="mr-1 inline" /> Recenter</button></div>
    <div className="mb-4 flex gap-2">{RADII.map(r => <button key={r} onClick={() => setRadius(r)} className={`rounded-full px-4 py-2 text-sm font-bold ${radius === r ? "bg-teal-700 text-white" : "surface border border-slate-200 bg-white"}`}>{r} km</button>)}</div>
    <div className="surface relative h-[65vh] min-h-[430px] overflow-hidden rounded-3xl border border-slate-100 bg-white p-2 shadow-sm">
      <MapView items={filtered} selected={selected} onSelect={setSelected} />
      {selected && <div className="absolute bottom-3 left-3 right-3 z-[500]"><div className="surface rounded-2xl bg-white p-3 shadow-xl">
        <div className="flex items-center justify-between"><span className="text-xs font-bold text-teal-700">SELECTED NEARBY</span><button onClick={() => setSelected(null)}><X size={17} /></button></div>
        <div className="mt-2"><ListingCard item={selected} onOpen={openListing} compact /></div>
        <button onClick={() => openListing(selected)} className="mt-3 w-full rounded-xl bg-teal-600 py-3 text-sm font-bold text-white">View details</button>
      </div></div>}
    </div>
    <p className="muted mt-3 text-xs text-slate-500">Map tiles © OpenStreetMap contributors. Pins show demo locations.</p>
  </section>;




  const detail = selected && <section className="mx-auto max-w-3xl">
    <BackBtn onClick={() => nav("home")} label="Back to discovery" />
    <div className="surface overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm">
      <div className="relative h-64 sm:h-80"><img src={selected.image} alt="" className="h-full w-full object-cover" /><span className="absolute bottom-4 left-4 rounded-full bg-white px-3 py-1.5 text-xs font-bold">{selected.category}</span>{selected.live && <span className="absolute right-4 top-4 rounded-full bg-amber-400 px-3 py-1.5 text-xs font-black text-amber-950">● LIVE NOW</span>}</div>
      <div className="p-5 sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <div><h1 className="text-2xl font-black">{selected.name}</h1><p className={sub}>{selected.title}</p>
            <div className="mt-2 flex flex-wrap gap-2">{selected.verified && <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700"><BadgeCheck size={13} className="mr-1 inline" />Verified</span>}<span className="text-xs text-slate-500"><Star size={13} className="mr-1 inline fill-amber-400 text-amber-400" />{selected.rating} ({selected.reviewCount} reviews)</span></div>
          </div>
          <TrustRing score={selected.trustScore} size={64} />
        </div>
        <p className="mt-5 leading-7 text-slate-600">{selected.description}</p>
        <div className="mt-5 rounded-2xl bg-teal-50 p-4">
          <div className="flex items-center justify-between"><h3 className="font-bold text-teal-950">Trust & reliability</h3><span className="text-xl font-black text-teal-700">{selected.trustScore}/100</span></div>
          <div className="mt-4">{TRUST_ROWS.map(([label, key]) => <ProgressRow key={key} label={label} value={selected.trustBreakdown?.[key] || 0} />)}</div>
        </div>
        <h3 className="mt-7 text-lg font-black">Neighbour reviews</h3>
        <div className="mt-3 space-y-3">{(selected.reviews || []).map((review, i) => <div key={i} className="rounded-2xl bg-slate-50 p-4">
          <div className="flex items-center justify-between"><b className="text-sm">{review.name}</b><span className="text-xs text-amber-600">{"★".repeat(review.rating)}</span></div>
          <p className="muted mt-2 text-sm text-slate-600">{review.text}</p>
          {review.verifiedBooking && <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-700"><ShieldCheck size={12} />Verified booking</span>}
        </div>)}</div>
        <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-5"><div><p className="text-xs text-slate-500">Starting at</p><p className="text-xl font-black">{selected.price}</p></div><span className="flex items-center gap-1 text-sm text-slate-500"><MapPin size={15} />{selected.distanceKm} km away</span></div>
      </div>
    </div>
    <div className="surface fixed inset-x-0 bottom-0 z-20 flex items-center gap-3 border-t border-slate-200 bg-white p-3 md:sticky md:mt-4 md:rounded-2xl md:border">
      <button onClick={() => notify("Demo chat opened — messaging is not connected yet.")} className="flex h-12 w-12 items-center justify-center rounded-xl border border-slate-200"><MessageCircle size={20} /></button>
      <button onClick={() => notify(selected.type === "tutor" ? "Demo request sent!" : "Request noted for demo.")} className="flex-1 rounded-xl bg-teal-600 py-3.5 text-sm font-bold text-white">{selected.type === "resource" ? "Request to borrow" : "Navigate to vendor"}</button>
    </div>
  </section>;



  const input = "mt-1.5 w-full rounded-xl border border-slate-200 bg-transparent px-3 py-3 outline-none focus:border-teal-500";
  const addPage = <section className="mx-auto max-w-2xl">
    <BackBtn onClick={() => nav("home")} label="Back" />
    {success ? <div className="surface rounded-3xl border border-slate-100 bg-white p-8 text-center shadow-sm">
      <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 text-emerald-700"><Check size={38} /></div>
      <h1 className="mt-5 text-2xl font-black">You're live in the demo!</h1>
      <p className="muted mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500">Your listing was accepted by the mock API. It isn't saved permanently yet.</p>
      <button onClick={() => { setSuccess(false); setStep(1); setForm(EMPTY_FORM); nav("home"); }} className="mt-6 rounded-xl bg-teal-600 px-6 py-3 font-bold text-white">Explore Padosi</button>
    </div> : <div className="surface rounded-3xl border border-slate-100 bg-white p-5 shadow-sm sm:p-8">
      <div className="flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-widest text-teal-700">Share with your neighbourhood</p><h1 className="mt-2 text-2xl font-black">Add a listing</h1></div><span className="rounded-full bg-teal-50 px-3 py-2 text-xs font-bold text-teal-700">Step {step} of 3</span></div>
      <div className="mt-5 flex gap-2">{[1, 2, 3].map(n => <div key={n} className={`h-1.5 flex-1 rounded-full ${step >= n ? "bg-teal-600" : "bg-slate-100"}`} />)}</div>

      {step === 1 && <div className="mt-7"><h2 className="font-bold">What would you like to share?</h2>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">{Object.entries(categoryMeta).map(([type, m]) => { const Icon = m.icon; return <button key={type} onClick={() => setForm(f => ({ ...f, type }))} className={`rounded-2xl border p-4 text-left ${form.type === type ? "border-teal-500 bg-teal-50" : "border-slate-200"}`}><Icon size={24} style={{ color: m.color }} /><b className="mt-3 block">{m.label}</b><span className="muted mt-1 block text-xs text-slate-500">{m.desc}</span></button>; })}</div>
        <button onClick={() => setStep(2)} className="mt-6 w-full rounded-xl bg-teal-600 py-3.5 font-bold text-white">Continue <ArrowRight size={16} className="ml-1 inline" /></button>
      </div>}

      {step === 2 && <div className="mt-7 space-y-4"><h2 className="font-bold">Tell neighbours about it</h2>
        {FIELDS.map(([key, label]) => <label key={key} className="block text-sm font-semibold">{label}<input value={form[key]} onChange={setField(key)} className={input} placeholder={label} /></label>)}
        <label className="block text-sm font-semibold">Description<textarea value={form.description} onChange={setField("description")} rows={3} className={input} placeholder="What should people know?" /></label>
        <div className="rounded-xl border border-dashed border-slate-300 p-4 text-center"><Plus className="mx-auto text-slate-400" /><p className="mt-1 text-xs text-slate-500">Photo picker UI demo — upload not connected</p></div>
        <div className="flex gap-3"><button onClick={() => setStep(1)} className="flex-1 rounded-xl border border-slate-200 py-3 font-bold">Back</button><button disabled={!form.name || !form.category || !form.title || !form.description || !form.price} onClick={() => setStep(3)} className="flex-1 rounded-xl bg-teal-600 py-3 font-bold text-white disabled:opacity-40">Continue</button></div>
      </div>}

      {step === 3 && <div className="mt-7">
        <div className="rounded-2xl bg-teal-50 p-5"><ShieldCheck size={28} className="text-teal-700" /><h2 className="mt-3 font-bold text-teal-950">Build trust with verification</h2><p className="mt-2 text-sm leading-6 text-teal-900">This demo shows the verification step only. Don't upload sensitive identity documents; secure verification isn't configured.</p><button onClick={() => notify("Verification is a UI-only demo.")} className="mt-4 w-full rounded-xl border border-teal-200 bg-white py-3 font-bold text-teal-800">Choose document (demo)</button></div>
        <div className="mt-5 flex gap-3"><button onClick={() => setStep(2)} className="flex-1 rounded-xl border border-slate-200 py-3 font-bold">Back</button><button onClick={submitListing} className="flex-1 rounded-xl bg-teal-600 py-3 font-bold text-white">Publish listing</button></div>
      </div>}
    </div>}
  </section>;

  const authError = auth.error && <p role="alert" className="text-sm font-semibold text-red-600">{auth.error}</p>;
  const loginPage = <section className="mx-auto max-w-md"><div className="surface rounded-3xl border border-slate-100 bg-white p-6 shadow-sm sm:p-8">
    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-100 text-teal-700">{auth.step === "otp" ? <KeyRound size={26} /> : <Lock size={26} />}</div>
    <h1 className="mt-4 text-2xl font-black">{auth.step === "otp" ? "Check your email" : auth.mode === "login" ? "Welcome back" : "Create your account"}</h1>
    <p className={sub}>{auth.step === "otp" ? `We sent a 6-digit code to ${auth.email}. It expires in 5 minutes.` : "Sign in to share things with your neighbours."}</p>
    {auth.step === "creds" ? <>
      <div className="mt-5 grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1">{[["login", "Sign in"], ["register", "Create account"]].map(([m, l]) => <button key={m} type="button" onClick={() => patchAuth({ mode: m, error: "" })} className={`rounded-lg py-2 text-sm font-bold ${auth.mode === m ? "surface bg-white text-teal-700 shadow-sm" : "text-slate-500"}`}>{l}</button>)}</div>
      <form onSubmit={submitCreds} className="mt-5 space-y-4">
        <label className="block text-sm font-semibold">Email<input type="email" required autoComplete="email" value={auth.email} onChange={e => patchAuth({ email: e.target.value })} className={input} placeholder="you@example.com" /></label>
        <label className="block text-sm font-semibold">Password<input type="password" required minLength={8} maxLength={72} autoComplete={auth.mode === "login" ? "current-password" : "new-password"} value={auth.password} onChange={e => patchAuth({ password: e.target.value })} className={input} placeholder="At least 8 characters" /></label>
        {authError}
        <button disabled={auth.busy} className="w-full rounded-xl bg-teal-600 py-3.5 font-bold text-white disabled:opacity-40">{auth.busy ? "Please wait…" : auth.mode === "login" ? "Send me a code" : "Create account and send code"}</button>
      </form>
    </> : <form onSubmit={submitOtp} className="mt-5 space-y-4">
      <input value={auth.otp} onChange={e => patchAuth({ otp: e.target.value.replace(/\D/g, "").slice(0, 6) })} inputMode="numeric" autoComplete="one-time-code" aria-label="6-digit code" placeholder="000000" className={`${input} text-center text-2xl font-black tracking-[0.5em]`} />
      {authError}
      <button disabled={auth.busy || auth.otp.length !== 6} className="w-full rounded-xl bg-teal-600 py-3.5 font-bold text-white disabled:opacity-40">{auth.busy ? "Checking…" : "Verify and continue"}</button>
      <div className="flex items-center justify-between text-sm"><button type="button" onClick={() => patchAuth({ step: "creds", error: "" })} className="font-bold text-slate-500">Change email</button><button type="button" disabled={auth.wait > 0 || auth.busy} onClick={resendOtp} className="font-bold text-teal-700 disabled:opacity-40">{auth.wait > 0 ? `Resend in ${auth.wait}s` : "Resend code"}</button></div>
    </form>}
  </div></section>;

  const profile = <section className="mx-auto max-w-xl"><div className="surface rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
    <div className="flex items-center gap-4"><div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-teal-100 text-teal-700"><UserRound size={30} /></div><div><h1 className="text-2xl font-black">Your Padosi profile</h1><p className={sub}>{user?.email || "Neighbourhood member · Demo account"}</p>{user && <p className="mt-1 text-xs text-slate-500">Member ID: {user.id}</p>}</div></div>
    <div className="mt-6 grid grid-cols-3 gap-3">{STATS.map(([v, l]) => <div key={l} className="rounded-2xl bg-slate-50 p-4 text-center"><b className="text-xl">{v}</b><span className="muted mt-1 block text-xs text-slate-500">{l}</span></div>)}</div>
    
 {/* Profile Editin */}
    <button onClick={() => notify("Profile editing isn't connected in this demo.")} className="mt-5 w-full rounded-xl border border-slate-200 py-3 font-bold">Edit profile</button>
    {user ? <button onClick={logout} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 py-3 font-bold"><LogOut size={17} /> Sign out</button> : <button onClick={() => nav("login")} className="mt-3 w-full rounded-xl bg-teal-600 py-3 font-bold text-white">Sign in or create account</button>}
    <button onClick={() => setDark(v => !v)} className="mt-3 flex w-full items-center justify-between rounded-xl border border-slate-200 p-3 font-semibold"><span className="flex items-center gap-2">{dark ? <Sun size={18} /> : <Moon size={18} />} Appearance</span><span className="text-xs text-slate-500">{dark ? "Dark mode" : "Light mode"}</span></button>
  </div></section>;

  const views = { home, map: mapPage, detail, add: addPage, profile, login: loginPage };

  return <main className="min-h-screen pb-24 md:pb-8">
    {topbar}
    <div className="mx-auto max-w-6xl px-4 py-5 sm:px-6 sm:py-8">{views[active]}</div>
    <BottomNav active={active} setActive={nav} onAdd={openAdd} />
    {toast && <div role="status" className="fixed bottom-24 left-1/2 z-[1000] -translate-x-1/2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-xl md:bottom-6">{toast}</div>}
    {loading && <div className="fixed bottom-24 right-4 z-20 rounded-full bg-white px-3 py-2 text-xs text-slate-500 shadow md:bottom-5">Connecting to Padosi API…</div>}
  </main>;
}
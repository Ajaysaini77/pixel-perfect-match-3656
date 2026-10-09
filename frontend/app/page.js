"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import {
  ArrowLeft, ArrowRight, BadgeCheck, Check, ChevronDown, Camera,
  Eye, EyeOff, ExternalLink, Globe2, Home, LocateFixed, Map as MapIcon, MapPin,
  MessageCircle, Moon, Navigation, Plus, KeyRound, Lock, LogOut, Search,
  ShieldCheck, Star, Sun, UserRound, Wrench, X, Zap
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
const RESOURCE_CATEGORIES = [
  "Infrastructure",
  "Consumables",
  "Human & skills",
  "Commercials",
  "Tools & equipment",
  "Transport & logistics",
  "Spaces & venues",
  "Digital & connectivity",
  "Books & study",
  "Health & wellbeing",
  "Home & community",
  "Recreation & events",
  "Creative & repair skills",
  "Other",
];
const SEARCH_DICTIONARY = [
  "3D printer", "accommodation", "amenities", "books", "caregiver", "carpenter",
  "cleaning", "community hall", "computer", "coworking", "electrician", "equipment",
  "event space", "farmers market", "fitness", "food", "garden", "groceries",
  "hardware", "health", "home repair", "internet", "ladder", "laptop", "library",
  "market", "mechanic", "medical", "meeting room", "music", "parking", "pharmacy",
  "plumber", "printing", "restaurant", "sewing", "sports", "study", "tailor",
  "tiffin", "tools", "tutor", "vegetables", "venue", "wifi", "yoga",
];
const CITY_CENTERS = {
  Meerut: { lat: 28.9845, lng: 77.7064 },
  Delhi: { lat: 28.6139, lng: 77.209 },
};
const RADII = [1, 2, 5];
const FIELDS = [["name", "Your name"], ["category", "Category"], ["title", "Listing title"], ["price", "Price / rate"]];
const TRUST_ROWS = [["ID verified", "idVerified"], ["Completed bookings", "completedBookings"], ["Repeat customers", "repeatCustomers"]];
const STATS = [["12", "Listings"], ["4.8★", "Rating"], ["3", "Requests"]];
const sub = "muted mt-1 text-sm text-slate-500";
const authFetch = (path, body) => fetch(`${API}/api/auth/${path}`, { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify(body) });

function parseCsvRecords(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;
  const source = text.replace(/^\uFEFF/, "");

  for (let i = 0; i < source.length; i += 1) {
    const char = source[i];
    if (quoted) {
      if (char === '"' && source[i + 1] === '"') {
        cell += '"';
        i += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        cell += char;
      }
    } else if (char === '"' && cell.length === 0) {
      quoted = true;
    } else if (char === ",") {
      row.push(cell);
      cell = "";
    } else if (char === "\n") {
      row.push(cell.replace(/\r$/, ""));
      rows.push(row);
      row = [];
      cell = "";
    } else if (char !== "\r") {
      cell += char;
    }
  }

  if (row.length || cell.length) {
    row.push(cell.replace(/\r$/, ""));
    rows.push(row);
  }

  const [headers, ...records] = rows;
  const required = ["Facility_ID", "City_Name", "Latitude", "Longitude"];
  if (!headers || required.some(header => !headers.includes(header))) {
    throw new Error("Facility CSV is missing required columns.");
  }

  return records
    .filter(values => values.some(value => value.trim()))
    .map(values => Object.fromEntries(headers.map((header, index) => [header, values[index] || ""])));
}

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
  const resultsRef = useRef(null);
  const profileImageInput = useRef(null);
  const vendorWatchRef = useRef(null);
  const [items, setItems] = useState([]);
  const [facilities, setFacilities] = useState([]);
  const [facilitiesLoading, setFacilitiesLoading] = useState(true);
  const [facilitiesError, setFacilitiesError] = useState("");
  const [onlinePlaces, setOnlinePlaces] = useState([]);
  const [onlinePlacesLoading, setOnlinePlacesLoading] = useState(false);
  const [onlinePlacesError, setOnlinePlacesError] = useState("");
  const [onlinePlacesLoaded, setOnlinePlacesLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState("home");
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [selected, setSelected] = useState(null);
  const [radius, setRadius] = useState(2);
  const [mapCity, setMapCity] = useState("Meerut");
  const [mapSearch, setMapSearch] = useState("");
  const [selectedFacility, setSelectedFacility] = useState(null);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [focusLocation, setFocusLocation] = useState(null);
  const [dark, setDark] = useState(false);
  const [step, setStep] = useState(1);
  const [form, setForm] = useState(EMPTY_FORM);
  const [shareVendorLocation, setShareVendorLocation] = useState(false);
  const [trackingVendorIds, setTrackingVendorIds] = useState([]);
  const [profileEditing, setProfileEditing] = useState(false);
  const [profileForm, setProfileForm] = useState({ name: "", username: "", image: "" });
  const [profileSaved, setProfileSaved] = useState(false);
  const [profileImageError, setProfileImageError] = useState("");
  const [recoveryEmail, setRecoveryEmail] = useState("");
  const [success, setSuccess] = useState(false);
  const [toast, setToast] = useState("");
  const [user, setUser] = useState(null);
  const [auth, setAuth] = useState({ mode: "login", step: "creds", email: "", password: "", passwordConfirm: "", otp: "", error: "", notice: "", busy: false, wait: 0 });
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => { document.documentElement.classList.toggle("dark", dark); }, [dark]);

  useEffect(() => {
    const initialQuery = new URLSearchParams(window.location.search).get("q");
    if (initialQuery) {
      setSearch(initialQuery);
      setRadius(5);
    }
  }, []);

  useEffect(() => {
    try {
      const savedProfile = JSON.parse(localStorage.getItem("padosi-profile") || "{}");
      setProfileForm({
        name: typeof savedProfile.name === "string" ? savedProfile.name : "",
        username: typeof savedProfile.username === "string" ? savedProfile.username : "",
        image: typeof savedProfile.image === "string" ? savedProfile.image : "",
      });
    } catch {
      localStorage.removeItem("padosi-profile");
    }
  }, []);

  useEffect(() => {
    if (!trackingVendorIds.length || !navigator.geolocation) return undefined;

    const watchId = navigator.geolocation.watchPosition(
      ({ coords }) => {
        if (document.visibilityState !== "visible") return;
        const trackedIds = new Set(trackingVendorIds);
        const updateLocation = item => trackedIds.has(item.id)
          ? { ...item, lat: coords.latitude, lng: coords.longitude, live: true }
          : item;
        setItems(current => current.map(updateLocation));
        setSelected(current => current ? updateLocation(current) : current);
      },
      () => notify("Live vendor location access ended. The last shared position remains on this device."),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
    );
    vendorWatchRef.current = watchId;

    return () => {
      navigator.geolocation.clearWatch(watchId);
      vendorWatchRef.current = null;
    };
  }, [trackingVendorIds]);

  useEffect(() => () => {
    if (vendorWatchRef.current !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(vendorWatchRef.current);
    }
  }, []);

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

  useEffect(() => {
    const controller = new AbortController();
    fetch("/city_facilities_available_dates.csv", { signal: controller.signal })
      .then(response => {
        if (!response.ok) throw new Error(`CSV request failed (${response.status}).`);
        return response.text();
      })
      .then(csv => {
        const parsed = parseCsvRecords(csv)
          .map(record => {
            const lat = Number(record.Latitude);
            const lng = Number(record.Longitude);
            if (!record.Facility_ID || !record.City_Name || !Number.isFinite(lat) || !Number.isFinite(lng)) return null;

            return {
              id: record.Facility_ID.trim(),
              name: `${record.category ? record.category.replace(/[_-]+/g, " ") : "Facility"} · ${record.Facility_ID.trim()}`,
              type: record.res_type.trim(),
              category: record.category.trim(),
              city: record.City_Name.trim(),
              state: record.State_Province.trim(),
              country: record.Country.trim(),
              address: record.Address_Line.trim(),
              phone: record.Phone_Number.trim(),
              email: record.Email.trim(),
              website: record.Website.trim(),
              operatingHours: record.Operating_Hours.trim(),
              lat,
              lng,
              availableDates: (record.Available_dates || "").split(";").map(value => value.trim()).filter(Boolean),
            };
          })
          .filter(Boolean);
        setFacilities(parsed);
        setFacilitiesError(parsed.length ? "" : "The facility CSV contains no usable map coordinates.");
      })
      .catch(error => {
        if (error.name !== "AbortError") setFacilitiesError(`Could not load facility CSV: ${error.message}`);
      })
      .finally(() => {
        if (!controller.signal.aborted) setFacilitiesLoading(false);
      });

    return () => controller.abort();
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
  const searchSuggestions = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return [];
    const listingTerms = items.flatMap(item => [item.name, item.category, item.title]);
    return [...new Set([...SEARCH_DICTIONARY, ...listingTerms])]
      .filter(term => term.toLowerCase().includes(query) && term.toLowerCase() !== query)
      .slice(0, 7);
  }, [items, search]);
  const submitSearch = event => {
    event.preventDefault();
    setFilter("all");
    setRadius(5);
    setOnlinePlaces([]);
    setOnlinePlacesLoaded(false);
    setOnlinePlacesError("");
    setActive("home");
    requestAnimationFrame(() => resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };
  const clearSearch = () => setSearch("");
  const openListing = item => { setSelected(item); setSelectedFacility(null); setActive("detail"); };
  const nav = page => { setSelected(null); setSelectedFacility(null); setSelectedPlace(null); setProfileEditing(false); setActive(page); };
  const openAdd = () => { setStep(1); setSuccess(false); setShareVendorLocation(false); nav("add"); };
  const notify = message => { setToast(message); setTimeout(() => setToast(""), 3000); };
  const setField = key => e => setForm(f => ({ ...f, [key]: e.target.value }));
  const updateProfileField = key => event => setProfileForm(current => ({ ...current, [key]: event.target.value }));

  const saveProfile = event => {
    event.preventDefault();
    const normalized = {
      name: profileForm.name.trim(),
      username: profileForm.username.trim().replace(/^@/, ""),
      image: profileForm.image,
    };
    if (!normalized.name || !normalized.username) return;
    try {
      localStorage.setItem("padosi-profile", JSON.stringify(normalized));
      setProfileForm(normalized);
      setProfileEditing(false);
      setProfileSaved(true);
      notify("Profile saved on this device.");
    } catch {
      notify("Could not save your profile image. Choose a smaller image and try again.");
    }
  };

  const handleProfileImage = event => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setProfileImageError("Choose an image file.");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setProfileImageError("Choose an image smaller than 8 MB.");
      return;
    }

    setProfileImageError("");
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        const image = new Image();
        image.onload = () => {
          const scale = Math.min(1, 512 / Math.max(image.naturalWidth, image.naturalHeight));
          const canvas = document.createElement("canvas");
          canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
          canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
          const context = canvas.getContext("2d");
          if (!context) {
            setProfileImageError("Image editing isn't available in this browser.");
            return;
          }
          context.drawImage(image, 0, 0, canvas.width, canvas.height);
          setProfileForm(current => ({ ...current, image: canvas.toDataURL("image/jpeg", 0.82) }));
        };
        image.onerror = () => setProfileImageError("The selected image could not be decoded.");
        image.src = reader.result;
      } else {
        setProfileImageError("The selected image could not be read.");
      }
    };
    reader.onerror = () => setProfileImageError("The selected image could not be read.");
    reader.readAsDataURL(file);
    event.target.value = "";
  };

  const patchAuth = p => setAuth(a => ({ ...a, ...p }));
  const otpNotice = data => data.cooldown
    ? `A recent code is still valid. Use that email; you can request another in ${data.resend_after} seconds.`
    : data.email_sent
      ? `A 6-digit verification code was sent to ${auth.email}. It expires in 5 minutes.`
      : "Email is not configured for this development server. Check the verification code in the backend console.";
  async function authCall(path, body, onOk) {
    patchAuth({ busy: true, error: "" });
    try {
      const r = await authFetch(path, body);
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(typeof data.detail === "string" ? data.detail : "Check your details and try again.");
      onOk(data);
    } catch (e) { patchAuth({ error: e.message === "Failed to fetch" ? "Can't reach the server. Is FastAPI running?" : e.message || "Something went wrong. Please try again." }); }
    finally { patchAuth({ busy: false }); }
  }
  const submitCreds = e => {
    e.preventDefault();
    if (auth.mode === "register" && auth.password !== auth.passwordConfirm) {
      patchAuth({ error: "Your passwords do not match." });
      return;
    }
    if (new TextEncoder().encode(auth.password).length > 72) {
      patchAuth({ error: "Password must be no longer than 72 bytes. Try fewer special or accented characters." });
      return;
    }
    authCall(auth.mode, { email: auth.email.trim().toLowerCase(), password: auth.password }, data => patchAuth({ step: "otp", otp: "", wait: data.resend_after || 30, notice: otpNotice(data) }));
  };
  const submitOtp = e => { e.preventDefault(); authCall("verify-otp", { email: auth.email, otp: auth.otp }, d => { setUser(d); patchAuth({ step: "creds", password: "", otp: "" }); nav("profile"); notify("Signed in"); }); };
  const resendOtp = () => authCall("resend-otp", { email: auth.email.trim().toLowerCase() }, data => patchAuth({ wait: data.resend_after || 30, notice: otpNotice(data) }));
  const logout = async () => { await fetch(`${API}/api/auth/logout`, { method: "POST", credentials: "include" }).catch(() => {}); setUser(null); nav("home"); notify("Signed out"); };

  async function submitListing() {
    try {
      let vendorPosition = null;
      if (form.type === "vendor" && shareVendorLocation && navigator.geolocation) {
        vendorPosition = await new Promise(resolve => {
          navigator.geolocation.getCurrentPosition(
            position => resolve(position.coords),
            () => resolve(null),
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
          );
        });
      }
      const response = await fetch(`${API}/api/listings`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      if (!response.ok) throw new Error();
      const data = await response.json();
      const createdItem = {
        ...data.item,
        live: form.type === "vendor" && Boolean(vendorPosition),
        ...(vendorPosition ? { lat: vendorPosition.latitude, lng: vendorPosition.longitude } : {}),
      };
      setItems(prev => [createdItem, ...prev]);
      if (form.type === "vendor" && shareVendorLocation && vendorPosition) {
        setTrackingVendorIds(ids => [...new Set([...ids, createdItem.id])]);
        notify("Vendor published. Live location is shared from this device while this app is open.");
      } else if (form.type === "vendor" && shareVendorLocation) {
        notify("Vendor published, but location permission was unavailable. Live tracking is off.");
      }
      setSuccess(true);
    } catch { notify("Could not submit. Check that FastAPI is running."); }
  }

  const facilityCities = [...new Set(facilities.map(facility => facility.city))];
  const mapNeedle = mapSearch.trim().toLowerCase();
  const visibleFacilities = facilities.filter(facility => {
    const matchesCity = mapCity === "All cities" || facility.city === mapCity;
    const searchable = `${facility.id} ${facility.name} ${facility.category} ${facility.city} ${facility.address}`.toLowerCase();
    return matchesCity && (!mapNeedle || searchable.includes(mapNeedle));
  });
  const visibleMapItems = (mapCity === "Meerut" || mapCity === "All cities")
    ? filtered.filter(item => {
      const searchable = `${item.name} ${item.category} ${item.title} ${item.description}`.toLowerCase();
      return !mapNeedle || searchable.includes(mapNeedle);
    })
    : [];
  const visibleOnlinePlaces = onlinePlaces.filter(place => {
    const searchable = `${place.name} ${place.category} ${place.city}`.toLowerCase();
    return place.city === mapCity && (!mapNeedle || searchable.includes(mapNeedle));
  });
  const selectOnlinePlace = place => {
    setSelected(null);
    setSelectedFacility(null);
    setSelectedPlace(place);
  };
  const setMapRadius = nextRadius => {
    setRadius(nextRadius);
    setOnlinePlaces([]);
    setOnlinePlacesLoaded(false);
    setOnlinePlacesError("");
  };
  const stopLiveVendorSharing = () => {
    const trackedIds = new Set(trackingVendorIds);
    setTrackingVendorIds([]);
    setItems(current => current.map(item => trackedIds.has(item.id) ? { ...item, live: false } : item));
    setSelected(current => current && trackedIds.has(current.id) ? { ...current, live: false } : current);
    notify("Live location sharing stopped.");
  };
  const selectFacility = facility => {
    setSelected(null);
    setSelectedPlace(null);
    setSelectedFacility(facility);
    setSelectedDate(facility.availableDates[0] || "");
  };
  const discoverOnlinePlaces = async () => {
    const center = CITY_CENTERS[mapCity];
    if (!center) {
      setOnlinePlacesError("Choose a supported city before searching OpenStreetMap.");
      return;
    }
    setOnlinePlacesLoading(true);
    setOnlinePlacesError("");
    const radiusMeters = Math.max(1000, radius * 1000);
    const query = `[out:json][timeout:15];(node(around:${radiusMeters},${center.lat},${center.lng})[amenity][name];node(around:${radiusMeters},${center.lat},${center.lng})[shop][name];node(around:${radiusMeters},${center.lat},${center.lng})[leisure][name];);out body 150;`;
    const endpoints = [
      "https://overpass-api.de/api/interpreter",
      "https://overpass.kumi.systems/api/interpreter",
      "https://overpass.private.coffee/api/interpreter",
    ];

    try {
      let result = null;
      const endpointErrors = [];
      for (const endpoint of endpoints) {
        try {
          const response = await fetch(endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
            body: new URLSearchParams({ data: query }),
            signal: AbortSignal.timeout(15000),
          });
          if (!response.ok) {
            endpointErrors.push(`${new URL(endpoint).hostname}: HTTP ${response.status}`);
            continue;
          }
          result = await response.json();
          break;
        } catch (error) {
          endpointErrors.push(`${new URL(endpoint).hostname}: ${error.name === "TimeoutError" ? "timed out" : error.message}`);
        }
      }
      if (!result) throw new Error(`OpenStreetMap places service is unavailable. ${endpointErrors.join("; ")}`);
      const places = (result.elements || [])
        .filter(place => Number.isFinite(place.lat) && Number.isFinite(place.lon) && place.tags?.name)
        .map(place => ({
          id: `osm-${place.id}`,
          name: place.tags.name,
          category: place.tags.amenity || place.tags.shop || place.tags.leisure || "place",
          lat: place.lat,
          lng: place.lon,
          tags: place.tags,
          city: mapCity,
        }));
      setOnlinePlaces(places);
      setOnlinePlacesLoaded(true);
      setSelected(null);
      setSelectedFacility(null);
      setSelectedPlace(null);
      if (!places.length) setOnlinePlacesError("No named places were returned for this area. Try another radius later.");
    } catch (error) {
      setOnlinePlacesError(error.message || "Could not reach the OpenStreetMap places service.");
    } finally {
      setOnlinePlacesLoading(false);
    }
  };
  const recenterMap = () => {
    if (!navigator.geolocation) {
      notify("Location access is unavailable in this browser. Showing selected city.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setSelected(null);
        setSelectedFacility(null);
        setFocusLocation({ lat: coords.latitude, lng: coords.longitude, zoom: 15 });
      },
      () => notify("Could not access your location. Showing selected city."),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

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
    <section className="relative rounded-[2rem] bg-gradient-to-br from-teal-900 via-teal-800 to-teal-600 p-5 text-white shadow-[12px_12px_28px_#c4cdd6,-10px_-10px_26px_#ffffff] sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-teal-100">Your neighbourhood, made useful</p>
          <h1 className="mt-2 max-w-xl text-3xl font-black leading-tight sm:text-4xl">Find good things nearby.</h1>
          <p className="mt-2 max-w-lg text-sm leading-6 text-teal-50">Discover community resources, trusted local vendors and places around you.</p>
        </div>
        <button onClick={() => nav("map")} className="flex items-center gap-2 rounded-full bg-white/15 px-3 py-2 text-xs font-bold text-white transition hover:bg-white/25"><LocateFixed size={15} /> Meerut <ChevronDown size={14} /></button>
      </div>
      <form onSubmit={submitSearch} role="search" className="relative mt-5 flex min-h-12 items-center gap-3 rounded-2xl bg-white px-4 text-slate-500 shadow-[inset_4px_4px_8px_#c9d3dd,inset_-4px_-4px_8px_#ffffff] focus-within:ring-2 focus-within:ring-teal-200">
        <Search size={19} aria-hidden="true" />
        <input
          aria-label="Search nearby listings"
          aria-autocomplete="list"
          aria-expanded={searchFocused && searchSuggestions.length > 0}
          aria-controls="listing-search-suggestions"
          role="combobox"
          value={search}
          onFocus={() => setSearchFocused(true)}
          onBlur={() => setTimeout(() => setSearchFocused(false), 120)}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search tools, tutors, groceries, places…"
          className="min-w-0 flex-1 bg-transparent py-3 text-sm text-slate-800 outline-none placeholder:text-slate-400"
        />
        {search && <button type="button" aria-label="Clear search" onClick={clearSearch} className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><X size={17} /></button>}
        <button type="submit" className="rounded-xl bg-teal-700 px-4 py-2 text-sm font-bold text-white transition hover:bg-teal-800">Search</button>
        {searchFocused && searchSuggestions.length > 0 && <ul id="listing-search-suggestions" role="listbox" className="surface absolute inset-x-0 top-[calc(100%+10px)] z-40 max-h-[min(45vh,18rem)] overflow-y-auto rounded-2xl p-2 text-slate-800">
          {searchSuggestions.map(suggestion => <li key={suggestion} role="option" aria-selected="false">
            <button type="button" onMouseDown={event => event.preventDefault()} onClick={() => { setSearch(suggestion); setSearchFocused(false); setFilter("all"); setRadius(5); }} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm hover:bg-teal-50">
              <Search size={14} className="shrink-0 text-teal-700" /><span>{suggestion}</span>
            </button>
          </li>)}
        </ul>}
      </form>
    </section>
    <section className="mt-7">
      <div className="mb-3 flex items-end justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-teal-700">A little closer to home</p><h2 className="mt-1 text-xl font-black">Explore nearby</h2><p className={sub}>Choose a category or open the map to discover more.</p></div><button onClick={() => nav("map")} className="surface flex shrink-0 items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold text-teal-800"><MapIcon size={16} /> Open map</button></div>
      <div className="grid grid-cols-2 gap-3 sm:max-w-xl">{Object.keys(categoryMeta).map(type => <CategoryCard key={type} type={type} onClick={() => {
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




  const input = "mt-1.5 w-full rounded-xl border border-slate-200 bg-transparent px-3 py-3 outline-none focus:border-teal-500";
  const mapPage = <section>
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
      <div><p className="text-xs font-bold uppercase tracking-[0.18em] text-teal-700">Neighbourhood explorer</p><h1 className="mt-1 text-2xl font-black">Explore the map</h1><p className={sub}>CSV facilities and nearby Padosi listings, all in one place.</p></div>
      <button onClick={recenterMap} className="surface rounded-full px-4 py-2 text-xs font-bold text-teal-800"><LocateFixed size={14} className="mr-1 inline" /> Use my location</button>
    </div>
    <div className="surface mb-4 grid gap-3 rounded-2xl p-4 sm:grid-cols-[minmax(180px,0.7fr)_minmax(220px,1.3fr)]">
      <label className="text-xs font-bold text-slate-600">City
        <select value={mapCity} onChange={event => {
          const nextCity = event.target.value;
          setMapCity(nextCity);
          setFocusLocation(null);
          setSelectedFacility(null);
          setSelected(null);
          setSelectedPlace(null);
          setOnlinePlaces([]);
          setOnlinePlacesLoaded(false);
          setOnlinePlacesError("");
        }} className={`${input} mt-2`}>
          {facilityCities.includes("Meerut") && <option value="Meerut">Meerut</option>}
          {facilityCities.filter(city => city !== "Meerut").map(city => <option key={city} value={city}>{city}</option>)}
          <option value="All cities">All cities</option>
        </select>
      </label>
      <label className="text-xs font-bold text-slate-600">Find a facility or listing
        <input value={mapSearch} onChange={event => setMapSearch(event.target.value)} className={`${input} mt-2`} placeholder="Search facility ID, category, area…" />
      </label>
    </div>
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="muted mr-1 text-xs font-semibold text-slate-500">Listing radius</span>
        {RADII.map(r => <button key={r} onClick={() => setMapRadius(r)} className={`rounded-full px-4 py-2 text-xs font-bold ${radius === r ? "bg-teal-700 text-white" : "surface text-slate-600"}`}>{r} km</button>)}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <p className="muted text-xs text-slate-500">{visibleFacilities.length} CSV facilities · {visibleMapItems.length} nearby listings{onlinePlacesLoaded ? ` · ${visibleOnlinePlaces.length} OSM places` : ""}</p>
        <button onClick={discoverOnlinePlaces} disabled={onlinePlacesLoading || mapCity === "All cities"} className="surface inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold text-violet-800 disabled:cursor-not-allowed disabled:opacity-50">
          <Globe2 size={15} /> {onlinePlacesLoading ? "Searching online…" : onlinePlacesLoaded ? "Refresh places" : "Find places online"}
        </button>
      </div>
    </div>
    {trackingVendorIds.length > 0 && <div role="status" className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-950">
      <span><b>Live location sharing is on.</b> This device updates {trackingVendorIds.length} vendor {trackingVendorIds.length === 1 ? "pin" : "pins"} only while the app is open.</span>
      <button onClick={stopLiveVendorSharing} className="rounded-lg bg-white px-3 py-2 text-xs font-bold text-emerald-800">Stop sharing</button>
    </div>}
    {facilitiesError && <p role="alert" className="mb-3 rounded-xl bg-rose-50 p-3 text-sm font-semibold text-rose-700">{facilitiesError}</p>}
    {onlinePlacesError && <p role={onlinePlacesLoading ? "status" : "alert"} className="mb-3 rounded-xl bg-violet-50 p-3 text-sm font-semibold text-violet-900">{onlinePlacesError}</p>}
    <p className="mb-3 text-xs leading-5 text-slate-500">Online places are sourced from OpenStreetMap and may not reflect current stock, opening status, or booking availability.</p>
    {facilitiesLoading && <p role="status" className="mb-3 text-sm text-slate-500">Loading facility locations from CSV…</p>}
    <div className="surface relative h-[62vh] min-h-[430px] overflow-hidden rounded-3xl p-2">
      <MapView
        items={visibleMapItems}
        facilities={visibleFacilities}
        onlinePlaces={visibleOnlinePlaces}
        selected={selected}
        selectedFacility={selectedFacility}
        selectedPlace={selectedPlace}
        city={mapCity}
        focusLocation={focusLocation}
        onSelect={item => { setSelected(item); setSelectedFacility(null); setSelectedPlace(null); }}
        onSelectFacility={selectFacility}
        onSelectPlace={selectOnlinePlace}
      />
      {selected && <div className="absolute bottom-3 left-3 right-3 z-[500]">
        <div className="surface rounded-2xl p-3">
          <div className="flex items-center justify-between"><span className="text-xs font-bold text-teal-700">NEARBY LISTING</span><button aria-label="Close selected listing" onClick={() => setSelected(null)}><X size={17} /></button></div>
          <div className="mt-2"><ListingCard item={selected} onOpen={openListing} compact /></div>
          <button onClick={() => openListing(selected)} className="mt-3 w-full rounded-xl bg-teal-600 py-3 text-sm font-bold text-white">View details</button>
        </div>
      </div>}
      {selectedFacility && <div className="absolute bottom-3 left-3 right-3 z-[500]">
        <div className="surface rounded-2xl p-4">
          <div className="flex items-start justify-between gap-3">
            <div><p className="text-[10px] font-black uppercase tracking-wider text-blue-700">CSV facility · {selectedFacility.city}</p><h2 className="mt-1 font-black">{selectedFacility.name}</h2><p className="muted mt-1 text-xs text-slate-500">{selectedFacility.address || selectedFacility.state}</p></div>
            <button aria-label="Close selected facility" onClick={() => setSelectedFacility(null)} className="rounded-xl p-2 text-slate-500"><X size={17} /></button>
          </div>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-slate-600">
            {selectedFacility.operatingHours && <span><b>Hours:</b> {selectedFacility.operatingHours}</span>}
            {selectedFacility.phone && <a className="font-bold text-teal-700" href={`tel:${selectedFacility.phone}`}>Call {selectedFacility.phone}</a>}
            {selectedFacility.website && <a className="font-bold text-teal-700" href={selectedFacility.website} target="_blank" rel="noreferrer">Website</a>}
          </div>
          {selectedFacility.availableDates.length > 0 && <label className="mt-3 block text-xs font-bold text-slate-600">Available dates
            <select value={selectedDate} onChange={event => setSelectedDate(event.target.value)} className={`${input} mt-2`}>
              {selectedFacility.availableDates.map(date => <option key={date} value={date}>{new Date(`${date}T00:00:00`).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}</option>)}
            </select>
          </label>}
        </div>
      </div>}
      {selectedPlace && <div className="absolute bottom-3 left-3 right-3 z-[500]">
        <div className="surface rounded-2xl p-4">
          <div className="flex items-start justify-between gap-3">
            <div><p className="text-[10px] font-black uppercase tracking-wider text-violet-700">OpenStreetMap place · {selectedPlace.city}</p><h2 className="mt-1 font-black">{selectedPlace.name}</h2><p className="muted mt-1 text-xs capitalize text-slate-500">{selectedPlace.category.replace(/_/g, " ")}</p></div>
            <button aria-label="Close selected place" onClick={() => setSelectedPlace(null)} className="rounded-xl p-2 text-slate-500"><X size={17} /></button>
          </div>
          <a href={`https://www.google.com/maps/dir/?api=1&destination=${selectedPlace.lat},${selectedPlace.lng}`} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-2 rounded-xl bg-teal-700 px-4 py-2.5 text-sm font-bold text-white"><Navigation size={15} /> Navigate with Google Maps <ExternalLink size={14} /></a>
        </div>
      </div>}
    </div>
    <div className="mt-5">
      <div className="mb-3 flex items-end justify-between gap-3"><div><h2 className="text-lg font-black">Facilities in {mapCity === "All cities" ? "all cities" : mapCity}</h2><p className={sub}>Select a result to center its map marker and check CSV details.</p></div><span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-800">Blue pins · CSV</span></div>
      {visibleFacilities.length
        ? <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{visibleFacilities.map(facility => <button key={facility.id} onClick={() => selectFacility(facility)} className={`surface rounded-2xl p-4 text-left transition ${selectedFacility?.id === facility.id ? "ring-2 ring-blue-500" : ""}`}>
          <div className="flex items-start justify-between gap-2"><span className="rounded-lg bg-blue-100 px-2 py-1 text-[10px] font-black uppercase text-blue-800">{facility.category || "facility"}</span><MapPin size={16} className="shrink-0 text-blue-600" /></div>
          <p className="mt-3 font-black">{facility.id}</p><p className="muted mt-1 line-clamp-2 text-xs text-slate-500">{facility.address || facility.city}</p>
        </button>)}</div>
        : !facilitiesLoading && <div className="surface rounded-2xl p-5 text-sm text-slate-600">No facilities match this city and search. Try another city or search term.</div>}
    </div>
    {onlinePlacesLoaded && <div className="mt-7">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <div><h2 className="text-lg font-black">Places from OpenStreetMap</h2><p className={sub}>Community-mapped shops and amenities within {radius} km; availability is not verified.</p></div>
        <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-bold text-violet-800">Purple pins · online</span>
      </div>
      {visibleOnlinePlaces.length
        ? <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{visibleOnlinePlaces.slice(0, 30).map(place => <button key={place.id} onClick={() => selectOnlinePlace(place)} className={`surface rounded-2xl p-4 text-left transition ${selectedPlace?.id === place.id ? "ring-2 ring-violet-500" : ""}`}>
          <div className="flex items-start justify-between gap-2"><span className="rounded-lg bg-violet-100 px-2 py-1 text-[10px] font-black uppercase text-violet-800">{place.category.replace(/_/g, " ")}</span><MapPin size={16} className="shrink-0 text-violet-600" /></div>
          <p className="mt-3 font-black">{place.name}</p><p className="muted mt-1 text-xs text-slate-500">{place.city}</p>
        </button>)}</div>
        : <p className="surface rounded-2xl p-5 text-sm text-slate-600">No places from the online search match this city and filter.</p>}
    </div>}
    <p className="muted mt-4 text-xs text-slate-500">Facility locations and availability come from the included CSV file. Map tiles © OpenStreetMap contributors.</p>
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
      {selected.type === "vendor"
        ? <a href={`https://www.google.com/maps/dir/?api=1&destination=${selected.lat},${selected.lng}`} target="_blank" rel="noreferrer" className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-teal-700 py-3.5 text-sm font-bold text-white"><Navigation size={17} /> Navigate to vendor <ExternalLink size={15} /></a>
        : <button onClick={() => notify("Request noted for demo.")} className="flex-1 rounded-xl bg-teal-600 py-3.5 text-sm font-bold text-white">Request to borrow</button>}
    </div>
  </section>;



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
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">{Object.entries(categoryMeta).map(([type, m]) => { const Icon = m.icon; return <button key={type} onClick={() => { setForm(f => ({ ...f, type })); setShareVendorLocation(false); }} className={`rounded-2xl border p-4 text-left ${form.type === type ? "border-teal-500 bg-teal-50" : "border-slate-200"}`}><Icon size={24} style={{ color: m.color }} /><b className="mt-3 block">{m.label}</b><span className="muted mt-1 block text-xs text-slate-500">{m.desc}</span></button>; })}</div>
        <button onClick={() => setStep(2)} className="mt-6 w-full rounded-xl bg-teal-600 py-3.5 font-bold text-white">Continue <ArrowRight size={16} className="ml-1 inline" /></button>
      </div>}

      {step === 2 && <div className="mt-7 space-y-4"><h2 className="font-bold">Tell neighbours about it</h2>
        {FIELDS.map(([key, label]) => <label key={key} className="block text-sm font-semibold">{label}
          {key === "category" && form.type === "resource"
            ? <select value={form.category} onChange={setField(key)} className={input}>
              <option value="">Choose a resource type</option>
              {RESOURCE_CATEGORIES.map(category => <option key={category} value={category}>{category}</option>)}
            </select>
            : <input value={form[key]} onChange={setField(key)} className={input} placeholder={label} />}
        </label>)}
        <label className="block text-sm font-semibold">Description<textarea value={form.description} onChange={setField("description")} rows={3} className={input} placeholder="What should people know?" /></label>
        <div className="rounded-xl border border-dashed border-slate-300 p-4 text-center"><Plus className="mx-auto text-slate-400" /><p className="mt-1 text-xs text-slate-500">Photo picker UI demo — upload not connected</p></div>
        <div className="flex gap-3"><button onClick={() => setStep(1)} className="flex-1 rounded-xl border border-slate-200 py-3 font-bold">Back</button><button disabled={!form.name || !form.category || !form.title || !form.description || !form.price} onClick={() => setStep(3)} className="flex-1 rounded-xl bg-teal-600 py-3 font-bold text-white disabled:opacity-40">Continue</button></div>
      </div>}

      {step === 3 && <div className="mt-7">
        <div className="rounded-2xl bg-teal-50 p-5"><ShieldCheck size={28} className="text-teal-700" /><h2 className="mt-3 font-bold text-teal-950">Build trust with verification</h2><p className="mt-2 text-sm leading-6 text-teal-900">This demo shows the verification step only. Don't upload sensitive identity documents; secure verification isn't configured.</p><button onClick={() => notify("Verification is a UI-only demo.")} className="mt-4 w-full rounded-xl border border-teal-200 bg-white py-3 font-bold text-teal-800">Choose document (demo)</button></div>
        {form.type === "vendor" && <label className="surface mt-4 flex cursor-pointer items-start gap-3 rounded-2xl p-4">
          <input type="checkbox" checked={shareVendorLocation} onChange={event => setShareVendorLocation(event.target.checked)} className="mt-1 h-4 w-4 accent-teal-700" />
          <span><span className="flex items-center gap-2 font-bold"><LocateFixed size={16} className="text-teal-700" /> Share this device's live location</span>
            <span className="muted mt-1 block text-xs leading-5 text-slate-500">Optional. While this page is open, your browser location updates this listing's map pin. Location is not sent to the backend or shared with other visitors; allow location access when prompted.</span>
          </span>
        </label>}
        <div className="mt-5 flex gap-3"><button onClick={() => setStep(2)} className="flex-1 rounded-xl border border-slate-200 py-3 font-bold">Back</button><button onClick={submitListing} className="flex-1 rounded-xl bg-teal-600 py-3 font-bold text-white">Publish listing</button></div>
      </div>}
    </div>}
  </section>;

  const authError = auth.error && <p role="alert" className="text-sm font-semibold text-red-600">{auth.error}</p>;
  const passwordStrength = [
    auth.password.length >= 8,
    /[a-z]/.test(auth.password) && /[A-Z]/.test(auth.password),
    /\d/.test(auth.password),
    /[^A-Za-z0-9]/.test(auth.password),
  ].filter(Boolean).length;
  const passwordStrengthLabel = passwordStrength >= 4 ? "Strong" : passwordStrength >= 3 ? "Good" : passwordStrength >= 2 ? "Fair" : "Add a few character types";
  const loginPage = <section className="mx-auto max-w-md"><div className="surface rounded-3xl border border-slate-100 bg-white p-6 shadow-sm sm:p-8">
    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-100 text-teal-700">{auth.step === "otp" ? <KeyRound size={26} /> : <Lock size={26} />}</div>
    <p className="mt-5 text-xs font-black uppercase tracking-[0.18em] text-teal-700">{auth.step === "otp" ? "Step 2 of 2 · Email verification" : auth.mode === "register" ? "Step 1 of 2 · Create account" : "Secure sign in"}</p>
    <h1 className="mt-2 text-2xl font-black">{auth.step === "otp" ? "Check your email" : auth.mode === "login" ? "Welcome back" : "Create your account"}</h1>
    <p className={sub}>{auth.step === "otp" ? auth.notice : auth.mode === "register" ? "Create your account with an email you can access. We’ll verify it with a one-time code." : "Sign in to share things with your neighbours."}</p>
    {auth.step === "creds" ? <>
      <div className="surface mt-5 grid grid-cols-2 gap-1 rounded-xl p-1">{[["login", "Sign in"], ["register", "Create account"]].map(([m, l]) => <button key={m} type="button" onClick={() => { setShowPassword(false); patchAuth({ mode: m, error: "", password: "", passwordConfirm: "" }); }} className={`rounded-lg py-2 text-sm font-bold ${auth.mode === m ? "rounded-lg bg-teal-700 text-white shadow-sm" : "text-slate-500"}`}>{l}</button>)}</div>
      <form onSubmit={submitCreds} className="mt-5 space-y-4">
        <label className="block text-sm font-semibold">Email address<input type="email" required autoComplete="email" value={auth.email} onChange={e => patchAuth({ email: e.target.value, error: "" })} className={input} placeholder="you@example.com" /></label>
        <label className="block text-sm font-semibold">Password
          <span className="relative mt-1.5 block">
            <input type={showPassword ? "text" : "password"} required minLength={8} maxLength={72} autoComplete={auth.mode === "login" ? "current-password" : "new-password"} value={auth.password} onChange={e => patchAuth({ password: e.target.value, error: "" })} className={`${input} pr-12`} placeholder="At least 8 characters" />
            <button type="button" aria-label={showPassword ? "Hide password" : "Show password"} onClick={() => setShowPassword(value => !value)} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-2 text-slate-500">{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button>
          </span>
        </label>
        {auth.mode === "register" && <>
          <div aria-live="polite" className="space-y-2">
            <div className="flex items-center justify-between text-xs"><span className="font-semibold text-slate-500">Password strength</span><span className={`font-bold ${passwordStrength >= 3 ? "text-emerald-700" : "text-amber-700"}`}>{auth.password ? passwordStrengthLabel : "Use a memorable passphrase"}</span></div>
            <div className="grid grid-cols-4 gap-1" aria-hidden="true">{[1, 2, 3, 4].map(level => <span key={level} className={`h-1.5 rounded-full ${passwordStrength >= level ? passwordStrength >= 3 ? "bg-emerald-500" : "bg-amber-400" : "bg-slate-200"}`} />)}</div>
            <p className="text-xs text-slate-500">Use at least 8 characters. Avoid sharing this password with other sites.</p>
          </div>
          <label className="block text-sm font-semibold">Confirm password
            <span className="relative mt-1.5 block">
              <input type={showPassword ? "text" : "password"} required minLength={8} maxLength={72} autoComplete="new-password" value={auth.passwordConfirm} onChange={e => patchAuth({ passwordConfirm: e.target.value, error: "" })} className={`${input} pr-12`} placeholder="Type your password again" />
              <button type="button" aria-label={showPassword ? "Hide confirmation" : "Show confirmation"} onClick={() => setShowPassword(value => !value)} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-2 text-slate-500">{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button>
            </span>
          </label>
          {auth.passwordConfirm && auth.password !== auth.passwordConfirm && <p className="text-xs font-semibold text-rose-600">Passwords do not match yet.</p>}
        </>}
        {authError}
        <button disabled={auth.busy || (auth.mode === "register" && auth.passwordConfirm.length > 0 && auth.password !== auth.passwordConfirm)} className="w-full rounded-xl bg-teal-700 py-3.5 font-bold text-white shadow-[5px_5px_10px_#c6d0d9,-5px_-5px_10px_#ffffff] transition hover:bg-teal-800 disabled:opacity-40">{auth.busy ? "Please wait…" : auth.mode === "login" ? "Continue with email" : "Create account"}</button>
      </form>
      {auth.mode === "login" && <button type="button" onClick={() => { setRecoveryEmail(auth.email); nav("recovery"); }} className="mt-4 w-full text-center text-sm font-bold text-teal-700">Forgot your password?</button>}
    </> : <form onSubmit={submitOtp} className="mt-5 space-y-4">
      <label className="block text-sm font-semibold">6-digit verification code
        <input required minLength={6} maxLength={6} value={auth.otp} onChange={e => patchAuth({ otp: e.target.value.replace(/\D/g, "").slice(0, 6), error: "" })} inputMode="numeric" autoComplete="one-time-code" aria-label="6-digit verification code" placeholder="000000" className={`${input} text-center text-2xl font-black tracking-[0.5em]`} />
      </label>
      {authError}
      <button disabled={auth.busy || auth.otp.length !== 6} className="w-full rounded-xl bg-teal-700 py-3.5 font-bold text-white shadow-[5px_5px_10px_#c6d0d9,-5px_-5px_10px_#ffffff] transition hover:bg-teal-800 disabled:opacity-40">{auth.busy ? "Checking…" : "Verify and continue"}</button>
      <div className="flex items-center justify-between text-sm"><button type="button" onClick={() => patchAuth({ step: "creds", error: "" })} className="font-bold text-slate-500">Change email</button><button type="button" disabled={auth.wait > 0 || auth.busy} onClick={resendOtp} className="font-bold text-teal-700 disabled:opacity-40">{auth.wait > 0 ? `Resend in ${auth.wait}s` : "Resend code"}</button></div>
      {auth.mode === "register" && <p className="text-center text-sm text-slate-500">Already have an account? <button type="button" onClick={() => patchAuth({ mode: "login", step: "creds", password: "", passwordConfirm: "", otp: "", error: "", wait: 0 })} className="font-bold text-teal-700">Sign in instead</button></p>}
    </form>}
  </div></section>;

  const profileTitle = profileForm.name || user?.email?.split("@")[0] || "Neighbour";
  const profileUsername = profileForm.username || (user?.email ? user.email.split("@")[0].replace(/[^a-zA-Z0-9_.]/g, "") : "neighbour");
  const profileAvatar = profileForm.image
    ? <img src={profileForm.image} alt={`${profileTitle}'s profile`} className="h-full w-full rounded-full object-cover" />
    : <UserRound size={32} />;
  const profile = <section className="mx-auto max-w-2xl">
    <div className="mb-5"><p className="text-xs font-bold uppercase tracking-[0.18em] text-teal-700">Your neighbourhood identity</p><h1 className="mt-1 text-2xl font-black">Profile</h1><p className={sub}>Manage how you appear to the Padosi community.</p></div>
    <div className="surface rounded-[2rem] p-6 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-teal-100 text-teal-800 shadow-[inset_4px_4px_8px_#c4cdd6,inset_-4px_-4px_8px_#ffffff]">{profileAvatar}</div>
          <div><h2 className="text-xl font-black">{profileTitle}</h2><p className="mt-1 text-sm font-semibold text-teal-700">@{profileUsername}</p><p className={sub}>{user?.email || "Neighbourhood member · local demo profile"}</p></div>
        </div>
        <button onClick={() => {
          setProfileForm(current => ({
            ...current,
            name: current.name || user?.email?.split("@")[0] || "",
            username: current.username || (user?.email ? user.email.split("@")[0].replace(/[^a-zA-Z0-9_.]/g, "") : ""),
          }));
          setProfileEditing(true);
          setProfileSaved(false);
          setProfileImageError("");
        }} className="surface rounded-xl px-4 py-2.5 text-sm font-bold text-teal-800">Edit profile</button>
      </div>
      {profileSaved && <p role="status" className="mt-4 text-xs font-semibold text-emerald-700">Your display profile is saved on this device only.</p>}
      <div className="mt-7 grid grid-cols-3 gap-3">{STATS.map(([v, l]) => <div key={l} className="surface rounded-2xl p-4 text-center"><b className="text-xl">{v}</b><span className="muted mt-1 block text-xs text-slate-500">{l}</span></div>)}</div>
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {user ? <button onClick={logout} className="surface flex items-center justify-center gap-2 rounded-xl py-3 font-bold"><LogOut size={17} /> Sign out</button> : <button onClick={() => nav("login")} className="rounded-xl bg-teal-700 py-3 font-bold text-white">Sign in or create account</button>}
        <button onClick={() => setDark(v => !v)} className="surface flex items-center justify-center gap-2 rounded-xl py-3 font-bold"><span className="flex items-center gap-2">{dark ? <Sun size={18} /> : <Moon size={18} />} Appearance</span><span className="text-xs text-slate-500">{dark ? "Dark" : "Light"}</span></button>
      </div>
      <p className="muted mt-5 text-xs leading-5 text-slate-500">Your current backend only stores email and account verification. Display name, username, and avatar are stored in this browser and are not synced to your account or visible to other users.</p>
    </div>
  </section>;

  const profileEdit = <section className="mx-auto max-w-xl">
    <BackBtn onClick={() => setProfileEditing(false)} label="Back to profile" />
    <form onSubmit={saveProfile} className="surface rounded-[2rem] p-6 sm:p-8">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-teal-700">Personalize your page</p><h1 className="mt-2 text-2xl font-black">Edit profile</h1>
      <div className="mt-6 flex flex-col items-center">
        <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-full bg-teal-100 text-teal-800 shadow-[inset_5px_5px_10px_#c4cdd6,inset_-5px_-5px_10px_#ffffff]">{profileAvatar}</div>
        <input ref={profileImageInput} type="file" accept="image/*" onChange={handleProfileImage} className="sr-only" />
        <button type="button" onClick={() => profileImageInput.current?.click()} className="surface mt-4 inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-teal-800"><Camera size={16} /> Choose profile photo</button>
        <p className="muted mt-2 text-xs text-slate-500">Image is resized and saved locally in this browser.</p>
        {profileImageError && <p role="alert" className="mt-2 text-sm font-semibold text-rose-700">{profileImageError}</p>}
      </div>
      <div className="mt-6 space-y-4">
        <label className="block text-sm font-semibold">Display name<input required maxLength={60} value={profileForm.name} onChange={updateProfileField("name")} className={input} placeholder="How neighbours should address you" /></label>
        <label className="block text-sm font-semibold">Username
          <div className="mt-1.5 flex items-center gap-2"><span className="text-lg font-bold text-teal-700">@</span><input required minLength={3} maxLength={24} pattern="[A-Za-z0-9_.]+" value={profileForm.username} onChange={event => setProfileForm(current => ({ ...current, username: event.target.value.replace(/[^A-Za-z0-9_.]/g, "") }))} className={input} placeholder="yourname" /></div>
          <span className="muted mt-1 block text-xs text-slate-500">3–24 characters; letters, numbers, underscores, and periods.</span>
        </label>
      </div>
      <div className="mt-6 flex gap-3"><button type="button" onClick={() => setProfileEditing(false)} className="surface flex-1 rounded-xl py-3 font-bold">Cancel</button><button type="submit" className="flex-1 rounded-xl bg-teal-700 py-3 font-bold text-white">Save on this device</button></div>
    </form>
  </section>;

  const recoveryPage = <section className="mx-auto max-w-lg">
    <BackBtn onClick={() => nav("login")} label="Back to sign in" />
    <div className="surface rounded-[2rem] p-6 sm:p-8">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-800"><KeyRound size={26} /></div>
      <p className="mt-5 text-xs font-black uppercase tracking-[0.18em] text-amber-800">Account recovery</p>
      <h1 className="mt-2 text-2xl font-black">Forgot your password?</h1>
      <p className={sub}>We can’t reset passwords yet. The current sign-in API has no password-reset endpoint, and its email code only verifies a login or registration—it cannot safely change your password.</p>
      {recoveryEmail && <p className="surface mt-5 rounded-xl p-3 text-sm"><span className="font-semibold text-slate-500">Account email</span><br /><span className="font-bold">{recoveryEmail}</span></p>}
      <div className="mt-5 rounded-2xl bg-amber-50 p-4 text-sm leading-6 text-amber-950"><b>For account safety, no reset email will be sent from this screen.</b> Enabling password reset requires a backend route that verifies a recovery token and updates the stored password. The backend has been left unchanged as requested.</div>
      <button onClick={() => nav("login")} className="mt-6 w-full rounded-xl bg-teal-700 py-3.5 font-bold text-white">Return to sign in</button>
    </div>
  </section>;

  const views = { home, map: mapPage, detail, add: addPage, profile: profileEditing ? profileEdit : profile, login: loginPage, recovery: recoveryPage };

  return <main className="min-h-screen pb-24 md:pb-8">
    {topbar}
    <div className="mx-auto max-w-6xl px-4 py-5 sm:px-6 sm:py-8">{views[active]}</div>
    <BottomNav active={active} setActive={nav} onAdd={openAdd} />
    {toast && <div role="status" className="fixed bottom-24 left-1/2 z-[1000] -translate-x-1/2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-xl md:bottom-6">{toast}</div>}
    {loading && <div className="fixed bottom-24 right-4 z-20 rounded-full bg-white px-3 py-2 text-xs text-slate-500 shadow md:bottom-5">Connecting to Padosi API…</div>}
  </main>;
}
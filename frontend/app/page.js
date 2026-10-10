"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import {
  ArrowLeft, ArrowRight, Check, ChevronDown, Camera,
  Eye, EyeOff, ExternalLink, Globe2, Home, LocateFixed, Map as MapIcon, MapPin,
  Moon, Navigation, Plus, KeyRound, Lock, LogOut, Search,
  Star, Sun, UserRound, Wrench, X, Zap
} from "lucide-react";

const MapView = dynamic(() => import("../components/MapView"), { ssr: false });
const API = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
const apiUrl = path => {
  const url = new URL(API);
  if (typeof window !== "undefined" && ["localhost", "127.0.0.1"].includes(window.location.hostname)
      && ["localhost", "127.0.0.1"].includes(url.hostname)) {
    url.hostname = window.location.hostname;
  }
  return `${url.origin}${path}`;
};

/* ---------- constants (data that used to be repeated inside JSX) ---------- */
const categoryMeta = {
  resource: { label: "Resources", icon: Wrench, tint: "#FFF1D6", color: "#A16207", desc: "Borrow, share, save" },
  vendor: { label: "Local vendors", icon: Zap, tint: "#FCE7D5", color: "#C2410C", desc: "Browse neighbourhood businesses" },
};
const EMPTY_FORM = { type: "resource", name: "", category: "", city: "", title: "", description: "", price: "" };
const TABS = [{ id: "home", label: "Home", icon: Home }, { id: "map", label: "Map", icon: MapIcon }, { id: "add", label: "Add", icon: Plus }, { id: "profile", label: "Profile", icon: UserRound }];
const LINKS = [["home", "Home"], ["map", "Map"], ["profile", "Profile"]];
const FILTERS = [["all", "For you"], ["resource", "Resources"], ["vendor", "Vendors"]];
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
const VENDOR_CATEGORIES = [
  "Food & beverages",
  "Groceries",
  "Health & wellness",
  "Home services",
  "Repair & maintenance",
  "Transport",
  "Tools & equipment",
  "Retail",
  "Education & skills",
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
const FIELDS = [["name", "Publisher"], ["category", "Category"], ["city", "City"], ["title", "Listing title"], ["price", "Price / rate"]];
const sub = "muted mt-1 text-sm text-slate-500";
const authFetch = (path, body) => fetch(apiUrl(`/api/auth/${path}`), { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify(body) });
const distanceInKm = (first, second) => {
  const radians = degrees => degrees * (Math.PI / 180);
  const latDelta = radians(second.lat - first.lat);
  const lngDelta = radians(second.lng - first.lng);
  const a = Math.sin(latDelta / 2) ** 2
    + Math.cos(radians(first.lat)) * Math.cos(radians(second.lat)) * Math.sin(lngDelta / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

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
function CategoryCard({ type, onClick }) {
  const meta = categoryMeta[type], Icon = meta.icon;
  return <button onClick={onClick} className="surface group flex min-h-[112px] items-center gap-3 rounded-2xl border border-slate-100 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-teal-200 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 sm:p-5">
    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl" style={{ background: meta.tint, color: meta.color }}><Icon size={22} /></span>
    <span><span className="block font-bold">{meta.label}</span><span className="muted mt-1 block text-xs text-slate-500">{meta.desc}</span></span>
  </button>;
}

function ListingImage({ item, className }) {
  const meta = categoryMeta[item.type] || categoryMeta.resource;
  const Icon = meta.icon;
  return item.image
    ? <img src={item.image} alt="" className={className} />
    : <div aria-hidden="true" className={`${className} flex items-center justify-center bg-slate-100 text-teal-800`}>
      <Icon size={32} />
    </div>;
}

function ListingCard({ item, onOpen, compact = false }) {
  const meta = categoryMeta[item.type] || categoryMeta.resource; // fallback: unknown types no longer crash the card
  return <button onClick={() => onOpen(item)} className={`surface group flex w-full gap-3 rounded-2xl border border-slate-100 bg-white p-3 text-left shadow-sm transition hover:shadow-md ${compact ? "min-w-[280px] max-w-[320px]" : ""}`}>
    <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-xl bg-slate-100 sm:h-32 sm:w-32">
      <ListingImage item={item} className="h-full w-full object-cover transition group-hover:scale-105" />
    </div>
    <div className="min-w-0 flex-1 py-0.5">
      <div className="flex items-start justify-between gap-2"><span className="truncate text-sm font-bold sm:text-base">{item.name}</span><span className="shrink-0 text-xs font-bold text-teal-800">{item.price}</span></div>
      <p className="muted mt-1 truncate text-xs text-slate-500">{item.title}</p>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <span className="rounded-full px-2 py-1 text-[10px] font-semibold" style={{ background: meta.tint, color: meta.color }}>{item.category}</span>
        {item.isSample && <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-600">Example</span>}
      </div>
      <div className="mt-2 flex items-center gap-1 text-xs text-slate-500"><MapPin size={12} />{item.distanceKm == null ? item.city || "Location not shared" : `${item.distanceKm} km away`}</div>
    </div>
  </button>;
}

function BottomNav({ active, setActive, onAdd }) {
  return <nav className="surface fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t border-slate-200 bg-white/95 px-2 pb-[max(env(safe-area-inset-bottom),8px)] pt-2 backdrop-blur md:hidden">
    {TABS.map(({ id, label, icon: Icon }) => <button key={id} onClick={() => id === "add" ? onAdd() : setActive(id)} className={`flex min-h-12 flex-col items-center justify-center gap-1 text-[11px] font-semibold ${active === id ? "text-teal-700" : "text-slate-400"}`}><Icon size={20} />{label}</button>)}
  </nav>;
}

const BackBtn = ({ onClick, label }) => <button onClick={onClick} className="mb-4 flex items-center gap-2 text-sm font-bold text-teal-700"><ArrowLeft size={17} /> {label}</button>;

/* ---------- page ---------- */
export default function Page() {
  const resultsRef = useRef(null);
  const profileImageInput = useRef(null);
  const userWatchRef = useRef(null);
  const [items, setItems] = useState([]);
  const [facilities, setFacilities] = useState([]);
  const [facilitiesLoading, setFacilitiesLoading] = useState(true);
  const [facilitiesError, setFacilitiesError] = useState("");
  const [onlinePlaces, setOnlinePlaces] = useState([]);
  const [onlinePlacesLoading, setOnlinePlacesLoading] = useState(false);
  const [onlinePlacesError, setOnlinePlacesError] = useState("");
  const [onlinePlacesLoaded, setOnlinePlacesLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [listingsError, setListingsError] = useState("");
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
  const [userLocation, setUserLocation] = useState(null);
  const [trackingUserLocation, setTrackingUserLocation] = useState(false);
  const [locationPrompt, setLocationPrompt] = useState(false);
  const [userLocationError, setUserLocationError] = useState("");
  const [mapCategory, setMapCategory] = useState("all");
  const [dark, setDark] = useState(false);
  const [step, setStep] = useState(1);
  const [form, setForm] = useState(EMPTY_FORM);
  const [profileEditing, setProfileEditing] = useState(false);
  const [profileForm, setProfileForm] = useState({ name: "", username: "", image: "" });
  const [profileSaved, setProfileSaved] = useState(false);
  const [profileImageError, setProfileImageError] = useState("");
  const [recoveryEmail, setRecoveryEmail] = useState("");
  const [success, setSuccess] = useState(false);
  const [toast, setToast] = useState("");
  const [user, setUser] = useState(null);
  const [authRestoring, setAuthRestoring] = useState(true);
  const [auth, setAuth] = useState({ mode: "login", role: "member", step: "creds", email: "", password: "", passwordConfirm: "", username: "", otp: "", error: "", notice: "", busy: false, wait: 0 });
  const [reviewForm, setReviewForm] = useState({ rating: 5, text: "" });
  const [reviewBusy, setReviewBusy] = useState(false);
  const [reviewError, setReviewError] = useState("");
  const [vendorProfile, setVendorProfile] = useState(null);
  const [vendorItems, setVendorItems] = useState([]);
  const [vendorDashboardLoading, setVendorDashboardLoading] = useState(false);
  const [vendorDashboardError, setVendorDashboardError] = useState("");
  const [vendorProfileForm, setVendorProfileForm] = useState({ business_name: "", category: "", description: "", city: "" });
  const [vendorItemForm, setVendorItemForm] = useState({ title: "", description: "", price: "", quantity: "1" });
  const [vendorBusy, setVendorBusy] = useState(false);
  const [vendorFormError, setVendorFormError] = useState("");
  const [vendorItemLocation, setVendorItemLocation] = useState(false);
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
    if (!user?.id) return;
    try {
      const savedProfile = JSON.parse(localStorage.getItem(`padosi-profile-${user.id}`) || "{}");
      setProfileForm(current => ({
        ...current,
        name: user.display_name || "",
        username: user.username || "",
        image: typeof savedProfile.image === "string" ? savedProfile.image : "",
      }));
    } catch {
      localStorage.removeItem(`padosi-profile-${user.id}`);
    }
  }, [user]);

  useEffect(() => () => {
    if (userWatchRef.current !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(userWatchRef.current);
    }
  }, []);

  useEffect(() => { // restore session from the httpOnly cookie
    fetch(apiUrl("/api/auth/me"), { credentials: "include" })
      .then(async response => {
        if (response.status === 401) return null;
        if (!response.ok) throw new Error("Could not restore your sign-in session.");
        return response.json();
      })
      .then(data => {
        if (!data) return;
        setUser(data);
        if (data.role === "vendor") setActive("vendor");
      })
      .catch(error => setToast(error.message || "Could not restore your sign-in session."))
      .finally(() => setAuthRestoring(false));
  }, []);

  useEffect(() => {
    if (active !== "vendor" || user?.role !== "vendor") return;
    const controller = new AbortController();
    setVendorDashboardLoading(true);
    setVendorDashboardError("");
    fetch(apiUrl("/api/vendor/dashboard"), { credentials: "include", signal: controller.signal })
      .then(async response => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.detail || "Could not load the vendor dashboard.");
        return data;
      })
      .then(data => {
        setVendorProfile(data.profile);
        setVendorItems(data.items || []);
        if (data.profile) setVendorProfileForm(data.profile);
        else setVendorProfileForm(current => ({ ...current, business_name: current.business_name || "", city: current.city || "" }));
      })
      .catch(error => {
        if (error.name !== "AbortError") setVendorDashboardError(error.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setVendorDashboardLoading(false);
      });
    return () => controller.abort();
  }, [active, user]);

  useEffect(() => { // resend countdown
    if (auth.wait <= 0) return;
    const t = setTimeout(() => setAuth(a => ({ ...a, wait: a.wait - 1 })), 1000);
    return () => clearTimeout(t);
  }, [auth.wait]);

  useEffect(() => {
    fetch(apiUrl("/api/listings"))
      .then(r => { if (!r.ok) throw new Error("API unavailable"); return r.json(); })
      .then(data => {
        setItems(data.items || []);
        setListingsError("");
      })
      .catch(() => {
        setListingsError("Could not connect to the listings service. Check that the backend is running.");
        setToast("Can't reach FastAPI yet. Start the backend on port 8000.");
      })
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
      const matchesRadius = item.distanceKm == null || item.distanceKm <= radius;
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
  const openListing = item => {
    setSelected(item);
    setReviewForm({ rating: 5, text: "" });
    setReviewError("");
    setSelectedFacility(null);
    setActive("detail");
  };
  const nav = page => { setSelected(null); setSelectedFacility(null); setSelectedPlace(null); setProfileEditing(false); setActive(page); };
  const openAdd = () => {
    if (authRestoring) {
      notify("Checking your sign-in session. Try again in a moment.");
      return;
    }
    if (!user) {
      patchAuth({ mode: "login", role: "member", error: "" });
      nav("login");
      notify("Sign in to publish a listing.");
      return;
    }
    setStep(1);
    setSuccess(false);
    setForm({ ...EMPTY_FORM, name: user.display_name || (user.username ? `@${user.username}` : "Neighbour") });
    nav("add");
  };
  const notify = message => { setToast(message); setTimeout(() => setToast(""), 3000); };
  const setField = key => e => setForm(f => ({ ...f, [key]: e.target.value }));
  const updateProfileField = key => event => setProfileForm(current => ({ ...current, [key]: event.target.value }));
  const setVendorProfileField = key => event => setVendorProfileForm(current => ({ ...current, [key]: event.target.value }));
  const setVendorItemField = key => event => setVendorItemForm(current => ({ ...current, [key]: event.target.value }));

  const saveVendorProfile = async event => {
    event.preventDefault();
    setVendorBusy(true);
    setVendorFormError("");
    try {
      const response = await fetch(apiUrl("/api/vendor/profile"), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(vendorProfileForm),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.detail || "Could not save your vendor profile.");
      setVendorProfile(data);
      notify("Vendor profile saved.");
    } catch (error) {
      setVendorFormError(error.message);
    } finally {
      setVendorBusy(false);
    }
  };

  const addVendorItem = async event => {
    event.preventDefault();
    if (!vendorProfile) return;
    setVendorBusy(true);
    setVendorFormError("");
    try {
      let coordinates = {};
      if (vendorItemLocation) {
        if (!navigator.geolocation) throw new Error("Location access is not available in this browser.");
        const position = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(
            ({ coords }) => resolve({ lat: coords.latitude, lng: coords.longitude }),
            error => reject(new Error(error.code === error.PERMISSION_DENIED
              ? "Location permission was denied; enable it in browser settings or turn off the map location option."
              : "Could not get your location. Try again or turn off the map location option.")),
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
          );
        });
        coordinates = position;
      }
      const response = await fetch(apiUrl("/api/listings"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: vendorProfile.business_name,
          type: "vendor",
          category: vendorProfile.category,
          city: vendorProfile.city,
          title: vendorItemForm.title.trim(),
          description: vendorItemForm.description.trim(),
          price: vendorItemForm.price.trim(),
          quantity: Number(vendorItemForm.quantity),
          ...coordinates,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.detail || "Could not save this item.");
      setVendorItems(current => [data.item, ...current]);
      setItems(current => [data.item, ...current.filter(item => item.id !== data.item.id)]);
      setVendorItemForm({ title: "", description: "", price: "", quantity: "1" });
      setVendorItemLocation(false);
      notify("Item saved to your vendor dashboard.");
    } catch (error) {
      setVendorFormError(error.message || "Could not save this item.");
    } finally {
      setVendorBusy(false);
    }
  };

  const removeVendorItem = async item => {
    setVendorFormError("");
    try {
      const response = await fetch(apiUrl(`/api/vendor/items/${item.id.replace("saved-", "")}`), {
        method: "DELETE",
        credentials: "include",
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.detail || "Could not remove this item.");
      setVendorItems(current => current.filter(existing => existing.id !== item.id));
      setItems(current => current.filter(existing => existing.id !== item.id));
      notify("Inventory item removed.");
    } catch (error) {
      setVendorFormError(error.message);
    }
  };

  const submitReview = async event => {
    event.preventDefault();
    if (!user || !selected?.id.startsWith("saved-")) return;
    setReviewBusy(true);
    setReviewError("");
    try {
      const response = await fetch(apiUrl(`/api/listings/${selected.id}/reviews`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ rating: Number(reviewForm.rating), text: reviewForm.text.trim() }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.detail || "Could not save your review.");
      setSelected(data.item);
      setItems(current => current.map(item => item.id === data.item.id ? data.item : item));
      setReviewForm({ rating: 5, text: "" });
      notify("Your review was published.");
    } catch (error) {
      setReviewError(error.message || "Could not save your review.");
    } finally {
      setReviewBusy(false);
    }
  };

  const saveProfile = async event => {
    event.preventDefault();
    if (!user) return;
    const displayName = profileForm.name.trim();
    if (!displayName) return;
    try {
      const response = await fetch(apiUrl("/api/auth/profile"), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ display_name: displayName }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.detail || "Could not save your profile.");
      setUser(data);
      setProfileForm(current => ({ ...current, name: data.display_name || "", username: data.username || "" }));
      setProfileEditing(false);
      setProfileSaved(true);
      try {
        localStorage.setItem(`padosi-profile-${user.id}`, JSON.stringify({ image: profileForm.image }));
        notify("Profile saved to your account.");
      } catch {
        notify("Your name was saved, but the profile photo could not be saved in this browser.");
      }
    } catch (error) {
      notify(error.message || "Could not save your profile.");
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
  const completeSignIn = data => {
    setUser(data);
    setProfileForm(current => ({
      ...current,
      name: data.display_name || "",
      username: data.username || "",
    }));
    patchAuth({ step: "creds", password: "", otp: "", error: "", notice: "", wait: 0 });
    if (data.role === "vendor") {
      setLocationPrompt(false);
      nav("vendor");
    } else {
      setLocationPrompt(true);
      setUserLocationError("");
      nav("home");
    }
  };
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
    const credentials = { email: auth.email.trim().toLowerCase(), password: auth.password };
    if (auth.mode === "register") {
      credentials.username = auth.username.trim().toLowerCase();
      credentials.role = auth.role;
    }
    authCall(auth.mode, credentials, data => {
      if (auth.mode === "login") {
        completeSignIn(data);
      } else {
        patchAuth({ step: "otp", otp: "", wait: data.resend_after || 30, notice: otpNotice(data) });
      }
    });
  };
  const submitOtp = e => { e.preventDefault(); authCall("verify-otp", { email: auth.email, otp: auth.otp }, completeSignIn); };
  const resendOtp = () => authCall("resend-otp", { email: auth.email.trim().toLowerCase() }, data => patchAuth({ wait: data.resend_after || 30, notice: otpNotice(data) }));
  const stopUserLocationTracking = () => {
    if (userWatchRef.current !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(userWatchRef.current);
      userWatchRef.current = null;
    }
    setTrackingUserLocation(false);
    setUserLocation(null);
    setFocusLocation(null);
    notify("Location tracking stopped.");
  };
  const startUserLocationTracking = () => {
    if (!navigator.geolocation) {
      setUserLocationError("Location access is unavailable in this browser.");
      return;
    }
    setUserLocationError("");
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const location = { lat: coords.latitude, lng: coords.longitude };
        setUserLocation(location);
        setFocusLocation({ ...location, zoom: 14 });
        setMapCity("All cities");
        setLocationPrompt(false);
        setTrackingUserLocation(true);
        nav("map");
        if (userWatchRef.current !== null) navigator.geolocation.clearWatch(userWatchRef.current);
        userWatchRef.current = navigator.geolocation.watchPosition(
          ({ coords: latest }) => setUserLocation({ lat: latest.latitude, lng: latest.longitude }),
          error => {
            if (error.code === error.PERMISSION_DENIED) {
              if (userWatchRef.current !== null) navigator.geolocation.clearWatch(userWatchRef.current);
              userWatchRef.current = null;
              setTrackingUserLocation(false);
              notify("Location permission was revoked. The last position remains visible on this device.");
              return;
            }
            notify("Live location could not update. The last position remains visible on this device.");
          },
          { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
        );
      },
      error => setUserLocationError(
        error.code === error.PERMISSION_DENIED
          ? "Location permission was denied. You can enable it in browser settings and try again."
          : "Could not get your location. Check device location services and try again."
      ),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
    );
  };
  const logout = async () => {
    try {
      const response = await fetch(apiUrl("/api/auth/logout"), { method: "POST", credentials: "include" });
      if (!response.ok) throw new Error("The server could not end your session.");
    } catch (error) {
      notify(error.message || "Could not sign out. Check your connection and try again.");
      return;
    }
    if (userWatchRef.current !== null && navigator.geolocation) navigator.geolocation.clearWatch(userWatchRef.current);
    userWatchRef.current = null;
    setTrackingUserLocation(false);
    setUserLocation(null);
    setUser(null);
    setProfileForm({ name: "", username: "", image: "" });
    setLocationPrompt(false);
    nav("home");
    notify("Signed out");
  };

  async function submitListing() {
    try {
      if (form.type === "vendor" && user?.role !== "vendor") {
        throw new Error("Vendor accounts must finish vendor setup in the Vendor dashboard before adding inventory.");
      }
      const response = await fetch(apiUrl("/api/listings"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          ...form,
          quantity: 1,
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.detail || "Could not save this listing.");
      const data = result;
      const createdItem = {
        ...data.item,
      };
      setItems(prev => [createdItem, ...prev]);
      setSuccess(true);
    } catch (error) { notify(error.message || "Could not submit. Check that FastAPI is running."); }
  }

  const facilityCities = [...new Set(facilities.map(facility => facility.city))];
  const listingCities = [...new Set(items.map(item => item.city).filter(Boolean))];
  const mapNeedle = mapSearch.trim().toLowerCase();
  const visibleFacilities = facilities.filter(facility => {
    const matchesCity = mapCity === "All cities" || facility.city === mapCity;
    const searchable = `${facility.id} ${facility.name} ${facility.category} ${facility.city} ${facility.address}`.toLowerCase();
    return matchesCity && (!mapNeedle || searchable.includes(mapNeedle));
  });
  const mapCategories = [...new Set(items.map(item => item.category).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  const mapItemDistance = item => userLocation && Number.isFinite(item.lat) && Number.isFinite(item.lng)
    ? distanceInKm(userLocation, { lat: item.lat, lng: item.lng })
    : item.distanceKm;
  const visibleMapItems = items.filter(item => {
      const searchable = `${item.name} ${item.category} ${item.title} ${item.description}`.toLowerCase();
      const itemDistance = mapItemDistance(item);
      const hasCoordinates = Number.isFinite(item.lat) && Number.isFinite(item.lng);
      return hasCoordinates
        && (mapCity === "All cities" || (item.city || "Meerut") === mapCity)
        && (filter === "all" || item.type === filter)
        && (mapCategory === "all" || item.category === mapCategory)
        && (itemDistance == null || itemDistance <= radius)
        && (!mapNeedle || searchable.includes(mapNeedle));
    }).map(item => ({
      ...item,
      distanceKm: mapItemDistance(item) == null ? null : Number(mapItemDistance(item).toFixed(1)),
    }));
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
    if (userLocation) {
      setFocusLocation({ ...userLocation, zoom: 14 });
      return;
    }
    startUserLocationTracking();
  };

  const topbar = <header className="surface sticky top-0 z-20 border-b border-slate-100 bg-white/90 backdrop-blur">
    <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
      <button onClick={() => nav("home")} className="flex items-center gap-2"><span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-teal-600 text-white"><MapPin size={22} /></span><span className="text-xl font-black tracking-tight">Padosi<span className="text-teal-600">.</span><span className="muted ml-2 hidden text-xs font-medium text-slate-400 sm:inline">Good things live nearby</span></span></button>
      <div className="hidden items-center gap-1 md:flex">
        {LINKS.map(([id, label]) => <button key={id} onClick={() => nav(id)} className={`rounded-full px-4 py-2 text-sm font-semibold ${active === id ? "bg-teal-50 text-teal-700" : "text-slate-500 hover:bg-slate-50"}`}>{label}</button>)}
        {user?.role === "vendor" && <button onClick={() => nav("vendor")} className={`rounded-full px-4 py-2 text-sm font-semibold ${active === "vendor" ? "bg-teal-50 text-teal-700" : "text-slate-500 hover:bg-slate-50"}`}>Vendor dashboard</button>}
        <button onClick={openAdd} className="ml-2 flex items-center gap-2 rounded-full bg-teal-600 px-4 py-2 text-sm font-bold text-white hover:bg-teal-700"><Plus size={16} /> Add listing</button>
      </div>
      <div className="flex items-center gap-2">
        <button aria-label={authRestoring ? "Checking sign-in" : user ? "Account" : "Sign in"} disabled={authRestoring} onClick={() => nav(user ? "profile" : "login")} className="flex h-10 items-center gap-2 rounded-full bg-teal-600 px-3 text-sm font-bold text-white hover:bg-teal-700 disabled:opacity-70 sm:px-4">{user ? <UserRound size={16} /> : <Lock size={16} />}<span className="hidden sm:inline">{authRestoring ? "Checking…" : user ? "Account" : "Sign in"}</span></button>
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
        {!loading && listingsError && <div role="alert" className="surface col-span-full rounded-2xl bg-white p-6 text-center"><p className="font-bold">Listings are temporarily unavailable</p><p className="muted mt-1 text-sm text-slate-500">{listingsError}</p><button className="mt-3 text-sm font-bold text-teal-700" onClick={() => window.location.reload()}>Try again</button></div>}
        {!loading && !listingsError && !filtered.length && <div className="surface col-span-full rounded-2xl bg-white p-8 text-center"><Search className="mx-auto text-slate-400" /><p className="mt-2 font-bold">{items.length === 0 ? "No listings have been published yet" : search.trim() ? "No results found" : "No matches nearby"}</p><p className="muted mt-1 text-sm text-slate-500">{items.length === 0 ? "Publish the first neighbourhood resource or vendor item." : search.trim() ? "Try another keyword or browse all listings." : "Try increasing your search area."}</p><button className="mt-3 text-sm font-bold text-teal-700" onClick={items.length === 0 ? openAdd : () => { setFilter("all"); setSearch(""); setRadius(5); }}>{items.length === 0 ? "Publish a listing" : "Clear filters"}</button></div>}
      </div>
    </section>
  </>;




  const input = "mt-1.5 w-full rounded-xl border border-slate-200 bg-transparent px-3 py-3 outline-none focus:border-teal-500";
  const mapPage = <section>
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
      <div><p className="text-xs font-bold uppercase tracking-[0.18em] text-teal-700">Neighbourhood explorer</p><h1 className="mt-1 text-2xl font-black">Explore the map</h1><p className={sub}>CSV facilities and nearby Padosi listings, all in one place.</p></div>
      <button onClick={recenterMap} className="surface rounded-full px-4 py-2 text-xs font-bold text-teal-800"><LocateFixed size={14} className="mr-1 inline" /> Use my location</button>
    </div>
    <div className="surface mb-4 grid gap-3 rounded-2xl p-4 sm:grid-cols-3">
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
          {[...new Set([...facilityCities, ...listingCities, "Meerut"])].sort().map(city => <option key={city} value={city}>{city}</option>)}
          <option value="All cities">All cities</option>
        </select>
      </label>
      <label className="text-xs font-bold text-slate-600">Find a facility or listing
        <input value={mapSearch} onChange={event => setMapSearch(event.target.value)} className={`${input} mt-2`} placeholder="Search facility ID, category, area…" />
      </label>
      <label className="text-xs font-bold text-slate-600">Listing category
        <select value={mapCategory} onChange={event => setMapCategory(event.target.value)} className={`${input} mt-2`}>
          <option value="all">All categories</option>
          {mapCategories.map(category => <option key={category} value={category}>{category}</option>)}
        </select>
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
    {trackingUserLocation && <div role="status" className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-950">
      <span><b>Location tracking is on.</b> Your position and nearby listing distances update on this device while the app is open.</span>
      <button onClick={stopUserLocationTracking} className="rounded-lg bg-white px-3 py-2 text-xs font-bold text-emerald-800">Stop my tracking</button>
    </div>}
    {userLocationError && <p role="alert" className="mb-3 rounded-xl bg-rose-50 p-3 text-sm font-semibold text-rose-700">{userLocationError}</p>}
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
        userLocation={userLocation}
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
      <div className="relative h-64 sm:h-80"><ListingImage item={selected} className="h-full w-full object-cover" /><span className="absolute bottom-4 left-4 rounded-full bg-white px-3 py-1.5 text-xs font-bold">{selected.category}</span></div>
      <div className="p-5 sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <div><h1 className="text-2xl font-black">{selected.name}</h1><p className={sub}>{selected.title}</p>
            {selected.reviewCount > 0 && <div className="mt-2 flex items-center gap-1 text-sm text-slate-600"><Star size={15} className="fill-amber-400 text-amber-400" />{selected.rating} · {selected.reviewCount} {selected.reviewCount === 1 ? "review" : "reviews"}</div>}
            {selected.isSample && <span className="mt-2 inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">Example listing</span>}
          </div>
        </div>
        <p className="mt-5 leading-7 text-slate-600">{selected.description}</p>
        <div className="mt-7 flex items-center justify-between gap-3"><h3 className="text-lg font-black">Neighbour reviews</h3><span className="text-xs text-slate-500">{selected.reviewCount || 0} total</span></div>
        {selected.reviews?.length
          ? <div className="mt-3 space-y-3">{selected.reviews.map((review, index) => <div key={`${review.reviewerId}-${index}`} className="rounded-2xl bg-slate-50 p-4">
            <div className="flex items-center justify-between gap-3"><b className="text-sm">{review.name}</b><span className="text-xs text-amber-600">{"★".repeat(review.rating)}</span></div>
            <p className="muted mt-2 text-sm text-slate-600">{review.text}</p>
          </div>)}</div>
          : <p className="muted mt-3 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">No reviews yet.</p>}
        {selected.id.startsWith("saved-") && user && selected.ownerId !== user.id && (
          selected.reviews?.some(review => review.reviewerId === user.id)
            ? <p className="mt-4 rounded-xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">You have reviewed this listing.</p>
            : <form onSubmit={submitReview} className="mt-4 rounded-2xl border border-slate-200 p-4">
              <h4 className="font-bold">Share your review</h4>
              <label className="mt-3 block text-sm font-semibold">Rating
                <select value={reviewForm.rating} onChange={event => setReviewForm(current => ({ ...current, rating: event.target.value }))} className={input}>
                  {[5, 4, 3, 2, 1].map(rating => <option key={rating} value={rating}>{rating} {rating === 1 ? "star" : "stars"}</option>)}
                </select>
              </label>
              <label className="mt-3 block text-sm font-semibold">Your review
                <textarea required minLength={3} maxLength={800} rows={3} value={reviewForm.text} onChange={event => setReviewForm(current => ({ ...current, text: event.target.value }))} className={input} placeholder="Describe your experience" />
              </label>
              {reviewError && <p role="alert" className="mt-2 text-sm font-semibold text-rose-700">{reviewError}</p>}
              <button disabled={reviewBusy} className="mt-3 rounded-xl bg-teal-700 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50">{reviewBusy ? "Publishing…" : "Publish review"}</button>
            </form>
        )}
        {selected.id.startsWith("saved-") && !user && <button onClick={() => { patchAuth({ mode: "login", error: "" }); nav("login"); }} className="mt-4 rounded-xl border border-teal-700 px-4 py-2.5 text-sm font-bold text-teal-800">Sign in to leave a review</button>}
        <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-5"><div><p className="text-xs text-slate-500">Price / rate</p><p className="text-xl font-black">{selected.price}</p></div><span className="flex items-center gap-1 text-sm text-slate-500"><MapPin size={15} />{selected.distanceKm == null ? selected.city || "Location not shared" : `${selected.distanceKm} km away`}</span></div>
      </div>
    </div>
    {Number.isFinite(selected.lat) && Number.isFinite(selected.lng) && <div className="surface sticky bottom-0 mt-4 flex items-center border-t border-slate-200 bg-white p-3 md:rounded-2xl md:border">
      <a href={`https://www.google.com/maps/dir/?api=1&destination=${selected.lat},${selected.lng}`} target="_blank" rel="noreferrer" className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-teal-700 py-3.5 text-sm font-bold text-white"><Navigation size={17} /> Navigate to listing <ExternalLink size={15} /></a>
    </div>}
  </section>;



  const addPage = <section className="mx-auto max-w-2xl">
    <BackBtn onClick={() => nav("home")} label="Back" />
    {success ? <div className="surface rounded-3xl border border-slate-100 bg-white p-8 text-center shadow-sm">
      <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 text-emerald-700"><Check size={38} /></div>
      <h1 className="mt-5 text-2xl font-black">Your listing is saved!</h1>
      <p className="muted mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500">It is stored with your account and is available to neighbours browsing its category.</p>
      <button onClick={() => { setSuccess(false); setStep(1); setForm(EMPTY_FORM); nav("home"); }} className="mt-6 rounded-xl bg-teal-600 px-6 py-3 font-bold text-white">Explore Padosi</button>
    </div> : <div className="surface rounded-3xl border border-slate-100 bg-white p-5 shadow-sm sm:p-8">
      <div className="flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-widest text-teal-700">Share with your neighbourhood</p><h1 className="mt-2 text-2xl font-black">Add a listing</h1></div><span className="rounded-full bg-teal-50 px-3 py-2 text-xs font-bold text-teal-700">Step {step} of 3</span></div>
      <div className="mt-5 flex gap-2">{[1, 2, 3].map(n => <div key={n} className={`h-1.5 flex-1 rounded-full ${step >= n ? "bg-teal-600" : "bg-slate-100"}`} />)}</div>

      {step === 1 && <div className="mt-7"><h2 className="font-bold">What would you like to share?</h2>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">{Object.entries(categoryMeta).map(([type, m]) => { const Icon = m.icon; return <button key={type} onClick={() => {
          if (type === "vendor") {
            if (user?.role === "vendor") nav("vendor");
            else if (user) notify("This account is not a vendor account. Sign out and create a vendor account to set up a dashboard.");
            else {
              patchAuth({ mode: "register", role: "vendor", error: "" });
              nav("login");
            }
            return;
          }
          setForm(f => ({ ...f, type }));
        }} className={`rounded-2xl border p-4 text-left ${form.type === type ? "border-teal-500 bg-teal-50" : "border-slate-200"}`}><Icon size={24} style={{ color: m.color }} /><b className="mt-3 block">{m.label}</b><span className="muted mt-1 block text-xs text-slate-500">{m.desc}</span></button>; })}</div>
        <button onClick={() => setStep(2)} className="mt-6 w-full rounded-xl bg-teal-600 py-3.5 font-bold text-white">Continue <ArrowRight size={16} className="ml-1 inline" /></button>
      </div>}

      {step === 2 && <div className="mt-7 space-y-4"><h2 className="font-bold">Tell neighbours about it</h2>
        {FIELDS.map(([key, label]) => <label key={key} className="block text-sm font-semibold">{key === "name" ? `${label} · account` : label}
          {key === "category" && form.type === "resource"
            ? <select value={form.category} onChange={setField(key)} className={input}>
              <option value="">Choose a resource type</option>
              {RESOURCE_CATEGORIES.map(category => <option key={category} value={category}>{category}</option>)}
            </select>
            : <input value={form[key]} onChange={setField(key)} readOnly={key === "name"} className={`${input} ${key === "name" ? "bg-slate-50" : ""}`} placeholder={label} />}
        </label>)}
        <label className="block text-sm font-semibold">Description<textarea value={form.description} onChange={setField("description")} rows={3} className={input} placeholder="What should people know?" /></label>
        <div className="flex gap-3"><button onClick={() => setStep(1)} className="flex-1 rounded-xl border border-slate-200 py-3 font-bold">Back</button><button disabled={!form.name || !form.category || !form.title || !form.description || !form.price} onClick={() => setStep(3)} className="flex-1 rounded-xl bg-teal-600 py-3 font-bold text-white disabled:opacity-40">Continue</button></div>
      </div>}

      {step === 3 && <div className="mt-7">
        <div className="rounded-2xl bg-teal-50 p-5"><h2 className="font-bold text-teal-950">Review before publishing</h2>
          <dl className="mt-4 grid gap-3 sm:grid-cols-2">
            {[["Publisher", form.name], ["Category", form.category], ["City", form.city], ["Listing", form.title], ["Price / rate", form.price]].map(([label, value]) => <div key={label} className="rounded-xl bg-white/80 p-3"><dt className="text-xs font-semibold text-slate-500">{label}</dt><dd className="mt-1 font-bold">{value}</dd></div>)}
          </dl>
          <p className="mt-3 text-sm leading-6 text-teal-900">{form.description}</p>
        </div>
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
        {auth.mode === "register" && <fieldset className="space-y-2">
          <legend className="text-sm font-semibold">What kind of account are you creating?</legend>
          <div className="grid grid-cols-2 gap-2">
            {[["member", "Community member"], ["vendor", "Vendor"]].map(([role, label]) => <button key={role} type="button" onClick={() => patchAuth({ role, error: "" })} aria-pressed={auth.role === role} className={`rounded-xl border px-3 py-3 text-sm font-bold ${auth.role === role ? "border-teal-600 bg-teal-50 text-teal-800" : "border-slate-200 text-slate-600"}`}>{label}</button>)}
          </div>
          {auth.role === "vendor" && <p className="muted text-xs leading-5 text-slate-500">After email verification, set up your business profile and open your inventory dashboard.</p>}
        </fieldset>}
        <label className="block text-sm font-semibold">Email address<input type="email" required autoComplete="email" value={auth.email} onChange={e => patchAuth({ email: e.target.value, error: "" })} className={input} placeholder="you@example.com" /></label>
        {auth.mode === "register" && <label className="block text-sm font-semibold">Unique username
          <div className="mt-1.5 flex items-center gap-2"><span className="text-lg font-bold text-teal-700">@</span><input type="text" required minLength={3} maxLength={24} pattern="[A-Za-z0-9][A-Za-z0-9_.]{1,22}[A-Za-z0-9]" autoComplete="username" value={auth.username} onChange={event => patchAuth({ username: event.target.value.replace(/[^A-Za-z0-9_.]/g, "").toLowerCase(), error: "" })} className={input} placeholder="choose-a-unique-name" /></div>
          <span className="muted mt-1 block text-xs text-slate-500">3–24 characters; letters, numbers, periods, and underscores. You’ll use this unique @handle on your profile.</span>
        </label>}
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

  const vendorDashboard = <section className="mx-auto max-w-4xl">
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div><p className="text-xs font-bold uppercase tracking-[0.18em] text-teal-700">Vendor workspace</p><h1 className="mt-1 text-2xl font-black">Vendor dashboard</h1><p className={sub}>Manage your business profile and keep your available items up to date.</p></div>
      {vendorProfile && <span className="rounded-full bg-teal-50 px-3 py-2 text-xs font-bold text-teal-800">{vendorProfile.category}</span>}
    </div>
    {vendorDashboardLoading && <p role="status" className="surface rounded-xl p-4 text-sm text-slate-600">Loading your saved vendor data…</p>}
    {vendorDashboardError && <p role="alert" className="mb-4 rounded-xl bg-rose-50 p-4 text-sm font-semibold text-rose-700">{vendorDashboardError}</p>}
    {vendorFormError && <p role="alert" className="mb-4 rounded-xl bg-rose-50 p-4 text-sm font-semibold text-rose-700">{vendorFormError}</p>}
    {!vendorDashboardLoading && user?.role !== "vendor" && <div className="surface rounded-2xl p-6">
      <h2 className="text-lg font-black">Vendor account required</h2>
      <p className={sub}>Sign in with a vendor account to create a business profile and manage inventory.</p>
      <button onClick={() => { patchAuth({ mode: "register", role: "vendor", error: "" }); nav("login"); }} className="mt-4 rounded-xl bg-teal-700 px-5 py-3 text-sm font-bold text-white">Create a vendor account</button>
    </div>}
    {!vendorDashboardLoading && user?.role === "vendor" && !vendorProfile && <form onSubmit={saveVendorProfile} className="surface rounded-3xl p-5 sm:p-8">
      <p className="text-xs font-black uppercase tracking-[0.16em] text-teal-700">Step 1 · List your business</p>
      <h2 className="mt-2 text-xl font-black">Create your vendor profile</h2>
      <p className={sub}>This is your public vendor identity. Once saved, you can add the items you currently offer.</p>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-semibold">Business or vendor name<input required minLength={2} maxLength={80} value={vendorProfileForm.business_name} onChange={setVendorProfileField("business_name")} className={input} placeholder="Your shop or service name" /></label>
        <label className="block text-sm font-semibold">Primary category<select required value={vendorProfileForm.category} onChange={setVendorProfileField("category")} className={input}><option value="">Choose a category</option>{VENDOR_CATEGORIES.map(category => <option key={category} value={category}>{category}</option>)}</select></label>
        <label className="block text-sm font-semibold sm:col-span-2">City<input required minLength={2} maxLength={80} value={vendorProfileForm.city} onChange={setVendorProfileField("city")} className={input} placeholder="Your service city" /></label>
        <label className="block text-sm font-semibold sm:col-span-2">About your business<textarea maxLength={800} rows={3} value={vendorProfileForm.description} onChange={setVendorProfileField("description")} className={input} placeholder="Describe what you offer to neighbours" /></label>
      </div>
      <button disabled={vendorBusy} className="mt-5 w-full rounded-xl bg-teal-700 py-3.5 font-bold text-white disabled:opacity-50">{vendorBusy ? "Saving…" : "Save vendor profile"}</button>
    </form>}
    {!vendorDashboardLoading && vendorProfile && <>
      <div className="surface rounded-3xl p-5 sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div><p className="text-xs font-black uppercase tracking-widest text-teal-700">Your public vendor listing</p><h2 className="mt-2 text-xl font-black">{vendorProfile.business_name}</h2><p className="muted mt-1 text-sm text-slate-500">{vendorProfile.city} · {vendorProfile.category}</p>{vendorProfile.description && <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">{vendorProfile.description}</p>}</div>
          <span className="rounded-full bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800">Profile saved</span>
        </div>
      </div>
      <form onSubmit={addVendorItem} className="surface mt-5 rounded-3xl p-5 sm:p-7">
        <p className="text-xs font-black uppercase tracking-widest text-teal-700">Step 2 · Manage your inventory</p>
        <h2 className="mt-2 text-xl font-black">Add an item to {vendorProfile.category}</h2>
        <p className={sub}>Items are saved to your vendor account and shown publicly under your business name and chosen category.</p>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-semibold">Item name<input required minLength={3} maxLength={120} value={vendorItemForm.title} onChange={setVendorItemField("title")} className={input} placeholder="Item or service you have" /></label>
          <label className="block text-sm font-semibold">Price / rate<input required maxLength={80} value={vendorItemForm.price} onChange={setVendorItemField("price")} className={input} placeholder="₹ price, negotiable, or free" /></label>
          <label className="block text-sm font-semibold sm:col-span-2">Item details<textarea required minLength={10} maxLength={800} rows={3} value={vendorItemForm.description} onChange={setVendorItemField("description")} className={input} placeholder="Describe condition, options, or service details" /></label>
          <label className="block text-sm font-semibold">Available quantity<input type="number" min="0" max="100000" required value={vendorItemForm.quantity} onChange={setVendorItemField("quantity")} className={input} /></label>
        </div>
        <label className="surface mt-4 flex cursor-pointer items-start gap-3 rounded-xl p-4">
          <input type="checkbox" checked={vendorItemLocation} onChange={event => setVendorItemLocation(event.target.checked)} className="mt-1 h-4 w-4 accent-teal-700" />
          <span><span className="font-bold">Add this device location to the map pin</span><span className="muted mt-1 block text-xs leading-5 text-slate-500">Optional. Your browser asks for permission when you save. The coordinates are stored with this item so map visitors can find it.</span></span>
        </label>
        <button disabled={vendorBusy} className="mt-4 w-full rounded-xl bg-teal-700 py-3.5 font-bold text-white disabled:opacity-50">{vendorBusy ? "Saving item…" : "Save item to inventory"}</button>
      </form>
      <div className="mt-7">
        <div className="mb-3 flex items-end justify-between gap-3"><div><h2 className="text-lg font-black">Your listed items</h2><p className={sub}>Saved to your account and available across sign-ins.</p></div><span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700">{vendorItems.length} items</span></div>
        {vendorItems.length ? <div className="grid gap-3 sm:grid-cols-2">{vendorItems.map(item => <article key={item.id} className="surface rounded-2xl p-4">
          <div className="flex items-start justify-between gap-3"><div className="min-w-0"><span className="rounded-full bg-teal-50 px-2.5 py-1 text-[10px] font-black uppercase text-teal-800">{item.category}</span><h3 className="mt-3 font-black">{item.title}</h3><p className="muted mt-1 line-clamp-2 text-sm text-slate-500">{item.description}</p></div><button type="button" onClick={() => removeVendorItem(item)} aria-label={`Remove ${item.title}`} className="shrink-0 rounded-lg px-3 py-2 text-xs font-bold text-rose-700 hover:bg-rose-50">Remove</button></div>
          <div className="mt-4 flex items-center justify-between border-t border-slate-200 pt-3 text-sm"><span className="font-bold">{item.price}</span><span className="muted text-xs text-slate-500">Available: {item.quantity}</span></div>
        </article>)}</div> : <div className="surface rounded-2xl p-6 text-center"><p className="font-bold">No items listed yet</p><p className={sub}>Add your first item above. It will be saved to your vendor account.</p></div>}
      </div>
    </>}
  </section>;

  const profileTitle = user?.display_name || "Set your display name";
  const profileAvatar = profileForm.image
    ? <img src={profileForm.image} alt={`${profileTitle}'s profile`} className="h-full w-full rounded-full object-cover" />
    : <UserRound size={32} />;
  const profile = <section className="mx-auto max-w-2xl">
    <div className="mb-5"><p className="text-xs font-bold uppercase tracking-[0.18em] text-teal-700">Your neighbourhood identity</p><h1 className="mt-1 text-2xl font-black">Profile</h1><p className={sub}>Manage how you appear to the Padosi community.</p></div>
    <div className="surface rounded-[2rem] p-6 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-teal-100 text-teal-800 shadow-[inset_4px_4px_8px_#c4cdd6,inset_-4px_-4px_8px_#ffffff]">{profileAvatar}</div>
          <div><h2 className="text-xl font-black">{profileTitle}</h2>{user && <><p className="mt-1 text-sm font-semibold text-teal-700">{user.username ? `@${user.username}` : "Username not set"}</p><p className={sub}>{user.email}</p></>}</div>
        </div>
        {user && <button onClick={() => {
          setProfileForm(current => ({ ...current, name: user.display_name || "" }));
          setProfileEditing(true);
          setProfileSaved(false);
          setProfileImageError("");
        }} className="surface rounded-xl px-4 py-2.5 text-sm font-bold text-teal-800">Edit profile</button>}
      </div>
      {profileSaved && <p role="status" className="mt-4 text-xs font-semibold text-emerald-700">Your display name is saved to your account.</p>}
      {user && <dl className="mt-7 grid gap-3 sm:grid-cols-2">
        <div className="surface rounded-xl p-4"><dt className="text-xs font-semibold text-slate-500">Display name</dt><dd className="mt-1 font-bold">{user.display_name || "Not set"}</dd></div>
        <div className="surface rounded-xl p-4"><dt className="text-xs font-semibold text-slate-500">Username</dt><dd className="mt-1 font-bold">{user.username ? `@${user.username}` : "Not set"}</dd></div>
        <div className="surface rounded-xl p-4"><dt className="text-xs font-semibold text-slate-500">Email</dt><dd className="mt-1 break-all font-bold">{user.email}</dd></div>
        <div className="surface rounded-xl p-4"><dt className="text-xs font-semibold text-slate-500">Account type</dt><dd className="mt-1 font-bold capitalize">{user.role}</dd></div>
      </dl>}
      {user?.role === "vendor" && <button onClick={() => nav("vendor")} className="mt-5 w-full rounded-xl bg-teal-700 py-3 font-bold text-white">Open vendor dashboard</button>}
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {authRestoring ? <p role="status" className="surface rounded-xl py-3 text-center text-sm text-slate-500">Checking your sign-in…</p> : user ? <button onClick={logout} className="surface flex items-center justify-center gap-2 rounded-xl py-3 font-bold"><LogOut size={17} /> Sign out</button> : <button onClick={() => nav("login")} className="rounded-xl bg-teal-700 py-3 font-bold text-white">Sign in or create account</button>}
        <button onClick={() => setDark(v => !v)} className="surface flex items-center justify-center gap-2 rounded-xl py-3 font-bold"><span className="flex items-center gap-2">{dark ? <Sun size={18} /> : <Moon size={18} />} Appearance</span><span className="text-xs text-slate-500">{dark ? "Dark" : "Light"}</span></button>
      </div>
      {user && <p className="muted mt-5 text-xs leading-5 text-slate-500">Your username and display name are saved to your account. Your profile photo is kept in this browser.</p>}
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
      </div>
      <div className="mt-6 flex gap-3"><button type="button" onClick={() => setProfileEditing(false)} className="surface flex-1 rounded-xl py-3 font-bold">Cancel</button><button type="submit" className="flex-1 rounded-xl bg-teal-700 py-3 font-bold text-white">Save profile</button></div>
    </form>
  </section>;

  const recoveryPage = <section className="mx-auto max-w-lg">
    <BackBtn onClick={() => nav("login")} label="Back to sign in" />
    <div className="surface rounded-[2rem] p-6 sm:p-8">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-800"><KeyRound size={26} /></div>
      <p className="mt-5 text-xs font-black uppercase tracking-[0.18em] text-amber-800">Account recovery</p>
      <h1 className="mt-2 text-2xl font-black">Forgot your password?</h1>
      <p className={sub}>We can’t reset passwords yet. The current API has no password-reset endpoint, and registration email codes are only for initial account verification.</p>
      {recoveryEmail && <p className="surface mt-5 rounded-xl p-3 text-sm"><span className="font-semibold text-slate-500">Account email</span><br /><span className="font-bold">{recoveryEmail}</span></p>}
      <div className="mt-5 rounded-2xl bg-amber-50 p-4 text-sm leading-6 text-amber-950"><b>For account safety, no reset email will be sent from this screen.</b> Enabling password reset requires a backend route that verifies a recovery token and updates the stored password.</div>
      <button onClick={() => nav("login")} className="mt-6 w-full rounded-xl bg-teal-700 py-3.5 font-bold text-white">Return to sign in</button>
    </div>
  </section>;

  const views = { home, map: mapPage, detail, add: addPage, profile: profileEditing ? profileEdit : profile, vendor: vendorDashboard, login: loginPage, recovery: recoveryPage };

  return <main className="min-h-screen pb-24 md:pb-8">
    {topbar}
    <div className="mx-auto max-w-6xl px-4 py-5 sm:px-6 sm:py-8">{views[active]}</div>
    <BottomNav active={active} setActive={nav} onAdd={openAdd} />
    {toast && <div role="status" className="fixed bottom-24 left-1/2 z-[1000] -translate-x-1/2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-xl md:bottom-6">{toast}</div>}
    {loading && <div className="fixed bottom-24 right-4 z-20 rounded-full bg-white px-3 py-2 text-xs text-slate-500 shadow md:bottom-5">Connecting to Padosi API…</div>}
    {locationPrompt && <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-slate-950/50 p-4" role="presentation">
      <section role="dialog" aria-modal="true" aria-labelledby="location-permission-title" className="surface w-full max-w-md rounded-3xl p-6 sm:p-8">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-100 text-teal-800"><LocateFixed size={26} /></div>
        <p className="mt-5 text-xs font-black uppercase tracking-[0.18em] text-teal-700">Optional location feature</p>
        <h2 id="location-permission-title" className="mt-2 text-2xl font-black">Find resources around you</h2>
        <p className={sub}>Allow your browser to share this device’s location so the map can show your position and filter listings by nearby category and distance. Location is used only on this device; it is not sent to our backend or shared with other users. Tracking continues only while this page is open.</p>
        {userLocationError && <p role="alert" className="mt-4 rounded-xl bg-rose-50 p-3 text-sm font-semibold text-rose-700">{userLocationError}</p>}
        <button onClick={startUserLocationTracking} className="mt-6 w-full rounded-xl bg-teal-700 py-3.5 font-bold text-white">Allow location and open map</button>
        <button onClick={() => { setLocationPrompt(false); setUserLocationError(""); }} className="mt-3 w-full rounded-xl py-3 text-sm font-bold text-slate-600">Not now</button>
      </section>
    </div>}
  </main>;
}
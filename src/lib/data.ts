// Mock data: realistic sample listings for a generic Indian neighbourhood.
// Replace `getListings()` / `getListing()` with Lovable Cloud queries later —
// all pages read listings only through these functions.

export type Category = "resource" | "tutor" | "vendor";

export interface Review {
  id: string;
  author: string;
  rating: number;
  text: string;
  date: string;
  verifiedBooking: boolean;
}

export interface Listing {
  id: string;
  category: Category;
  name: string;
  owner: string;
  photos: string[];
  description: string;
  lat: number;
  lng: number;
  verified: boolean;
  rating: number;
  reviewCount: number;
  trust: {
    verifiedId: boolean;
    completedBookings: number;
    repeatCustomers: number; // percent 0-100
    responseMins: number;
  };
  availability: string;
  reviews: Review[];
  tutor?: { subjects: string[]; feePerClass: number; outcomes: string[] };
  resource?: { condition: "Like new" | "Good" | "Fair"; rentPerDay: number; deposit: number; pickup: string };
  vendor?: { sells: string[]; live: boolean; lastUpdatedMins: number };
}

export const NEIGHBOURHOOD = { name: "Green Park Colony", lat: 28.5596, lng: 77.2066 };

export const CATEGORY_META: Record<Category, { label: string; plural: string; action: string }> = {
  resource: { label: "Resource", plural: "Resources", action: "Request" },
  tutor: { label: "Tutor", plural: "Tutors", action: "Book demo" },
  vendor: { label: "Live vendor", plural: "Live vendors", action: "Navigate" },
};

const u = (id: string) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=800&q=70`;

const r = (id: string, author: string, rating: number, text: string, date: string, verifiedBooking = true): Review => ({
  id, author, rating, text, date, verifiedBooking,
});

export const LISTINGS: Listing[] = [
  {
    id: "t-math", category: "tutor", name: "Maths with Meera Ma'am", owner: "Meera Iyer",
    photos: [u("photo-1635070041078-e363dbe005cb"), u("photo-1509228468518-180dd4864904"), u("photo-1596495578065-6e0763fa1178")],
    description: "Retired KV maths teacher. Classes 6–12, CBSE & ICSE. Small batches of 4 at my home, or one-on-one.",
    lat: 28.5612, lng: 77.2081, verified: true, rating: 4.9, reviewCount: 86,
    trust: { verifiedId: true, completedBookings: 312, repeatCustomers: 78, responseMins: 12 },
    availability: "Mon–Sat, 4 pm – 8 pm",
    tutor: { subjects: ["Algebra", "Geometry", "Calculus", "Board prep"], feePerClass: 400, outcomes: ["Aarav: 62 → 91 in Class 10 boards", "Riya cleared JEE Mains (98.2 %ile)", "14 students scored 90+ in 2025"] },
    reviews: [
      r("r1", "Sunita K.", 5, "My son finally stopped fearing maths. Patient and very clear.", "2 weeks ago"),
      r("r2", "Vikram S.", 5, "Board results speak for themselves. Highly recommend.", "1 month ago"),
      r("r3", "Pooja M.", 4, "Excellent teacher, timings fill up fast.", "2 months ago"),
    ],
  },
  {
    id: "t-guitar", category: "tutor", name: "Strum with Rohan", owner: "Rohan D'Souza",
    photos: [u("photo-1510915361894-db8b60106cb1"), u("photo-1525201548942-d8732f6617a0")],
    description: "Acoustic & electric guitar for beginners to intermediate. Learn your favourite Bollywood songs in 4 weeks.",
    lat: 28.5571, lng: 77.2032, verified: true, rating: 4.7, reviewCount: 41,
    trust: { verifiedId: true, completedBookings: 140, repeatCustomers: 64, responseMins: 25 },
    availability: "Weekends, 10 am – 6 pm",
    tutor: { subjects: ["Acoustic guitar", "Chords & strumming", "Music theory"], feePerClass: 600, outcomes: ["9 students passed Trinity Grade 3", "Student band played at RWA Diwali mela"] },
    reviews: [
      r("r4", "Ananya", 5, "Super fun classes, my daughter loves it.", "3 weeks ago"),
      r("r5", "Karan B.", 4, "Good teacher, sometimes reschedules.", "1 month ago"),
    ],
  },
  {
    id: "t-coding", category: "tutor", name: "Kids Coding Club", owner: "Priya Nair",
    photos: [u("photo-1503676260728-1c00da094a0b"), u("photo-1516321318423-f06f85e504b3")],
    description: "Scratch and Python for ages 8–14. Project-based — every kid builds a game.",
    lat: 28.5648, lng: 77.2102, verified: true, rating: 4.8, reviewCount: 29,
    trust: { verifiedId: true, completedBookings: 88, repeatCustomers: 70, responseMins: 18 },
    availability: "Tue, Thu, Sat · 5 pm – 7 pm",
    tutor: { subjects: ["Scratch", "Python basics", "Logic"], feePerClass: 500, outcomes: ["3 kids won school hackathon", "Avg. 6 projects per student"] },
    reviews: [r("r6", "Neha G.", 5, "My son built his own quiz game!", "1 week ago")],
  },
  {
    id: "t-yoga", category: "tutor", name: "Morning Yoga — Ramesh ji", owner: "Ramesh Gupta",
    photos: [u("photo-1544367567-0f2fcb009e0b")],
    description: "Hatha yoga in the colony park. All ages welcome.",
    lat: 28.5545, lng: 77.1985, verified: false, rating: 4.1, reviewCount: 7,
    trust: { verifiedId: false, completedBookings: 9, repeatCustomers: 30, responseMins: 180 },
    availability: "Daily, 6 am – 7 am",
    tutor: { subjects: ["Hatha yoga", "Pranayama"], feePerClass: 150, outcomes: ["New listing — few results yet"] },
    reviews: [r("r7", "Mr. Bhatia", 4, "Good session but started late twice.", "1 month ago", false)],
  },
  {
    id: "res-3dp", category: "resource", name: "Creality Ender 3 V3 — 3D printer", owner: "Arjun Mehta",
    photos: [u("photo-1631541909061-71e349d1f203"), u("photo-1615286922420-c6b348ffbd62")],
    description: "Well-calibrated 3D printer with PLA spools. I'll show you how to slice and start a print.",
    lat: 28.5603, lng: 77.2047, verified: true, rating: 4.8, reviewCount: 23,
    trust: { verifiedId: true, completedBookings: 47, repeatCustomers: 55, responseMins: 30 },
    availability: "Any day with 1-day notice",
    resource: { condition: "Like new", rentPerDay: 350, deposit: 3000, pickup: "B-14, Green Park Colony" },
    reviews: [r("r8", "Ishaan", 5, "Printed my college project overnight. Arjun was super helpful.", "2 weeks ago")],
  },
  {
    id: "res-drill", category: "resource", name: "Bosch impact drill + bit set", owner: "Harpreet Singh",
    photos: [u("photo-1504148455328-c376907d081c"), u("photo-1572981779307-38b8cabb2407")],
    description: "Heavy-duty drill for wall mounts and furniture. Comes with 20-piece bit set.",
    lat: 28.5588, lng: 77.2091, verified: true, rating: 4.6, reviewCount: 34,
    trust: { verifiedId: true, completedBookings: 61, repeatCustomers: 40, responseMins: 45 },
    availability: "Evenings & weekends",
    resource: { condition: "Good", rentPerDay: 0, deposit: 1000, pickup: "C-3 gate, near temple" },
    reviews: [r("r9", "Divya", 5, "Free and saved me buying one. Thank you!", "5 days ago")],
  },
  {
    id: "res-keyboard", category: "resource", name: "Yamaha PSR keyboard (61 keys)", owner: "Sneha Kapoor",
    photos: [u("photo-1520523839897-bd0b52f945a0")],
    description: "Perfect for practice. Stand and adapter included.",
    lat: 28.5629, lng: 77.2019, verified: true, rating: 4.5, reviewCount: 12,
    trust: { verifiedId: true, completedBookings: 18, repeatCustomers: 35, responseMins: 60 },
    availability: "Weekly rentals preferred",
    resource: { condition: "Good", rentPerDay: 200, deposit: 2500, pickup: "A-22, 2nd floor" },
    reviews: [r("r10", "Tanvi", 4, "Works great, one key slightly sticky.", "1 month ago")],
  },
  {
    id: "res-tent", category: "resource", name: "4-person camping tent", owner: "Kabir Rao",
    photos: [u("photo-1504280390367-361c6d9f38f4")],
    description: "Used twice for Rishikesh trips. Waterproof.",
    lat: 28.5527, lng: 77.2125, verified: false, rating: 3.8, reviewCount: 4,
    trust: { verifiedId: false, completedBookings: 5, repeatCustomers: 0, responseMins: 300 },
    availability: "Ask first",
    resource: { condition: "Fair", rentPerDay: 150, deposit: 1500, pickup: "Near metro gate 2" },
    reviews: [r("r11", "Aditya", 3, "Tent was fine, owner replied late.", "3 months ago", false)],
  },
  {
    id: "v-chai", category: "vendor", name: "Raju's Chai Cart", owner: "Raju Yadav",
    photos: [u("photo-1571934811356-5cc061b6821f"), u("photo-1561336526-2914f13ceb36")],
    description: "Kadak adrak chai and fresh bun-maska since 2009. Moves between the market and the park.",
    lat: 28.5598, lng: 77.2071, verified: true, rating: 4.9, reviewCount: 212,
    trust: { verifiedId: true, completedBookings: 900, repeatCustomers: 88, responseMins: 5 },
    availability: "6:30 am – 11 am, 4 pm – 9 pm",
    vendor: { sells: ["Adrak chai ₹15", "Bun maska ₹25", "Poha ₹30"], live: true, lastUpdatedMins: 2 },
    reviews: [r("r12", "Office uncle", 5, "Best chai in South Delhi, no debate.", "Yesterday")],
  },
  {
    id: "v-veg", category: "vendor", name: "Shanti Devi Sabziwali", owner: "Shanti Devi",
    photos: [u("photo-1542838132-92c53300491e"), u("photo-1540420773420-3366772f4999")],
    description: "Fresh vegetables from Azadpur mandi every morning. Fair prices, honest weight.",
    lat: 28.5620, lng: 77.2058, verified: true, rating: 4.7, reviewCount: 96,
    trust: { verifiedId: true, completedBookings: 520, repeatCustomers: 82, responseMins: 10 },
    availability: "7 am – 12 pm, 5 pm – 8 pm",
    vendor: { sells: ["Seasonal vegetables", "Herbs", "Fruits"], live: true, lastUpdatedMins: 7 },
    reviews: [r("r13", "Mrs. Sharma", 5, "Always fresh. She keeps coriander free for regulars!", "3 days ago")],
  },
  {
    id: "v-repair", category: "vendor", name: "QuickFix Mobile Repair", owner: "Salim Khan",
    photos: [u("photo-1512054502232-10a0a035d672")],
    description: "Screen guards, battery swaps, charging port fixes while you wait.",
    lat: 28.5566, lng: 77.2099, verified: true, rating: 4.4, reviewCount: 58,
    trust: { verifiedId: true, completedBookings: 210, repeatCustomers: 45, responseMins: 20 },
    availability: "11 am – 8 pm (closed Tue)",
    vendor: { sells: ["Screen guards", "Battery replacement", "Charging port repair"], live: false, lastUpdatedMins: 95 },
    reviews: [r("r14", "Rahul", 4, "Fixed my port in 20 mins.", "1 week ago")],
  },
  {
    id: "v-momo", category: "vendor", name: "Tashi's Momo Stall", owner: "Tashi Dorje",
    photos: [u("photo-1534422298391-e4f8c172dddb")],
    description: "Steamed & fried momos with spicy red chutney. Evenings only.",
    lat: 28.5640, lng: 77.2120, verified: false, rating: 4.2, reviewCount: 15,
    trust: { verifiedId: false, completedBookings: 30, repeatCustomers: 50, responseMins: 90 },
    availability: "5 pm – 10 pm",
    vendor: { sells: ["Veg momos ₹60", "Chicken momos ₹80"], live: true, lastUpdatedMins: 14 },
    reviews: [r("r15", "Simran", 4, "Tasty, but location changes a lot.", "2 weeks ago", false)],
  },
  {
    id: "v-iron", category: "vendor", name: "Press-wala Mohan", owner: "Mohan Lal",
    photos: [u("photo-1489274495757-95c7c837b101")],
    description: "Clothes ironing ₹10 per piece. Pickup from your gate.",
    lat: 28.5579, lng: 77.2009, verified: false, rating: 3.6, reviewCount: 6,
    trust: { verifiedId: false, completedBookings: 12, repeatCustomers: 20, responseMins: 240 },
    availability: "8 am – 6 pm",
    vendor: { sells: ["Ironing ₹10/pc", "Starch ₹20/pc"], live: false, lastUpdatedMins: 300 },
    reviews: [r("r16", "Kriti", 3, "Okay work, delayed once.", "1 month ago", false)],
  },
];

/** Composite trust score 0-100 from the four signals. */
export function trustScore(l: Listing): number {
  const t = l.trust;
  const id = t.verifiedId ? 1 : 0;
  const bookings = Math.min(t.completedBookings / 200, 1);
  const repeat = t.repeatCustomers / 100;
  const response = Math.max(0, 1 - t.responseMins / 240);
  return Math.round(id * 25 + bookings * 30 + repeat * 25 + response * 20);
}

export function trustBreakdown(l: Listing) {
  const t = l.trust;
  return [
    { label: "Verified ID", value: t.verifiedId ? 100 : 0, detail: t.verifiedId ? "Government ID checked" : "Not yet verified" },
    { label: "Completed bookings", value: Math.round(Math.min(t.completedBookings / 200, 1) * 100), detail: `${t.completedBookings} bookings` },
    { label: "Repeat customers", value: t.repeatCustomers, detail: `${t.repeatCustomers}% come back` },
    { label: "Response time", value: Math.round(Math.max(0, 1 - t.responseMins / 240) * 100), detail: t.responseMins < 60 ? `~${t.responseMins} min` : `~${Math.round(t.responseMins / 60)} hr` },
  ];
}

export function distanceKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos((aLat * Math.PI) / 180) * Math.cos((bLat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

/** Ranking: 70% trust, 30% closeness (within 5 km). Higher is better. */
export function rankScore(trust: number, km: number): number {
  return trust * 0.7 + (1 - Math.min(km, 5) / 5) * 30;
}

export interface RankedListing extends Listing {
  score: number;
  km: number;
}

export function rankListings(list: Listing[], origin = NEIGHBOURHOOD): RankedListing[] {
  return list
    .map((l) => {
      const km = distanceKm(origin.lat, origin.lng, l.lat, l.lng);
      return { ...l, score: trustScore(l), km };
    })
    .sort((a, b) => rankScore(b.score, b.km) - rankScore(a.score, a.km));
}

export function formatKm(km: number) {
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;
}

export function formatAgo(mins: number) {
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  return `${Math.round(mins / 60)} hr ago`;
}

export function priceLabel(l: Listing): string | null {
  if (l.tutor) return `₹${l.tutor.feePerClass}/class`;
  if (l.resource) return l.resource.rentPerDay === 0 ? "Free" : `₹${l.resource.rentPerDay}/day`;
  return null;
}

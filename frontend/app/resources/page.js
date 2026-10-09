import Link from "next/link";
import {
  ArrowLeft,
  BookOpenText,
  Boxes,
  BriefcaseBusiness,
  HeartPulse,
  Home,
  Laptop,
  Lightbulb,
  MapPinned,
  Package,
  Sparkles,
  Truck,
  UsersRound,
  Wrench,
} from "lucide-react";

const resourceTypes = [
  {
    name: "Infrastructure",
    subtitle: "Spaces, utilities and facilities",
    description: "Find community rooms, work areas, power backup, internet access and other shared facilities.",
    icon: MapPinned,
    tint: "#E0F2FE",
    color: "#0369A1",
  },
  {
    name: "Consumables",
    subtitle: "Everyday supplies and materials",
    description: "Source groceries, stationery, garden supplies, building materials and other useful essentials.",
    icon: Package,
    tint: "#DCFCE7",
    color: "#15803D",
  },
  {
    name: "Human & skills",
    subtitle: "People, knowledge and services",
    description: "Connect with tutors, repair professionals, caregivers, translators and skilled neighbours.",
    icon: UsersRound,
    tint: "#FCE7F3",
    color: "#BE185D",
  },
  {
    name: "Commercials",
    subtitle: "Business and trade resources",
    description: "Discover shop and office spaces, business equipment, local suppliers and commercial services.",
    icon: BriefcaseBusiness,
    tint: "#EDE9FE",
    color: "#6D28D9",
  },
  {
    name: "Tools & equipment",
    subtitle: "For repairs and home projects",
    description: "Borrow drills, ladders, sewing machines, pressure washers and other useful equipment.",
    icon: Wrench,
    tint: "#FFF1D6",
    color: "#A16207",
  },
  {
    name: "Transport & logistics",
    subtitle: "Get things and people moving",
    description: "Find bicycle and cargo-van access, moving help, local delivery and transport support.",
    icon: Truck,
    tint: "#FFEDD5",
    color: "#C2410C",
  },
  {
    name: "Spaces & venues",
    subtitle: "Places to meet, work and create",
    description: "Browse shared meeting rooms, community halls, gardens, studios and event spaces.",
    icon: Home,
    tint: "#FEF3C7",
    color: "#A16207",
  },
  {
    name: "Digital & connectivity",
    subtitle: "Technology and online help",
    description: "Access Wi-Fi, devices, printing, digital setup and practical tech support nearby.",
    icon: Laptop,
    tint: "#DBEAFE",
    color: "#1D4ED8",
  },
  {
    name: "Books & study",
    subtitle: "Learn and explore",
    description: "Find textbooks, exam prep guides, novels and quiet study-friendly resources.",
    icon: BookOpenText,
    tint: "#E0F2F1",
    color: "#0F766E",
  },
  {
    name: "Health & wellbeing",
    subtitle: "Care and everyday wellbeing",
    description: "Find local fitness support, wellness practitioners and non-emergency care services.",
    icon: HeartPulse,
    tint: "#FFE4E6",
    color: "#BE123C",
  },
  {
    name: "Home & community",
    subtitle: "Household and neighbourhood help",
    description: "Share kitchenware, cleaning gear, storage, gardening help and community essentials.",
    icon: Boxes,
    tint: "#CCFBF1",
    color: "#0F766E",
  },
  {
    name: "Recreation & events",
    subtitle: "Fun and shared experiences",
    description: "Browse sports gear, party equipment, creative workshops and community activities.",
    icon: Sparkles,
    tint: "#F3E8FF",
    color: "#7C3AED",
  },
  {
    name: "Creative & repair skills",
    subtitle: "Make, mend and learn",
    description: "Find sewing, tailoring, design, craft, appliance repair and hands-on workshop support.",
    icon: Lightbulb,
    tint: "#FEF9C3",
    color: "#A16207",
  },
];

export default function ResourcesPage() {
  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        <Link href="/" className="mb-5 inline-flex items-center gap-2 text-sm font-bold text-teal-700">
          <ArrowLeft size={16} /> Back to home
        </Link>

        <section className="rounded-3xl bg-gradient-to-br from-teal-700 to-teal-500 p-6 text-white shadow-md sm:p-8">
          <p className="text-sm font-semibold text-teal-50">Borrow, share, save</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Resource types</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-teal-50">
            Find shared facilities, supplies, skills, services and business resources offered by your community.
          </p>
        </section>

        <section className="mt-7 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {resourceTypes.map(({ name, subtitle, description, icon: Icon, tint, color }) => (
            <Link key={name} href={`/?q=${encodeURIComponent(name)}`} className="surface group rounded-3xl border border-slate-100 bg-white p-5 text-left shadow-sm transition hover:-translate-y-1 hover:shadow-md">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl" style={{ background: tint, color }}>
                <Icon size={24} />
              </div>
              <div className="mt-4">
                <p className="text-lg font-black text-slate-900">{name}</p>
                <p className="mt-1 text-sm font-semibold text-teal-700">{subtitle}</p>
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-600">{description}</p>
              <div className="mt-4 flex items-center justify-between text-sm font-bold text-slate-700">
                <span>Browse listings</span>
                <span aria-hidden="true">→</span>
              </div>
            </Link>
          ))}
        </section>
      </div>
    </main>
  );
}

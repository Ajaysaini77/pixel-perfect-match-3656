import Link from "next/link";
import { ArrowLeft, BookOpenText, Home, MonitorSmartphone, Sparkles, Wrench } from "lucide-react";

const resourceTypes = [
  {
    name: "Tools & equipment",
    subtitle: "For repairs and home projects",
    description: "Borrow drills, ladders, pressure washers and other everyday essentials.",
    icon: Wrench,
    tint: "#FFF1D6",
    color: "#A16207",
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
    name: "Home essentials",
    subtitle: "Kitchen, cleaning and more",
    description: "Share cookware, cleaning gear, storage solutions and small household helpers.",
    icon: Home,
    tint: "#FCE7F3",
    color: "#BE185D",
  },
  {
    name: "Electronics",
    subtitle: "Chargers, gadgets and more",
    description: "Access project gear, chargers, adapters and tech for short-term use.",
    icon: MonitorSmartphone,
    tint: "#DBEAFE",
    color: "#1D4ED8",
  },
  {
    name: "Recreation & events",
    subtitle: "Fun and shared experiences",
    description: "Browse sports items, party equipment and community-friendly activity gear.",
    icon: Sparkles,
    tint: "#F3E8FF",
    color: "#7C3AED",
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
            Discover everyday essentials available nearby from neighbours and community members.
          </p>
        </section>

        <section className="mt-7 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {resourceTypes.map(({ name, subtitle, description, icon: Icon, tint, color }) => (
            <Link key={name} href="/" className="surface group rounded-3xl border border-slate-100 bg-white p-5 text-left shadow-sm transition hover:-translate-y-1 hover:shadow-md">
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

import { ClipboardCheck, Database, Heart, LayoutDashboard, LogOut, PackageCheck, ScrollText, Store, Users } from "lucide-react";
import Link from "next/link";
import { chatGPTSignOutPath } from "@/app/chatgpt-auth";
import { requireAdministrator } from "@/lib/server/admin";

export const dynamic = "force-dynamic";

const navigation = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/donations", label: "Donations", icon: Store },
  { href: "/admin/pickups", label: "Pickups", icon: PackageCheck },
  { href: "/admin/audit", label: "Audit log", icon: ScrollText },
  { href: "/admin/system", label: "System", icon: Database },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user } = await requireAdministrator("/admin");
  return <div className="min-h-screen bg-[#f6f6f1] text-[#17332f]"><header className="border-b border-[#dfe4dc] bg-white"><div className="mx-auto flex h-[72px] max-w-[1500px] items-center justify-between px-5 lg:px-8"><Link href="/admin" className="flex items-center gap-3"><span className="logo-mark"><Heart className="size-5 fill-current" /></span><div><p className="font-display text-xl font-bold">FoodBridge Admin</p><p className="text-xs text-[#78908b]">Operations control center</p></div></Link><div className="flex items-center gap-3"><div className="hidden text-right sm:block"><p className="text-sm font-bold">{user.displayName}</p><p className="text-xs text-[#78908b]">{user.email}</p></div><a href={chatGPTSignOutPath("/")} target="_top" className="flex size-9 items-center justify-center rounded-full hover:bg-[#edf0eb]" aria-label="Sign out"><LogOut className="size-4" /></a></div></div></header><div className="mx-auto grid max-w-[1500px] lg:grid-cols-[220px_minmax(0,1fr)]"><aside className="border-b border-[#dfe4dc] bg-white px-4 py-4 lg:min-h-[calc(100vh-72px)] lg:border-b-0 lg:border-r lg:py-7"><nav className="grid grid-cols-3 gap-1 lg:grid-cols-1" aria-label="Admin monitoring">{navigation.map(({ href, label, icon: Icon }) => <Link key={href} href={href} className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-bold text-[#60756f] hover:bg-[#edf0eb] hover:text-[#17332f]"><Icon className="size-4" /> {label}</Link>)}</nav><div className="mt-6 hidden rounded-2xl bg-[#153f3a] p-4 text-white lg:block"><ClipboardCheck className="size-5 text-[#f6b94b]" /><p className="mt-4 text-sm font-bold">Admin access verified</p><p className="mt-1 text-xs leading-5 text-white/60">Every page and write action is checked on the server.</p></div><Link href="/app" className="mt-6 hidden px-3 text-sm font-bold text-[#d7552d] lg:block">← Return to app</Link></aside><main className="min-w-0 px-5 py-7 lg:px-8 lg:py-9">{children}</main></div></div>;
}

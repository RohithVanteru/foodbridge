import { BadgeCheck, Building2, Clock3, Heart, LogOut, ShieldAlert } from "lucide-react";
import { eq } from "drizzle-orm";
import Link from "next/link";
import { redirect } from "next/navigation";
import { chatGPTSignOutPath, requireChatGPTUser } from "@/app/chatgpt-auth";
import { getDb } from "@/db";
import { profiles } from "@/db/schema";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const user = await requireChatGPTUser("/account");
  const db = getDb();
  const [profile] = await db.select().from(profiles).where(eq(profiles.id, user.userId)).limit(1);
  if (!profile) redirect("/onboarding");

  const verified = profile.verificationStatus === "verified";
  const rejected = profile.verificationStatus === "rejected";
  return <main className="grid min-h-screen place-items-center bg-[#f6f6f1] px-5 py-10 text-[#17332f]"><section className="w-full max-w-2xl rounded-[2rem] border border-[#dfe4dc] bg-white p-7 shadow-[0_24px_80px_rgba(23,51,47,.10)] sm:p-10"><Link href="/" className="flex items-center gap-3"><span className="logo-mark"><Heart className="size-5 fill-current" /></span><span className="font-display text-2xl font-bold">Food<span className="text-[#d7552d]">Bridge</span></span></Link><div className="mt-10 flex items-start gap-4"><span className={`flex size-12 shrink-0 items-center justify-center rounded-2xl ${verified ? "bg-[#e5f2eb] text-[#26705d]" : rejected ? "bg-[#fff0e9] text-[#b33c27]" : "bg-[#fff4d6] text-[#9a6700]"}`}>{verified ? <BadgeCheck /> : rejected ? <ShieldAlert /> : <Clock3 />}</span><div><p className="eyebrow">Account status</p><h1 className="font-display mt-2 text-4xl font-bold tracking-[-.05em]">{verified ? "Your account is verified" : rejected ? "Verification needs attention" : "Your account is under review"}</h1><p className="mt-3 leading-7 text-[#60756f]">{verified ? "You can access FoodBridge and use the features available to your role." : rejected ? "The organization details could not be verified. Contact the FoodBridge administrator before submitting new information." : "An administrator will verify your organization details before you can list or accept food."}</p></div></div><dl className="mt-8 grid gap-4 rounded-2xl bg-[#eef3ef] p-5 sm:grid-cols-2"><div><dt className="text-xs font-bold uppercase tracking-[.1em] text-[#78908b]">Signed in as</dt><dd className="mt-1 font-bold">{user.displayName}</dd><dd className="text-sm text-[#60756f]">{user.email}</dd></div><div><dt className="text-xs font-bold uppercase tracking-[.1em] text-[#78908b]">Account type</dt><dd className="mt-1 flex items-center gap-2 font-bold capitalize"><Building2 className="size-4" /> {profile.role}</dd><dd className="text-sm text-[#60756f]">{profile.organizationName ?? "Individual volunteer"}</dd></div></dl><div className="mt-8 flex flex-wrap items-center gap-3">{verified ? <a href="/app" className="rounded-full bg-[#d7552d] px-6 py-3 font-bold text-white">Open dashboard</a> : <a href="/account" className="rounded-full bg-[#153f3a] px-6 py-3 font-bold text-white">Refresh status</a>}<a href={chatGPTSignOutPath("/")} target="_top" className="inline-flex items-center gap-2 rounded-full border border-[#cbd4cb] px-6 py-3 font-bold"><LogOut className="size-4" /> Sign out</a></div></section></main>;
}

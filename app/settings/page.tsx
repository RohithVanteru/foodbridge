import { requireUser } from "@/lib/server/session";
import { AccountSettings } from "@/components/account-settings";
export const dynamic = "force-dynamic";
export default async function Page() { await requireUser("/settings"); return <AccountSettings />; }

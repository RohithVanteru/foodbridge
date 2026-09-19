import { PrivacyControls } from "@/components/privacy-controls";
import { requireUser } from "@/lib/server/session";
export const dynamic = "force-dynamic";
export default async function Page() { await requireUser("/privacy"); return <PrivacyControls />; }

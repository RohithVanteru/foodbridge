import { IncidentManager } from "@/components/incident-manager";
import { requireAdministrator } from "@/lib/server/admin";
export default async function Page() { await requireAdministrator("/admin/incidents"); return <IncidentManager admin />; }

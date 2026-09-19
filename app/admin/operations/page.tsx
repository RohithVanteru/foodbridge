import { OperationsManager } from "@/components/operations-manager";
import { requireAdministrator } from "@/lib/server/admin";
export default async function Page() { await requireAdministrator("/admin/operations"); return <OperationsManager />; }

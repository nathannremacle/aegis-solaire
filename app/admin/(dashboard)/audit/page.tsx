import { getAdminUser } from "@/lib/admin-auth"
import { createServiceRoleClient } from "@/lib/supabase/admin"
import { redirect } from "next/navigation"
import { AuditLogTable } from "./audit-log-table"

async function getAuditLogs() {
  const user = await getAdminUser()
  if (!user) redirect("/admin/login")
  const supabase = createServiceRoleClient()
  const { data, error } = await supabase
    .from("audit_log")
    .select("id, admin_email, action, entity_type, entity_id, details, created_at")
    .order("created_at", { ascending: false })
    .limit(100)
  if (error) return { logs: [] }
  return { logs: data ?? [] }
}

export default async function AdminAuditPage() {
  const { logs } = await getAuditLogs()
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Logs d'audit</h1>
      <p className="text-sm text-muted-foreground">
        Qui a fait quoi (assignation, export CSV, nettoyage RGPD, envoi email installateur).
      </p>
      <AuditLogTable logs={logs} />
    </div>
  )
}

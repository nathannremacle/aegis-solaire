import { createServiceRoleClient } from "@/lib/supabase/admin"

export type AuditAction =
  | "lead_updated"
  | "lead_notify_installateur"
  | "leads_export"
  | "leads_anonymized"

export type AuditEntry = {
  adminEmail: string
  action: AuditAction | string
  entityType: string
  entityId?: string | null
  details?: Record<string, unknown> | null
}

/**
 * Enregistre une action dans les logs d'audit (qui a fait quoi).
 * À appeler depuis les routes admin après getAdminUser().
 */
export async function logAudit(entry: AuditEntry): Promise<void> {
  const supabase = createServiceRoleClient()
  await supabase.from("audit_log").insert({
    admin_email: entry.adminEmail,
    action: entry.action,
    entity_type: entry.entityType,
    entity_id: entry.entityId ?? null,
    details: entry.details ?? null,
  })
}

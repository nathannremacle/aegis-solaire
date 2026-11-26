import type { SupabaseClient } from "@supabase/supabase-js"
import { DEFAULT_DISPUTE_SUSPENSION_REASON } from "@/lib/disputes-policy"

export interface PartnerDisputePrivilege {
  disputes_suspended: boolean
  disputes_suspended_at: string | null
  disputes_suspended_reason: string | null
  disputes_suspended_by?: string | null
}

const DEFAULT_PRIVILEGE: PartnerDisputePrivilege = {
  disputes_suspended: false,
  disputes_suspended_at: null,
  disputes_suspended_reason: null,
  disputes_suspended_by: null,
}

function isMissingSuspensionColumnsError(err: { code?: string; message?: string } | null | undefined): boolean {
  if (!err) return false
  const msg = (err.message || "").toLowerCase()
  return (
    err.code === "42703" ||
    err.code === "PGRST204" ||
    msg.includes("disputes_suspended")
  )
}

/**
 * Lit l'état de suspension des litiges d'un partenaire avec repli sûr si la migration
 * SQL n'a pas encore été exécutée sur l'environnement cible.
 */
export async function fetchPartnerDisputePrivilege(
  supabase: SupabaseClient,
  partnerId: string
): Promise<PartnerDisputePrivilege> {
  if (!partnerId || partnerId === "mock-partner-dev") {
    return DEFAULT_PRIVILEGE
  }

  const { data, error } = await supabase
    .from("partners")
    .select("disputes_suspended, disputes_suspended_at, disputes_suspended_reason, disputes_suspended_by")
    .eq("id", partnerId)
    .maybeSingle()

  if (error) {
    if (isMissingSuspensionColumnsError(error)) {
      return DEFAULT_PRIVILEGE
    }
    return DEFAULT_PRIVILEGE
  }

  if (!data) return DEFAULT_PRIVILEGE

  return {
    disputes_suspended: Boolean((data as any).disputes_suspended),
    disputes_suspended_at: (data as any).disputes_suspended_at ?? null,
    disputes_suspended_reason: (data as any).disputes_suspended_reason ?? null,
    disputes_suspended_by: (data as any).disputes_suspended_by ?? null,
  }
}

/**
 * Charge en lot l'état de suspension des litiges pour une liste d'IDs partenaires.
 */
export async function fetchPartnersDisputePrivilegeMap(
  supabase: SupabaseClient,
  partnerIds: string[]
): Promise<Map<string, PartnerDisputePrivilege>> {
  const map = new Map<string, PartnerDisputePrivilege>()
  const uniqueIds = Array.from(new Set(partnerIds.filter(Boolean)))
  if (uniqueIds.length === 0) return map

  const { data, error } = await supabase
    .from("partners")
    .select("id, disputes_suspended, disputes_suspended_at, disputes_suspended_reason, disputes_suspended_by")
    .in("id", uniqueIds)

  if (error) {
    if (isMissingSuspensionColumnsError(error)) {
      return map
    }
    return map
  }

  for (const row of data ?? []) {
    const r = row as any
    map.set(r.id, {
      disputes_suspended: Boolean(r.disputes_suspended),
      disputes_suspended_at: r.disputes_suspended_at ?? null,
      disputes_suspended_reason: r.disputes_suspended_reason ?? null,
      disputes_suspended_by: r.disputes_suspended_by ?? null,
    })
  }

  return map
}

export async function setPartnerDisputePrivilege(params: {
  supabase: SupabaseClient
  partnerId: string
  suspended: boolean
  reason?: string | null
  adminEmail: string
}): Promise<{ ok: true; data: PartnerDisputePrivilege } | { ok: false; error: string; status: number }> {
  const nowIso = new Date().toISOString()
  const cleanReason = params.suspended
    ? params.reason?.trim() || DEFAULT_DISPUTE_SUSPENSION_REASON
    : null

  const updatePayload = params.suspended
    ? {
        disputes_suspended: true,
        disputes_suspended_at: nowIso,
        disputes_suspended_reason: cleanReason,
        disputes_suspended_by: params.adminEmail,
      }
    : {
        disputes_suspended: false,
        disputes_suspended_at: null,
        disputes_suspended_reason: null,
        disputes_suspended_by: null,
      }

  const { data, error } = await params.supabase
    .from("partners")
    .update(updatePayload)
    .eq("id", params.partnerId)
    .select("id, company_name, email, disputes_suspended, disputes_suspended_at, disputes_suspended_reason, disputes_suspended_by")
    .single()

  if (error) {
    if (isMissingSuspensionColumnsError(error)) {
      return {
        ok: false,
        status: 409,
        error:
          "Les colonnes SQL de suspension des litiges sont absentes. Exécutez d'abord la migration 202611260001_partner_dispute_suspension.sql sur Supabase.",
      }
    }
    return {
      ok: false,
      status: 500,
      error: error.message || "Erreur lors de la mise à jour du statut de litige partenaire.",
    }
  }

  try {
    await params.supabase.from("audit_log").insert({
      admin_email: params.adminEmail,
      action: params.suspended ? "PARTNER_DISPUTES_SUSPENDED" : "PARTNER_DISPUTES_REACTIVATED",
      entity_type: "partners",
      entity_id: params.partnerId,
      details: {
        company_name: (data as any).company_name ?? null,
        disputes_suspended: params.suspended,
        reason: cleanReason,
      },
    })
  } catch {
    /* non-blocking */
  }

  return {
    ok: true,
    data: {
      disputes_suspended: Boolean((data as any).disputes_suspended),
      disputes_suspended_at: (data as any).disputes_suspended_at ?? null,
      disputes_suspended_reason: (data as any).disputes_suspended_reason ?? null,
      disputes_suspended_by: (data as any).disputes_suspended_by ?? null,
    },
  }
}

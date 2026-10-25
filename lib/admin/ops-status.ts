export type OpsStatus =
  | "new"
  | "review"
  | "qualified"
  | "distributed"
  | "disputed"
  | "converted"
  | "archived"

export type LeadOpsInput = {
  status?: string | null
  marketplace_status?: string | null
  archived_at?: string | null
  has_dispute?: boolean
  purchases_count?: number
}

export function deriveOpsStatus(lead: LeadOpsInput): OpsStatus {
  if (lead.archived_at || lead.status === "lost") {
    return "archived"
  }
  if (lead.has_dispute) {
    return "disputed"
  }
  if (lead.status === "converted") {
    return "converted"
  }
  if (lead.marketplace_status === "available" || lead.marketplace_status === "sold_out" || (lead.purchases_count ?? 0) > 0) {
    return "distributed"
  }
  if (lead.status === "qualified") {
    return "qualified"
  }
  if (lead.status === "NEEDS_HUMAN_REVIEW" || lead.marketplace_status === "pending_review") {
    return "review"
  }
  return "new"
}

export const OPS_STATUS_CONFIG: Record<
  OpsStatus,
  {
    label: string
    dotClass: string
    badgeClass: string
    description: string
  }
> = {
  new: {
    label: "Nouveau",
    dotClass: "bg-status-new",
    badgeClass: "bg-status-new/10 text-status-new border-status-new/25",
    description: "Lead entrant non encore audité",
  },
  review: {
    label: "À contrôler",
    dotClass: "bg-status-review",
    badgeClass: "bg-status-review/10 text-status-review border-status-review/25",
    description: "Score faible ou incohérence détectée",
  },
  qualified: {
    label: "Qualifié",
    dotClass: "bg-status-qualified",
    badgeClass: "bg-status-qualified/10 text-status-qualified border-status-qualified/25",
    description: "Vérifié, prêt pour publication ou routage",
  },
  distributed: {
    label: "Distribué",
    dotClass: "bg-status-distributed",
    badgeClass: "bg-primary text-primary-foreground border-transparent",
    description: "Actif sur la marketplace ou déjà attribué",
  },
  disputed: {
    label: "Contesté",
    dotClass: "bg-status-disputed",
    badgeClass: "bg-status-disputed/10 text-status-disputed border-status-disputed/25",
    description: "Litige en attente d'arbitrage",
  },
  converted: {
    label: "Converti",
    dotClass: "bg-status-converted",
    badgeClass: "bg-status-converted/10 text-status-converted border-status-converted/25",
    description: "Chantier signé chez un installateur partenaire",
  },
  archived: {
    label: "Archivé",
    dotClass: "bg-status-archived",
    badgeClass: "bg-status-archived/10 text-status-archived border-status-archived/25",
    description: "Rejeté, faux lead ou expiré",
  },
}

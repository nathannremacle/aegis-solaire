import { NextResponse } from "next/server"
import { getPartner } from "@/lib/partner-auth"
import { createServiceRoleClient } from "@/lib/supabase/admin"

export const dynamic = "force-dynamic"

const PROVINCE_NAMES: Record<string, string> = {
  liege: "Liège",
  hainaut: "Hainaut",
  namur: "Namur",
  brabant_wallon: "Brabant Wallon",
  luxembourg: "Luxembourg",
}

function formatProvince(p: string | null | undefined): string {
  if (!p) return "Wallonie"
  return PROVINCE_NAMES[p.toLowerCase()] || p
}

export async function GET() {
  const partner = await getPartner()
  if (!partner) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  }

  const admin = createServiceRoleClient()

  // 1. Récupérer les achats récents avec informations du lead
  const { data: recentPurchases } = await admin
    .from("lead_purchases")
    .select(`
      id,
      created_at,
      lead_id,
      leads (
        province,
        segment,
        surface_area,
        surface_type
      )
    `)
    .order("created_at", { ascending: false })
    .limit(5)

  // 2. Récupérer les derniers leads mis à disposition
  const { data: newLeads } = await admin
    .from("leads")
    .select("id, province, segment, surface_area, created_at")
    .eq("marketplace_status", "available")
    .order("created_at", { ascending: false })
    .limit(5)

  const items: Array<{
    id: string
    type: "purchase" | "new_lead"
    message: string
    timestamp: string
    badge: string
  }> = []

  if (recentPurchases && recentPurchases.length > 0) {
    for (const p of recentPurchases) {
      const l = (p as any).leads
      if (l) {
        const kwc = Math.round((l.surface_area || 100) * 0.17)
        items.push({
          id: `purch-${p.id}`,
          type: "purchase",
          message: `Un installateur agréé a débloqué un projet ${l.segment} (${kwc} kWc) en province de ${formatProvince(l.province)}`,
          timestamp: p.created_at,
          badge: "Lead Réservé",
        })
      }
    }
  }

  if (newLeads && newLeads.length > 0) {
    for (const nl of newLeads) {
      const surf = nl.surface_area ? `${nl.surface_area} m²` : "Toiture qualifiée"
      items.push({
        id: `nl-${nl.id}`,
        type: "new_lead",
        message: `Nouveau dossier ${nl.segment} disponible (${surf}) en province de ${formatProvince(nl.province)}`,
        timestamp: nl.created_at,
        badge: "Nouveau Lead",
      })
    }
  }

  // Tri chronologique réel
  items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

  return NextResponse.json({
    items: items.slice(0, 6),
  })
}

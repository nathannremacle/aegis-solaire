import { NextRequest, NextResponse } from "next/server"
import { getAdminUser } from "@/lib/admin-auth"
import { createServiceRoleClient } from "@/lib/supabase/admin"
import { dispatchLeadWave, MAX_SLOTS_B2C, MAX_SLOTS_B2B, isDevTestPartner } from "@/lib/lead-relance-engine"

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAdminUser()
  if (!user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  }

  const { id } = await params
  const supabase = createServiceRoleClient()

  // 1. Récupérer le lead
  const { data: lead, error: leadErr } = await supabase
    .from("leads")
    .select("id, segment, marketplace_status, relance_wave, last_relance_at, created_at, province, city, postal_code, credit_cost")
    .eq("id", id)
    .single()

  if (leadErr || !lead) {
    return NextResponse.json({ error: "Lead introuvable" }, { status: 404 })
  }

  const maxSlots = lead.segment === "B2B" ? MAX_SLOTS_B2B : MAX_SLOTS_B2C

  // 2. Récupérer les achats réels (slots vendus, hors comptes de test DEV)
  const { data: purchases } = await supabase
    .from("lead_purchases")
    .select("id, partner_id, purchased_at, credits_spent, partners(id, company_name, email, is_test)")
    .eq("lead_id", id)
    .order("purchased_at", { ascending: true })

  const realPurchases = (purchases || []).filter((p: any) => {
    const partnerObj = Array.isArray(p.partners) ? p.partners[0] : p.partners
    return !isDevTestPartner({ ...partnerObj, email: partnerObj?.email })
  })
  const takenSlots = realPurchases.length

  // 3. Récupérer l'historique des relances envoyées (hors comptes de test DEV)
  let realDispatches: any[] = []
  try {
    const { data: dispatchRows } = await supabase
      .from("lead_relance_dispatches")
      .select("id, wave_number, email_to, sent_at, matching_score, matching_tier, credits_at_send, partner_id, partners(id, company_name, email, is_test)")
      .eq("lead_id", id)
      .order("sent_at", { ascending: false })

    realDispatches = (dispatchRows || []).filter((d: any) => {
      const partnerObj = Array.isArray(d.partners) ? d.partners[0] : d.partners
      return !isDevTestPartner({ ...partnerObj, emailTo: d.email_to })
    })
  } catch {
    // Si la table n'est pas encore créée
  }

  return NextResponse.json({
    leadId: lead.id,
    segment: lead.segment,
    marketplaceStatus: lead.marketplace_status,
    currentWave: lead.relance_wave || 0,
    lastRelanceAt: lead.last_relance_at,
    takenSlots,
    maxSlots,
    remainingSlots: Math.max(0, maxSlots - takenSlots),
    isFullySold: takenSlots >= maxSlots,
    dispatches: realDispatches,
    purchases: realPurchases,
  })
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAdminUser()
  if (!user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  }

  const { id } = await params
  let waveNumber = 1
  let force = false

  try {
    const body = await request.json()
    if (body.waveNumber && typeof body.waveNumber === "number") {
      waveNumber = body.waveNumber
    }
    if (body.force === true) {
      force = true
    }
  } catch {
    // Pas de body json, prend la vague 1 par défaut
  }

  try {
    const result = await dispatchLeadWave(id, waveNumber, force)
    return NextResponse.json(result)
  } catch (err: any) {
    console.error("[relance POST error]:", err)
    return NextResponse.json({ error: err.message || "Échec de l'envoi de la relance" }, { status: 500 })
  }
}

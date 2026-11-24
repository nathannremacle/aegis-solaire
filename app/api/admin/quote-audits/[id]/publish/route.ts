import { NextRequest, NextResponse } from "next/server"
import { createServiceRoleClient } from "@/lib/supabase/admin"
import { getAdminUser } from "@/lib/admin-auth"
import { B2C_QUOTE_AUDIT_CREDIT_COST, B2C_QUOTE_AUDIT_MAX_SLOTS } from "@/lib/credit-pricing"
import { computeWalloniaQuoteBenchmark } from "@/lib/quote-audit-extractor"
import { triggerPostPublishDispatch } from "@/lib/lead-relance-engine"
import {
  renderCalloutBox,
  renderFiguresBox,
  renderInstallerEmailShell,
  renderSpecsTable,
} from "@/lib/email-templates/installer-email-layout"
import { Resend } from "resend"

export const dynamic = "force-dynamic"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await getAdminUser()
  if (!admin) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  }

  const { id } = await params
  const body = await request.json()
  const kwc = Number(body?.kwc || 6)
  const batteryKwh = Number(body?.batteryKwh || 0)
  const quotedPriceTvac = Number(body?.quotedPriceTvac || 0)
  const city = typeof body?.city === "string" ? body.city.trim() : ""
  const firstName = typeof body?.firstName === "string" ? body.firstName.trim() : "Propriétaire"
  const lastName = typeof body?.lastName === "string" ? body.lastName.trim() : "Vérifié"
  const publishToMarketplace = body?.publishToMarketplace !== false

  const supabase = createServiceRoleClient()
  const { data: audit, error: auditErr } = await supabase
    .from("quote_audits")
    .select("*")
    .eq("id", id)
    .single()

  if (auditErr || !audit) {
    return NextResponse.json({ error: "Audit introuvable." }, { status: 404 })
  }

  const bench = computeWalloniaQuoteBenchmark({
    kwc,
    batteryKwh,
    quotedPriceTvac,
    vatRate: audit.segment === "B2B" ? 0.21 : 0.06,
  })

  let leadId: string | null = audit.lead_id || null

  if (publishToMarketplace && !leadId) {
    const targetBudgetLabel =
      bench.benchmarkMaxTvac > 0
        ? `< ${bench.benchmarkMaxTvac.toLocaleString("fr-BE")} € TVAC`
        : "Tarif médian RESCERT Tier-1"

    const { data: createdLead, error: leadErr } = await supabase
      .from("leads")
      .insert({
        segment: audit.segment || "B2C",
        marketplace_status: "available",
        credit_cost: B2C_QUOTE_AUDIT_CREDIT_COST,
        max_slots: B2C_QUOTE_AUDIT_MAX_SLOTS,
        allocation_mode: "quote_audit_2",
        pricing_tier: "premium",
        first_name: firstName,
        last_name: lastName,
        email: audit.email,
        phone: audit.phone,
        province: audit.province || "liege",
        postal_code: audit.postal_code,
        city: city || null,
        surface_type: "toiture",
        surface_area: Math.round(kwc * 5.5),
        estimated_power_kwc: kwc,
        annual_electricity_bill: Math.round(kwc * 320),
        contact_preference: audit.contact_preference || "written_first",
        lead_score: 92,
        status: "HOT_LEAD",
        source: "quote_audit",
        source_form: "manual_admin",
        marketing_consent: true,
        project_details: `Dossier Contre-Offre Prêt-à-Signer (${kwc} kWc${batteryKwh > 0 ? ` + Batterie ${batteryKwh} kWh` : ""}). Devis concurrent audité par la Cellule Technique. Cible compétitive : ${targetBudgetLabel}.`,
        qualification_metadata: {
          lead_intent_type: "quote_audit_ready",
          quote_audit_id: audit.id,
          has_battery: batteryKwh > 0,
          battery_kwh: batteryKwh,
          target_budget_tvac: bench.benchmarkMaxTvac,
          published_at: new Date().toISOString(),
        },
      })
      .select("id")
      .single()

    if (leadErr || !createdLead) {
      return NextResponse.json(
        { error: leadErr?.message || "Erreur création dossier Contre-Offre." },
        { status: 500 }
      )
    }
    leadId = createdLead.id

    // Déclencher Auto-Pilot & Vague 1
    if (leadId) {
      await triggerPostPublishDispatch(leadId).catch(() => { })
    }
  }

  await supabase
    .from("quote_audits")
    .update({
      lead_id: leadId,
      extracted_kwc: kwc,
      extracted_battery_kwh: batteryKwh,
      extracted_price_tvac: quotedPriceTvac || null,
      benchmark_min_tvac: bench.benchmarkMinTvac,
      benchmark_max_tvac: bench.benchmarkMaxTvac,
      estimated_overcharge_eur: bench.estimatedOverchargeEur,
      status: publishToMarketplace ? "published_counter_offer" : "report_sent",
      report_sent_at: new Date().toISOString(),
    })
    .eq("id", id)

  if (process.env.RESEND_API_KEY && audit.email) {
    try {
      const resend = new Resend(process.env.RESEND_API_KEY)
      const subject = `Résultat de votre contrôle devis solaire (${kwc} kWc) — Aegis Solaire`
      const benchRange = `${bench.benchmarkMinTvac.toLocaleString("fr-BE")} € – ${bench.benchmarkMaxTvac.toLocaleString("fr-BE")} € TVAC`
      const overchargeLabel =
        bench.estimatedOverchargeEur > 0
          ? `+${bench.estimatedOverchargeEur.toLocaleString("fr-BE")} € au-dessus du plafond`
          : "Dans la fourchette du marché"
      const text = `Bonjour,\n\nLa Cellule Technique Aegis Solaire a terminé l'analyse indépendante de votre devis (${kwc} kWc${batteryKwh > 0 ? ` + Batterie ${batteryKwh} kWh` : ""}).\n\nFourchette de référence RESCERT Tier-1 Wallonie 2026 : ${benchRange}.\n${bench.estimatedOverchargeEur > 0 ? `Écart constaté par rapport au plafond du marché : +${bench.estimatedOverchargeEur.toLocaleString("fr-BE")} €.` : "Votre devis se situe dans la fourchette compétitive du marché."}\n\n${publishToMarketplace ? "Conformément à votre demande, nous avons activé la mise en concurrence encadrée auprès de 2 installateurs certifiés RESCERT de votre province (cahier des charges Tier-1 strict, zéro divulgation de votre devis actuel)." : "Si vous souhaitez recevoir jusqu'à 2 contre-propositions RESCERT pour comparer, répondez simplement à cet e-mail."}\n\nL'équipe Technique Aegis Solaire\ncontact@aegissolaire.com`
      const html = renderInstallerEmailShell({
        subject,
        preheader: `Analyse indépendante de votre devis (${kwc} kWc) : fourchette de référence ${benchRange}.`,
        reference: `AUDIT · #${audit.id.slice(0, 8).toUpperCase()}`,
        context: "Cellule Technique Aegis Solaire · De votre côté",
        headline: "Résultat de votre contre-expertise devis",
        subtitle: `${kwc} kWc${batteryKwh > 0 ? ` + Batterie ${batteryKwh} kWh` : ""} · ${audit.postal_code}`,
        statusPill: {
          text:
            bench.estimatedOverchargeEur > 0
              ? `Écart détecté : ${overchargeLabel}`
              : "Devis cohérent avec le marché Wallonie 2026",
          tone: bench.estimatedOverchargeEur > 0 ? "warning" : "success",
        },
        bodyHtml: `
          ${renderFiguresBox(
            {
              label: "Référence RESCERT Tier-1 2026",
              value: benchRange,
              sublabel: `${kwc} kWc${batteryKwh > 0 ? ` + ${batteryKwh} kWh` : ""}`,
            },
            {
              label: "Diagnostic tarifaire",
              value: overchargeLabel,
              sublabel: quotedPriceTvac > 0 ? `Offre analysée : ${quotedPriceTvac.toLocaleString("fr-BE")} € TVAC` : "Analyse technique effectuée",
            }
          )}
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-top: 16px; width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding-top: 14px; border-top: 1px solid #E6EDF1;">
                ${renderSpecsTable([
                  { label: "Puissance analysée", value: `${kwc} kWc` },
                  ...(batteryKwh > 0 ? [{ label: "Stockage batterie", value: `${batteryKwh} kWh` }] : []),
                  { label: "Exigence qualité", value: "Panneaux Tier-1, conformité RGIE & Synergrid C10/11" },
                  {
                    label: "Suite donnée",
                    value: publishToMarketplace
                      ? "Mise en concurrence activée auprès de 2 installateurs RESCERT max (devis initial confidentiel)"
                      : "Conseil neutre transmis par écrit — aucune transmission sans votre accord",
                  },
                ])}
              </td>
            </tr>
          </table>
          ${renderCalloutBox({
            label: "Zéro contrepartie sur la qualité · 100 % gratuit",
            value: publishToMarketplace
              ? "Les installateurs RESCERT sollicités savent qu'ils sont mis en concurrence sur un cahier des charges Tier-1 strict sans jamais voir votre document concurrent."
              : "Si vous souhaitez comparer avec 2 offres RESCERT de votre région sans centre d'appels, répondez simplement à cet e-mail.",
            tone: "info",
          })}
        `,
        footerLinks: [
          { label: "Assistance technique", href: "mailto:contact@aegissolaire.com" },
          { label: "Aegis Solaire", href: "https://www.aegissolaire.com" },
        ],
      })

      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || "contact@aegissolaire.com",
        to: audit.email,
        replyTo: "contact@aegissolaire.com",
        subject,
        text,
        html,
      })
    } catch {
      // non-blocking
    }
  }

  return NextResponse.json({
    success: true,
    leadId,
    benchmark: bench,
  })
}

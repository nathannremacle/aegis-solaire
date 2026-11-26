/**
 * Script idempotent de recalcul (backfill) des grandeurs solaires et marges nettes indicatives
 * sur tous les leads existants en base Supabase, à partir du moteur unique `calculateMarketplaceFinancials`.
 *
 * Usage :
 *   npx tsx scripts/backfill-lead-financials.ts
 */

import fs from "node:fs"
import path from "node:path"
import { calculateMarketplaceFinancials } from "../lib/marketplace-pricing"

interface LeadRow {
  id: string
  segment: string | null
  first_name: string | null
  last_name: string | null
  city: string | null
  postal_code: string | null
  surface_area: number | null
  surface_type: string | null
  roof_material: string | null
  annual_electricity_bill: number | null
  estimated_power_kwc: number | null
  estimated_roi_years: number | null
  autoconsumption_rate: number | null
  estimated_savings: number | null
  credit_cost: number | null
  marketplace_status: string | null
  project_details: string | null
  qualification_metadata: Record<string, unknown> | null
}

function loadEnv(): Record<string, string> {
  const root = path.resolve(__dirname, "..")
  const envFile = fs.existsSync(path.join(root, ".env.local"))
    ? path.join(root, ".env.local")
    : path.join(root, ".env")

  const env: Record<string, string> = { ...process.env } as Record<string, string>
  if (fs.existsSync(envFile)) {
    for (const line of fs.readFileSync(envFile, "utf8").split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
      if (m && !env[m[1]]) {
        env[m[1]] = m[2].replace(/^['"]|['"]$/g, "")
      }
    }
  }
  return env
}

async function main() {
  const env = loadEnv()
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceKey) {
    throw new Error("Variables NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY requises.")
  }

  const selectCols = [
    "id",
    "segment",
    "first_name",
    "last_name",
    "city",
    "postal_code",
    "surface_area",
    "surface_type",
    "roof_material",
    "annual_electricity_bill",
    "estimated_power_kwc",
    "estimated_roi_years",
    "autoconsumption_rate",
    "estimated_savings",
    "credit_cost",
    "marketplace_status",
    "project_details",
    "qualification_metadata",
  ].join(",")

  const res = await fetch(
    `${supabaseUrl}/rest/v1/leads?select=${selectCols}&order=created_at.desc`,
    {
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
      },
    }
  )

  if (!res.ok) {
    throw new Error(`Erreur lecture leads (${res.status}): ${await res.text()}`)
  }

  const leads = (await res.json()) as LeadRow[]
  const summaryRows: Array<Record<string, string | number>> = []
  let updatedCount = 0
  let skippedCount = 0

  for (const lead of leads) {
    const isDraft = lead.marketplace_status === "draft"
    const hasSizingInputs =
      (Number(lead.surface_area) || 0) > 0 || (Number(lead.annual_electricity_bill) || 0) > 0

    if (isDraft && !hasSizingInputs) {
      skippedCount++
      continue
    }

    const existingMeta =
      lead.qualification_metadata && typeof lead.qualification_metadata === "object"
        ? lead.qualification_metadata
        : {}

    const financials = calculateMarketplaceFinancials({
      segment: lead.segment || "B2C",
      surfaceArea: lead.surface_area,
      surfaceType: lead.surface_type,
      roofMaterial: lead.roof_material,
      annualBill: lead.annual_electricity_bill,
      creditCost: lead.credit_cost,
      estimatedPowerKwc: lead.estimated_power_kwc,
      projectDetails: lead.project_details,
      qualificationMetadata: existingMeta,
    })

    const mergedMeta: Record<string, unknown> = {
      ...existingMeta,
      estimatedPanelCount: financials.estimatedPanelCount,
      annualProductionKwh: financials.annualProductionKwh,
      usableSurfaceM2: financials.usableSurfaceM2,
      estimatedNetMarginEur: financials.estimatedInstallerMargin,
      installerMarginPercent: financials.installerMarginPercent,
      sizingLimiter: financials.sizingLimiter,
    }

    const patchRes = await fetch(
      `${supabaseUrl}/rest/v1/leads?id=eq.${encodeURIComponent(lead.id)}`,
      {
        method: "PATCH",
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
          "Content-Type": "application/json",
          Prefer: "return=minimal",
        },
        body: JSON.stringify({
          estimated_power_kwc: financials.estimatedPowerKwc,
          estimated_roi_years: financials.estimatedRoiYears,
          autoconsumption_rate: financials.autoconsumptionRate,
          estimated_savings: financials.revenueEstimatePerYear,
          qualification_metadata: mergedMeta,
        }),
      }
    )

    if (!patchRes.ok) {
      throw new Error(`Erreur PATCH lead ${lead.id} (${patchRes.status}): ${await patchRes.text()}`)
    }

    updatedCount++
    summaryRows.push({
      nom: lead.last_name || lead.first_name || lead.id.slice(0, 8),
      commune: `${lead.postal_code || ""} ${lead.city || ""}`.trim(),
      statut: lead.marketplace_status || "-",
      ancien_kwc: lead.estimated_power_kwc ?? "-",
      nouveau_kwc: financials.estimatedPowerKwc,
      panneaux: financials.estimatedPanelCount,
      limiteur: financials.sizingLimiter,
      devis_ht: financials.estimatedContractValue,
      marge_nette_ht: financials.estimatedInstallerMargin,
      taux_marge: `${financials.installerMarginPercent}%`,
    })
  }

  console.table(summaryRows)
  console.log(`Backfill terminé : ${updatedCount} leads mis à jour, ${skippedCount} drafts ignorés.`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

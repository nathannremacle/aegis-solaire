import { NextResponse } from "next/server"
import { getAdminUser } from "@/lib/admin-auth"
import { createServiceRoleClient } from "@/lib/supabase/admin"
import { logAudit } from "@/lib/audit-log"

/**
 * Nettoyage RGPD : anonymiser les leads dont la date de création est strictement
 * supérieure à 3 ans (36 mois). Obligation CNIL pour la prospection B2B.
 * Protégé : réservé aux administrateurs (ADMIN_EMAILS).
 */
export async function POST() {
  const user = await getAdminUser()
  if (!user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  }

  const cutoff = new Date()
  cutoff.setMonth(cutoff.getMonth() - 36)
  const cutoffIso = cutoff.toISOString()

  const supabase = createServiceRoleClient()

  // Sélectionner les leads à anonymiser (created_at < cutoff)
  const { data: toAnonymize, error: selectError } = await supabase
    .from("leads")
    .select("id")
    .lt("created_at", cutoffIso)

  if (selectError) {
    console.error("Cleanup leads select error:", selectError)
    return NextResponse.json(
      { error: "Erreur lors de la sélection des leads à nettoyer" },
      { status: 500 }
    )
  }

  if (!toAnonymize?.length) {
    return NextResponse.json({
      success: true,
      anonymized_count: 0,
      message: "Aucun lead à anonymiser (aucun lead de plus de 3 ans).",
    })
  }

  // Anonymiser chaque lead (conserver l'enregistrement pour stats, conformité RGPD)
  let anonymized = 0
  for (const row of toAnonymize) {
    const { error: updateError } = await supabase
      .from("leads")
      .update({
        first_name: "Anonymisé",
        last_name: "",
        email: `deleted-${row.id}@anonymized.local`,
        phone: "",
        company: null,
        message: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", row.id)

    if (!updateError) anonymized++
    else console.error("Cleanup lead update error for", row.id, updateError)
  }

  try {
    await logAudit({
      adminEmail: user.email!,
      action: "leads_anonymized",
      entityType: "leads",
      details: { anonymized_count: anonymized, cutoff: cutoffIso },
    })
  } catch (e) {
    console.error("Audit log failed:", e)
  }

  return NextResponse.json({
    success: true,
    anonymized_count: anonymized,
    message: `${anonymized} lead(s) de plus de 3 ans ont été anonymisés (conformité RGPD).`,
  })
}

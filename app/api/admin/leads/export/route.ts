import { NextRequest, NextResponse } from "next/server"
import { getAdminUser } from "@/lib/admin-auth"
import { createServiceRoleClient } from "@/lib/supabase/admin"

const EXPORT_MAX = 5000

function escapeCsv(value: string | number | null | undefined): string {
  if (value == null) return ""
  const s = String(value)
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

export async function GET(request: NextRequest) {
  const user = await getAdminUser()
  if (!user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const status = searchParams.get("status") ?? ""
  const search = searchParams.get("search") ?? ""
  const installateurId = searchParams.get("installateur") ?? ""

  const supabase = createServiceRoleClient()
  let query = supabase
    .from("leads")
    .select("id, first_name, last_name, email, phone, job_title, company, message, surface_type, surface_area, project_timeline, annual_electricity_bill, estimated_roi_years, autoconsumption_rate, estimated_savings, status, lead_score, installateur_id, created_at")
    .order("created_at", { ascending: false })
    .limit(EXPORT_MAX)

  if (status && status !== "all") query = query.eq("status", status)
  if (search.trim()) query = query.ilike("email", `%${search.trim()}%`)
  if (installateurId && installateurId !== "all") query = query.eq("installateur_id", installateurId)

  const { data: leads, error } = await query

  if (error) {
    console.error("Admin leads export error:", error)
    return NextResponse.json({ error: "Erreur lors de l'export" }, { status: 500 })
  }

  const rows = (leads ?? []) as Array<{
    id: string
    first_name: string
    last_name: string
    email: string
    phone: string
    job_title: string
    company: string | null
    message: string | null
    surface_type: string
    surface_area: number
    project_timeline: string | null
    annual_electricity_bill: number
    estimated_roi_years: number | null
    autoconsumption_rate: number | null
    estimated_savings: number | null
    status: string
    lead_score: number | null
    installateur_id: string | null
    created_at: string
  }>

  const header = [
    "ID",
    "Prénom",
    "Nom",
    "Email",
    "Téléphone",
    "Fonction",
    "Entreprise",
    "Message",
    "Type surface",
    "Surface (m²)",
    "Délai projet",
    "Facture annuelle (€)",
    "ROI (ans)",
    "Autoconsommation (%)",
    "Économies (€/an)",
    "Statut",
    "Score",
    "Installateur ID",
    "Date création",
  ]
  const csvRows = [header.map(escapeCsv).join(",")]
  for (const l of rows) {
    csvRows.push(
      [
        l.id,
        l.first_name,
        l.last_name,
        l.email,
        l.phone ?? "",
        l.job_title,
        l.company ?? "",
        l.message ?? "",
        l.surface_type,
        l.surface_area,
        l.project_timeline ?? "",
        l.annual_electricity_bill,
        l.estimated_roi_years ?? "",
        l.autoconsumption_rate ?? "",
        l.estimated_savings ?? "",
        l.status,
        l.lead_score ?? "",
        l.installateur_id ?? "",
        l.created_at,
      ].map(escapeCsv).join(",")
    )
  }

  const csv = "\uFEFF" + csvRows.join("\r\n")
  const filename = `leads-aegis-${new Date().toISOString().slice(0, 10)}.csv`

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  })
}

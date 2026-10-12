import { NextResponse } from "next/server"
import { createServiceRoleClient } from "@/lib/supabase/admin"
import { getAdminUser } from "@/lib/admin-auth"

type SearchResult = {
  id: string
  type: "lead" | "installateur" | "partner" | "media_partner"
  title: string
  subtitle: string
  badge?: string
  url: string
}

export async function GET(request: Request) {
  const user = await getAdminUser()
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const q = searchParams.get("q")?.trim()

  if (!q || q.length < 2) {
    return NextResponse.json({ results: [] })
  }

  const supabase = createServiceRoleClient()
  const searchQuery = `%${q}%`

  const [leadsRes, installateursRes, partnersRes, mediaRes] = await Promise.all([
    supabase
      .from("leads")
      .select("id, first_name, last_name, email, company, status")
      .or(
        `email.ilike.${searchQuery},first_name.ilike.${searchQuery},last_name.ilike.${searchQuery},company.ilike.${searchQuery},phone.ilike.${searchQuery}`
      )
      .limit(5),

    supabase
      .from("installateurs")
      .select("id, name, email")
      .or(`name.ilike.${searchQuery},email.ilike.${searchQuery}`)
      .limit(3),

    supabase
      .from("partners")
      .select("id, company_name, email")
      .or(`company_name.ilike.${searchQuery},email.ilike.${searchQuery}`)
      .limit(3),

    supabase
      .from("media_partners")
      .select("id, name, email")
      .or(`name.ilike.${searchQuery},email.ilike.${searchQuery}`)
      .limit(3),
  ])

  const results: SearchResult[] = []

  if (leadsRes.data) {
    leadsRes.data.forEach((l) => {
      results.push({
        id: l.id,
        type: "lead",
        title: `${l.first_name} ${l.last_name || l.company || l.email.split("@")[0]}`,
        subtitle: l.email,
        badge: l.status,
        url: `/admin/leads?leadId=${l.id}`,
      })
    })
  }

  if (installateursRes.data) {
    installateursRes.data.forEach((i) => {
      results.push({
        id: i.id,
        type: "installateur",
        title: i.name,
        subtitle: i.email,
        url: `/admin/installateurs`,
      })
    })
  }

  if (partnersRes.data) {
    partnersRes.data.forEach((p) => {
      results.push({
        id: p.id,
        type: "partner",
        title: p.company_name,
        subtitle: `Acheteur Marketplace · ${p.email}`,
        url: `/admin/partners`,
      })
    })
  }

  if (mediaRes.data) {
    mediaRes.data.forEach((m) => {
      results.push({
        id: m.id,
        type: "media_partner",
        title: m.name,
        subtitle: `Apporteur d'affaires · ${m.email}`,
        url: `/admin/media-partners`,
      })
    })
  }

  return NextResponse.json({ results })
}

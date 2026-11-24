import { NextResponse } from "next/server"
import { getAdminUser } from "@/lib/admin-auth"
import { createServiceRoleClient } from "@/lib/supabase/admin"

export const dynamic = "force-dynamic"

export async function GET() {
  const admin = await getAdminUser()
  if (!admin) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  }

  const supabase = createServiceRoleClient()
  const { data: rows, error } = await supabase
    .from("quote_audits")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const enriched = await Promise.all(
    (rows || []).map(async (row: any) => {
      let signedFileUrl: string | null = null
      if (row.file_path) {
        try {
          const { data: signed } = await supabase.storage
            .from("quote-audits")
            .createSignedUrl(row.file_path, 3600)
          signedFileUrl = signed?.signedUrl || null
        } catch {
          signedFileUrl = null
        }
      }
      return {
        ...row,
        signed_file_url: signedFileUrl,
      }
    })
  )

  return NextResponse.json({ audits: enriched })
}

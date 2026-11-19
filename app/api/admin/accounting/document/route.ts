import { NextRequest, NextResponse } from "next/server"
import { getAdminUser } from "@/lib/admin-auth"
import { createServiceRoleClient } from "@/lib/supabase/admin"
import { ACCOUNTING_DOCUMENTS_BUCKET } from "@/lib/accounting/invoice-extractor"

export const dynamic = "force-dynamic"

const SAFE_STORAGE_PATH_RE = /^[0-9]{4}\/[0-9]{2}\/[a-zA-Z0-9._-]+$/

function inferMimeFromPath(storagePath: string): string {
  const lower = storagePath.toLowerCase()
  if (lower.endsWith(".pdf")) return "application/pdf"
  if (lower.endsWith(".png")) return "image/png"
  if (lower.endsWith(".webp")) return "image/webp"
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg"
  return "application/octet-stream"
}

export async function GET(request: NextRequest) {
  const user = await getAdminUser()
  if (!user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  }

  const storagePath = (request.nextUrl.searchParams.get("path") || "").trim()
  if (!storagePath || storagePath.includes("..") || !SAFE_STORAGE_PATH_RE.test(storagePath)) {
    return NextResponse.json({ error: "Chemin de document invalide" }, { status: 400 })
  }

  const supabase = createServiceRoleClient()
  const { data, error } = await supabase.storage
    .from(ACCOUNTING_DOCUMENTS_BUCKET)
    .download(storagePath)

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message || "Document introuvable dans le coffre comptable." },
      { status: 404 }
    )
  }

  const buffer = Buffer.from(await data.arrayBuffer())
  const filename = storagePath.split("/").pop() || "piece-comptable"
  const contentType = data.type || inferMimeFromPath(storagePath)

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `inline; filename="${filename.replace(/"/g, "")}"`,
      "Cache-Control": "private, no-store",
    },
  })
}

import { NextRequest, NextResponse } from "next/server"
import { getAdminUser } from "@/lib/admin-auth"
import { createServiceRoleClient } from "@/lib/supabase/admin"
import { logAudit } from "@/lib/audit-log"

export const dynamic = "force-dynamic"

const BUCKET_NAME = "lead-media"
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/jpg"]
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024 // 10 Mo

async function ensureBucketExists(supabase: ReturnType<typeof createServiceRoleClient>) {
  try {
    const { data: buckets } = await supabase.storage.listBuckets()
    const found = (buckets || []).some((b) => b.name === BUCKET_NAME)
    if (!found) {
      await supabase.storage.createBucket(BUCKET_NAME, {
        public: true,
        fileSizeLimit: MAX_FILE_SIZE_BYTES,
        allowedMimeTypes: ALLOWED_MIME_TYPES,
      })
    }
  } catch (err) {
    console.warn("[lead-image-api] ensureBucketExists warning:", err)
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAdminUser()
  if (!user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  }

  const { id: leadId } = await params
  if (!leadId) {
    return NextResponse.json({ error: "ID du lead manquant" }, { status: 400 })
  }

  try {
    const supabase = createServiceRoleClient()

    // Vérifier l'existence du lead
    const { data: lead, error: leadErr } = await supabase
      .from("leads")
      .select("id, qualification_metadata")
      .eq("id", leadId)
      .single()

    if (leadErr || !lead) {
      return NextResponse.json({ error: "Lead introuvable" }, { status: 404 })
    }

    let publicUrl: string | null = null

    const contentType = request.headers.get("content-type") || ""

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData()
      const file = formData.get("file") as File | null
      const directUrl = formData.get("imageUrl") as string | null

      if (directUrl && directUrl.trim()) {
        publicUrl = directUrl.trim()
      } else if (file) {
        if (!ALLOWED_MIME_TYPES.includes(file.type)) {
          return NextResponse.json(
            { error: "Format invalide. Seuls JPEG, PNG et WebP sont acceptés." },
            { status: 400 }
          )
        }
        if (file.size > MAX_FILE_SIZE_BYTES) {
          return NextResponse.json(
            { error: "Image trop volumineuse (max 10 Mo)." },
            { status: 400 }
          )
        }

        await ensureBucketExists(supabase)

        const ext = file.name.split(".").pop()?.toLowerCase() || "jpg"
        const storagePath = `leads/${leadId}/${Date.now()}.${ext}`
        const arrayBuffer = await file.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)

        const { error: uploadError } = await supabase.storage
          .from(BUCKET_NAME)
          .upload(storagePath, buffer, {
            contentType: file.type,
            upsert: true,
          })

        if (uploadError) {
          console.error("[lead-image-api] Upload error:", uploadError)
          return NextResponse.json(
            { error: `Échec du téléchargement: ${uploadError.message}` },
            { status: 500 }
          )
        }

        const { data: publicUrlData } = supabase.storage
          .from(BUCKET_NAME)
          .getPublicUrl(storagePath)

        publicUrl = publicUrlData.publicUrl
      } else {
        return NextResponse.json({ error: "Aucun fichier ou URL fourni" }, { status: 400 })
      }
    } else {
      // JSON payload avec imageUrl
      const body = await request.json().catch(() => ({}))
      if (!body.imageUrl || typeof body.imageUrl !== "string") {
        return NextResponse.json({ error: "Champ imageUrl manquant" }, { status: 400 })
      }
      publicUrl = body.imageUrl.trim()
    }

    if (!publicUrl) {
      return NextResponse.json({ error: "Impossible de déterminer l'URL de l'image" }, { status: 400 })
    }

    // Mettre à jour qualification_metadata
    const currentMeta = (lead.qualification_metadata as Record<string, unknown>) || {}
    const updatedMeta = {
      ...currentMeta,
      roof_image_url: publicUrl,
      site_image_url: publicUrl,
      roof_image_updated_at: new Date().toISOString(),
    }

    const { data: updatedLead, error: updateErr } = await supabase
      .from("leads")
      .update({
        qualification_metadata: updatedMeta,
        updated_at: new Date().toISOString(),
      })
      .eq("id", leadId)
      .select("id, qualification_metadata")
      .single()

    if (updateErr) {
      console.error("[lead-image-api] Update error:", updateErr)
      return NextResponse.json(
        { error: "Échec de l'association de l'image au lead" },
        { status: 500 }
      )
    }

    await logAudit({
      adminEmail: user.email!,
      action: "lead_image_attached",
      entityType: "lead",
      entityId: leadId,
      details: {
        imageUrl: publicUrl,
      },
    })

    return NextResponse.json({
      success: true,
      imageUrl: publicUrl,
      qualification_metadata: updatedLead.qualification_metadata,
    })
  } catch (err: any) {
    console.error("[lead-image-api] Unexpected error:", err)
    return NextResponse.json(
      { error: err.message || "Erreur interne lors de l'enregistrement de l'image" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAdminUser()
  if (!user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  }

  const { id: leadId } = await params
  if (!leadId) {
    return NextResponse.json({ error: "ID du lead manquant" }, { status: 400 })
  }

  try {
    const supabase = createServiceRoleClient()

    const { data: lead, error: leadErr } = await supabase
      .from("leads")
      .select("id, qualification_metadata")
      .eq("id", leadId)
      .single()

    if (leadErr || !lead) {
      return NextResponse.json({ error: "Lead introuvable" }, { status: 404 })
    }

    const currentMeta = (lead.qualification_metadata as Record<string, unknown>) || {}
    const updatedMeta = { ...currentMeta }
    delete updatedMeta.roof_image_url
    delete updatedMeta.site_image_url
    delete updatedMeta.roof_image_updated_at

    const { error: updateErr } = await supabase
      .from("leads")
      .update({
        qualification_metadata: updatedMeta,
        updated_at: new Date().toISOString(),
      })
      .eq("id", leadId)

    if (updateErr) {
      return NextResponse.json({ error: "Échec de la suppression de l'image" }, { status: 500 })
    }

    await logAudit({
      adminEmail: user.email!,
      action: "lead_image_removed",
      entityType: "lead",
      entityId: leadId,
      details: {},
    })

    return NextResponse.json({
      success: true,
      qualification_metadata: updatedMeta,
    })
  } catch (err: any) {
    console.error("[lead-image-api] Delete error:", err)
    return NextResponse.json(
      { error: err.message || "Erreur interne" },
      { status: 500 }
    )
  }
}

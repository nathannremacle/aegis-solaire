import crypto from "crypto"
import { NextRequest, NextResponse } from "next/server"
import { revalidatePath } from "next/cache"
import { getAdminUser } from "@/lib/admin-auth"
import { createServiceRoleClient } from "@/lib/supabase/admin"
import { logAudit } from "@/lib/audit-log"
import {
  appendLeadImages,
  getLeadImageItems,
  getLeadImagesFromMetadata,
  isValidLeadImageUrl,
  MAX_LEAD_IMAGES,
  removeLeadImage,
  reorderLeadImages,
  setPrimaryLeadImage,
  syncLeadImagesMetadata,
  type LeadImageKind,
} from "@/lib/lead-images"

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

    const { data: lead, error: leadErr } = await supabase
      .from("leads")
      .select("id, qualification_metadata")
      .eq("id", leadId)
      .single()

    if (leadErr || !lead) {
      return NextResponse.json({ error: "Lead introuvable" }, { status: 404 })
    }

    const currentMeta = (lead.qualification_metadata as Record<string, unknown>) || {}
    const existingImages = getLeadImagesFromMetadata(currentMeta)

    let setAsPrimary = false
    let requestedKind: LeadImageKind = "real"
    const filesToUpload: File[] = []
    const candidateUrls: string[] = []

    const contentType = request.headers.get("content-type") || ""

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData()
      setAsPrimary = formData.get("setAsPrimary") === "true"
      if (formData.get("kind") === "ai_3d_projection") {
        requestedKind = "ai_3d_projection"
      }

      const rawEntries = [...formData.getAll("files"), ...formData.getAll("file")]
      const seenFiles = new Set<File>()
      for (const entry of rawEntries) {
        if (entry instanceof File && entry.size > 0 && !seenFiles.has(entry)) {
          seenFiles.add(entry)
          filesToUpload.push(entry)
        }
      }

      const rawDirectUrl = formData.get("imageUrl")
      if (typeof rawDirectUrl === "string" && rawDirectUrl.trim()) {
        if (!isValidLeadImageUrl(rawDirectUrl)) {
          return NextResponse.json(
            { error: "URL d'image invalide (http://, https:// ou / requis)." },
            { status: 400 }
          )
        }
        candidateUrls.push(rawDirectUrl.trim())
      }

      if (filesToUpload.length === 0 && candidateUrls.length === 0) {
        return NextResponse.json({ error: "Aucun fichier ou URL fourni" }, { status: 400 })
      }
    } else {
      const body = await request.json().catch(() => ({}))
      setAsPrimary = body?.setAsPrimary === true
      if (body?.kind === "ai_3d_projection") {
        requestedKind = "ai_3d_projection"
      }

      const rawList: unknown[] = []
      if (typeof body?.imageUrl === "string" && body.imageUrl.trim()) {
        rawList.push(body.imageUrl)
      }
      if (Array.isArray(body?.imageUrls)) {
        rawList.push(...body.imageUrls)
      }

      if (rawList.length === 0) {
        return NextResponse.json({ error: "Champ imageUrl manquant" }, { status: 400 })
      }

      for (const item of rawList) {
        if (!isValidLeadImageUrl(item)) {
          return NextResponse.json(
            { error: "URL d'image invalide (http://, https:// ou / requis)." },
            { status: 400 }
          )
        }
        candidateUrls.push(item.trim())
      }
    }

    // Valider tous les fichiers avant tout upload vers Storage
    for (const file of filesToUpload) {
      if (!ALLOWED_MIME_TYPES.includes(file.type)) {
        return NextResponse.json(
          { error: `Format invalide (${file.name}). Seuls JPEG, PNG et WebP sont acceptés.` },
          { status: 400 }
        )
      }
      if (file.size > MAX_FILE_SIZE_BYTES) {
        return NextResponse.json(
          { error: `Image trop volumineuse (${file.name}, max 10 Mo).` },
          { status: 400 }
        )
      }
    }

    // Vérifier la limite maximale avant d'uploader
    const uniqueNewUrls = Array.from(new Set(candidateUrls)).filter(
      (url) => !existingImages.includes(url)
    )
    const projectedTotal = existingImages.length + uniqueNewUrls.length + filesToUpload.length
    if (projectedTotal > MAX_LEAD_IMAGES) {
      return NextResponse.json(
        { error: `Limite atteinte : maximum ${MAX_LEAD_IMAGES} photos par dossier.` },
        { status: 400 }
      )
    }

    const addedUrls: string[] = [...candidateUrls]

    if (filesToUpload.length > 0) {
      await ensureBucketExists(supabase)
      const batchTs = Date.now()

      for (let idx = 0; idx < filesToUpload.length; idx++) {
        const file = filesToUpload[idx]
        const rawExt = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "")
        const ext = rawExt || "jpg"
        const storagePath = `leads/${leadId}/${batchTs}-${idx}-${crypto.randomUUID().slice(0, 8)}.${ext}`
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

        addedUrls.push(publicUrlData.publicUrl)
      }
    }

    const nextImages = appendLeadImages(existingImages, addedUrls, { makeFirst: setAsPrimary })
    const metaOverrides: Record<string, LeadImageKind> = {}
    if (requestedKind === "ai_3d_projection") {
      for (const url of addedUrls) {
        metaOverrides[url] = "ai_3d_projection"
      }
    }
    const updatedMeta = syncLeadImagesMetadata(
      currentMeta,
      nextImages,
      undefined,
      metaOverrides
    )

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
        { error: "Échec de l'association des images au lead" },
        { status: 500 }
      )
    }

    revalidatePath("/admin/leads")
    revalidatePath("/partenaires/dashboard")

    await logAudit({
      adminEmail: user.email!,
      action: "lead_image_attached",
      entityType: "lead",
      entityId: leadId,
      details: {
        addedUrls,
        totalImages: nextImages.length,
        primaryImageUrl: nextImages[0] ?? null,
      },
    })

    return NextResponse.json({
      success: true,
      imageUrl: nextImages[0] ?? null,
      addedUrls,
      images: nextImages,
      imageItems: getLeadImageItems(updatedLead),
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

export async function PATCH(
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
    const body = await request.json().catch(() => ({}))
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
    const existingImages = getLeadImagesFromMetadata(currentMeta)

    let nextImages: string[]
    let metaOverrides: Record<string, LeadImageKind> | undefined
    let metadataOnlyUpdate: { targetUrl: string; kind: LeadImageKind } | null = null

    if (
      typeof body?.imageUrl === "string" &&
      (body?.kind === "real" || body?.kind === "ai_3d_projection")
    ) {
      const targetUrl = body.imageUrl.trim()
      if (!targetUrl || !existingImages.includes(targetUrl)) {
        return NextResponse.json(
          { error: "Photo introuvable dans ce dossier." },
          { status: 404 }
        )
      }
      nextImages = existingImages
      metaOverrides = { [targetUrl]: body.kind }
      metadataOnlyUpdate = { targetUrl, kind: body.kind }
    } else if (typeof body?.primaryUrl === "string") {
      const targetUrl = body.primaryUrl.trim()
      if (!targetUrl || !existingImages.includes(targetUrl)) {
        return NextResponse.json(
          { error: "Photo introuvable dans ce dossier." },
          { status: 404 }
        )
      }
      nextImages = setPrimaryLeadImage(existingImages, targetUrl)
    } else if (Array.isArray(body?.images)) {
      const ordered = body.images.filter((u: unknown): u is string => typeof u === "string")
      nextImages = reorderLeadImages(existingImages, ordered)
    } else {
      return NextResponse.json(
        { error: "Paramètre primaryUrl, images ou imageUrl/kind manquant." },
        { status: 400 }
      )
    }

    const updatedMeta = syncLeadImagesMetadata(
      currentMeta,
      nextImages,
      undefined,
      metaOverrides
    )

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
      console.error("[lead-image-api] Patch error:", updateErr)
      return NextResponse.json(
        { error: "Échec de la mise à jour de l'ordre des photos" },
        { status: 500 }
      )
    }

    revalidatePath("/admin/leads")
    revalidatePath("/partenaires/dashboard")

    if (metadataOnlyUpdate) {
      await logAudit({
        adminEmail: user.email!,
        action: "lead_image_metadata_updated",
        entityType: "lead",
        entityId: leadId,
        details: {
          imageUrl: metadataOnlyUpdate.targetUrl,
          kind: metadataOnlyUpdate.kind,
        },
      })
    } else {
      await logAudit({
        adminEmail: user.email!,
        action: "lead_images_reordered",
        entityType: "lead",
        entityId: leadId,
        details: {
          primaryImageUrl: nextImages[0] ?? null,
          totalImages: nextImages.length,
        },
      })
    }

    return NextResponse.json({
      success: true,
      imageUrl: nextImages[0] ?? null,
      images: nextImages,
      imageItems: getLeadImageItems(updatedLead),
      qualification_metadata: updatedLead.qualification_metadata,
    })
  } catch (err: any) {
    console.error("[lead-image-api] Patch unexpected error:", err)
    return NextResponse.json(
      { error: err.message || "Erreur interne lors du réordonnancement" },
      { status: 500 }
    )
  }
}

export async function DELETE(
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
    const queryImageUrl = request.nextUrl.searchParams.get("imageUrl")
    const body = await request.json().catch(() => ({}))
    const bodyImageUrl = typeof body?.imageUrl === "string" ? body.imageUrl : null
    const targetUrl = (queryImageUrl ?? bodyImageUrl)?.trim() || null
    const removeAll = body?.removeAll === true || !targetUrl

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
    const existingImages = getLeadImagesFromMetadata(currentMeta)

    // Ne jamais supprimer les objets du bucket Supabase Storage :
    // des e-mails déjà envoyés aux partenaires peuvent encore référencer ces URLs.
    const nextImages = removeAll ? [] : removeLeadImage(existingImages, targetUrl!)
    const updatedMeta = syncLeadImagesMetadata(currentMeta, nextImages)

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

    revalidatePath("/admin/leads")
    revalidatePath("/partenaires/dashboard")

    await logAudit({
      adminEmail: user.email!,
      action: "lead_image_removed",
      entityType: "lead",
      entityId: leadId,
      details: {
        removedUrl: removeAll ? "ALL" : targetUrl,
        remainingCount: nextImages.length,
        primaryImageUrl: nextImages[0] ?? null,
      },
    })

    return NextResponse.json({
      success: true,
      imageUrl: nextImages[0] ?? null,
      images: nextImages,
      imageItems: getLeadImageItems({ qualification_metadata: updatedMeta }),
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

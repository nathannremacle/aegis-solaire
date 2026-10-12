"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Zap, Check, Loader2, AlertCircle } from "lucide-react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

export function PublishLeadQuickButton({
  leadId,
  currentMarketplaceStatus,
  isComplete = true,
  missingReason,
}: {
  leadId: string
  currentMarketplaceStatus: string
  isComplete?: boolean
  missingReason?: string
}) {
  const [loading, setLoading] = useState(false)
  const [published, setPublished] = useState(currentMarketplaceStatus === "available")
  const router = useRouter()

  if (published) {
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
        <Check className="h-3 w-3 text-emerald-600" />
        En ligne
      </span>
    )
  }

  if (currentMarketplaceStatus === "sold_out") {
    return (
      <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700 border border-blue-200">
        Vendu
      </span>
    )
  }

  if (!isComplete) {
    return (
      <span 
        className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500 border border-slate-200 cursor-not-allowed"
        title={missingReason || "Dossier incomplet : vérifiez les données obligatoires (surface, province) avant publication"}
      >
        <AlertCircle className="h-3 w-3 text-amber-500" />
        Incomplet
      </span>
    )
  }

  const handlePublish = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setLoading(true)

    try {
      const res = await fetch(`/api/admin/leads/${leadId}/publish`, {
        method: "POST",
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        if (data.missingFields && Array.isArray(data.missingFields)) {
          throw new Error(`Critères manquants : ${data.missingFields.join(" · ")}`)
        }
        throw new Error(data.error || "Erreur lors de la mise en ligne")
      }

      setPublished(true)
      toast.success("Lead validé et publié sur la marketplace !")
      router.refresh()
    } catch (err: any) {
      toast.error(err.message || "Échec de la mise en vente")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      size="sm"
      variant="outline"
      onClick={handlePublish}
      disabled={loading}
      className="h-7 px-2 text-[10px] font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border-emerald-200 hover:border-emerald-300 rounded-lg gap-1 transition-all"
      title="Mettre immédiatement en vente sur la marketplace"
    >
      {loading ? (
        <Loader2 className="h-3 w-3 animate-spin" />
      ) : (
        <Zap className="h-3 w-3 text-emerald-600" />
      )}
      <span>{loading ? "…" : "Mettre en vente"}</span>
    </Button>
  )
}

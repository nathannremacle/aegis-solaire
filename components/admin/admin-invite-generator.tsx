"use client"

import { useState } from "react"
import {
  Link2,
  Copy,
  Check,
  Send,
  ExternalLink,
  Sparkles,
  UserPlus,
  MessageCircle,
  Building2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"

export function AdminInviteGenerator() {
  const [firstName, setFirstName] = useState("")
  const [companyName, setCompanyName] = useState("")
  const [copiedLink, setCopiedLink] = useState(false)
  const [copiedMsg, setCopiedMsg] = useState(false)

  // Construction de l'URL
  const origin =
    typeof window !== "undefined" && window.location.origin
      ? window.location.origin
      : "https://www.aegissolaire.com"

  const params = new URLSearchParams()
  if (firstName.trim()) params.set("nom", firstName.trim())
  if (companyName.trim()) params.set("cie", companyName.trim())

  const queryString = params.toString()
  const generatedUrl = `${origin}/partenaires/invitation${queryString ? `?${queryString}` : ""}`

  const prefilledMessage = firstName.trim()
    ? `Salut ${firstName.trim()}, c'est Fabrice Remacle. Je t'invite à découvrir la plateforme Aegis Solaire dont je t'ai parlé. Chaque projet est vérifié à la main avant d'être mis en ligne, sans guerre des prix. Voici ton lien d'accès privilégié : ${generatedUrl}`
    : `Bonjour, c'est Fabrice Remacle. Je vous invite à découvrir la marketplace photovoltaïque Aegis Solaire en Wallonie (leads vérifiés à la main, exclusivité B2B) : ${generatedUrl}`

  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(prefilledMessage)}`

  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(generatedUrl)
      setCopiedLink(true)
      toast.success("Lien d'invitation copié dans le presse-papier !")
      setTimeout(() => setCopiedLink(false), 2500)
    } catch {
      toast.error("Impossible de copier automatiquement. Sélectionnez le lien manuellement.")
    }
  }

  async function handleCopyMessage() {
    try {
      await navigator.clipboard.writeText(prefilledMessage)
      setCopiedMsg(true)
      toast.success("Message d'invitation prêt à être envoyé copié !")
      setTimeout(() => setCopiedMsg(false), 2500)
    } catch {
      toast.error("Erreur lors de la copie.")
    }
  }

  return (
    <div className="relative overflow-hidden rounded-3xl border border-amber-200/90 bg-gradient-to-br from-white via-amber-50/20 to-orange-50/20 p-6 sm:p-7 shadow-xs">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-amber-100 pb-5 mb-5">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 border border-amber-200 px-3 py-0.5 text-xs font-bold text-amber-900">
            <Sparkles className="h-3.5 w-3.5 text-amber-600" />
            <span>Outil de Démarchage Privé · Réseau Fabrice</span>
          </div>
          <h3 className="text-lg sm:text-xl font-black text-slate-900 flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-amber-600" />
            Générateur de Liens d'Invitation Personnalisés
          </h3>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-2xl">
            Permet à Fabrice de générer en 3 secondes un lien sur-mesure pour un installateur partenaire, avec pré-remplissage de son prénom et accès privilégié.
          </p>
        </div>

        <div className="shrink-0 flex items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 text-amber-900 font-bold px-3 py-1 text-xs">
            <Sparkles className="h-3.5 w-3.5 text-amber-600" />
            Accès Réseau Privé
          </span>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-12 items-end">
        {/* Champ Prénom */}
        <div className="lg:col-span-4 space-y-1.5">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
            Prénom de l'installateur
          </label>
          <Input
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder="Ex. Christophe, Marc, André..."
            className="h-11 rounded-xl border-slate-300 bg-white shadow-2xs font-medium"
          />
        </div>

        {/* Champ Entreprise (optionnel) */}
        <div className="lg:col-span-4 space-y-1.5">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
            Entreprise (optionnel)
          </label>
          <Input
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            placeholder="Ex. Coretec, Energreen, SolWallonie..."
            className="h-11 rounded-xl border-slate-300 bg-white shadow-2xs"
          />
        </div>

        {/* Boutons d'action rapides */}
        <div className="lg:col-span-4 flex flex-wrap sm:flex-nowrap gap-2">
          <Button
            type="button"
            variant="accent"
            onClick={handleCopyLink}
            className="h-11 flex-1 rounded-xl font-bold shadow-xs"
          >
            {copiedLink ? (
              <>
                <Check className="h-4 w-4 mr-1.5 text-emerald-950" />
                Lien Copié !
              </>
            ) : (
              <>
                <Copy className="h-4 w-4 mr-1.5" />
                Copier le lien
              </>
            )}
          </Button>

          <Button
            type="button"
            variant="outline"
            asChild
            className="h-11 rounded-xl border-emerald-300 bg-emerald-50 text-emerald-900 hover:bg-emerald-100 font-bold px-3 shadow-2xs"
            title="Envoyer directement via WhatsApp"
          >
            <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
              <MessageCircle className="h-4 w-4 mr-1 text-emerald-600" />
              WhatsApp
            </a>
          </Button>

          <Button
            type="button"
            variant="outline"
            asChild
            className="h-11 rounded-xl border-slate-200 px-3 bg-white"
            title="Tester la page dans un nouvel onglet"
          >
            <a href={generatedUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4 text-slate-600" />
            </a>
          </Button>
        </div>
      </div>

      {/* Rendu du lien & Message pré-rédigé */}
      <div className="mt-4 rounded-2xl bg-white/80 border border-slate-200 p-3 sm:p-4 text-xs space-y-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2 overflow-hidden">
            <Link2 className="h-4 w-4 text-amber-600 shrink-0" />
            <span className="font-mono text-slate-600 truncate select-all">
              {generatedUrl}
            </span>
          </div>
          <button
            type="button"
            onClick={handleCopyMessage}
            className="text-[11px] font-bold text-amber-800 hover:text-amber-900 underline shrink-0 cursor-pointer"
          >
            {copiedMsg ? "Message copié !" : "Copier le texte du message complet"}
          </button>
        </div>

        <div className="text-[11px] text-slate-500 italic bg-slate-50 p-2.5 rounded-xl border border-slate-100">
          « {prefilledMessage} »
        </div>
      </div>
    </div>
  )
}

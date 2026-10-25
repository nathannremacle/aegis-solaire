"use client"

import { useState, useEffect, useMemo, useRef, useCallback } from "react"
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
  Mail,
  RotateCcw,
  Eye,
  Edit3,
  CheckCircle2,
  Loader2,
  History,
  Save,
  Tag,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import {
  buildFabriceInviteSubject,
  buildFabriceInvitePlainText,
  buildFabriceWhatsAppMessage,
  renderFabriceInviteHtml,
  substituteTemplateVariables,
  type FabriceInviteData,
} from "@/lib/email-templates/fabrice-network-invite"

export type ToneKey = "tutoiement" | "vouvoiement" | "court_whatsapp"

export interface ToneData {
  subject: string
  body: string
  isCustom: boolean
  updatedAt?: string
}

interface SavedInviteHistory {
  id: string
  name: string
  company: string
  email: string
  date: string
  url: string
}

const TONE_LABELS: Record<ToneKey, { title: string; subtitle: string; icon: string }> = {
  tutoiement: {
    title: "Tutoiement",
    subtitle: "Client régulier",
    icon: "🤝",
  },
  vouvoiement: {
    title: "Vouvoiement",
    subtitle: "PME / Formel",
    icon: "💼",
  },
  court_whatsapp: {
    title: "Court SMS",
    subtitle: "Mobile direct",
    icon: "💬",
  },
}

export function AdminNetworkInviteHub() {
  // ─── 1. États du Destinataire & Paramètres ───
  const [firstName, setFirstName] = useState("")
  const [companyName, setCompanyName] = useState("")
  const [installerEmail, setInstallerEmail] = useState("")
  const [installerPhone, setInstallerPhone] = useState("")
  const [tone, setTone] = useState<ToneKey>("tutoiement")
  const [freeCredits, setFreeCredits] = useState<number>(2)
  const [includeCreditsText, setIncludeCreditsText] = useState<boolean>(true)
  const [provinces, setProvinces] = useState("ALL")
  const [customNote, setCustomNote] = useState("")

  // ─── 2. Stockage Persistant des Modèles pour chaque Ton ───
  const [templatesByTone, setTemplatesByTone] = useState<Record<ToneKey, ToneData>>({
    tutoiement: { subject: "", body: "", isCustom: false },
    vouvoiement: { subject: "", body: "", isCustom: false },
    court_whatsapp: { subject: "", body: "", isCustom: false },
  })

  const [viewTab, setViewTab] = useState<"edit" | "preview">("edit")
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "default">("default")
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)

  // ─── 3. États UI d'action ───
  const [copiedLink, setCopiedLink] = useState(false)
  const [copiedMail, setCopiedMail] = useState(false)
  const [isSendingEmail, setIsSendingEmail] = useState(false)
  const [history, setHistory] = useState<SavedInviteHistory[]>([])

  // Origine du site (initialisé avec le domaine de référence pour garantir l'identité exacte entre SSR et premier rendu client)
  const [origin, setOrigin] = useState("https://www.aegissolaire.com")

  useEffect(() => {
    if (typeof window !== "undefined" && window.location.origin) {
      setOrigin(window.location.origin)
    }
  }, [])

  // Construction de l'URL dynamique
  const generatedUrl = useMemo(() => {
    const params = new URLSearchParams()
    if (firstName.trim()) params.set("nom", firstName.trim())
    if (companyName.trim()) params.set("cie", companyName.trim())
    if (freeCredits > 0 && includeCreditsText) params.set("credits", String(freeCredits))
    if (provinces !== "ALL") params.set("provinces", provinces)
    params.set("par", "Fabrice Remacle")

    const query = params.toString()
    return `${origin}/partenaires/invitation${query ? `?${query}` : ""}`
  }, [firstName, companyName, freeCredits, includeCreditsText, provinces, origin])

  // Données de base pour la génération par défaut
  const baseInviteData = useMemo<FabriceInviteData>(() => {
    return {
      installerName: firstName,
      companyName,
      installerEmail,
      installerPhone,
      tone,
      freeCredits,
      includeCreditsText,
      provinces: provinces === "ALL" ? undefined : provinces,
      customNote,
      inviteUrl: generatedUrl,
    }
  }, [firstName, companyName, installerEmail, installerPhone, tone, freeCredits, includeCreditsText, provinces, customNote, generatedUrl])

  // ─── 4. Initialisation & Chargement Persistant ───
  useEffect(() => {
    // A) Charger depuis localStorage immédiatement
    const initialTemplates: Record<ToneKey, ToneData> = {
      tutoiement: {
        subject: buildFabriceInviteSubject({ ...baseInviteData, tone: "tutoiement" }),
        body: buildFabriceInvitePlainText({ ...baseInviteData, tone: "tutoiement" }),
        isCustom: false,
      },
      vouvoiement: {
        subject: buildFabriceInviteSubject({ ...baseInviteData, tone: "vouvoiement" }),
        body: buildFabriceInvitePlainText({ ...baseInviteData, tone: "vouvoiement" }),
        isCustom: false,
      },
      court_whatsapp: {
        subject: buildFabriceInviteSubject({ ...baseInviteData, tone: "court_whatsapp" }),
        body: buildFabriceInvitePlainText({ ...baseInviteData, tone: "court_whatsapp" }),
        isCustom: false,
      },
    }

    const tones: ToneKey[] = ["tutoiement", "vouvoiement", "court_whatsapp"]
    for (const t of tones) {
      try {
        const local = localStorage.getItem(`aegis_fabrice_custom_template_${t}`)
        if (local) {
          const parsed = JSON.parse(local)
          if (parsed && parsed.body) {
            // Nettoyage automatique des anciens modèles qui contenaient "Co-fondateur" ou l'ancienne tournure
            const isLegacy =
              parsed.body.includes("Co-fondateur") ||
              parsed.body.includes("Tu me connais pour le matériel") ||
              parsed.body.includes("leads de sorte à")
            if (isLegacy) {
              localStorage.removeItem(`aegis_fabrice_custom_template_${t}`)
            } else {
              initialTemplates[t] = {
                subject: parsed.subject || initialTemplates[t].subject,
                body: parsed.body,
                isCustom: true,
                updatedAt: parsed.updatedAt,
              }
            }
          }
        }
      } catch {
        // Ignore
      }
    }

    setTemplatesByTone(initialTemplates)

    // B) Synchroniser avec l'API serveur Supabase
    fetch("/api/admin/invite-templates")
      .then((res) => res.json())
      .then((data) => {
        if (data?.templates && typeof data.templates === "object") {
          setTemplatesByTone((prev) => {
            const next = { ...prev }
            for (const t of tones) {
              if (data.templates[t] && data.templates[t].body) {
                const isLegacy =
                  data.templates[t].body.includes("Co-fondateur") ||
                  data.templates[t].body.includes("Tu me connais pour le matériel") ||
                  data.templates[t].body.includes("leads de sorte à")
                if (!isLegacy) {
                  next[t] = {
                    subject: data.templates[t].subject,
                    body: data.templates[t].body,
                    isCustom: true,
                    updatedAt: data.templates[t].updatedAt,
                  }
                  try {
                    localStorage.setItem(
                      `aegis_fabrice_custom_template_${t}`,
                      JSON.stringify(next[t])
                    )
                  } catch {
                    // Ignore
                  }
                }
              }
            }
            return next
          })
        }
      })
      .catch((e) => console.warn("[invite-templates] API sync notice:", e))
  }, []) // 1 seul chargement au montage

  // ─── 5. Synchronisation serveur asynchrone (Debounce) ───
  const syncTemplateToServer = useCallback((targetTone: ToneKey, subject: string, bodyText: string) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }

    setSaveStatus("saving")
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        await fetch("/api/admin/invite-templates", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tone: targetTone, subject, body: bodyText }),
        })
        setSaveStatus("saved")
      } catch {
        setSaveStatus("saved") // Reste enregistré localement
      }
    }, 600)
  }, [])

  // ─── 6. Gestionnaire de modification pour le ton actif ───
  const handleSubjectChange = (newSubject: string) => {
    const now = new Date().toLocaleTimeString("fr-BE", { hour: "2-digit", minute: "2-digit" })
    const updated: ToneData = {
      ...templatesByTone[tone],
      subject: newSubject,
      isCustom: true,
      updatedAt: now,
    }

    setTemplatesByTone((prev) => ({
      ...prev,
      [tone]: updated,
    }))

    try {
      localStorage.setItem(`aegis_fabrice_custom_template_${tone}`, JSON.stringify(updated))
    } catch {
      // Ignore
    }

    syncTemplateToServer(tone, newSubject, updated.body)
  }

  const handleBodyChange = (newBody: string) => {
    const now = new Date().toLocaleTimeString("fr-BE", { hour: "2-digit", minute: "2-digit" })
    const updated: ToneData = {
      ...templatesByTone[tone],
      body: newBody,
      isCustom: true,
      updatedAt: now,
    }

    setTemplatesByTone((prev) => ({
      ...prev,
      [tone]: updated,
    }))

    try {
      localStorage.setItem(`aegis_fabrice_custom_template_${tone}`, JSON.stringify(updated))
    } catch {
      // Ignore
    }

    syncTemplateToServer(tone, updated.subject, newBody)
  }

  // ─── 6b. Gestionnaire d'activation/désactivation de la mention des crédits dans le message ───
  const handleToggleCreditsText = (include: boolean) => {
    setIncludeCreditsText(include)

    // Récupérer le corps actuel ou celui par défaut
    const currentBody = templatesByTone[tone].body || buildFabriceInvitePlainText({ ...baseInviteData, includeCreditsText: !include })

    if (!include) {
      // Retirer le paragraphe des crédits du texte
      const cleaned = currentBody
        .replace(/\n*Comme on se connaît bien, je t'ai fait créditer[^\n]*(sans rien payer|gratuitement)\.?\n*/gi, "\n\n")
        .replace(/\n*Comme on se connaît bien, je t'ai crédité[^\n]*(sans rien payer|gratuitement)\.?\n*/gi, "\n\n")
        .replace(/\n*Dans le cadre de nos relations[^\n]*(engagement financier)\.?\n*/gi, "\n\n")
        .replace(/\n*Dans le cadre de nos relations de confiance[^\n]*(engagement financier)\.?\n*/gi, "\n\n")
        .replace(/\s*Je t'ai fait réserver \d+ crédits offerts pour tester ton 1er dossier gratuit : /gi, " Tu peux activer ton accès réservé ici : ")
        .replace(/\s*Je t'ai préparé un accès direct avec \d+ crédits offerts pour tester ton 1er dossier gratuit : /gi, " Tu peux activer ton accès réservé ici : ")
        .replace(/\n{3,}/g, "\n\n")
        .trim()
      handleBodyChange(cleaned)
      toast.info("Paragraphe des crédits d'accueil retiré du message.")
    } else {
      // S'assurer que le nombre de crédits est supérieur à 0
      if (freeCredits === 0) {
        setFreeCredits(2)
      }

      const hasCreditMention = /crédit/i.test(currentBody)
      if (!hasCreditMention) {
        const sentence = tone === "tutoiement"
          ? `Comme on se connaît bien, je t'ai fait créditer {{credits}} crédits d'accueil sur ton espace pour que tu puisses tester et débloquer ton 1er dossier B2C gratuitement, sans rien payer.`
          : tone === "vouvoiement"
          ? `Dans le cadre de nos relations, je vous ai fait allouer {{credits}} crédits d'accueil sur votre espace afin que vous puissiez tester et débloquer votre 1er dossier sans aucun engagement financier.`
          : ""

        if (sentence) {
          let updated = currentBody
          if (updated.includes("Tu peux activer ton accès")) {
            updated = updated.replace("Tu peux activer ton accès", `${sentence}\n\nTu peux activer ton accès`)
          } else if (updated.includes("Vous pouvez activer votre accès")) {
            updated = updated.replace("Vous pouvez activer votre accès", `${sentence}\n\nVous pouvez activer votre accès`)
          } else {
            updated = `${updated}\n\n${sentence}`
          }
          handleBodyChange(updated.trim())
        } else if (tone === "court_whatsapp") {
          const updated = buildFabriceInvitePlainText({
            ...baseInviteData,
            tone: "court_whatsapp",
            includeCreditsText: true,
          })
          handleBodyChange(updated)
        }
      }
      toast.success("Paragraphe des crédits d'accueil inclus dans le message.")
    }
  }

  // ─── 7. Réinitialisation spécifique au ton actif ───
  const handleResetCurrentTone = async () => {
    const defaultSubject = buildFabriceInviteSubject(baseInviteData)
    const defaultBody = buildFabriceInvitePlainText(baseInviteData)

    const resetData: ToneData = {
      subject: defaultSubject,
      body: defaultBody,
      isCustom: false,
    }

    setTemplatesByTone((prev) => ({
      ...prev,
      [tone]: resetData,
    }))

    try {
      localStorage.removeItem(`aegis_fabrice_custom_template_${tone}`)
    } catch {
      // Ignore
    }

    setSaveStatus("default")

    try {
      await fetch(`/api/admin/invite-templates?tone=${tone}`, { method: "DELETE" })
    } catch {
      // Ignore
    }

    toast.info(`Modèle « ${TONE_LABELS[tone].title} » réinitialisé aux valeurs d'origine.`)
  }

  // ─── 8. Insertion de variables dynamiques ───
  const insertVariableTag = (tag: string) => {
    const textarea = textareaRef.current
    const currentBody = templatesByTone[tone].body || ""

    if (textarea) {
      const start = textarea.selectionStart
      const end = textarea.selectionEnd
      const newBody = currentBody.substring(0, start) + tag + currentBody.substring(end)
      handleBodyChange(newBody)
      setTimeout(() => {
        textarea.focus()
        textarea.setSelectionRange(start + tag.length, start + tag.length)
      }, 50)
    } else {
      handleBodyChange(currentBody + " " + tag)
    }
    toast.success(`Balise ${tag} insérée. Elle sera remplacée automatiquement par la vraie valeur.`)
  }

  // ─── 9. Données résolues prêtes pour la prévisualisation et l'envoi ───
  const currentToneData = templatesByTone[tone]

  // Sujet et corps avec remplacement automatique des tags {{...}} et fallback
  const resolvedSubject = useMemo(() => {
    const raw = currentToneData.subject || buildFabriceInviteSubject(baseInviteData)
    return substituteTemplateVariables(raw, {
      installerName: firstName,
      companyName,
      inviteUrl: generatedUrl,
      freeCredits,
    })
  }, [currentToneData.subject, baseInviteData, firstName, companyName, generatedUrl, freeCredits])

  const resolvedBody = useMemo(() => {
    let raw = currentToneData.body || buildFabriceInvitePlainText(baseInviteData)
    
    // Si le modèle contient des tags {{...}}, on substitue
    if (/\{\{\s*(prenom|nom|name|entreprise|societe|company|cie|lien|url|link|credits)\s*\}\}/i.test(raw)) {
      return substituteTemplateVariables(raw, {
        installerName: firstName,
        companyName,
        inviteUrl: generatedUrl,
        freeCredits,
      })
    }
    
    // Sinon, on s'assure que le lien dans le texte est synchronisé avec l'URL générée actuelle
    if (raw.includes("/partenaires/invitation")) {
      raw = raw.replace(/https?:\/\/[^\s\n]+\/partenaires\/invitation[^\s\n]*/g, generatedUrl)
    }

    return raw
  }, [currentToneData.body, baseInviteData, firstName, companyName, generatedUrl, freeCredits])

  // Historique local
  useEffect(() => {
    try {
      const saved = localStorage.getItem("aegis_fabrice_invite_history")
      if (saved) setHistory(JSON.parse(saved))
    } catch {
      // Ignore
    }
  }, [])

  const saveToHistory = () => {
    if (!firstName.trim() && !companyName.trim()) return
    const entry: SavedInviteHistory = {
      id: `inv_${Date.now()}`,
      name: firstName.trim() || "Artisan",
      company: companyName.trim() || "Société",
      email: installerEmail.trim() || "—",
      date: new Date().toLocaleDateString("fr-BE", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }),
      url: generatedUrl,
    }
    const updated = [entry, ...history.filter((h) => h.url !== generatedUrl)].slice(0, 8)
    setHistory(updated)
    try {
      localStorage.setItem("aegis_fabrice_invite_history", JSON.stringify(updated))
    } catch {
      // Ignore
    }
  }

  // ─── Actions d'envoi et copie ───
  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(generatedUrl)
      setCopiedLink(true)
      saveToHistory()
      toast.success("Lien d'invitation copié dans le presse-papier !")
      setTimeout(() => setCopiedLink(false), 2200)
    } catch {
      toast.error("Impossible de copier automatiquement.")
    }
  }

  const handleCopyFullMail = async () => {
    const fullText = `Objet : ${resolvedSubject}\n\n${resolvedBody}`
    try {
      await navigator.clipboard.writeText(fullText)
      setCopiedMail(true)
      saveToHistory()
      toast.success("Objet et corps de l'e-mail copiés !")
      setTimeout(() => setCopiedMail(false), 2200)
    } catch {
      toast.error("Erreur lors de la copie de l'e-mail.")
    }
  }

  const handleSendViaResend = async () => {
    if (!installerEmail.trim() || !installerEmail.includes("@")) {
      toast.error("Veuillez saisir une adresse e-mail valide pour l'envoi direct.")
      return
    }

    if (!confirm(`Envoyer cet e-mail d'invitation personnalisé signé Fabrice Remacle à ${installerEmail} ?`)) {
      return
    }

    setIsSendingEmail(true)
    try {
      const renderedHtml = renderFabriceInviteHtml(baseInviteData, resolvedBody)
      const res = await fetch("/api/admin/invite-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          toEmail: installerEmail.trim(),
          subject: resolvedSubject,
          html: renderedHtml,
          text: resolvedBody,
          installerName: firstName,
          companyName,
          inviteUrl: generatedUrl,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Erreur lors de l'envoi de l'e-mail")

      toast.success(`E-mail d'invitation envoyé avec succès à ${installerEmail} !`)
      saveToHistory()
    } catch (err: any) {
      toast.error(err.message || "Impossible d'envoyer l'e-mail.")
    } finally {
      setIsSendingEmail(false)
    }
  }

  // Message WhatsApp
  const whatsAppMessage = tone === "court_whatsapp" ? resolvedBody : buildFabriceWhatsAppMessage(baseInviteData)
  const whatsAppUrl = `https://wa.me/${installerPhone.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(whatsAppMessage)}`

  // Lien mailto
  const mailtoUrl = `mailto:${encodeURIComponent(installerEmail.trim())}?subject=${encodeURIComponent(resolvedSubject)}&body=${encodeURIComponent(resolvedBody)}`

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-5 sm:p-7 shadow-xs">
      {/* ─── Header Éditorial Grossiste ─── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-border pb-5 mb-6">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-1.5 rounded-md bg-secondary border border-border px-2.5 py-1 text-xs font-semibold text-foreground">
            <Sparkles className="h-3.5 w-3.5 text-accent" />
            <span>Réseau Installateurs · Fabrice Remacle (Grossiste PV)</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            Invitations Réseau &amp; Gestion des E-mails Grossiste
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed max-w-3xl">
            Personnalisez vos e-mails d&apos;invitation par ton (tutoiement, vouvoiement, WhatsApp).
            <strong className="text-foreground"> Chaque modification est enregistrée automatiquement pour chaque ton.</strong>
          </p>
        </div>

        <div className="shrink-0 flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-md bg-primary text-primary-foreground font-mono text-xs font-bold px-3 py-1.5 shadow-2xs">
            ✓ Accès VIP Fabrice
          </span>
        </div>
      </div>

      {/* ─── Grille Principale : 1. Paramétrage & 2. Éditeur Sauvegardé ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* COLONNE GAUCHE (5 cols) : Formulaire Destinataire & Offre */}
        <div className="lg:col-span-5 space-y-4 rounded-xl border border-border bg-background/50 p-4 sm:p-5">
          <h3 className="text-sm font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
            <Building2 className="h-4 w-4 text-accent" />
            1. Destinataire &amp; Paramètres
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-muted-foreground">Prénom artisan</Label>
              <Input
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Ex. Christophe, Marc..."
                className="h-9 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-muted-foreground">Société (optionnel)</Label>
              <Input
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Ex. Coretec, SolarWallonie..."
                className="h-9 text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-muted-foreground">E-mail installateur</Label>
              <Input
                type="email"
                value={installerEmail}
                onChange={(e) => setInstallerEmail(e.target.value)}
                placeholder="artisan@domaine.be"
                className="h-9 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-muted-foreground">Téléphone (WhatsApp)</Label>
              <Input
                value={installerPhone}
                onChange={(e) => setInstallerPhone(e.target.value)}
                placeholder="+32 475 ..."
                className="h-9 text-xs"
              />
            </div>
          </div>

          {/* Choix du Ton / Posture avec indicateur de personnalisation */}
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold text-foreground">Ton &amp; Modèle actif</Label>
              <span className="text-[11px] text-muted-foreground font-mono">
                3 modèles distincts
              </span>
            </div>

            <div className="grid grid-cols-3 gap-1.5">
              {(["tutoiement", "vouvoiement", "court_whatsapp"] as const).map((t) => {
                const isSelected = tone === t
                const isCustom = templatesByTone[t].isCustom
                const meta = TONE_LABELS[t]

                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => {
                      setTone(t)
                      setSaveStatus(templatesByTone[t].isCustom ? "saved" : "default")
                    }}
                    className={`relative rounded-md p-2 text-xs font-medium border text-center transition-all ${
                      isSelected
                        ? "bg-primary text-primary-foreground border-primary shadow-2xs font-bold"
                        : "bg-card text-muted-foreground border-border hover:text-foreground"
                    }`}
                  >
                    {isCustom && (
                      <span
                        className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-accent ring-2 ring-card"
                        title="Modèle personnalisé enregistré"
                      />
                    )}
                    <div>{meta.icon} {meta.title}</div>
                    <div className="text-[10px] opacity-80">{meta.subtitle}</div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Offre de Bienvenue & Provinces */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-muted-foreground">Crédits d&apos;accueil offerts</Label>
              <select
                value={freeCredits}
                onChange={(e) => {
                  const val = Number(e.target.value)
                  setFreeCredits(val)
                  if (val === 0) {
                    handleToggleCreditsText(false)
                  } else if (!includeCreditsText) {
                    handleToggleCreditsText(true)
                  }
                }}
                className="w-full h-9 rounded-md border border-border bg-card px-2.5 text-xs font-semibold text-foreground"
              >
                <option value={2}>🎁 2 crédits (1er lead gratuit)</option>
                <option value={5}>⭐ 5 crédits (Pack VIP Découverte)</option>
                <option value={0}>⚪ Aucun crédit offert</option>
              </select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold text-muted-foreground">Zone prioritaire</Label>
              <select
                value={provinces}
                onChange={(e) => setProvinces(e.target.value)}
                className="w-full h-9 rounded-md border border-border bg-card px-2.5 text-xs font-semibold text-foreground"
              >
                <option value="ALL">Toute la Wallonie</option>
                <option value="liege">Liège</option>
                <option value="namur">Namur</option>
                <option value="hainaut">Hainaut</option>
                <option value="brabant_wallon">Brabant Wallon</option>
                <option value="luxembourg">Luxembourg</option>
              </select>
            </div>
          </div>

          {/* Option : Inclure ou enlever la partie du texte où il offre les crédits */}
          <div className="rounded-lg border border-border bg-card p-3 flex items-center justify-between gap-3">
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                <Sparkles className="h-3.5 w-3.5 text-accent" />
                <span>Offre de crédits dans le message</span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-tight">
                {includeCreditsText
                  ? `Mentionne l'accueil de ${freeCredits > 0 ? freeCredits : 2} crédits offerts pour tester gratuitement.`
                  : "Le paragraphe offrant les crédits est retiré du message."}
              </p>
            </div>

            <button
              type="button"
              role="switch"
              aria-checked={includeCreditsText}
              onClick={() => handleToggleCreditsText(!includeCreditsText)}
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                includeCreditsText ? "bg-primary" : "bg-muted"
              }`}
              title={includeCreditsText ? "Désactiver l'offre de crédits dans le texte" : "Activer l'offre de crédits dans le texte"}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-background shadow-xs ring-0 transition duration-200 ease-in-out ${
                  includeCreditsText ? "translate-x-4" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {/* Note personnelle optionnelle */}
          <div className="space-y-1 pt-1">
            <Label className="text-xs font-semibold text-muted-foreground">
              Note personnelle de Fabrice (optionnelle)
            </Label>
            <Input
              value={customNote}
              onChange={(e) => setCustomNote(e.target.value)}
              placeholder="Ex: J'espère que le chantier de Verviers s'est bien passé."
              className="h-9 text-xs"
            />
          </div>

          {/* Bloc Lien d'invitation généré */}
          <div className="mt-4 rounded-xl border border-border bg-card p-3.5 space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-foreground">
              <span className="flex items-center gap-1.5">
                <Link2 className="h-4 w-4 text-accent" />
                Lien d&apos;accès personnalisé
              </span>
              <a
                href={generatedUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[11px] text-accent hover:underline"
              >
                <span>Tester</span>
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>

            <div className="font-mono text-[11px] text-muted-foreground bg-secondary/60 p-2 rounded border border-border break-all select-all">
              {generatedUrl}
            </div>

            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleCopyLink}
              className="w-full h-8 text-xs font-semibold gap-1.5"
            >
              {copiedLink ? (
                <>
                  <Check className="h-3.5 w-3.5 text-primary" />
                  <span>Lien Copié dans le presse-papier !</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  <span>Copier uniquement le lien</span>
                </>
              )}
            </Button>
          </div>
        </div>

        {/* COLONNE DROITE (7 cols) : Éditeur Persistant par Ton & Prévisualisation */}
        <div className="lg:col-span-7 flex flex-col justify-between rounded-xl border border-border bg-card p-4 sm:p-5 space-y-4">
          
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                  <Mail className="h-4 w-4 text-accent" />
                  2. Message personnalisé ({TONE_LABELS[tone].title})
                </h3>

                {/* Badge d'état de sauvegarde automatique */}
                {currentToneData.isCustom && (
                  <span className="inline-flex items-center gap-1 text-[10px] rounded bg-primary/10 text-primary font-mono font-semibold px-2 py-0.5 border border-primary/20">
                    <Save className="h-3 w-3" />
                    <span>Modèle sauvegardé {currentToneData.updatedAt ? `(${currentToneData.updatedAt})` : ""}</span>
                  </span>
                )}
                {saveStatus === "saving" && (
                  <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground font-mono">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    <span>Enregistrement...</span>
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5">
                <div className="inline-flex rounded-lg bg-secondary p-0.5 border border-border">
                  <button
                    type="button"
                    onClick={() => setViewTab("edit")}
                    className={`rounded px-2.5 py-1 text-xs font-semibold transition-all ${
                      viewTab === "edit" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Edit3 className="h-3 w-3 inline mr-1" />
                    Édition
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewTab("preview")}
                    className={`rounded px-2.5 py-1 text-xs font-semibold transition-all ${
                      viewTab === "preview" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Eye className="h-3 w-3 inline mr-1" />
                    Aperçu HTML
                  </button>
                </div>

                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={handleResetCurrentTone}
                  className="h-7 px-2 text-[11px] text-muted-foreground hover:text-foreground"
                  title={`Rétablir le modèle par défaut pour le ton ${TONE_LABELS[tone].title}`}
                >
                  <RotateCcw className="h-3 w-3 mr-1" />
                  Rétablir
                </Button>
              </div>
            </div>

            {/* Champ Objet */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-muted-foreground">Objet de l&apos;e-mail ({TONE_LABELS[tone].title})</Label>
                <span className="text-[10px] text-muted-foreground">Modifiable en direct</span>
              </div>
              <Input
                value={currentToneData.subject || buildFabriceInviteSubject(baseInviteData)}
                onChange={(e) => handleSubjectChange(e.target.value)}
                className="h-9 text-xs font-semibold font-mono"
              />
            </div>

            {/* Zone Édition VS Aperçu */}
            {viewTab === "edit" ? (
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center justify-between gap-1">
                  <Label className="text-xs font-semibold text-muted-foreground">
                    Corps du message enregistré pour le ton <strong className="text-foreground">{TONE_LABELS[tone].title}</strong>
                  </Label>

                  {/* Puces d'insertion de variables rapides */}
                  <div className="flex items-center gap-1 text-[11px]">
                    <span className="text-muted-foreground font-mono text-[10px] hidden sm:inline">Insérer :</span>
                    <button
                      type="button"
                      onClick={() => insertVariableTag("{{prenom}}")}
                      className="rounded bg-secondary px-1.5 py-0.5 font-mono text-[10px] hover:bg-secondary/80 border border-border"
                      title="Insérer le prénom du destinataire"
                    >
                      + Prénom
                    </button>
                    <button
                      type="button"
                      onClick={() => insertVariableTag("{{entreprise}}")}
                      className="rounded bg-secondary px-1.5 py-0.5 font-mono text-[10px] hover:bg-secondary/80 border border-border"
                      title="Insérer l'entreprise"
                    >
                      + Entreprise
                    </button>
                    <button
                      type="button"
                      onClick={() => insertVariableTag("{{lien}}")}
                      className="rounded bg-secondary px-1.5 py-0.5 font-mono text-[10px] hover:bg-secondary/80 border border-border"
                      title="Insérer le lien d'accès personnalisé"
                    >
                      + Lien
                    </button>
                    <button
                      type="button"
                      onClick={() => insertVariableTag("{{credits}}")}
                      className="rounded bg-secondary px-1.5 py-0.5 font-mono text-[10px] hover:bg-secondary/80 border border-border"
                      title="Insérer le nombre de crédits offerts"
                    >
                      + Crédits
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const phrase =
                          tone === "tutoiement"
                            ? "Comme on se connaît bien, je t'ai fait créditer {{credits}} crédits d'accueil sur ton espace pour que tu puisses tester et débloquer ton 1er dossier B2C gratuitement, sans rien payer."
                            : "Dans le cadre de nos relations, je vous ai fait allouer {{credits}} crédits d'accueil sur votre espace afin que vous puissiez tester et débloquer votre 1er dossier sans aucun engagement financier."
                        insertVariableTag(phrase)
                      }}
                      className="rounded bg-accent/10 text-accent border border-accent/20 px-1.5 py-0.5 font-mono text-[10px] hover:bg-accent/20 font-semibold"
                      title="Insérer le paragraphe complet d'offre de crédits"
                    >
                      + Paragraphe Crédits
                    </button>
                  </div>
                </div>

                <Textarea
                  ref={textareaRef}
                  value={currentToneData.body || buildFabriceInvitePlainText(baseInviteData)}
                  onChange={(e) => handleBodyChange(e.target.value)}
                  rows={13}
                  className="font-mono text-xs leading-relaxed resize-y min-h-[260px] bg-background/50"
                  placeholder="Tapez ou personnalisez votre message pour ce ton..."
                />

                <div className="flex items-center justify-between text-[11px] text-muted-foreground font-mono pt-0.5">
                  <span>💾 Enregistré automatiquement dès la saisie</span>
                  <span>{currentToneData.body?.length || 0} caractères</span>
                </div>
              </div>
            ) : (
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold text-muted-foreground">Rendu final envoyé à l&apos;installateur</Label>
                  <span className="font-mono text-[10px] text-muted-foreground">Variables résolues</span>
                </div>
                <div className="rounded-lg border border-border bg-background p-4 max-h-[360px] overflow-y-auto text-xs space-y-3 leading-relaxed">
                  <div className="border-b border-border pb-2 flex items-center justify-between">
                    <span className="font-bold text-foreground">Aegis Solaire · Réseau Partenaires</span>
                    <span className="font-mono text-[10px] text-muted-foreground">Wallonie Agréé</span>
                  </div>
                  <div className="font-mono font-semibold text-xs text-foreground bg-secondary/40 p-2 rounded">
                    Objet : {resolvedSubject}
                  </div>
                  <div className="whitespace-pre-line text-foreground/90 font-sans">
                    {resolvedBody}
                  </div>
                  <div className="border-t border-border pt-2 text-[11px] text-muted-foreground font-mono">
                    Fabrice Remacle · Fournisseur Matériel PV · Tél : +32 495 57 07 73
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ─── Barre d'actions d'envoi et de copie ─── */}
          <div className="pt-3 border-t border-border space-y-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
              
              {/* Action 1 : Copier E-mail */}
              <Button
                type="button"
                variant="outline"
                onClick={handleCopyFullMail}
                className="h-10 text-xs font-semibold gap-1.5"
                title="Copier l'objet et le texte du mail personnalisé"
              >
                {copiedMail ? (
                  <>
                    <Check className="h-4 w-4 text-primary" />
                    <span>Copié !</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    <span>Copier l&apos;e-mail</span>
                  </>
                )}
              </Button>

              {/* Action 2 : Ouvrir dans client mail (Outlook/Webmail) */}
              <Button
                type="button"
                variant="outline"
                asChild
                className="h-10 text-xs font-semibold gap-1.5"
                title="Ouvrir directement dans votre logiciel de messagerie (Outlook, Thunderbird, etc.)"
              >
                <a href={mailtoUrl}>
                  <Mail className="h-4 w-4" />
                  <span>Mon Webmail</span>
                </a>
              </Button>

              {/* Action 3 : WhatsApp direct */}
              <Button
                type="button"
                variant="outline"
                asChild
                className="h-10 text-xs font-semibold gap-1.5 text-foreground hover:bg-secondary"
                title="Envoyer le message court via WhatsApp"
              >
                <a href={whatsAppUrl} target="_blank" rel="noopener noreferrer">
                  <MessageCircle className="h-4 w-4 text-accent" />
                  <span>WhatsApp</span>
                </a>
              </Button>

              {/* Action 4 : Envoi direct via Resend */}
              <Button
                type="button"
                variant="default"
                disabled={isSendingEmail || !installerEmail.trim()}
                onClick={handleSendViaResend}
                className="h-10 text-xs font-bold gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90"
                title="Envoyer l'e-mail officiel avec logo et design Swiss Editorial directement"
              >
                {isSendingEmail ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Envoi...</span>
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    <span>Envoyer en 1 clic</span>
                  </>
                )}
              </Button>
            </div>

            {!installerEmail.trim() && (
              <p className="text-[11px] text-muted-foreground text-center sm:text-right">
                💡 Renseignez l&apos;adresse e-mail à gauche pour débloquer l&apos;envoi automatique direct via Resend.
              </p>
            )}
          </div>

        </div>

      </div>

      {/* ─── 10. Historique des dernières invitations ─── */}
      {history.length > 0 && (
        <div className="mt-6 pt-5 border-t border-border">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <History className="h-3.5 w-3.5 text-accent" />
              Dernières invitations générées ({history.length})
            </span>
            <button
              type="button"
              onClick={() => {
                setHistory([])
                localStorage.removeItem("aegis_fabrice_invite_history")
              }}
              className="text-[11px] text-muted-foreground hover:underline"
            >
              Effacer l&apos;historique
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            {history.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between rounded-lg border border-border bg-background p-2.5 text-xs hover:border-border transition-colors"
              >
                <div className="truncate mr-2">
                  <div className="font-bold text-foreground truncate">{item.name} {item.company !== "Société" ? `(${item.company})` : ""}</div>
                  <div className="text-[10px] text-muted-foreground font-mono">{item.date} · {item.email}</div>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    await navigator.clipboard.writeText(item.url)
                    toast.success(`Lien pour ${item.name} copié !`)
                  }}
                  className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground shrink-0"
                  title="Copier à nouveau le lien"
                >
                  <Copy className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

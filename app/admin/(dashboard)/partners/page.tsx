"use client"

import { useEffect, useState, useMemo } from "react"
import Link from "next/link"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table"
import {
  Coins,
  Building2,
  Phone,
  Mail,
  RefreshCw,
  Search,
  Plus,
  Eye,
  AlertTriangle,
  ShieldCheck,
  CheckCircle2,
  ExternalLink,
  MapPin,
  Clock,
  Layers,
  ArrowRight,
  UserPlus,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { AdminNetworkInviteHub } from "@/components/admin/admin-network-invite-hub"

/* ═══════════════════════════════════════════════════════
   Types
   ═══════════════════════════════════════════════════════ */

type Partner = {
  id: string
  company_name: string
  email: string
  phone: string | null
  credits: number
  segment: "B2B" | "B2C" | "both" | string | null
  target_provinces: string[] | null
  created_at: string
  is_test?: boolean
  stats: {
    leadsPurchased: number
    creditsSpent: number
    creditsTopupped: number
  }
}

const WALLOON_PROVINCES = [
  { code: "BW", name: "Brabant wallon", key: "brabant-wallon" },
  { code: "HAI", name: "Hainaut", key: "hainaut" },
  { code: "LGE", name: "Liège", key: "liege" },
  { code: "LUX", name: "Luxembourg", key: "luxembourg" },
  { code: "NAM", name: "Namur", key: "namur" },
]

export default function AdminPartnersPage() {
  const [partners, setPartners] = useState<Partner[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [activeTab, setActiveTab] = useState<"all" | "at_risk" | "coverage">("all")
  const [showInviteHub, setShowInviteHub] = useState(false)

  // Modale d'ajout de crédits
  const [creditModalPartner, setCreditModalPartner] = useState<Partner | null>(null)
  const [creditAmount, setCreditAmount] = useState<number>(10)
  const [creditReason, setCreditReason] = useState<string>("Attribution commerciale Aegis")
  const [savingCredits, setSavingCredits] = useState(false)

  // Modale des achats de leads
  const [purchasesModalPartner, setPurchasesModalPartner] = useState<Partner | null>(null)
  const [purchasesData, setPurchasesData] = useState<any[]>([])
  const [loadingPurchases, setLoadingPurchases] = useState(false)

  // Charger les partenaires
  const loadPartners = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/partners", {
        headers: { "x-admin-request": "true" },
      })
      if (!res.ok) throw new Error("Échec du chargement")
      const data = await res.json()
      setPartners(Array.isArray(data) ? data : [])
    } catch {
      toast.error("Impossible de charger les installateurs")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPartners()
  }, [])

  // Attribution manuelle de crédits
  async function handleAddCredits() {
    if (!creditModalPartner || creditAmount === 0) return
    setSavingCredits(true)

    try {
      const res = await fetch(`/api/admin/partners/${creditModalPartner.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-admin-request": "true",
        },
        body: JSON.stringify({
          addCredits: creditAmount,
          reference: creditReason.trim() || "admin_manual_topup",
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Erreur lors de l'attribution")

      setPartners((prev) =>
        prev.map((p) =>
          p.id === creditModalPartner.id ? { ...p, credits: data.newCredits } : p
        )
      )

      toast.success(
        `${creditAmount > 0 ? `+${creditAmount}` : creditAmount} crédits alloués à ${creditModalPartner.company_name}`
      )
      setCreditModalPartner(null)
      setCreditAmount(10)
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de l'attribution des crédits")
    } finally {
      setSavingCredits(false)
    }
  }

  // Consulter les achats d'un partenaire
  async function openPurchases(partner: Partner) {
    setPurchasesModalPartner(partner)
    setLoadingPurchases(true)
    setPurchasesData([])

    try {
      const res = await fetch(`/api/admin/partners/${partner.id}/purchases`, {
        headers: { "x-admin-request": "true" },
      })
      const data = await res.json()
      setPurchasesData(Array.isArray(data) ? data : [])
    } catch {
      toast.error("Impossible de charger l'historique des achats")
    } finally {
      setLoadingPurchases(false)
    }
  }

  // Partenaires "À risque" (solde < 5 crédits ou zéro achat récent)
  const isPartnerAtRisk = (p: Partner) => {
    const isCreditCritical = p.credits < 5
    return isCreditCritical
  }

  const partnersAtRisk = useMemo(
    () => partners.filter((p) => isPartnerAtRisk(p)),
    [partners]
  )

  const filteredPartners = useMemo(() => {
    let list = partners
    if (activeTab === "at_risk") {
      list = partnersAtRisk
    }
    if (!searchTerm.trim()) return list
    const q = searchTerm.toLowerCase().trim()
    return list.filter(
      (p) =>
        p.company_name.toLowerCase().includes(q) ||
        p.email.toLowerCase().includes(q) ||
        p.phone?.toLowerCase().includes(q)
    )
  }, [partners, activeTab, partnersAtRisk, searchTerm])

  // KPIs
  const totalCreditsCirculation = useMemo(
    () => partners.reduce((s, p) => s + (p.credits || 0), 0),
    [partners]
  )
  const totalLeadsPurchased = useMemo(
    () => partners.reduce((s, p) => s + (p.stats.leadsPurchased || 0), 0),
    [partners]
  )
  const b2bPartnersCount = useMemo(
    () => partners.filter((p) => p.segment?.toUpperCase() === "B2B" || p.segment?.toUpperCase() === "BOTH").length,
    [partners]
  )
  const b2cPartnersCount = useMemo(
    () => partners.filter((p) => p.segment?.toUpperCase() === "B2C" || p.segment?.toUpperCase() === "BOTH").length,
    [partners]
  )

  return (
    <div className="flex flex-col gap-6">
      {/* 1. Header Opérationnel */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-3">
            <h1 className="font-heading text-xl font-semibold tracking-tight text-foreground">
              Réseau Installateurs &amp; Capacité
            </h1>
            <span className="font-mono text-xs tabular-nums text-muted-foreground bg-secondary px-2 py-0.5 rounded-sm border border-border">
              {partners.length} partenaires
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            Supervision des installateurs agréés RESCERT, contrôle des soldes de crédits et surveillance de la couverture en Wallonie.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="default"
            size="sm"
            onClick={() => setShowInviteHub((prev) => !prev)}
            className="h-8 text-xs gap-1.5 font-bold bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <UserPlus className="h-3.5 w-3.5" />
            <span>{showInviteHub ? "Masquer Invites" : "Inviter Réseau Fabrice"}</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={loadPartners}
            disabled={loading}
            className="h-8 text-xs gap-1.5"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
            <span>Actualiser</span>
          </Button>

          <Button variant="outline" size="sm" asChild className="h-8 text-xs gap-1.5">
            <Link href="/admin/finance">
              <Coins className="h-3.5 w-3.5" />
              <span>Virements &amp; SEPA</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          </Button>

          <Button size="sm" asChild className="h-8 text-xs gap-1.5">
            <Link href="/admin/applications">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>Candidatures</span>
            </Link>
          </Button>
        </div>
      </div>

      {/* Module Dépliable : Hub d'Invitations Réseau Grossiste */}
      {showInviteHub && (
        <div className="animate-in fade-in slide-in-from-top-2 duration-200">
          <AdminNetworkInviteHub />
        </div>
      )}

      {/* 2. Cartes de Métriques Réseau (Tokens sémantiques, zéro couleur interdite) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total installateurs */}
        <div className="rounded-lg border border-border bg-card p-4 flex flex-col gap-2">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Installateurs certifiés</span>
            <div className="h-7 w-7 rounded-md bg-secondary flex items-center justify-center text-foreground">
              <Building2 className="h-4 w-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-2xl font-bold tabular-nums text-foreground">
              {partners.length}
            </span>
            <span className="text-xs text-muted-foreground">partenaires actifs</span>
          </div>
          <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
            {b2bPartnersCount} B2B · {b2cPartnersCount} B2C
          </span>
        </div>

        {/* Partenaires à risque */}
        <div
          className={cn(
            "rounded-lg border p-4 flex flex-col gap-2 transition-colors",
            partnersAtRisk.length > 0
              ? "border-destructive/40 bg-destructive/5"
              : "border-border bg-card"
          )}
        >
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Partenaires à risque de rupture</span>
            <div
              className={cn(
                "h-7 w-7 rounded-md flex items-center justify-center",
                partnersAtRisk.length > 0
                  ? "bg-destructive/20 text-destructive"
                  : "bg-secondary text-foreground"
              )}
            >
              <AlertTriangle className="h-4 w-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-2xl font-bold tabular-nums text-foreground">
              {partnersAtRisk.length}
            </span>
            <span className="text-xs text-muted-foreground">solde &lt; 5 crédits</span>
          </div>
          <span className="text-[11px] text-muted-foreground">
            Incapables d&apos;acquérir un lead B2B sans recharge
          </span>
        </div>

        {/* Crédits en circulation */}
        <div className="rounded-lg border border-border bg-card p-4 flex flex-col gap-2">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Crédits détenus par le réseau</span>
            <div className="h-7 w-7 rounded-md bg-secondary flex items-center justify-center text-foreground">
              <Coins className="h-4 w-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-2xl font-bold tabular-nums text-foreground">
              {totalCreditsCirculation}
            </span>
            <span className="text-xs text-muted-foreground">crédits en réserve</span>
          </div>
          <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
            Moyenne : {partners.length > 0 ? Math.round(totalCreditsCirculation / partners.length) : 0} cr. / installateur
          </span>
        </div>

        {/* Leads débloqués */}
        <div className="rounded-lg border border-border bg-card p-4 flex flex-col gap-2">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Leads acquis par le réseau</span>
            <div className="h-7 w-7 rounded-md bg-secondary flex items-center justify-center text-foreground">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-2xl font-bold tabular-nums text-foreground">
              {totalLeadsPurchased}
            </span>
            <span className="text-xs text-muted-foreground">leads débloqués</span>
          </div>
          <span className="text-[11px] text-muted-foreground">
            Volume historique marketplace Aegis
          </span>
        </div>
      </div>

      {/* 3. Onglets & Barre d'outils */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center rounded-md border border-border bg-card p-0.5 text-xs overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab("all")}
            className={cn(
              "px-3 py-1.5 rounded-sm font-medium transition-colors whitespace-nowrap flex items-center gap-1.5",
              activeTab === "all"
                ? "bg-secondary text-foreground shadow-2xs font-semibold"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <span>Tous les installateurs</span>
            <span className="font-mono text-[10px] tabular-nums text-muted-foreground">
              ({partners.length})
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("at_risk")}
            className={cn(
              "px-3 py-1.5 rounded-sm font-medium transition-colors whitespace-nowrap flex items-center gap-1.5",
              activeTab === "at_risk"
                ? "bg-secondary text-foreground shadow-2xs font-semibold"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <span>À risque (&lt; 5 cr.)</span>
            {partnersAtRisk.length > 0 && (
              <span className="rounded-full bg-destructive/20 px-1.5 py-0.2 font-mono text-[10px] tabular-nums font-bold text-destructive">
                {partnersAtRisk.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("coverage")}
            className={cn(
              "px-3 py-1.5 rounded-sm font-medium transition-colors whitespace-nowrap flex items-center gap-1.5",
              activeTab === "coverage"
                ? "bg-secondary text-foreground shadow-2xs font-semibold"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <MapPin className="h-3 w-3" />
            <span>Matrice de Couverture Wallonie</span>
          </button>
        </div>

        {activeTab !== "coverage" && (
          <div className="relative min-w-[260px] max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Rechercher installateur, e-mail, téléphone…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 h-8 text-xs bg-card"
            />
          </div>
        )}
      </div>

      {/* 4. Affichage conditionnel : Matrice de Couverture OU Table Haute Densité */}
      {activeTab === "coverage" ? (
        <div className="rounded-md border border-border bg-card p-5 flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <h2 className="text-sm font-semibold text-foreground">
              Matrice de Couverture Géographique par Province
            </h2>
            <p className="text-xs text-muted-foreground">
              Disponibilité des installateurs certifiés actifs pour absorber le flux de leads entrants.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-2">
            {WALLOON_PROVINCES.map((prov) => {
              const coveringPartners = partners.filter((p) => {
                if (!p.target_provinces || p.target_provinces.length === 0) return true
                return p.target_provinces.some((tp) =>
                  tp.toLowerCase().includes(prov.key) || tp.toLowerCase().includes(prov.name.toLowerCase())
                )
              })

              const b2bCount = coveringPartners.filter(
                (p) => p.segment?.toUpperCase() === "B2B" || p.segment?.toUpperCase() === "BOTH"
              ).length
              const b2cCount = coveringPartners.filter(
                (p) => p.segment?.toUpperCase() === "B2C" || p.segment?.toUpperCase() === "BOTH"
              ).length
              const hasCoverageTension = coveringPartners.length < 2

              return (
                <div
                  key={prov.code}
                  className={cn(
                    "rounded-lg border p-3.5 flex flex-col gap-2",
                    hasCoverageTension
                      ? "border-destructive/30 bg-destructive/5"
                      : "border-border bg-secondary/30"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-foreground">
                      {prov.code}
                    </span>
                    <Badge variant="outline" className="text-[10px] font-mono tabular-nums">
                      {coveringPartners.length} installateurs
                    </Badge>
                  </div>
                  <span className="text-xs font-medium text-foreground">{prov.name}</span>
                  <div className="flex flex-col gap-1 pt-1 border-t border-border/50 text-[11px] font-mono tabular-nums text-muted-foreground">
                    <div className="flex justify-between">
                      <span>Couverture B2B :</span>
                      <span className="font-semibold text-foreground">{b2bCount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Couverture B2C :</span>
                      <span className="font-semibold text-foreground">{b2cCount}</span>
                    </div>
                  </div>
                  {hasCoverageTension && (
                    <span className="text-[10px] text-destructive font-medium mt-1">
                      ⚠ Tension de couverture
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        <div className="rounded-md border border-border bg-card overflow-hidden">
          <Table className="text-xs">
            <TableHeader>
              <TableRow className="bg-secondary/40 border-b border-border hover:bg-secondary/40">
                <TableHead className="min-w-[220px]">Installateur &amp; Contact</TableHead>
                <TableHead className="w-24 text-center font-mono text-[11px] text-muted-foreground">Segment</TableHead>
                <TableHead className="min-w-[160px]">Provinces Couvertes</TableHead>
                <TableHead className="w-28 text-right font-mono text-[11px] text-muted-foreground">Solde Crédits</TableHead>
                <TableHead className="w-28 text-right font-mono text-[11px] text-muted-foreground">Leads Achetés</TableHead>
                <TableHead className="w-40 text-right">Actions Opérationnelles</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPartners.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-12 text-center text-muted-foreground italic">
                    Aucun installateur ne correspond aux critères sélectionnés.
                  </TableCell>
                </TableRow>
              ) : (
                filteredPartners.map((partner) => {
                  const isLowCredits = partner.credits < 5
                  const segmentLabel =
                    partner.segment === "B2B"
                      ? "B2B"
                      : partner.segment === "B2C"
                      ? "B2C"
                      : "B2B & B2C"

                  return (
                    <TableRow
                      key={partner.id}
                      className="border-b border-border transition-colors hover:bg-secondary/20"
                    >
                      {/* Société */}
                      <TableCell>
                        <div className="flex flex-col gap-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-foreground">
                              {partner.company_name}
                            </span>
                            {partner.is_test && (
                              <Badge
                                variant="outline"
                                className="text-[9px] font-mono py-0 h-4 bg-secondary text-muted-foreground"
                              >
                                TEST
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {partner.email}
                            </span>
                            {partner.phone && (
                              <span className="flex items-center gap-1 font-mono tabular-nums">
                                <Phone className="h-3 w-3" />
                                {partner.phone}
                              </span>
                            )}
                          </div>
                        </div>
                      </TableCell>

                      {/* Segment */}
                      <TableCell className="text-center">
                        <Badge variant="outline" className="font-mono text-[10px]">
                          {segmentLabel}
                        </Badge>
                      </TableCell>

                      {/* Provinces */}
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {partner.target_provinces && partner.target_provinces.length > 0 ? (
                            partner.target_provinces.slice(0, 3).map((prov) => (
                              <span
                                key={prov}
                                className="rounded bg-secondary border border-border px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground capitalize"
                              >
                                {prov.replace(/-/g, " ")}
                              </span>
                            ))
                          ) : (
                            <span className="text-[11px] text-muted-foreground italic">
                              Toute la Wallonie
                            </span>
                          )}
                          {partner.target_provinces && partner.target_provinces.length > 3 && (
                            <span className="text-[10px] font-mono text-muted-foreground self-center">
                              +{partner.target_provinces.length - 3}
                            </span>
                          )}
                        </div>
                      </TableCell>

                      {/* Solde Crédits */}
                      <TableCell className="text-right font-mono tabular-nums">
                        <span
                          className={cn(
                            "font-bold text-sm px-2 py-0.5 rounded border",
                            isLowCredits
                              ? "bg-destructive/10 text-destructive border-destructive/20"
                              : "bg-secondary text-foreground border-border"
                          )}
                        >
                          {partner.credits} cr.
                        </span>
                      </TableCell>

                      {/* Leads Achetés */}
                      <TableCell className="text-right font-mono tabular-nums">
                        <span className="font-semibold text-foreground">
                          {partner.stats.leadsPurchased}
                        </span>
                        <span className="text-[10px] text-muted-foreground block">
                          ({partner.stats.creditsSpent} cr. dépensés)
                        </span>
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            size="sm"
                            variant="default"
                            className="h-7 text-xs font-medium gap-1"
                            onClick={() => {
                              setCreditModalPartner(partner)
                              setCreditAmount(10)
                              setCreditReason("Attribution manuelle Aegis")
                            }}
                          >
                            <Plus className="h-3 w-3" />
                            <span>Crédits</span>
                          </Button>

                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs gap-1"
                            onClick={() => openPurchases(partner)}
                          >
                            <Eye className="h-3 w-3" />
                            <span>Achats</span>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Dialogue d'Attribution Manuelle de Crédits */}
      <Dialog
        open={Boolean(creditModalPartner)}
        onOpenChange={(open) => !open && setCreditModalPartner(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Coins className="h-5 w-5 text-primary" />
              <span>Allouer des crédits</span>
            </DialogTitle>
            <DialogDescription>
              Attribution manuelle immédiate sur le compte de l&apos;installateur.
            </DialogDescription>
          </DialogHeader>

          {creditModalPartner && (
            <div className="flex flex-col gap-4 py-2">
              <div className="rounded-md border border-border bg-secondary/30 p-3 flex flex-col gap-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Installateur :</span>
                  <span className="font-semibold text-foreground">
                    {creditModalPartner.company_name}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Solde actuel :</span>
                  <span className="font-mono font-bold tabular-nums text-foreground">
                    {creditModalPartner.credits} crédits
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="creditAmount" className="text-xs">
                  Nombre de crédits à ajouter
                </Label>
                <Input
                  id="creditAmount"
                  type="number"
                  min="1"
                  max="500"
                  value={creditAmount}
                  onChange={(e) => setCreditAmount(parseInt(e.target.value) || 0)}
                  className="font-mono text-sm"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="creditReason" className="text-xs">
                  Motif d&apos;attribution (journalisé dans l&apos;audit)
                </Label>
                <Input
                  id="creditReason"
                  placeholder="Ex : Virement direct, geste commercial..."
                  value={creditReason}
                  onChange={(e) => setCreditReason(e.target.value)}
                  className="text-xs"
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCreditModalPartner(null)}
              disabled={savingCredits}
            >
              Annuler
            </Button>
            <Button
              size="sm"
              onClick={handleAddCredits}
              disabled={savingCredits || creditAmount <= 0}
            >
              {savingCredits ? "Enregistrement…" : "Confirmer l'ajout"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialogue d'Historique des Achats de Leads */}
      <Dialog
        open={Boolean(purchasesModalPartner)}
        onOpenChange={(open) => !open && setPurchasesModalPartner(null)}
      >
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-primary" />
              <span>Historique des leads débloqués</span>
            </DialogTitle>
            <DialogDescription>
              Leads acquis par {purchasesModalPartner?.company_name} sur la marketplace.
            </DialogDescription>
          </DialogHeader>

          <div className="overflow-y-auto flex-1 my-2">
            {loadingPurchases ? (
              <div className="p-8 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
                <RefreshCw className="h-4 w-4 animate-spin text-primary" />
                <span>Chargement des achats…</span>
              </div>
            ) : purchasesData.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground italic">
                Aucun lead n&apos;a encore été acheté par ce partenaire.
              </div>
            ) : (
              <Table className="text-xs">
                <TableHeader>
                  <TableRow className="bg-secondary/40 border-b border-border">
                    <TableHead className="w-28 font-mono text-[11px] text-muted-foreground">Date d&apos;achat</TableHead>
                    <TableHead>Prospect / Contact</TableHead>
                    <TableHead className="w-20 font-mono text-[11px] text-muted-foreground">Segment</TableHead>
                    <TableHead className="w-28">Province</TableHead>
                    <TableHead className="w-24 text-right font-mono text-[11px] text-muted-foreground">Crédits</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {purchasesData.map((item) => {
                    const lead = item.leads || item
                    return (
                      <TableRow key={item.id} className="border-b border-border">
                        <TableCell className="font-mono text-[11px] tabular-nums whitespace-nowrap text-muted-foreground">
                          {new Date(item.purchased_at || item.created_at).toLocaleDateString("fr-BE")}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium text-foreground">
                              {lead.first_name} {lead.last_name || lead.company || ""}
                            </span>
                            <span className="text-[11px] text-muted-foreground font-mono">
                              {lead.phone || lead.email || "—"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-[10px]">
                          {lead.segment || "B2C"}
                        </TableCell>
                        <TableCell className="capitalize">
                          {lead.province || "Wallonie"}
                        </TableCell>
                        <TableCell className="text-right font-mono tabular-nums font-semibold text-foreground">
                          {item.credits_spent || (lead.segment === "B2B" ? 5 : 2)} cr.
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPurchasesModalPartner(null)}
            >
              Fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

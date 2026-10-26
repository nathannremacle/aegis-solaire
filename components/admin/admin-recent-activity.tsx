"use client"

import Link from "next/link"
import { 
  ArrowRight, 
  Eye, 
  ShieldCheck, 
  Clock, 
  Building2, 
  User, 
  MapPin, 
  Sparkles,
  Layers,
  Activity,
  FileCheck2,
  AlertCircle
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface AdminRecentActivityProps {
  recentLeads: any[]
  auditLogs: any[]
}

export function AdminRecentActivity({
  recentLeads,
  auditLogs,
}: AdminRecentActivityProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* 1. Derniers leads reçus (2 colonnes) */}
      <Card className="lg:col-span-2 border-border bg-card shadow-2xs overflow-hidden flex flex-col justify-between">
        <CardHeader className="flex flex-row items-center justify-between border-b border-border bg-muted/30 px-5 py-4">
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-accent" />
              <CardTitle className="text-sm sm:text-base font-bold text-foreground">
                Flux des Derniers Leads Entrants
              </CardTitle>
            </div>
            <p className="text-xs text-muted-foreground">
              Acquisition multi-canaux (Simulateur B2B, Devis Landing B2C, Webinaire)
            </p>
          </div>
          <Button variant="outline" size="sm" asChild className="h-8 text-xs font-semibold gap-1.5 border-border">
            <Link href="/admin/leads">
              <span>Voir tout ({recentLeads.length})</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </CardHeader>

        <CardContent className="p-0 flex-1">
          {recentLeads.length === 0 ? (
            <div className="p-8 text-center text-xs text-muted-foreground">
              Aucun lead enregistré pour le moment.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-border bg-muted/50 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">Lead / Entreprise</th>
                    <th className="px-4 py-3">Segment &amp; Format</th>
                    <th className="px-4 py-3">Localisation</th>
                    <th className="px-4 py-3">Score &amp; Surface</th>
                    <th className="px-4 py-3">Statut Marketplace</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {recentLeads.slice(0, 8).map((lead) => {
                    const isB2B = lead.segment === "B2B"
                    const leadScore = Number(lead.lead_score || 0)
                    const dateFormatted = lead.created_at
                      ? new Date(lead.created_at).toLocaleDateString("fr-BE", {
                          day: "2-digit",
                          month: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "—"

                    return (
                      <tr key={lead.id} className="hover:bg-muted/40 transition-colors">
                        {/* Identité Lead */}
                        <td className="px-4 py-3">
                          <div className="flex flex-col gap-0.5">
                            <span className="font-semibold text-foreground flex items-center gap-1.5">
                              {isB2B ? (
                                <Building2 className="h-3.5 w-3.5 text-accent shrink-0" />
                              ) : (
                                <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                              )}
                              <span className="truncate max-w-[180px]">
                                {lead.company || `${lead.first_name || ""} ${lead.last_name || ""}`}
                              </span>
                            </span>
                            <span className="text-[11px] text-muted-foreground truncate max-w-[200px]">
                              {lead.email || "E-mail non renseigné"}
                            </span>
                            <span className="text-[10px] text-muted-foreground font-mono tabular-nums">
                              {dateFormatted}
                            </span>
                          </div>
                        </td>

                        {/* Segment */}
                        <td className="px-4 py-3">
                          <div className="flex flex-col gap-1">
                            <span
                              className={cn(
                                "inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-bold w-fit",
                                isB2B
                                  ? "bg-primary text-primary-foreground font-mono"
                                  : "bg-secondary text-foreground border border-border font-mono"
                              )}
                            >
                              {lead.segment}
                            </span>
                            <span className="text-[10px] text-muted-foreground font-mono tabular-nums">
                              {lead.credit_cost ? `${lead.credit_cost} cr.` : isB2B ? "5 cr." : "2 cr."}
                            </span>
                          </div>
                        </td>

                        {/* Localisation */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <MapPin className="h-3 w-3 shrink-0" />
                            <span className="capitalize text-foreground font-medium truncate max-w-[110px]">
                              {lead.city || (lead.province ? lead.province.replace(/_/g, " ") : "Wallonie")}
                            </span>
                          </div>
                        </td>

                        {/* Score & Surface */}
                        <td className="px-4 py-3">
                          <div className="flex flex-col gap-0.5">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-bold font-mono tabular-nums text-foreground">
                                {leadScore > 0 ? `${leadScore}/100` : "N/A"}
                              </span>
                              {leadScore >= 75 && (
                                <span className="h-1.5 w-1.5 rounded-full bg-accent" title="Lead hautement qualifié" />
                              )}
                            </div>
                            <span className="text-[11px] text-muted-foreground font-mono tabular-nums">
                              {lead.surface_area ? `${lead.surface_area} m²` : "Surface N/A"}
                            </span>
                          </div>
                        </td>

                        {/* Statut Marketplace */}
                        <td className="px-4 py-3">
                          <Badge 
                            variant={
                              lead.marketplace_status === "available" 
                                ? "default" 
                                : lead.marketplace_status === "sold_out" 
                                ? "secondary" 
                                : "outline"
                            }
                            className={cn(
                              "text-[10px] uppercase font-mono tracking-wider font-semibold",
                              lead.marketplace_status === "available" && "bg-accent text-accent-foreground border-transparent"
                            )}
                          >
                            {lead.marketplace_status || lead.status || "Nouveau"}
                          </Badge>
                        </td>

                        {/* Action Rapide */}
                        <td className="px-4 py-3 text-right">
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground hover:bg-secondary" 
                            asChild
                            title="Inspecter le dossier du lead"
                          >
                            <Link href={`/admin/leads?focus=${lead.id}`}>
                              <Eye className="h-3.5 w-3.5" />
                              <span className="sr-only">Inspecter</span>
                            </Link>
                          </Button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 2. Journal d'Audit Système (1 colonne) */}
      <Card className="border-border bg-card shadow-2xs overflow-hidden flex flex-col justify-between">
        <CardHeader className="flex flex-row items-center justify-between border-b border-border bg-muted/30 px-5 py-4">
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-accent" />
              <CardTitle className="text-sm sm:text-base font-bold text-foreground">
                Journal d'Audit
              </CardTitle>
            </div>
            <p className="text-xs text-muted-foreground">Traçabilité &amp; gouvernance administrative</p>
          </div>
          <Button variant="ghost" size="sm" asChild className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground">
            <Link href="/admin/audit" title="Voir l'historique complet des logs">
              <Clock className="h-3.5 w-3.5" />
              <span className="sr-only">Historique d'audit</span>
            </Link>
          </Button>
        </CardHeader>

        <CardContent className="p-4 flex-1">
          {auditLogs.length === 0 ? (
            <div className="p-6 text-center text-xs text-muted-foreground">
              Aucune activité récente enregistrée.
            </div>
          ) : (
            <div className="flex flex-col gap-2.5">
              {auditLogs.slice(0, 6).map((log) => {
                const hourFormatted = log.created_at
                  ? new Date(log.created_at).toLocaleTimeString("fr-BE", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "—"

                return (
                  <div
                    key={log.id}
                    className="flex items-start gap-2.5 rounded-lg border border-border bg-muted/30 p-2.5 text-xs hover:bg-muted/60 transition-colors"
                  >
                    <div className="mt-0.5 rounded-md bg-secondary p-1 text-muted-foreground shrink-0 border border-border">
                      <FileCheck2 className="h-3.5 w-3.5 text-foreground" />
                    </div>
                    <div className="flex flex-col gap-0.5 overflow-hidden flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-foreground truncate">
                          {log.action}
                        </span>
                        <span className="text-[10px] font-mono tabular-nums text-muted-foreground shrink-0">
                          {hourFormatted}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground truncate">
                        Entité : <span className="font-mono text-foreground font-medium">{log.entity_type}</span>
                        {log.admin_email ? ` • ${log.admin_email}` : ""}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

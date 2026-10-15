import Link from "next/link"
import { ArrowRight, Eye, ShieldCheck, Clock, FileText } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

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
      <Card className="lg:col-span-2 border-slate-200 shadow-2xs">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="text-base font-bold text-slate-900">
              Derniers Leads Enregistrés
            </CardTitle>
            <p className="text-xs text-slate-500">Flux d'entrée en temps réel</p>
          </div>
          <Button variant="ghost" size="sm" asChild className="text-xs font-semibold text-[#001D3D]">
            <Link href="/admin/leads" className="flex items-center gap-1">
              <span>Voir tout ({recentLeads.length})</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-y border-slate-100 bg-slate-50/70 text-[11px] font-bold uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-2.5">Lead / Société</th>
                  <th className="px-4 py-2.5">Segment</th>
                  <th className="px-4 py-2.5">Province</th>
                  <th className="px-4 py-2.5">Statut</th>
                  <th className="px-4 py-2.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentLeads.slice(0, 8).map((lead) => (
                  <tr key={lead.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-bold text-slate-900">
                        {lead.company || `${lead.first_name || ""} ${lead.last_name || ""}`}
                      </p>
                      <p className="text-slate-500 text-[11px]">{lead.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded px-2 py-0.5 text-[11px] font-bold ${
                          lead.segment === "B2B"
                            ? "bg-[#001D3D] text-[#FFB800]"
                            : "bg-blue-100 text-blue-900"
                        }`}
                      >
                        {lead.segment}
                      </span>
                    </td>
                    <td className="px-4 py-3 capitalize text-slate-700">
                      {lead.province ? lead.province.replace("_", " ") : "Wallonie"}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className="text-[10px] font-semibold">
                        {lead.marketplace_status || lead.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" asChild>
                        <Link href={`/admin/leads?focus=${lead.id}`}>
                          <Eye className="h-3.5 w-3.5" />
                        </Link>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* 2. Journal d'Audit Système (1 colonne) */}
      <Card className="border-slate-200 shadow-2xs">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="text-base font-bold text-slate-900">
              Journal d'Audit
            </CardTitle>
            <p className="text-xs text-slate-500">Traçabilité &amp; Sécurité</p>
          </div>
          <Button variant="ghost" size="sm" asChild className="text-xs font-semibold text-[#001D3D]">
            <Link href="/admin/audit">
              <Clock className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {auditLogs.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-4">Aucune activité récente.</p>
          ) : (
            auditLogs.slice(0, 6).map((log) => (
              <div key={log.id} className="flex items-start gap-2.5 rounded-lg border border-slate-100 bg-slate-50/50 p-2.5 text-xs">
                <ShieldCheck className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
                <div className="space-y-0.5 overflow-hidden">
                  <p className="font-semibold text-slate-900 truncate">
                    {log.action} <span className="font-normal text-slate-500">({log.entity_type})</span>
                  </p>
                  <p className="text-[11px] text-slate-400 truncate">
                    Par {log.admin_email} • {new Date(log.created_at).toLocaleTimeString("fr-BE", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
}

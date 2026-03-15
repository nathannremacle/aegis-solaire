"use client"

type AuditLog = {
  id: string
  admin_email: string
  action: string
  entity_type: string
  entity_id: string | null
  details: Record<string, unknown> | null
  created_at: string
}

const ACTION_LABELS: Record<string, string> = {
  lead_updated: "Lead modifié",
  lead_notify_installateur: "Email envoyé à l'installateur",
  leads_export: "Export CSV",
  leads_anonymized: "Nettoyage RGPD",
}

export function AuditLogTable({ logs }: { logs: AuditLog[] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/50">
            <th className="px-4 py-3 text-left font-medium">Date</th>
            <th className="px-4 py-3 text-left font-medium">Admin</th>
            <th className="px-4 py-3 text-left font-medium">Action</th>
            <th className="px-4 py-3 text-left font-medium">Entité</th>
            <th className="px-4 py-3 text-left font-medium">Détails</th>
          </tr>
        </thead>
        <tbody>
          {logs.length === 0 ? (
            <tr>
              <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                Aucun log.
              </td>
            </tr>
          ) : (
            logs.map((log) => (
              <tr key={log.id} className="border-b border-border">
                <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                  {new Date(log.created_at).toLocaleString("fr-FR", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </td>
                <td className="px-4 py-3 font-medium">{log.admin_email}</td>
                <td className="px-4 py-3">
                  {ACTION_LABELS[log.action] ?? log.action}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {log.entity_type}
                  {log.entity_id ? ` #${log.entity_id.slice(0, 8)}…` : ""}
                </td>
                <td className="px-4 py-3 text-muted-foreground max-w-xs truncate">
                  {log.details && Object.keys(log.details).length > 0
                    ? JSON.stringify(log.details)
                    : "–"}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}

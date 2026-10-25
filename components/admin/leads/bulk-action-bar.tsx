"use client"

import { Button } from "@/components/ui/button"
import { Check, X, Trash2, Archive, Loader2 } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function BulkActionBar({
  selectedCount,
  onQualifyAll,
  onRejectAll,
  onArchiveAll,
  onClearSelection,
  loading = false,
}: {
  selectedCount: number
  onQualifyAll: () => void
  onRejectAll: (reason: string) => void
  onArchiveAll: () => void
  onClearSelection: () => void
  loading?: boolean
}) {
  if (selectedCount === 0) return null

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 rounded-md border border-border bg-card px-4 py-2.5 shadow-xs">
      <div className="flex items-center gap-2 border-r border-border pr-3">
        <span className="font-mono text-xs font-semibold tabular-nums text-foreground">
          {selectedCount}
        </span>
        <span className="text-xs text-muted-foreground">sélectionné{selectedCount > 1 ? "s" : ""}</span>
      </div>

      <div className="flex items-center gap-2">
        <Button
          size="sm"
          onClick={onQualifyAll}
          disabled={loading}
          className="h-8 gap-1.5 text-xs font-medium"
        >
          {loading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Check className="h-3.5 w-3.5" />
          )}
          <span>Publier vivier</span>
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              disabled={loading}
              className="h-8 gap-1.5 text-xs font-medium"
            >
              <span>Rejeter</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="center" className="text-xs">
            <DropdownMenuItem onClick={() => onRejectAll("Hors zone wallonne")}>
              1. Hors zone wallonne
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onRejectAll("Spam ou données factices")}>
              2. Spam ou données factices
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onRejectAll("Numéro injoignable")}>
              3. Numéro injoignable
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onRejectAll("Doublon existant")}>
              4. Doublon existant
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onRejectAll("Locataire non autorisé")}>
              5. Locataire non autorisé
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onRejectAll("Autre motif")}>
              6. Autre motif
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button
          variant="outline"
          size="sm"
          onClick={onArchiveAll}
          disabled={loading}
          className="h-8 gap-1.5 text-xs font-medium"
        >
          <Archive className="h-3.5 w-3.5 text-muted-foreground" />
          <span>Archiver</span>
        </Button>
      </div>

      <Button
        variant="ghost"
        size="icon"
        onClick={onClearSelection}
        className="h-7 w-7 text-muted-foreground hover:text-foreground ml-1"
        title="Désélectionner tout"
      >
        <X className="h-3.5 w-3.5" />
      </Button>
    </div>
  )
}

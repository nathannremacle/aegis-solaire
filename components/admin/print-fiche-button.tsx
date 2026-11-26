"use client"

import { Printer } from "lucide-react"
import { Button } from "@/components/ui/button"

export function PrintButton() {
  return (
    <Button
      type="button"
      size="sm"
      onClick={() => window.print()}
      className="rounded-xl text-xs font-bold gap-2 cursor-pointer"
    >
      <Printer className="h-3.5 w-3.5" />
      <span>Imprimer / Enregistrer en PDF</span>
    </Button>
  )
}

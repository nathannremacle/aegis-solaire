"use client"

import { useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { RefreshCw, Home, AlertTriangle } from "lucide-react"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("Application error:", error)
  }, [error])

  return (
    <div className="min-h-screen bg-primary flex flex-col items-center justify-center px-4 py-16 text-center text-white font-sans">
      <div className="max-w-md w-full space-y-6">
        <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-destructive/20 border border-destructive/40 text-destructive mx-auto">
          <AlertTriangle className="h-8 w-8 text-amber-400" />
        </div>

        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Une erreur inattendue est survenue
          </h1>
          <p className="mt-2 text-sm text-neutral-300 leading-relaxed">
            Notre équipe technique a été notifiée. Vous pouvez rafraîchir la page ou revenir à l&apos;accueil.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-2 justify-center">
          <Button
            onClick={() => reset()}
            className="h-11 bg-accent text-accent-foreground hover:bg-accent/90 font-bold text-sm shadow-xs"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Réessayer
          </Button>

          <Link href="/">
            <Button
              variant="outline"
              className="w-full sm:w-auto h-11 border-white/20 bg-white/10 text-white hover:bg-white/20 font-semibold text-sm"
            >
              <Home className="h-4 w-4 mr-2" />
              Accueil
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}

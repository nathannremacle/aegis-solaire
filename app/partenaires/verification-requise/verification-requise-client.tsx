"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Mail, RefreshCw, ArrowRight } from "lucide-react"

export function VerificationRequiseClient({ email }: { email: string }) {
  const router = useRouter()
  const [resending, setResending] = useState(false)
  const [sent, setSent] = useState(false)

  async function handleResend() {
    if (!email) {
      toast.error("Adresse e-mail manquante.")
      return
    }

    setResending(true)
    try {
      const res = await fetch("/api/installateurs/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || "Erreur lors du renvoi.")
      }
      setSent(true)
      toast.success("E-mail de confirmation envoyé ! Vérifiez votre boîte de réception.")
    } catch (err: any) {
      toast.error(err.message || "Impossible de renvoyer l'e-mail.")
    } finally {
      setResending(false)
    }
  }

  function handleRetryDashboard() {
    router.push("/partenaires/dashboard")
    router.refresh()
  }

  return (
    <div className="space-y-4 pt-2">
      <div className="flex flex-col sm:flex-row gap-3">
        <Button
          onClick={handleResend}
          disabled={resending}
          variant="outline"
          className="flex-1 rounded-xl py-2.5 font-medium border-border"
        >
          <Mail className="mr-2 h-4 w-4 text-accent" />
          {resending ? "Envoi en cours…" : sent ? "Renvoyer à nouveau" : "Renvoyer l'e-mail de validation"}
        </Button>

        <Button
          onClick={handleRetryDashboard}
          className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl py-2.5 font-medium shadow-xs"
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Actualiser l'accès
        </Button>
      </div>

      <div className="pt-2 text-center">
        <Button variant="ghost" size="sm" asChild className="text-xs text-muted-foreground">
          <Link href="/api/partners/logout">Se déconnecter</Link>
        </Button>
      </div>
    </div>
  )
}

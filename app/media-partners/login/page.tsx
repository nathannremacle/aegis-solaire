"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Euro, ArrowLeft } from "lucide-react"

export default function MediaPartnerLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const supabase = createClient()
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (authError) {
        setError(
          authError.message === "Invalid login credentials"
            ? "Email ou mot de passe incorrect."
            : authError.message
        )
        setLoading(false)
        return
      }
      router.push("/media-partners/dashboard")
      router.refresh()
    } catch {
      setError("Une erreur est survenue.")
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#000a19] px-4">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-40 top-20 h-[500px] w-[500px] rounded-full bg-accent/[0.05] blur-[120px]" />
        <div className="absolute -right-32 bottom-20 h-[400px] w-[400px] rounded-full bg-blue-500/[0.04] blur-[100px]" />
      </div>

      <div className="relative z-10 w-full max-w-sm space-y-8">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/10 ring-1 ring-accent/20">
            <Euro className="h-7 w-7 text-accent" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Media Partners
          </h1>
          <p className="mt-2 text-sm text-neutral-500">
            Aegis Solaire · Espace affilié
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.04] p-6 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)] backdrop-blur-xl"
        >
          <div className="space-y-2">
            <Label htmlFor="email" className="text-neutral-300">
              Email
            </Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="partenaire@email.com"
              required
              autoComplete="email"
              className="h-11 border-white/10 bg-white/[0.06] text-white placeholder:text-neutral-600 focus-visible:border-accent/50 focus-visible:ring-accent/30"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password" className="text-neutral-300">
              Mot de passe
            </Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="h-11 border-white/10 bg-white/[0.06] text-white placeholder:text-neutral-600 focus-visible:border-accent/50 focus-visible:ring-accent/30"
            />
          </div>
          {error && (
            <p className="text-sm text-red-400" role="alert">
              {error}
            </p>
          )}
          <Button
            type="submit"
            className="h-11 w-full bg-accent font-bold text-[#001D3D] hover:bg-accent/90"
            disabled={loading}
          >
            {loading ? "Connexion…" : "Se connecter"}
          </Button>
        </form>

        <p className="text-center">
          <Link
            href="/media-partners"
            className="inline-flex items-center gap-1.5 text-sm text-neutral-500 underline-offset-4 hover:text-white hover:underline"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Retour au programme
          </Link>
        </p>
      </div>
    </div>
  )
}

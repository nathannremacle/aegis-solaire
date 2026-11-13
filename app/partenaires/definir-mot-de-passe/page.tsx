"use client"

import { Suspense, useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  ArrowLeft,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  ShieldCheck,
} from "lucide-react"

export default function PartnerSetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <PartnerSetPasswordForm />
    </Suspense>
  )
}

function PartnerSetPasswordForm() {
  const searchParams = useSearchParams()
  const tokenHash = searchParams.get("token_hash") || ""
  const tokenType = (searchParams.get("type") || "recovery") as "recovery" | "magiclink" | "invite"
  const code = searchParams.get("code") || ""
  const rawNext = searchParams.get("next") || ""
  const safeRedirectUrl =
    rawNext.startsWith("/partenaires") && !rawNext.startsWith("//")
      ? rawNext
      : "/partenaires/dashboard"

  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [checkingLink, setCheckingLink] = useState(true)
  const [hasSessionOrToken, setHasSessionOrToken] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    async function initAuthContext() {
      const supabase = createClient()
      try {
        if (code) {
          await supabase.auth.exchangeCodeForSession(code)
        }
        const {
          data: { session },
        } = await supabase.auth.getSession()

        if (!active) return
        if (session || tokenHash) {
          setHasSessionOrToken(true)
        } else {
          setHasSessionOrToken(false)
        }
      } catch {
        if (!active) return
        setHasSessionOrToken(Boolean(tokenHash))
      } finally {
        if (active) setCheckingLink(false)
      }
    }

    initAuthContext()
    return () => {
      active = false
    }
  }, [code, tokenHash])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (password.length < 8) {
      setError("Le mot de passe doit contenir au moins 8 caractères.")
      return
    }
    if (password !== confirmPassword) {
      setError("Les deux mots de passe ne correspondent pas.")
      return
    }

    setSubmitting(true)
    try {
      const supabase = createClient()
      const {
        data: { session: existingSession },
      } = await supabase.auth.getSession()

      if (!existingSession) {
        if (!tokenHash) {
          setError("Ce lien est invalide ou expiré. Veuillez demander un nouveau lien.")
          setSubmitting(false)
          return
        }

        const { error: otpError } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: tokenType,
        })

        if (otpError) {
          setError(
            "Ce lien sécurisé a expiré ou a déjà été utilisé. Demandez un nouveau lien depuis la page de connexion."
          )
          setSubmitting(false)
          return
        }
      }

      const { error: updateError } = await supabase.auth.updateUser({ password })
      if (updateError) {
        setError(
          updateError.message ||
          "Impossible d'enregistrer le mot de passe. Demandez un nouveau lien."
        )
        setSubmitting(false)
        return
      }

      setSuccess(true)
      setTimeout(() => {
        window.location.assign(safeRedirectUrl)
      }, 900)
    } catch {
      setError("Une erreur technique est survenue. Veuillez réessayer.")
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-8 text-foreground">
      <div className="w-full max-w-sm flex flex-col gap-6">
        <div className="text-center flex flex-col items-center">
          <Link href="/" className="mb-4 block" title="Aegis Solaire">
            <div className="relative h-11 w-44">
              <Image
                src="/logo.png"
                alt="Aegis Solaire"
                fill
                className="object-contain"
                priority
              />
            </div>
          </Link>

          <div className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary px-3 py-1 text-xs font-semibold text-foreground">
            <ShieldCheck className="h-3.5 w-3.5 text-primary" />
            <span>Activation Portail Partenaire</span>
          </div>

          <h1 className="font-heading text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            Définissez votre mot de passe
          </h1>
          <p className="mt-1 text-xs text-muted-foreground">
            Accès sécurisé à votre espace Marketplace Wallonie
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-xs flex flex-col gap-4">
          {checkingLink ? (
            <div className="flex flex-col items-center justify-center gap-3 py-6 text-xs text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <span>Vérification du lien sécurisé…</span>
            </div>
          ) : success ? (
            <div className="flex flex-col items-center text-center gap-3 py-4">
              <CheckCircle2 className="h-10 w-10 text-primary" />
              <p className="text-sm font-semibold text-foreground">
                Mot de passe enregistré
              </p>
              <p className="text-xs text-muted-foreground">
                Redirection automatique vers votre Marketplace…
              </p>
            </div>
          ) : !hasSessionOrToken ? (
            <div className="flex flex-col gap-4 text-center py-2">
              <p className="text-xs text-muted-foreground leading-relaxed">
                Ce lien est absent, expiré ou a déjà été utilisé. Vous pouvez recevoir un nouveau lien instantanément avec votre adresse e-mail professionnelle.
              </p>
              <Button
                asChild
                className="h-12 w-full bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-bold shadow-xs"
              >
                <Link href="/partenaires/login?mode=reset">
                  Recevoir un nouveau lien
                </Link>
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="new-password" className="text-xs font-bold text-foreground">
                  Nouveau mot de passe (<span className="font-mono tabular-nums">8</span> car. min.)
                </Label>
                <div className="relative">
                  <Input
                    id="new-password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimum 8 caractères"
                    required
                    minLength={8}
                    autoComplete="new-password"
                    className="h-12 pr-11 text-sm sm:text-xs bg-background border-border"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-0 top-0 flex h-12 w-11 items-center justify-center text-muted-foreground hover:text-foreground transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-ring rounded-r-md cursor-pointer"
                    aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" aria-hidden="true" />
                    ) : (
                      <Eye className="h-4 w-4" aria-hidden="true" />
                    )}
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="confirm-password" className="text-xs font-bold text-foreground">
                  Confirmez le mot de passe
                </Label>
                <Input
                  id="confirm-password"
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Répétez votre mot de passe"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  className="h-12 text-sm sm:text-xs bg-background border-border"
                />
              </div>

              {error && (
                <div className="flex flex-col gap-2">
                  <p
                    className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive"
                    role="alert"
                  >
                    {error}
                  </p>
                  <Link
                    href="/partenaires/login?mode=reset"
                    className="text-xs font-semibold text-primary hover:underline text-center"
                  >
                    Demander un nouveau lien par e-mail
                  </Link>
                </div>
              )}

              <Button
                type="submit"
                className="h-12 w-full bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-bold shadow-xs transition-colors cursor-pointer justify-center"
                disabled={submitting}
              >
                {submitting ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-accent" />
                    Enregistrement…
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <KeyRound className="h-4 w-4" />
                    Activer mon accès Marketplace
                  </span>
                )}
              </Button>
            </form>
          )}
        </div>

        <p className="text-center">
          <Link
            href="/partenaires/login"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground cursor-pointer"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Retour à la connexion partenaire</span>
          </Link>
        </p>
      </div>
    </div>
  )
}


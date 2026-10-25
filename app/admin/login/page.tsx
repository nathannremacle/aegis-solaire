"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowLeft, LayoutDashboard, Loader2 } from "lucide-react"
import { motion } from "framer-motion"

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.12, delayChildren: 0.1 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring" as const, stiffness: 300, damping: 24 },
  },
}

export default function AdminLoginPage() {
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
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (authError) {
        setError(
          authError.message === "Invalid login credentials"
            ? "E-mail ou mot de passe incorrect."
            : authError.message
        )
        setLoading(false)
        return
      }
      if (data.user?.email) {
        router.push("/admin/dashboard")
        router.refresh()
      }
    } catch {
      setError("Une erreur est survenue.")
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 [padding-bottom:env(safe-area-inset-bottom)]">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="w-full max-w-sm flex flex-col gap-6"
      >
        <motion.div variants={itemVariants} className="text-center flex flex-col items-center">
          <Link href="/" className="mb-4 block">
            <div className="relative h-10 w-40">
              <Image src="/logo.png" alt="Aegis Solaire" fill className="object-contain" priority />
            </div>
          </Link>
          <div className="mb-3 inline-flex items-center gap-1.5 rounded-sm border border-border bg-secondary px-2.5 py-1 text-xs">
            <LayoutDashboard className="h-3.5 w-3.5 text-accent" />
            <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-foreground">
              Console d'Administration
            </span>
          </div>
          <h1 className="font-heading text-xl font-semibold tracking-tight text-foreground">
            Authentification Admin
          </h1>
          <p className="mt-1 font-mono text-xs text-muted-foreground">
            Aegis Solaire Wallonie · Accès réservé
          </p>
        </motion.div>

        <motion.form
          variants={itemVariants}
          onSubmit={handleSubmit}
          className="flex flex-col gap-4 rounded-lg border border-border bg-card p-6 shadow-xs"
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email" className="text-xs font-medium text-foreground">
              Adresse e-mail
            </Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@aegis-solaire.be"
              required
              autoComplete="email"
              className="h-9 text-xs"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="password" className="text-xs font-medium text-foreground">
              Mot de passe
            </Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="h-9 text-xs"
            />
          </div>
          {error && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-sm border border-destructive/25 bg-destructive/10 px-3 py-2 text-xs text-destructive font-mono"
              role="alert"
            >
              {error}
            </motion.p>
          )}
          <Button
            type="submit"
            className="h-9 w-full text-xs font-medium shadow-xs mt-1"
            disabled={loading}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Connexion…
              </span>
            ) : (
              "Se connecter"
            )}
          </Button>
        </motion.form>

        <motion.p variants={itemVariants} className="text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
          >
            <ArrowLeft className="h-3 w-3" />
            Retourner au site public
          </Link>
        </motion.p>
      </motion.div>
    </div>
  )
}

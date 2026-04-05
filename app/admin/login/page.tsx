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
  hidden: { opacity: 0, y: 24 },
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
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 [padding-bottom:env(safe-area-inset-bottom)]">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="w-full max-w-sm space-y-8"
      >
        <motion.div variants={itemVariants} className="text-center">
          <Link href="/" className="mx-auto mb-6 block">
            <div className="relative mx-auto h-12 w-48">
              <Image src="/logo.png" alt="Aegis Solaire" fill className="object-contain" priority />
            </div>
          </Link>
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-1.5 shadow-sm">
            <LayoutDashboard className="h-3.5 w-3.5 text-accent" />
            <span className="text-xs font-bold uppercase tracking-widest text-[#001D3D]">
              Administration
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Connexion admin</h1>
          <p className="mt-2 text-sm text-slate-500">Aegis Solaire · Accès réservé</p>
        </motion.div>

        <motion.form
          variants={itemVariants}
          onSubmit={handleSubmit}
          className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-medium text-slate-700">
              E-mail
            </Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@exemple.be"
              required
              autoComplete="email"
              className="h-11 rounded-xl"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password" className="text-sm font-medium text-slate-700">
              Mot de passe
            </Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="h-11 rounded-xl"
            />
          </div>
          {error && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
              role="alert"
            >
              {error}
            </motion.p>
          )}
          <Button
            type="submit"
            className="h-12 w-full bg-[#001D3D] text-base font-bold text-white shadow-md transition-all hover:bg-[#00152e] hover:shadow-lg"
            disabled={loading}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
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
            className="inline-flex items-center gap-1.5 text-sm text-slate-500 underline-offset-4 transition-colors hover:text-slate-900 hover:underline"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Retour au site
          </Link>
        </motion.p>
      </motion.div>
    </div>
  )
}

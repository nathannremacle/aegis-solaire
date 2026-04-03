"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowLeft, Loader2, Zap } from "lucide-react"
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

export default function PartnerLoginPage() {
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
      router.push("/partenaires/dashboard")
      router.refresh()
    } catch {
      setError("Une erreur est survenue.")
      setLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[#001D3D] px-4">
      {/* Hero background */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-30"
        style={{
          backgroundImage: "url('/hero-partenaires.png')",
          maskImage:
            "linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0.5) 60%, rgba(0,0,0,0) 100%)",
          WebkitMaskImage:
            "linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0.5) 60%, rgba(0,0,0,0) 100%)",
        }}
      />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,29,61,0.2)_0%,rgba(0,29,61,0.85)_100%)]" />

      {/* Ambient orbs */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-40 top-20 h-[500px] w-[500px] rounded-full bg-accent/[0.04] blur-[120px]" />
        <div className="absolute -right-32 bottom-20 h-[400px] w-[400px] rounded-full bg-blue-500/[0.03] blur-[100px]" />
      </div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="relative z-10 w-full max-w-sm space-y-8"
      >
        {/* Branding */}
        <motion.div variants={itemVariants} className="text-center">
          <Link href="/" className="mx-auto mb-6 block">
            <div className="relative mx-auto h-10 w-44">
              <Image
                src="/logo.png"
                alt="Aegis Solaire"
                fill
                className="object-contain brightness-0 invert"
                priority
              />
            </div>
          </Link>
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-accent/30 bg-white/5 px-4 py-1.5 shadow-[0_0_15px_rgba(255,184,0,0.1)] backdrop-blur-md">
            <Zap className="h-3.5 w-3.5 text-accent drop-shadow-[0_0_6px_rgba(255,184,0,0.6)]" />
            <span className="text-xs font-bold uppercase tracking-widest text-accent">
              Portail Installateur
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Accédez à vos leads
          </h1>
          <p className="mt-2 text-sm text-neutral-400">
            Marketplace solaire qualifié · Wallonie
          </p>
        </motion.div>

        {/* Login Form */}
        <motion.form
          variants={itemVariants}
          onSubmit={handleSubmit}
          className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.04] p-6 shadow-[0_8px_32px_rgba(0,0,0,0.3)] backdrop-blur-xl"
        >
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-medium text-neutral-300">
              Email
            </Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="partenaire@entreprise.be"
              required
              autoComplete="email"
              className="h-11 border-white/10 bg-white/[0.06] text-white placeholder:text-neutral-600 focus-visible:border-accent/50 focus-visible:ring-accent/30"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password" className="text-sm font-medium text-neutral-300">
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
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-300"
              role="alert"
            >
              {error}
            </motion.p>
          )}
          <Button
            type="submit"
            className="h-12 w-full bg-accent text-base font-bold text-[#001D3D] shadow-[0_0_20px_rgba(255,184,0,0.25)] transition-all hover:scale-[1.01] hover:bg-[#e6a600] hover:shadow-[0_0_30px_rgba(255,184,0,0.4)]"
            disabled={loading}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Connexion…
              </span>
            ) : (
              "Se connecter"
            )}
          </Button>
        </motion.form>

        {/* Footer link */}
        <motion.p variants={itemVariants} className="text-center">
          <Link
            href="/partenaires"
            className="inline-flex items-center gap-1.5 text-sm text-neutral-500 underline-offset-4 transition-colors hover:text-white hover:underline"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Retour au programme partenaires
          </Link>
        </motion.p>
      </motion.div>
    </div>
  )
}

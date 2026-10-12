import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Home, Calculator, HelpCircle } from "lucide-react"

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#001D3D] flex flex-col items-center justify-center px-4 py-16 text-center text-white font-sans">
      <div className="max-w-md w-full space-y-6">
        <div className="inline-flex items-center justify-center h-20 w-20 rounded-3xl bg-accent/20 border border-accent/40 text-accent mx-auto shadow-lg shadow-accent/10">
          <span className="text-3xl font-extrabold">404</span>
        </div>

        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Page introuvable
          </h1>
          <p className="mt-2 text-sm text-neutral-300 leading-relaxed">
            La page que vous recherchez n&apos;existe pas ou a été déplacée. Choisissez l&apos;un des accès rapides ci-dessous :
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 pt-2">
          <Link href="/">
            <Button className="w-full h-12 bg-accent text-[#001D3D] hover:bg-[#e6a600] font-bold text-sm shadow-md">
              <Home className="h-4 w-4 mr-2" />
              Retour à l&apos;accueil (B2B)
            </Button>
          </Link>

          <Link href="/particuliers">
            <Button variant="outline" className="w-full h-12 border-white/20 bg-white/10 text-white hover:bg-white/20 font-semibold text-sm">
              <Calculator className="h-4 w-4 mr-2 text-accent" />
              Espace Particuliers & Résidentiel
            </Button>
          </Link>

          <Link href="/devis-panneaux-solaires">
            <Button variant="outline" className="w-full h-12 border-white/20 bg-white/10 text-white hover:bg-white/20 font-semibold text-sm">
              <HelpCircle className="h-4 w-4 mr-2 text-accent" />
              Recevoir 3 devis comparatifs gratuits
            </Button>
          </Link>
        </div>

        <div className="pt-4 border-t border-white/10">
          <Link href="/" className="inline-flex items-center text-xs text-neutral-400 hover:text-white transition-colors">
            <ArrowLeft className="h-3.5 w-3.5 mr-1" />
            Aegis Solaire Wallonie
          </Link>
        </div>
      </div>
    </div>
  )
}

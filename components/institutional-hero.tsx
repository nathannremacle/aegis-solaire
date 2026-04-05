/**
 * Hero institutionnel (DA : Bleu Nuit #001D3D, image + masque linéaire, overlay radial, texte blanc, badge or).
 * Variante compacte pour pages légales ; pleine hauteur pour landings secondaires (FAQ, etc.).
 */
export function InstitutionalHero({
  badge,
  title,
  subtitle,
  compact = false,
}: {
  badge?: string
  title: string
  subtitle?: string
  compact?: boolean
}) {
  return (
    <section
      className={`relative w-full overflow-hidden bg-[#001D3D] [padding-left:max(1rem,env(safe-area-inset-left))] [padding-right:max(1rem,env(safe-area-inset-right))] ${
        compact
          ? "py-14 sm:py-16 lg:py-20"
          : "flex min-h-[min(520px,calc(100dvh-4rem))] flex-col justify-center py-16 sm:min-h-[min(600px,calc(100dvh-5rem))] sm:py-20 lg:py-24"
      }`}
    >
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-80"
        style={{
          backgroundImage:
            "url('https://images.unsplash.com/photo-1548618753-157945d81c4e?q=80&w=2670&auto=format&fit=crop')",
          maskImage:
            "linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0.6) 70%, rgba(0,0,0,0.1) 100%)",
          WebkitMaskImage:
            "linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0.6) 70%, rgba(0,0,0,0.1) 100%)",
        }}
      />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,29,61,0.15)_0%,rgba(0,29,61,0.78)_100%)]" />

      <div className="relative z-10 mx-auto w-full max-w-4xl px-4 text-center sm:px-6 lg:px-8">
        {badge ? (
          <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-accent/30 bg-white/5 px-4 py-2 text-xs font-bold uppercase tracking-widest text-accent shadow-[0_0_15px_rgba(255,184,0,0.12)] backdrop-blur-md sm:mb-6 sm:text-sm">
            {badge}
          </span>
        ) : null}
        <h1 className="text-balance text-3xl font-extrabold tracking-tight text-white sm:text-4xl md:text-5xl lg:text-6xl">
          {title}
        </h1>
        {subtitle ? (
          <p className="mx-auto mt-4 max-w-2xl text-pretty text-base font-medium leading-relaxed text-neutral-300 sm:mt-6 sm:text-lg">
            {subtitle}
          </p>
        ) : null}
      </div>
    </section>
  )
}

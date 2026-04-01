"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, ArrowRight, CheckCircle2, Home, Zap } from "lucide-react"
import { BELGIUM_PROVINCE_KEYS } from "@/lib/belgium-regions"

const b2cFormSchema = z.object({
  roofType: z.enum(["tuiles", "ardoises", "plat", "zinc"], { required_error: "Sélectionnez un type de toiture" }),
  annualBill: z.coerce.number().min(500, "Facture minimum de 500€/an").max(20000, "Valeur trop élevée pour un particulier"),
  batteryInterest: z.enum(["oui", "non", "hesite"], { required_error: "Indiquez votre intérêt" }),
  firstName: z.string().min(2, "Prénom requis"),
  lastName: z.string().min(2, "Nom requis"),
  email: z.string().email("E-mail invalide"),
  phone: z.string().min(8, "Téléphone requis"),
  province: z.enum(BELGIUM_PROVINCE_KEYS as unknown as [string, ...string[]]),
})

type B2CFormData = z.infer<typeof b2cFormSchema>

const PROVINCE_LABELS: Record<string, string> = {
  liege: "Liège",
  hainaut: "Hainaut",
  namur: "Namur",
  luxembourg: "Luxembourg",
  brabant_wallon: "Brabant wallon",
  bruxelles: "Bruxelles",
  flandre_anvers: "Anvers",
  flandre_limbourg: "Limbourg",
  flandre_occidentale: "Flandre-Occidentale",
  flandre_orientale: "Flandre-Orientale",
  brabant_flamand: "Brabant flamand",
  autre: "Autre / Étranger",
  etranger: "Étranger",
}

export function B2CSimulator() {
  const [step, setStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

  const form = useForm<B2CFormData>({
    resolver: zodResolver(b2cFormSchema),
    defaultValues: {
      roofType: undefined,
      annualBill: 1500,
      batteryInterest: undefined,
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      province: "liege",
    },
    mode: "onTouched",
  })

  const nextStep = async (fieldsToValidate: (keyof B2CFormData)[]) => {
    const isValid = await form.trigger(fieldsToValidate)
    if (isValid) setStep((s) => s + 1)
  }

  const onSubmit = async (data: B2CFormData) => {
    setIsSubmitting(true)
    try {
      const payload = {
        segment: "B2C",
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone,
        surfaceType: "toiture",
        surfaceArea: 100,
        province: data.province,
        annualElectricityBill: data.annualBill,
        projectDetails: `Type de toiture: ${data.roofType} | Batterie: ${data.batteryInterest}`,
        marketingConsent: true,
      }

      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!res.ok) throw new Error("Erreur B2C Simulator")
      setIsSuccess(true)
    } catch (e) {
      console.error(e)
      alert("Une erreur est survenue lors de l'envoi.")
    } finally {
      setIsSubmitting(false)
    }
  }

  /* ─── Success state ─── */
  if (isSuccess) {
    return (
      <div className="mx-auto max-w-2xl rounded-3xl border border-accent/20 bg-gradient-to-br from-[#001D3D] to-[#00132b] p-10 text-center shadow-[0_8px_60px_rgba(0,0,0,0.5)]">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-accent/15 shadow-[0_0_30px_rgba(255,184,0,0.15)]">
          <CheckCircle2 className="h-10 w-10 text-accent" />
        </div>
        <h3 className="text-2xl font-bold text-white">Étude confirmée !</h3>
        <p className="mt-4 text-neutral-300 leading-relaxed">
          Un conseiller expert du marché résidentiel wallon va vous recontacter très prochainement avec votre simulation d&apos;amortissement sur mesure.
        </p>
      </div>
    )
  }

  /* ─── Main form ─── */
  return (
    <div
      id="b2c-simulator"
      className="mx-auto max-w-2xl overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#001D3D] to-[#00132b] shadow-[0_8px_60px_rgba(0,0,0,0.5)]"
    >
      {/* Progress bar */}
      <div className="h-1 w-full bg-white/5">
        <motion.div
          className="h-full bg-accent shadow-[0_0_10px_rgba(255,184,0,0.4)]"
          initial={{ width: "33%" }}
          animate={{ width: `${(step / 3) * 100}%` }}
          transition={{ duration: 0.4 }}
        />
      </div>

      <div className="p-6 sm:p-10">
        <div className="mb-8 flex items-center justify-between">
          <h3 className="text-xl font-bold text-white sm:text-2xl">
            Simulez vos économies
          </h3>
          <div className="flex items-center gap-2 rounded-full border border-accent/20 bg-accent/10 px-3 py-1">
            <span className="text-xs font-bold text-accent">Étape {step}/3</span>
          </div>
        </div>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <AnimatePresence mode="wait">
            {/* ─── Step 1: Toiture & Facture ─── */}
            {step === 1 && (
              <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                <div className="space-y-3">
                  <Label className="text-base font-semibold text-white">Type de toiture principal</Label>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {[
                      { id: "tuiles", label: "Tuiles", emoji: "🏠" },
                      { id: "ardoises", label: "Ardoises", emoji: "🏡" },
                      { id: "plat", label: "Plat", emoji: "🏢" },
                      { id: "zinc", label: "Zinc", emoji: "🏗️" },
                    ].map((roof) => (
                      <button
                        key={roof.id}
                        type="button"
                        onClick={() => {
                          form.setValue("roofType", roof.id as B2CFormData["roofType"])
                          form.clearErrors("roofType")
                        }}
                        className={`flex flex-col items-center justify-center gap-2 rounded-xl border-2 p-4 transition-all duration-200 ${
                          form.watch("roofType") === roof.id
                            ? "border-accent bg-accent/15 text-accent shadow-[0_0_15px_rgba(255,184,0,0.15)]"
                            : "border-white/10 bg-white/5 text-neutral-300 hover:border-white/25 hover:bg-white/10 hover:text-white"
                        }`}
                      >
                        <span className="text-2xl">{roof.emoji}</span>
                        <span className="text-sm font-semibold">{roof.label}</span>
                      </button>
                    ))}
                  </div>
                  {form.formState.errors.roofType && <p className="text-sm font-medium text-red-400">{form.formState.errors.roofType.message}</p>}
                </div>

                <div className="space-y-3">
                  <Label htmlFor="annualBill" className="text-base font-semibold text-white">Facture d&apos;électricité annuelle (€)</Label>
                  <div className="relative">
                    <Zap className="absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-accent/60" />
                    <Input
                      id="annualBill"
                      type="number"
                      className="h-14 border-white/15 bg-white/5 pl-11 text-lg font-semibold text-white placeholder:text-neutral-500 focus-visible:border-accent focus-visible:ring-accent/30"
                      {...form.register("annualBill")}
                    />
                  </div>
                  {form.formState.errors.annualBill && <p className="text-sm font-medium text-red-400">{form.formState.errors.annualBill.message}</p>}
                </div>

                <Button
                  type="button"
                  size="lg"
                  className="mt-4 h-14 w-full bg-accent text-base font-bold text-[#001D3D] shadow-[0_0_20px_rgba(255,184,0,0.25)] hover:bg-[#e6a600] hover:shadow-[0_0_30px_rgba(255,184,0,0.4)]"
                  onClick={() => nextStep(["roofType", "annualBill"])}
                >
                  Suivant <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </motion.div>
            )}

            {/* ─── Step 2: Batterie ─── */}
            {step === 2 && (
              <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                <div className="space-y-4">
                  <Label className="text-base font-semibold text-white">Envisagez-vous une Batterie Domestique ?</Label>
                  <p className="text-sm leading-relaxed text-neutral-400">Maximisez votre autonomie et protégez-vous des tarifs dynamiques.</p>
                  <div className="flex flex-col gap-3">
                    {[
                      { id: "oui", label: "Oui, c'est indispensable" },
                      { id: "hesite", label: "Peut-être, à évaluer" },
                      { id: "non", label: "Non, uniquement des panneaux" },
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => {
                          form.setValue("batteryInterest", opt.id as B2CFormData["batteryInterest"])
                          form.clearErrors("batteryInterest")
                        }}
                        className={`flex items-center gap-4 rounded-xl border-2 p-4 text-left transition-all duration-200 ${
                          form.watch("batteryInterest") === opt.id
                            ? "border-accent bg-accent/10 shadow-[0_0_15px_rgba(255,184,0,0.1)]"
                            : "border-white/10 bg-white/5 hover:border-white/25 hover:bg-white/8"
                        }`}
                      >
                        <div
                          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                            form.watch("batteryInterest") === opt.id ? "border-accent bg-accent" : "border-neutral-500"
                          }`}
                        >
                          {form.watch("batteryInterest") === opt.id && <div className="h-2 w-2 rounded-full bg-[#001D3D]" />}
                        </div>
                        <span className={`font-medium ${form.watch("batteryInterest") === opt.id ? "text-white" : "text-neutral-300"}`}>{opt.label}</span>
                      </button>
                    ))}
                  </div>
                  {form.formState.errors.batteryInterest && <p className="text-sm font-medium text-red-400">{form.formState.errors.batteryInterest.message}</p>}
                </div>

                <div className="flex gap-4 pt-2">
                  <Button type="button" size="lg" className="h-12 w-1/3 border-2 border-white/15 bg-white/5 text-white hover:bg-white/10" onClick={() => setStep(1)}>
                    <ArrowLeft className="mr-2 h-5 w-5" /> Retour
                  </Button>
                  <Button
                    type="button"
                    size="lg"
                    className="h-12 w-2/3 bg-accent font-bold text-[#001D3D] shadow-[0_0_15px_rgba(255,184,0,0.2)] hover:bg-[#e6a600]"
                    onClick={() => nextStep(["batteryInterest"])}
                  >
                    Vos coordonnées <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </div>
              </motion.div>
            )}

            {/* ─── Step 3: Coordonnées ─── */}
            {step === 3 && (
              <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName" className="font-semibold text-white">Prénom</Label>
                    <Input id="firstName" className="h-12 border-white/15 bg-white/5 text-white placeholder:text-neutral-500 focus-visible:border-accent focus-visible:ring-accent/30" placeholder="Jean" {...form.register("firstName")} />
                    {form.formState.errors.firstName && <p className="text-xs font-medium text-red-400">{form.formState.errors.firstName.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName" className="font-semibold text-white">Nom</Label>
                    <Input id="lastName" className="h-12 border-white/15 bg-white/5 text-white placeholder:text-neutral-500 focus-visible:border-accent focus-visible:ring-accent/30" placeholder="Dupont" {...form.register("lastName")} />
                    {form.formState.errors.lastName && <p className="text-xs font-medium text-red-400">{form.formState.errors.lastName.message}</p>}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="font-semibold text-white">E-mail</Label>
                  <Input id="email" type="email" className="h-12 border-white/15 bg-white/5 text-white placeholder:text-neutral-500 focus-visible:border-accent focus-visible:ring-accent/30" placeholder="jean.dupont@email.be" {...form.register("email")} />
                  {form.formState.errors.email && <p className="text-xs font-medium text-red-400">{form.formState.errors.email.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone" className="font-semibold text-white">Téléphone</Label>
                  <Input id="phone" type="tel" className="h-12 border-white/15 bg-white/5 text-white placeholder:text-neutral-500 focus-visible:border-accent focus-visible:ring-accent/30" placeholder="+32 475 12 34 56" {...form.register("phone")} />
                  {form.formState.errors.phone && <p className="text-xs font-medium text-red-400">{form.formState.errors.phone.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="province" className="font-semibold text-white">Province d&apos;installation</Label>
                  <Select onValueChange={(val) => form.setValue("province", val as B2CFormData["province"])} defaultValue={form.getValues("province")}>
                    <SelectTrigger id="province" className="h-12 border-white/15 bg-white/5 text-white focus:border-accent focus:ring-accent/30">
                      <SelectValue placeholder="Sélectionnez..." />
                    </SelectTrigger>
                    <SelectContent className="border-white/10 bg-[#001D3D] text-white">
                      {BELGIUM_PROVINCE_KEYS.map((prov) => (
                        <SelectItem key={prov} value={prov} className="focus:bg-white/10 focus:text-white">
                          {PROVINCE_LABELS[prov] ?? prov}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex gap-4 pt-4">
                  <Button type="button" size="lg" className="h-14 w-1/3 border-2 border-white/15 bg-white/5 text-white hover:bg-white/10" onClick={() => setStep(2)}>
                    <ArrowLeft className="h-5 w-5" />
                  </Button>
                  <Button
                    type="submit"
                    size="lg"
                    className="h-14 w-2/3 bg-accent text-base font-bold text-[#001D3D] shadow-[0_0_25px_rgba(255,184,0,0.3)] hover:bg-[#e6a600] hover:shadow-[0_0_35px_rgba(255,184,0,0.45)]"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? "Validation..." : "Recevoir mon étude gratuite"}
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </form>
      </div>
    </div>
  )
}

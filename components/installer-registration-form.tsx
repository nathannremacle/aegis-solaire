"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  installerRegistrationSchema,
  type InstallerRegistrationInput,
  INSTALLER_REGIONS,
} from "@/lib/installer-registration-schema"

export function InstallerRegistrationForm() {
  const [loading, setLoading] = useState(false)

  const form = useForm<InstallerRegistrationInput>({
    resolver: zodResolver(installerRegistrationSchema),
    defaultValues: {
      companyName: "",
      siret: "",
      firstName: "",
      lastName: "",
      jobTitle: "",
      email: "",
      phone: "",
      rescertPhotovoltaicRef: "",
      rescertPhotovoltaicConfirmed: false,
      regions: [],
    },
  })

  async function onSubmit(values: InstallerRegistrationInput) {
    setLoading(true)
    try {
      const res = await fetch("/api/installateurs/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? "Erreur lors de l'envoi")
        return
      }
      toast.success(
        data.message ??
          "Votre demande a bien été envoyée. Notre équipe va vérifier votre certification RESCERT Photovoltaïque et vous recontactera sous 48h."
      )
      form.reset()
    } catch {
      toast.error("Une erreur est survenue. Veuillez réessayer.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Entreprise */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-foreground">Informations de l'entreprise</h3>
          <FormField
            control={form.control}
            name="companyName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nom de l'entreprise</FormLabel>
                <FormControl>
                  <Input placeholder="Ex. Solar Pro SAS" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="siret"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Numéro d&apos;entreprise (BCE / KBO — 10 chiffres en Belgique)</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Ex. 0123456789"
                    inputMode="numeric"
                    maxLength={20}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Contact */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-foreground">Contact</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="firstName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Prénom</FormLabel>
                  <FormControl>
                    <Input placeholder="Jean" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="lastName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nom</FormLabel>
                  <FormControl>
                    <Input placeholder="Dupont" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <FormField
            control={form.control}
            name="jobTitle"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Fonction</FormLabel>
                <FormControl>
                  <Input placeholder="Ex. Directeur technique" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email professionnel</FormLabel>
                <FormControl>
                  <Input type="email" placeholder="jean.dupont@entreprise.be" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Téléphone</FormLabel>
                <FormControl>
                  <Input type="tel" placeholder="+32 475 12 34 56" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Certification RESCERT Photovoltaïque (Belgique) */}
        <div className="space-y-4 rounded-lg border border-border bg-muted/30 p-4">
          <h3 className="text-sm font-semibold text-foreground">Certification requise (Belgique)</h3>
          <FormField
            control={form.control}
            name="rescertPhotovoltaicRef"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Référence RESCERT Photovoltaïque</FormLabel>
                <FormControl>
                  <Input placeholder="Ex. numéro ou identifiant RESCERT" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="rescertPhotovoltaicConfirmed"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start gap-3 space-y-0">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    aria-describedby="rescert-error"
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel className="cursor-pointer font-normal">
                    Je certifie que mon entreprise est couverte par la certification RESCERT Photovoltaïque à jour (conformité reconnue pour le marché belge, RGIE et assurances).
                  </FormLabel>
                  <FormMessage id="rescert-error" />
                </div>
              </FormItem>
            )}
          />
        </div>

        {/* Zones d'intervention (multi-sélection) */}
        <FormField
          control={form.control}
          name="regions"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Région(s) couverte(s)</FormLabel>
              <p className="mb-3 text-xs text-muted-foreground">Cochez toutes les zones où vous intervenez.</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {INSTALLER_REGIONS.map((r) => {
                  const selected = field.value ?? []
                  const checked = selected.includes(r)
                  return (
                    <label
                      key={r}
                      className={`flex min-h-[44px] cursor-pointer items-center gap-3 rounded-lg border p-3 text-sm transition-colors hover:bg-muted/40 ${
                        checked ? "border-accent/60 bg-accent/5" : "border-border"
                      }`}
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(isOn) => {
                          const next = new Set(selected)
                          if (isOn === true) next.add(r)
                          else next.delete(r)
                          field.onChange(Array.from(next))
                        }}
                      />
                      <span className="font-normal leading-snug text-foreground">{r}</span>
                    </label>
                  )
                })}
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button
          type="submit"
          size="lg"
          className="w-full bg-accent text-accent-foreground hover:bg-accent/90 sm:w-auto sm:min-w-[220px]"
          disabled={loading}
        >
          {loading ? "Envoi en cours…" : "Postuler au réseau de partenaires"}
        </Button>
      </form>
    </Form>
  )
}

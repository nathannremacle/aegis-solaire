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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
      rgeNumber: "",
      qualiPvCertified: false,
      region: "",
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
        data.message ?? "Votre demande a bien été envoyée. Notre équipe va vérifier vos certifications RGE/QualiPV et vous recontactera sous 48h."
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
                <FormLabel>SIRET (14 chiffres)</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Ex. 123 456 789 00012"
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
                  <Input type="email" placeholder="jean.dupont@entreprise.fr" {...field} />
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
                  <Input type="tel" placeholder="06 12 34 56 78" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Qualification RGE / QualiPV */}
        <div className="space-y-4 rounded-lg border border-border bg-muted/30 p-4">
          <h3 className="text-sm font-semibold text-foreground">Certifications requises</h3>
          <FormField
            control={form.control}
            name="rgeNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Numéro de certification RGE (Reconnu Garant de l'Environnement)</FormLabel>
                <FormControl>
                  <Input placeholder="Ex. RGE-123456" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="qualiPvCertified"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start gap-3 space-y-0">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    aria-describedby="qualipv-error"
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel className="cursor-pointer font-normal">
                    Je certifie que mon entreprise possède la qualification QualiPV à jour.
                  </FormLabel>
                  <FormMessage id="qualipv-error" />
                </div>
              </FormItem>
            )}
          />
        </div>

        {/* Zone d'intervention */}
        <FormField
          control={form.control}
          name="region"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Région(s) couverte(s)</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Sélectionnez votre zone d'intervention" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {INSTALLER_REGIONS.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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

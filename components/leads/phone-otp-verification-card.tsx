"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { REGEXP_ONLY_DIGITS } from "input-otp"
import {
  CheckCircle2,
  Loader2,
  MessageSquare,
  Pencil,
  PhoneCall,
  RefreshCw,
  ShieldCheck,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from "@/components/ui/input-otp"
import { cn } from "@/lib/utils"

export interface OtpChallengeState {
  active: boolean
  /** true quand le lead est enregistré mais que l'envoi du code a échoué (aucun code reçu) */
  sendFailed: boolean
  normalizedPhone: string
  maskedPhone: string
  channel: "sms" | "call" | "dev_mock"
  lineType: string | null
  carrierName: string | null
  code: string
  isSending: boolean
  isVerifying: boolean
  error: string | null
}

interface VerifiedPhoneCache {
  phoneRaw: string
  normalizedPhone: string
  token: string
}

const INITIAL_CHALLENGE: OtpChallengeState = {
  active: false,
  sendFailed: false,
  normalizedPhone: "",
  maskedPhone: "",
  channel: "sms",
  lineType: null,
  carrierName: null,
  code: "",
  isSending: false,
  isVerifying: false,
  error: null,
}

export function useLeadPhoneOtp() {
  const [challenge, setChallenge] = useState<OtpChallengeState>(INITIAL_CHALLENGE)
  const [cooldown, setCooldown] = useState(0)
  const [verifiedCache, setVerifiedCache] = useState<VerifiedPhoneCache | null>(null)
  const lastMetaRef = useRef<{
    segment: "B2B" | "B2C"
    leadId?: string
    sessionId?: string
    phone?: string
  }>({ segment: "B2C" })
  const pendingCompleteRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    if (cooldown <= 0) return
    const t = setInterval(() => {
      setCooldown((prev) => (prev <= 1 ? 0 : prev - 1))
    }, 1000)
    return () => clearInterval(t)
  }, [cooldown])

  const resetOtp = useCallback(() => {
    pendingCompleteRef.current = null
    setChallenge(INITIAL_CHALLENGE)
    setCooldown(0)
  }, [])

  const skipOtp = useCallback(() => {
    const meta = lastMetaRef.current
    const targetPhone = challenge.normalizedPhone || meta.phone
    if (meta.leadId) {
      fetch("/api/leads/phone-otp/skip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        keepalive: true,
        body: JSON.stringify({
          leadId: meta.leadId,
          sessionId: meta.sessionId || undefined,
          phone: targetPhone || undefined,
          segment: meta.segment,
        }),
      }).catch(() => undefined)
    }
    resetOtp()
  }, [challenge.normalizedPhone, resetOtp])

  const getCachedTokenForPhone = useCallback(
    (phoneInput: string): string | undefined => {
      if (!verifiedCache) return undefined
      const cleanInput = phoneInput.replace(/[\s.\-()/]/g, "")
      const cleanRaw = verifiedCache.phoneRaw.replace(/[\s.\-()/]/g, "")
      const cleanE164 = verifiedCache.normalizedPhone
      if (cleanInput === cleanRaw || cleanInput === cleanE164) {
        return verifiedCache.token
      }
      return undefined
    },
    [verifiedCache]
  )

  const sendOtpRequest = useCallback(
    async (params: {
      phone: string
      segment: "B2B" | "B2C"
      email?: string
      firstName?: string
      lastName?: string
      postalCode?: string
      channel?: "sms" | "call"
      fax_number?: string
      form_opened_at?: string
      leadId?: string
      sessionId?: string
    }): Promise<
      | { status: "verified_cached"; token: string }
      | { status: "not_required" }
      | { status: "challenge_started" }
      | { status: "error"; message: string }
    > => {
      const cached = !params.channel ? getCachedTokenForPhone(params.phone) : undefined
      if (cached) {
        return { status: "verified_cached", token: cached }
      }

      const resolvedLeadId = params.leadId ?? lastMetaRef.current.leadId
      const resolvedSessionId = params.sessionId ?? lastMetaRef.current.sessionId
      lastMetaRef.current = {
        segment: params.segment,
        leadId: resolvedLeadId,
        sessionId: resolvedSessionId,
        phone: params.phone || lastMetaRef.current.phone,
      }
      setChallenge((prev) => ({ ...prev, isSending: true, error: null }))

      try {
        const res = await fetch("/api/leads/phone-otp/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...params,
            leadId: resolvedLeadId,
            sessionId: resolvedSessionId,
          }),
        })
        const data = (await res.json().catch(() => ({}))) as {
          ok?: boolean
          otpRequired?: boolean
          channel?: "sms" | "call" | "dev_mock"
          normalizedPhone?: string
          maskedPhone?: string
          lineType?: string | null
          carrierName?: string | null
          cooldownSeconds?: number
          retryAfterSeconds?: number
          error?: string
        }

        if (!res.ok) {
          if (typeof data.retryAfterSeconds === "number" && data.retryAfterSeconds > 0) {
            setCooldown(data.retryAfterSeconds)
          }
          const message = data.error || "Numéro impossible à vérifier. Contrôlez votre saisie."
          console.warn("[PhoneOtp] Envoi du code refusé:", res.status, message)
          setChallenge((prev) => ({
            ...prev,
            isSending: false,
            error: prev.active ? message : null,
          }))
          return { status: "error", message }
        }

        if (!data.otpRequired) {
          setChallenge(INITIAL_CHALLENGE)
          const pendingComplete = pendingCompleteRef.current
          pendingCompleteRef.current = null
          pendingComplete?.()
          return { status: "not_required" }
        }

        setCooldown(data.cooldownSeconds ?? 30)
        setChallenge({
          active: true,
          sendFailed: false,
          normalizedPhone: data.normalizedPhone || params.phone,
          maskedPhone: data.maskedPhone || params.phone,
          channel: data.channel || "sms",
          lineType: data.lineType ?? null,
          carrierName: data.carrierName ?? null,
          code: "",
          isSending: false,
          isVerifying: false,
          error: null,
        })
        return { status: "challenge_started" }
      } catch (err) {
        const message = "Erreur réseau lors de l'envoi du code. Réessayez."
        console.warn("[PhoneOtp] Erreur réseau à l'envoi du code:", err)
        setChallenge((prev) => ({
          ...prev,
          isSending: false,
          error: prev.active ? message : null,
        }))
        return { status: "error", message }
      }
    },
    [getCachedTokenForPhone]
  )

  const setCode = useCallback((nextCode: string) => {
    setChallenge((prev) => ({
      ...prev,
      code: nextCode.replace(/\D/g, "").slice(0, 6),
      error: null,
    }))
  }, [])

  const submitCode = useCallback(
    async (
      rawPhone: string,
      overrideCode?: string,
      options?: { leadId?: string | null; sessionId?: string | null }
    ): Promise<{ ok: true; token: string } | { ok: false; message: string }> => {
      const codeToCheck = (overrideCode ?? challenge.code).replace(/\D/g, "")
      if (codeToCheck.length < 6) {
        const msg = "Veuillez saisir les 6 chiffres reçus sur votre téléphone."
        setChallenge((prev) => ({ ...prev, error: msg }))
        return { ok: false, message: msg }
      }

      setChallenge((prev) => ({ ...prev, isVerifying: true, error: null }))
      try {
        const resolvedLeadId = options?.leadId ?? lastMetaRef.current.leadId
        const resolvedSessionId = options?.sessionId ?? lastMetaRef.current.sessionId
        const res = await fetch("/api/leads/phone-otp/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            phone: challenge.normalizedPhone || rawPhone,
            code: codeToCheck,
            segment: lastMetaRef.current.segment,
            channel: challenge.channel,
            lineType: challenge.lineType,
            carrierName: challenge.carrierName,
            leadId: resolvedLeadId || undefined,
            sessionId: resolvedSessionId || undefined,
          }),
        })
        const data = (await res.json().catch(() => ({}))) as {
          ok?: boolean
          verifiedPhone?: string
          verificationToken?: string
          error?: string
        }

        if (!res.ok || !data.verificationToken) {
          const msg = data.error || "Code incorrect ou expiré. Réessayez."
          setChallenge((prev) => ({ ...prev, isVerifying: false, error: msg }))
          return { ok: false, message: msg }
        }

        setVerifiedCache({
          phoneRaw: rawPhone,
          normalizedPhone: data.verifiedPhone || challenge.normalizedPhone || rawPhone,
          token: data.verificationToken,
        })
        setChallenge(INITIAL_CHALLENGE)
        return { ok: true, token: data.verificationToken }
      } catch {
        const msg = "Erreur réseau lors du contrôle du code. Réessayez."
        setChallenge((prev) => ({ ...prev, isVerifying: false, error: msg }))
        return { ok: false, message: msg }
      }
    },
    [challenge]
  )

  const executeSoftOtpSubmit = useCallback(
    async (params: {
      phone: string
      segment: "B2B" | "B2C"
      email?: string
      firstName?: string
      lastName?: string
      postalCode?: string
      fax_number?: string
      form_opened_at?: string
      sessionId?: string
      saveLead: (cachedToken?: string) => Promise<{ ok: true; leadId: string } | { ok: false }>
      onComplete: () => void
    }) => {
      const cachedToken = getCachedTokenForPhone(params.phone)
      const saveRes = await params.saveLead(cachedToken)
      if (!saveRes.ok) return

      if (cachedToken) {
        params.onComplete()
        return
      }

      const otpRes = await sendOtpRequest({
        phone: params.phone,
        segment: params.segment,
        email: params.email,
        firstName: params.firstName,
        lastName: params.lastName,
        postalCode: params.postalCode,
        fax_number: params.fax_number,
        form_opened_at: params.form_opened_at,
        leadId: saveRes.leadId || undefined,
        sessionId: params.sessionId || undefined,
      })

      if (otpRes.status === "challenge_started") {
        return
      }

      if (otpRes.status === "error") {
        // Lead déjà enregistré : on n'affiche jamais un faux succès silencieux.
        // L'utilisateur voit l'erreur et choisit : réessayer (SMS / appel) ou continuer sans confirmer.
        pendingCompleteRef.current = params.onComplete
        setChallenge({
          ...INITIAL_CHALLENGE,
          active: true,
          sendFailed: true,
          normalizedPhone: params.phone,
          maskedPhone: params.phone,
          error: otpRes.message,
        })
        return
      }

      params.onComplete()
    },
    [getCachedTokenForPhone, sendOtpRequest]
  )

  return {
    challenge,
    cooldown,
    getCachedTokenForPhone,
    isPhoneOtpVerifiedFor: (phoneInput: string) => Boolean(getCachedTokenForPhone(phoneInput)),
    sendOtpRequest,
    executeSoftOtpSubmit,
    setCode,
    submitCode,
    resetOtp,
    skipOtp,
  }
}

export interface PhoneOtpVerificationCardProps {
  challenge: OtpChallengeState
  cooldown: number
  onCodeChange: (code: string) => void
  onVerify: (codeOverride?: string) => void
  onResend: (channel: "sms" | "call") => void
  onEditPhone: () => void
  onSkip?: () => void
  skipLabel?: string
  savedNotice?: string
  editorial?: boolean
  submitLabel?: string
}

export function PhoneOtpVerificationCard({
  challenge,
  cooldown,
  onCodeChange,
  onVerify,
  onResend,
  onEditPhone,
  onSkip,
  skipLabel = "Continuer sans confirmer par SMS →",
  savedNotice = "Demande enregistrée · étape optionnelle pour passer en priorité",
  editorial = false,
  submitLabel = "Valider et recevoir mon étude",
}: PhoneOtpVerificationCardProps) {
  const isCall = challenge.channel === "call"
  const lastAutoSubmittedRef = useRef<string>("")

  useEffect(() => {
    if (!challenge.code) {
      lastAutoSubmittedRef.current = ""
    }
  }, [challenge.code])

  const handleOtpComplete = (val: string) => {
    const clean = val.replace(/\D/g, "")
    onCodeChange(clean)
    if (clean.length === 6 && !challenge.isVerifying && lastAutoSubmittedRef.current !== clean) {
      lastAutoSubmittedRef.current = clean
      onVerify(clean)
    }
  }

  return (
    <div
      className={cn(
        "flex flex-col gap-4 rounded-xl border p-4 sm:p-5",
        editorial
          ? "rounded-[10px] border-[var(--aegis-preference-accent)] bg-[var(--aegis-summary)] text-[var(--aegis-ink)]"
          : "border-primary/30 bg-card text-foreground shadow-sm"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <div
            className={cn(
              "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
              editorial
                ? "bg-accent-solar text-accent-solar-foreground"
                : "bg-primary/10 text-primary"
            )}
          >
            {isCall ? (
              <PhoneCall className="h-4 w-4" />
            ) : (
              <MessageSquare className="h-4 w-4" />
            )}
          </div>
          <div className="flex flex-col gap-1">
            {onSkip && (
              <span
                className={cn(
                  "inline-flex w-fit items-center gap-1 rounded px-2 py-0.5 text-[11px] font-semibold",
                  editorial
                    ? "bg-[var(--aegis-status-ok-bg)] text-[var(--aegis-status-ok-text)]"
                    : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20"
                )}
              >
                <CheckCircle2 className="h-3 w-3 shrink-0" />
                <span>{savedNotice}</span>
              </span>
            )}
            <h3 className="text-sm font-bold leading-snug">
              {challenge.sendFailed
                ? "Le code de confirmation n'a pas pu être envoyé"
                : isCall
                  ? "Appel automatique en cours avec votre code"
                  : "Confirmez votre numéro par SMS"}
            </h3>
            <p
              className={cn(
                "text-xs leading-relaxed",
                editorial ? "text-[var(--aegis-muted)]" : "text-muted-foreground"
              )}
            >
              {challenge.sendFailed
                ? "Votre demande est bien enregistrée. Réessayez l'envoi ou recevez le code par appel vocal sur le "
                : isCall
                  ? "Code dicté par appel sur le "
                  : "Code à 6 chiffres envoyé au "}
              <span className="font-mono tabular-nums font-semibold text-foreground">
                {challenge.maskedPhone}
              </span>
              {challenge.carrierName ? ` (${challenge.carrierName})` : ""}.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onEditPhone}
          disabled={challenge.isVerifying}
          className={cn(
            "inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition-colors cursor-pointer",
            editorial
              ? "text-[var(--aegis-link)] hover:bg-[var(--aegis-surface)]"
              : "text-primary hover:bg-secondary"
          )}
        >
          <Pencil className="h-3 w-3" />
          <span>Modifier</span>
        </button>
      </div>

      <div className="flex flex-col items-center gap-3 py-1">
        {!challenge.sendFailed && (
        <InputOTP
          maxLength={6}
          pattern={REGEXP_ONLY_DIGITS}
          inputMode="numeric"
          autoComplete="one-time-code"
          autoFocus
          value={challenge.code}
          onChange={handleOtpComplete}
          disabled={challenge.isVerifying}
          aria-label="Code de vérification à 6 chiffres"
        >
          <InputOTPGroup>
            <InputOTPSlot index={0} className="h-11 w-10 font-mono tabular-nums text-base font-bold bg-background" />
            <InputOTPSlot index={1} className="h-11 w-10 font-mono tabular-nums text-base font-bold bg-background" />
            <InputOTPSlot index={2} className="h-11 w-10 font-mono tabular-nums text-base font-bold bg-background" />
          </InputOTPGroup>
          <InputOTPSeparator />
          <InputOTPGroup>
            <InputOTPSlot index={3} className="h-11 w-10 font-mono tabular-nums text-base font-bold bg-background" />
            <InputOTPSlot index={4} className="h-11 w-10 font-mono tabular-nums text-base font-bold bg-background" />
            <InputOTPSlot index={5} className="h-11 w-10 font-mono tabular-nums text-base font-bold bg-background" />
          </InputOTPGroup>
        </InputOTP>
        )}

        {challenge.error && (
          <p
            role="alert"
            className={cn(
              "text-center text-xs font-medium",
              editorial ? "text-[var(--aegis-danger-text)]" : "text-destructive"
            )}
          >
            {challenge.error}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        {challenge.sendFailed ? (
          <Button
            type="button"
            onClick={() => onResend("sms")}
            disabled={cooldown > 0 || challenge.isSending}
            className={cn(
              "h-11 w-full font-bold cursor-pointer",
              editorial
                ? "rounded-[6px] bg-accent-solar hover:bg-accent-solar/90 text-accent-solar-foreground border border-[var(--aegis-preference-accent)]"
                : "bg-accent text-accent-foreground hover:bg-accent/90"
            )}
          >
            {challenge.isSending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            <span className="font-mono tabular-nums">
              {cooldown > 0 ? `Réessayer l'envoi par SMS (${cooldown} s)` : "Réessayer l'envoi par SMS"}
            </span>
          </Button>
        ) : (
        <Button
          type="button"
          onClick={() => onVerify()}
          disabled={challenge.isVerifying || challenge.code.length < 6}
          className={cn(
            "h-11 w-full font-bold cursor-pointer",
            editorial
              ? "rounded-[6px] bg-accent-solar hover:bg-accent-solar/90 text-accent-solar-foreground border border-[var(--aegis-preference-accent)]"
              : "bg-accent text-accent-foreground hover:bg-accent/90"
          )}
        >
          {challenge.isVerifying ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              <span>Validation du code…</span>
            </>
          ) : (
            <>
              <CheckCircle2 className="mr-2 h-4 w-4" />
              <span>{submitLabel}</span>
            </>
          )}
        </Button>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
          {!challenge.sendFailed && (
          <button
            type="button"
            disabled={cooldown > 0 || challenge.isSending || challenge.isVerifying}
            onClick={() => onResend(isCall ? "call" : "sms")}
            className={cn(
              "inline-flex items-center gap-1.5 font-medium transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed",
              editorial ? "text-[var(--aegis-link)]" : "text-primary hover:underline"
            )}
          >
            <RefreshCw className={cn("h-3 w-3", challenge.isSending && "animate-spin")} />
            <span className="font-mono tabular-nums">
              {cooldown > 0
                ? `Renvoyer le code (${cooldown} s)`
                : "Renvoyer le code"}
            </span>
          </button>
          )}

          {!isCall && (
            <button
              type="button"
              disabled={cooldown > 0 || challenge.isSending || challenge.isVerifying}
              onClick={() => onResend("call")}
              className={cn(
                "inline-flex items-center gap-1.5 font-medium transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed",
                editorial ? "text-[var(--aegis-muted)] hover:text-[var(--aegis-ink)]" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <PhoneCall className="h-3 w-3" />
              <span>Recevoir plutôt par appel</span>
            </button>
          )}
        </div>

        {onSkip && (
          <button
            type="button"
            disabled={challenge.isVerifying}
            onClick={onSkip}
            className={cn(
              "mt-1 w-full rounded-lg border py-2 text-center text-xs font-medium transition-colors cursor-pointer disabled:opacity-50",
              editorial
                ? "border-[var(--aegis-border)] bg-[var(--aegis-surface)] text-[var(--aegis-muted)] hover:text-[var(--aegis-ink)]"
                : "border-border bg-secondary/40 text-muted-foreground hover:text-foreground hover:bg-secondary/70"
            )}
          >
            {skipLabel}
          </button>
        )}
      </div>

      <p
        className={cn(
          "flex items-center justify-center gap-1.5 border-t pt-2.5 text-center text-[11px]",
          editorial
            ? "border-[var(--aegis-divider)] text-[var(--aegis-muted)]"
            : "border-border text-muted-foreground"
        )}
      >
        <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
        <span>Validation unique gratuite · garantit l&apos;envoi de vos offres aux bons interlocuteurs.</span>
      </p>
    </div>
  )
}

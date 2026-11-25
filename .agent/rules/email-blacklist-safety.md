# RÈGLE STRICTE ANTI-SPAM & PROTECTION DE LA LISTE NOIRE E-MAIL (AEGIS SOLAIRE)

Cette règle s'applique sans exception à toute fonctionnalité, route API, cron, moteur de relance ou script d'envoi d'e-mails.

## 1. INTERDICTION D'ENVOI DIRECT NON FILTRÉ
- **Il est STRICTEMENT INTERDIT** d'appeler `resend.emails.send(...)` directement pour des e-mails d'outreach, de prospection RESCERT, de relance, de teaser ou de notification partenaire.
- Tout envoi doit obligatoirement passer par le garde-fou centralisé fail-closed :
  - Dans l'app Next.js / TypeScript : `safeSendResendEmail(...)` et `loadGlobalEmailBlacklist(...)` depuis `lib/email-blacklist.ts`.
  - Dans les scripts Node `.mjs` : `safeSendResendEmail(...)` et `loadGlobalEmailBlacklist(...)` depuis `scripts/lib/email-blacklist.mjs`.

## 2. ARCHITECTURE FAIL-CLOSED OBLIGATOIRE
- Ne jamais inventer ou supposer un nom de table Supabase (ex. `rescert_optouts` n'existe pas).
- Les sources officielles de liste noire sont agrégées par `loadGlobalEmailBlacklist` :
  1. `lib/data/optout-emails.json`
  2. `lib/data/b2c-optout-emails.json`
  3. `audit_log` (`action IN ('RESCERT_OUTREACH_OPTOUT', 'EMAIL_BLACKLISTED', 'PARTNER_OPTOUT_ALL')`)
  4. `partners` (`email_notifications_enabled = false` ou `target_surfaces` contenant `__optout_all__`)
- **Ne jamais ignorer `.error` sur une lecture de liste noire.** En cas d'erreur DB ou de fichier absent, l'envoi doit être **immédiatement annulé / bloqué**.

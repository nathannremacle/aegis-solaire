# Guide : envoyer des e-mails avec une solution gratuite (Aegis Solaire)

Ce document explique **comment mettre en place l’envoi d’e-mails transactionnels** (notification à l’installateur lors de l’assignation d’un lead) en utilisant une **solution gratuite**. Deux options sont détaillées : **Resend** (recommandé, très simple) et **Brevo** (ex-Sendinblue, français, SMTP ou API).

---

## 1. Contexte dans Aegis Solaire

- **Où** : lorsqu’un admin assigne un lead à un installateur (panel admin), le site doit envoyer un e-mail à l’installateur avec les détails du lead (contact, surface, facture, etc.).
- **Fichier concerné** : `lib/notify-installateur.ts` — la fonction `sendLeadAssignedEmail(installateurEmail, lead)` est pour l’instant en `console.log` ; ce guide permet de la brancher sur un vrai service.
- **Variable d’environnement** : vous ajouterez une clé API (ou SMTP) dans `.env.local` et sur votre hébergeur.

---

## 2. Solutions gratuites comparées

| Solution    | Offre gratuite        | Avantages                          | Inconvénients              |
|------------|------------------------|------------------------------------|----------------------------|
| **Resend** | 3 000 e-mails/mois     | API simple, très bien intégrée Next.js, pas de SMTP | Nécessite de vérifier un domaine pour l’expéditeur |
| **Brevo**  | 300 e-mails/jour       | Français, SMTP ou API, bon pour l’Europe | Config un peu plus lourde  |
| **SendGrid** | 100 e-mails/jour    | Très connu                         | Limite basse en gratuit    |
| **Mailgun** | 1 000 e-mails/mois (3 mois) | Puissant | Offre free limitée dans le temps |

**Recommandation** : **Resend** pour la simplicité et le volume gratuit. **Brevo** si vous préférez un acteur français ou que vous utilisez déjà leur SMTP.

---

## 3. Option A : Resend (recommandé)

### 3.1 Créer un compte et obtenir la clé API

1. Allez sur [resend.com](https://resend.com) et **inscrivez-vous** (gratuit).
2. Dans le dashboard : **API Keys** → **Create API Key**.
3. Donnez un nom (ex. `Aegis Solaire prod`) et copiez la clé (elle ne sera plus affichée ensuite).
4. **Domaine expéditeur** : pour que les e-mails ne partent pas en spam, ajoutez votre domaine (ex. `aegissolaire.com`) dans **Domains** → **Add Domain**. Resend vous donnera des enregistrements DNS (SPF, DKIM) à ajouter chez votre hébergeur de domaine. En dev, vous pouvez envoyer depuis l’adresse de test Resend (voir ci‑dessous).

### 3.2 Installer le SDK

À la racine du projet :

```bash
npm install resend
```

### 3.3 Variable d’environnement

Dans **`.env.local`** (et sur Vercel / hébergeur en production) :

```env
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxx
```

L’adresse **From** doit être un e-mail vérifié sur Resend. En développement, vous pouvez utiliser leur domaine de test : `onboarding@resend.dev` (voir la doc Resend pour les limites).

En production, après avoir vérifié votre domaine, utilisez par exemple : `noreply@aegissolaire.com` ou `leads@aegissolaire.com`.

### 3.4 Modifier `lib/notify-installateur.ts`

Remplacez le contenu du fichier par une version qui utilise Resend quand la clé est présente :

```ts
import { Resend } from "resend"

export type LeadDetailsForEmail = {
  first_name: string
  last_name: string
  email: string
  phone: string
  job_title: string
  company: string | null
  surface_type: string
  surface_area: number
  annual_electricity_bill: number
  project_timeline?: string | null
  estimated_roi_years?: number | null
  estimated_savings?: number | null
  message?: string | null
}

const resendApiKey = process.env.RESEND_API_KEY
const fromEmail = process.env.RESEND_FROM_EMAIL ?? "onboarding@resend.dev"

function buildLeadAssignedHtml(lead: LeadDetailsForEmail): string {
  const surface = `${lead.surface_area.toLocaleString("fr-FR")} m² (${lead.surface_type})`
  const facture = `${lead.annual_electricity_bill.toLocaleString("fr-FR")} € HT / an`
  const roi = lead.estimated_roi_years != null ? `${lead.estimated_roi_years} ans` : "–"
  const economies = lead.estimated_savings != null ? `${lead.estimated_savings.toLocaleString("fr-FR")} € / an` : "–"
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Nouveau lead Aegis Solaire</title></head>
<body style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h2 style="color: #112f4b;">Nouveau lead assigné – Aegis Solaire</h2>
  <p>Un lead vous a été assigné. Coordonnées et résumé ci-dessous.</p>
  <table style="border-collapse: collapse; width: 100%;">
    <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Contact</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${lead.first_name} ${lead.last_name}</td></tr>
    <tr><td style="padding: 8px; border: 1px solid #ddd;">Fonction</td><td style="padding: 8px; border: 1px solid #ddd;">${lead.job_title}</td></tr>
    <tr><td style="padding: 8px; border: 1px solid #ddd;">Entreprise</td><td style="padding: 8px; border: 1px solid #ddd;">${lead.company ?? "–"}</td></tr>
    <tr><td style="padding: 8px; border: 1px solid #ddd;">Email</td><td style="padding: 8px; border: 1px solid #ddd;">${lead.email}</td></tr>
    <tr><td style="padding: 8px; border: 1px solid #ddd;">Téléphone</td><td style="padding: 8px; border: 1px solid #ddd;">${lead.phone}</td></tr>
    <tr><td style="padding: 8px; border: 1px solid #ddd;">Surface</td><td style="padding: 8px; border: 1px solid #ddd;">${surface}</td></tr>
    <tr><td style="padding: 8px; border: 1px solid #ddd;">Facture annuelle</td><td style="padding: 8px; border: 1px solid #ddd;">${facture}</td></tr>
    <tr><td style="padding: 8px; border: 1px solid #ddd;">ROI estimé</td><td style="padding: 8px; border: 1px solid #ddd;">${roi}</td></tr>
    <tr><td style="padding: 8px; border: 1px solid #ddd;">Économies estimées</td><td style="padding: 8px; border: 1px solid #ddd;">${economies}</td></tr>
  </table>
  ${lead.message ? `<p><strong>Message du prospect :</strong><br/>${lead.message.replace(/\n/g, "<br/>")}</p>` : ""}
  <p style="margin-top: 24px; color: #666; font-size: 12px;">Cet e-mail a été envoyé automatiquement par Aegis Solaire (Speed-to-Lead).</p>
</body>
</html>
  `.trim()
}

export async function sendLeadAssignedEmail(
  installateurEmail: string,
  lead: LeadDetailsForEmail
): Promise<void> {
  const subject = `[Aegis Solaire] Nouveau lead assigné : ${lead.first_name} ${lead.last_name}`

  if (!resendApiKey) {
    console.log("[Speed-to-Lead] RESEND_API_KEY non définie – e-mail simulé:", { to: installateurEmail, subject, lead: lead.first_name + " " + lead.last_name })
    return
  }

  const resend = new Resend(resendApiKey)
  const { error } = await resend.emails.send({
    from: fromEmail,
    to: installateurEmail,
    subject,
    html: buildLeadAssignedHtml(lead),
  })

  if (error) {
    console.error("[Speed-to-Lead] Resend error:", error)
    throw new Error("Échec envoi e-mail")
  }
}
```

### 3.5 Variable optionnelle pour l’expéditeur

En production, définissez l’adresse d’envoi (après vérification du domaine) :

```env
RESEND_FROM_EMAIL=noreply@aegissolaire.com
```

Sans cette variable, le code utilise `onboarding@resend.dev` (domaine de test Resend).

---

## 4. Option B : Brevo (ex-Sendinblue)

Brevo propose un **plan gratuit** (300 e-mails/jour) et une API simple. Idéal si vous voulez un acteur français.

### 4.1 Créer un compte et obtenir la clé API

1. Allez sur [brevo.com](https://www.brevo.com) et créez un compte.
2. **Paramètres** → **Clés API** (ou SMTP & API) → **Générer une clé API**.
3. Copiez la clé (format `xkeysib-...`).

### 4.2 Envoyer avec l’API (sans SDK)

Vous n’êtes pas obligé d’installer un package : un `fetch` vers l’API Brevo suffit.

**Variable d’environnement** :

```env
BREVO_API_KEY=xkeysib-xxxxxxxxxxxxxxxxxxxxxxxx
BREVO_FROM_EMAIL=noreply@votredomaine.com
BREVO_FROM_NAME=Aegis Solaire
```

**Exemple d’intégration dans `lib/notify-installateur.ts`** (à adapter selon que vous utilisez Resend ou Brevo) :

```ts
// Exemple d’envoi via Brevo (à placer dans sendLeadAssignedEmail si vous choisissez Brevo)
const BREVO_API_KEY = process.env.BREVO_API_KEY
const BREVO_FROM = process.env.BREVO_FROM_EMAIL ?? "noreply@votredomaine.com"
const BREVO_FROM_NAME = process.env.BREVO_FROM_NAME ?? "Aegis Solaire"

if (BREVO_API_KEY) {
  const html = buildLeadAssignedHtml(lead) // réutiliser la même fonction HTML que pour Resend
  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "Accept": "application/json",
      "Content-Type": "application/json",
      "api-key": BREVO_API_KEY,
    },
    body: JSON.stringify({
      sender: { name: BREVO_FROM_NAME, email: BREVO_FROM },
      to: [{ email: installateurEmail }],
      subject: `[Aegis Solaire] Nouveau lead assigné : ${lead.first_name} ${lead.last_name}`,
      htmlContent: html,
    }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    console.error("[Speed-to-Lead] Brevo error:", err)
    throw new Error("Échec envoi e-mail")
  }
}
```

Vous pouvez aussi utiliser **Nodemailer** avec le SMTP Brevo (paramètres fournis dans le compte Brevo) si vous préférez une approche SMTP.

---

## 5. Récapitulatif des variables d’environnement

| Variable | Option | Obligatoire | Description |
|----------|--------|-------------|-------------|
| `RESEND_API_KEY` | Resend | Oui (si Resend) | Clé API Resend |
| `RESEND_FROM_EMAIL` | Resend | Non | Expéditeur (défaut : onboarding@resend.dev) |
| `BREVO_API_KEY` | Brevo | Oui (si Brevo) | Clé API Brevo |
| `BREVO_FROM_EMAIL` | Brevo | Oui | Adresse d’envoi |
| `BREVO_FROM_NAME` | Brevo | Non | Nom d’affichage de l’expéditeur |

Si **aucune** clé n’est définie, le code actuel (ou la version avec `if (!resendApiKey)`) peut rester en fallback **console.log** / simulation pour ne pas casser l’app en dev.

---

## 6. Checklist de mise en production

- [ ] Compte créé sur Resend (ou Brevo).
- [ ] Domaine vérifié chez Resend (ou expéditeur configuré chez Brevo) pour limiter le spam.
- [ ] `RESEND_API_KEY` (ou `BREVO_*`) ajoutée dans **Vercel** (ou hébergeur) en **production**.
- [ ] `RESEND_FROM_EMAIL` (ou `BREVO_FROM_EMAIL`) défini avec une adresse du type `noreply@aegissolaire.com`.
- [ ] `lib/notify-installateur.ts` mis à jour avec le code Resend (ou Brevo) comme ci‑dessus.
- [ ] Test : assigner un lead à un installateur (avec votre propre e-mail) et vérifier la réception.

---

## 7. En cas d’erreur

- **E-mails en spam** : vérifiez les enregistrements SPF/DKIM (Resend ou Brevo vous les indiquent). Utilisez toujours un domaine vérifié en production.
- **« Unauthorized » / 401** : la clé API est absente ou incorrecte. Vérifiez le nom de la variable et qu’elle est bien disponible côté serveur (Next.js API routes).
- **Rate limit** : en gratuit, respectez les quotas (Resend 3 000/mois, Brevo 300/jour). Au‑delà, passer à un plan payant ou changer de fournisseur.

Pour plus d’infos sur la configuration globale du projet, voir **GUIDE-CONFIGURATION.md**.

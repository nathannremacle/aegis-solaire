# Guide de configuration – Aegis Solaire (100 % fonctionnel)

Ce guide décrit **étape par étape** tout ce qu’il faut configurer pour que le site (landing, simulateur, enregistrement des leads, panel admin) soit **100 % opérationnel**.

---

## 1. Supabase est-il gratuit ?

**Oui.** Supabase propose un **plan Free** (0 €/mois) avec :

| Inclus (Free) | Limite |
|---------------|--------|
| **Projets** | 2 projets max |
| **Base de données** | 500 Mo par projet |
| **Stockage fichiers** | 1 Go |
| **Bandeau sortant (egress)** | 5 Go / mois |
| **Utilisateurs actifs (Auth)** | 50 000 MAU |
| **Requêtes API** | Illimitées |

**Point important :** sur le plan Free, un projet peut être **mis en pause après 1 semaine d’inactivité**. Il suffit de le « réveiller » depuis le dashboard Supabase (quelques secondes). Pour un site en production avec trafic régulier, l’inactivité est rare.

Pour un site comme Aegis Solaire (landing + formulaire leads + admin), le **plan Free suffit** pour démarrer. Si vous dépassez les quotas ou souhaitez éviter la pause (plan **Pro**, 25 $/mois), vous pourrez upgrader plus tard.

---

## 2. Vue d’ensemble de la configuration

Pour que le site soit 100 % fonctionnel, il faut :

1. **Supabase** : créer un projet, exécuter les scripts SQL (tables `leads` et `installateurs`), activer Auth, récupérer les clés.
2. **Variables d’environnement** : les renseigner en local (`.env.local`) et sur l’hébergeur (ex. Vercel).
3. **Compte admin** : créer un utilisateur dans Supabase Auth et l’ajouter dans `ADMIN_EMAILS`.
4. **Hébergement** (optionnel pour tester en local) : déployer sur Vercel (ou autre) et y configurer les mêmes variables.

---

## 3. Configurer Supabase

### 3.1 Créer un compte et un projet

1. Allez sur [supabase.com](https://supabase.com) et **créez un compte** (ou connectez-vous).
2. **New project** :
   - **Organization** : gardez la par défaut ou créez-en une.
   - **Name** : par ex. `aegis-solaire`.
   - **Database Password** : choisissez un mot de passe **fort** et **notez-le** (il sert à la connexion directe à Postgres si besoin).
   - **Region** : choisissez la plus proche (ex. `West EU (Ireland)` pour la France).
3. Cliquez sur **Create new project** et attendez la création (1 à 2 minutes).

### 3.2 Récupérer l’URL et les clés API

1. Dans le menu gauche : **Project Settings** (icône engrenage).
2. Onglet **API** :
   - **Project URL** → vous en aurez besoin pour `NEXT_PUBLIC_SUPABASE_URL`.
   - **Project API keys** :
     - **anon / public** → pour `NEXT_PUBLIC_SUPABASE_ANON_KEY` (utilisée côté navigateur et pour la session Auth).
     - **service_role** → pour `SUPABASE_SERVICE_ROLE_KEY` (**secrète**, uniquement côté serveur : API leads, API admin). Ne la partagez jamais et ne la mettez pas dans du code client.

Copiez ces trois valeurs dans un endroit sûr (vous les collerez dans les variables d’environnement).

### 3.3 Créer les tables (base de données)

1. Dans le menu gauche : **SQL Editor**.
2. **New query**.
3. Copiez-collez **tout** le contenu du fichier **`scripts/001_create_leads_table.sql`** du projet (table `leads` + index + RLS + fonction `update_updated_at_column` + trigger).
4. Cliquez sur **Run** (ou Ctrl+Entrée). Vous devez voir « Success ».
5. Nouvelle requête : copiez-collez **tout** le contenu de **`scripts/002_create_installateurs_table.sql`** (table `installateurs`).
6. **Run**. Si une erreur indique que la fonction ou le trigger existe déjà, c’est souvent parce que le script `001` a déjà créé la fonction ; dans ce cas vous pouvez adapter le script (par ex. créer uniquement la table et les policies) ou ignorer l’erreur si la table `installateurs` est bien créée.

Vérification : dans **Table Editor**, vous devez voir les tables **`leads`** et **`installateurs`**.

### 3.4 Activer l’authentification (Auth) pour le panel admin

L’auth Supabase est **activée par défaut** (email + mot de passe).

1. **Authentication** → **Providers** : vérifiez que **Email** est activé.
2. **Authentication** → **Users** : pour l’instant vide ; vous ajouterez l’admin à l’étape 4.

Aucune config supplémentaire n’est nécessaire pour une connexion email/mot de passe.

### 3.5 (Optionnel) Vérifier les politiques RLS

- **Table `leads`** : RLS activé, une politique permet au **service role** de tout faire. La clé **anon** ne doit pas pouvoir lire/écrire les leads depuis le client (seule l’API avec la **service role** le fait).
- **Table `installateurs`** : idem, accès réservé au **service role** via l’API admin.

Les scripts fournis créent déjà ces politiques. Vous n’avez rien à changer sauf besoin spécifique.

---

## 4. Variables d’environnement

### 4.1 En local (développement)

À la **racine du projet** (à côté de `package.json`), créez un fichier **`.env.local`** (il ne doit **pas** être commité dans Git). Exemple :

```env
# Supabase (obligatoire)
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Site (obligatoire pour le bon fonctionnement des liens et du sitemap)
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# Admin (obligatoire pour accéder au panel /admin)
ADMIN_EMAILS=admin@aegis-solaire.fr

# Optionnel : webhook pour envoyer les leads à un CRM ou un installateur
# LEAD_WEBHOOK_URL=https://votre-crm.com/webhook

# Optionnel : vidéo Fondateur (section Expert)
# NEXT_PUBLIC_FOUNDER_VIDEO_URL=https://www.youtube.com/watch?v=xxxxx
```

Remplacez :

- `NEXT_PUBLIC_SUPABASE_URL` et les deux clés par les valeurs de votre projet Supabase (voir 3.2).
- `ADMIN_EMAILS` par l’email que vous utiliserez pour vous connecter au panel admin (plusieurs emails possibles, séparés par des virgules, sans espaces).
- En production, `NEXT_PUBLIC_SITE_URL` sera l’URL réelle du site (ex. `https://www.aegis-solaire.fr`).

### 4.2 Sur Vercel (production)

1. **Vercel** : connectez votre dépôt Git au projet.
2. **Settings** → **Environment Variables**.
3. Ajoutez **les mêmes variables** que dans `.env.local`, avec des valeurs **production** :
   - `NEXT_PUBLIC_SITE_URL` = `https://votre-domaine.fr`
   - `ADMIN_EMAILS` = l’email (ou la liste) admin.
   - Les clés Supabase restent celles du **même** projet Supabase (ou d’un projet dédié prod si vous en créez un).
4. Redéployez le projet pour que les variables soient prises en compte.

### 4.3 Récapitulatif des variables

| Variable | Obligatoire | Où la mettre | Description |
|----------|-------------|--------------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Oui | .env.local + Vercel | URL du projet Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Oui | .env.local + Vercel | Clé anon (publique) |
| `SUPABASE_SERVICE_ROLE_KEY` | Oui | .env.local + Vercel (secrète) | Clé service role – ne jamais exposer |
| `NEXT_PUBLIC_SITE_URL` | Oui | .env.local + Vercel | URL du site (ex. https://www.aegis-solaire.fr) |
| `ADMIN_EMAILS` | Oui pour l’admin | .env.local + Vercel (secrète) | Emails autorisés à se connecter à /admin |
| `LEAD_WEBHOOK_URL` | Non | .env.local + Vercel (secrète) | Webhook POST pour envoyer les leads en temps réel |
| `NEXT_PUBLIC_FOUNDER_VIDEO_URL` | Non | .env.local + Vercel | URL YouTube/Vimeo de la vidéo Fondateur |

---

## 5. Créer le premier compte admin

Pour vous connecter à **/admin** (tableau de bord, leads, installateurs) :

1. Dans Supabase : **Authentication** → **Users**.
2. **Add user** → **Create new user**.
3. Saisissez l’**email** (le même que dans `ADMIN_EMAILS`) et un **mot de passe**.
4. Validez. L’utilisateur apparaît dans la liste.
5. Vérifiez que dans votre `.env.local` (et sur Vercel) vous avez bien **`ADMIN_EMAILS=cet-email@exemple.fr`** (sans espace).

Vous pouvez ensuite aller sur **https://votre-site.fr/admin/login** (ou `http://localhost:3000/admin/login` en local), vous connecter avec cet email et ce mot de passe, puis accéder au panel.

---

## 6. Hébergement (Vercel) – site en ligne

### 6.1 Connexion du dépôt

1. [vercel.com](https://vercel.com) : connectez-vous (GitHub / GitLab / Bitbucket).
2. **Add New** → **Project** → importez le dépôt du site Aegis Solaire.
3. **Framework Preset** : Next.js (détecté automatiquement).
4. **Root Directory** : laissez vide si le projet est à la racine du dépôt.

### 6.2 Variables d’environnement

Avant ou après le premier déploiement : **Settings** → **Environment Variables**. Ajoutez toutes les variables listées en 4.3 (au minimum les 5 obligatoires). Pour les secrets (`SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_EMAILS`, `LEAD_WEBHOOK_URL`), cochez **Sensitive** si l’interface le propose.

### 6.3 Déploiement

- **Deploy** : chaque push sur la branche connectée (souvent `main`) déclenche un déploiement.
- Une fois déployé, le site est accessible à l’URL fournie par Vercel (ex. `https://aegis-solaire.vercel.app`). Vous pouvez ensuite attacher un **domaine personnalisé** (ex. `www.aegis-solaire.fr`) dans **Settings** → **Domains**.

### 6.4 Après le domaine personnalisé

Mettez à jour **`NEXT_PUBLIC_SITE_URL`** sur Vercel pour qu’elle soit égale à l’URL finale du site (ex. `https://www.aegis-solaire.fr`). Cela sert au sitemap, aux métadonnées et aux redirections (ex. déconnexion admin).

---

## 7. Checklist « Site 100 % fonctionnel »

Cochez au fur et à mesure :

- [ ] **Supabase**
  - [ ] Projet créé
  - [ ] Script `001_create_leads_table.sql` exécuté (table `leads` visible)
  - [ ] Script `002_create_installateurs_table.sql` exécuté (table `installateurs` visible)
  - [ ] URL + anon key + service_role key copiées
- [ ] **Variables d’environnement**
  - [ ] `.env.local` créé en local avec les 5 variables obligatoires
  - [ ] Sur Vercel (ou autre hébergeur), les mêmes variables renseignées pour la prod
- [ ] **Auth admin**
  - [ ] Un utilisateur créé dans Supabase (Authentication → Users)
  - [ ] Son email ajouté dans `ADMIN_EMAILS`
- [ ] **Tests**
  - [ ] En local : `npm run dev` → formulaire simulateur → soumission → un lead apparaît dans Supabase (Table Editor → `leads`)
  - [ ] En local : `/admin/login` → connexion avec l’email admin → accès au tableau de bord, liste des leads, liste des installateurs (vide au départ)
  - [ ] En prod : même scénario après déploiement
- [ ] **Optionnel**
  - [ ] `LEAD_WEBHOOK_URL` configuré si vous voulez envoyer les leads à un CRM
  - [ ] `NEXT_PUBLIC_FOUNDER_VIDEO_URL` configuré si vous avez une vidéo pour la section Expert
  - [ ] Domaine personnalisé configuré sur Vercel et `NEXT_PUBLIC_SITE_URL` mis à jour

---

## 8. Dépannage rapide

| Problème | Piste de solution |
|----------|-------------------|
| **Je n'arrive pas à accéder à /admin** | C'est normal : l'admin exige une connexion. Aller sur **/admin** ou **/admin/login** : vous devez voir la page de connexion. Si erreur (500, 404), vérifier `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `ADMIN_EMAILS`, puis créer un utilisateur dans Supabase Auth (section 5). |
| « Invalid login credentials » sur /admin/login | Vérifier que l’utilisateur existe dans Supabase (Authentication → Users) et que l’email correspond exactement à celui dans `ADMIN_EMAILS`. |
| Après connexion, redirection vers /admin/login ou 404 | Vérifier que `ADMIN_EMAILS` contient bien l’email (sans espace, même casse). Vérifier les cookies (connexion bien établie). |
| Les leads ne s’enregistrent pas (erreur 500) | Vérifier que la table `leads` existe et que `SUPABASE_SERVICE_ROLE_KEY` est définie (et que l’API utilise bien le client avec cette clé). Vérifier les logs Supabase (Logs → API) et les logs Vercel. |
| Erreur « relation "leads" does not exist » | Exécuter le script `001_create_leads_table.sql` dans le SQL Editor Supabase. |
| Erreur « relation "installateurs" does not exist » | Exécuter le script `002_create_installateurs_table.sql` dans le SQL Editor Supabase. |
| Projet Supabase en pause | Aller dans le dashboard Supabase sur le projet et le « réveiller » (bouton prévu à cet effet). |

---

## 9. Résumé

- **Supabase** : gratuit avec un plan Free (2 projets, 500 Mo DB, 5 Go egress, etc.) ; suffisant pour démarrer Aegis Solaire.
- **Configuration complète** : créer le projet Supabase, exécuter les 2 scripts SQL, récupérer URL + anon + service_role, créer `.env.local` et les variables sur Vercel, créer un utilisateur Auth et l’ajouter dans `ADMIN_EMAILS`.
- Une fois ces étapes faites, le site est **100 % fonctionnel** : landing, simulateur, enregistrement des leads, panel admin (dashboard, leads, installateurs).

Pour plus de détails sur le fonctionnement du site et l’architecture, voir **DOCUMENTATION.md**. Pour le panel admin, voir **PLAN-ADMIN.md**.

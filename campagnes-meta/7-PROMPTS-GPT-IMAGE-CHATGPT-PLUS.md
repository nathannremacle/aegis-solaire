# Prompts Optimisés GPT Image (ChatGPT Plus) — Variantes Photopub A/B Test V2

Ce guide complète les créatives **V2 Éditoriales** déjà générées et prêtes dans `campagnes-meta/creatives-v2/`.  
Utilisez ces prompts dans **ChatGPT Plus (GPT Image)** si vous souhaitez produire en parallèle des variantes **"photo-réaliste / native UGC"** où texte et scène physique sont fondus naturellement dans l'image, puis les tester en A/B face aux créatives éditoriales V2.

---

## Règles fixes avant génération dans ChatGPT Plus
- **Ratio obligatoire** : `4:5` (vertical Feed Instagram/Facebook — occupe +25 % d'écran mobile que le `1:1`). Dans votre prompt, précisez toujours **`portrait 4:5 aspect ratio`**.
- **Rendu français impeccable** : GPT Image gère très bien le texte court intégré s'il est entre guillemets français/anglais exacts, limité à **3 blocs courts max** par visuel.
- **Zéro promesse interdite Meta** : pas de *"panneaux gratuits par l'État"*, pas de badge jaune fluo *"PROMO -50 %"*, pas de faux bouton Web cliquable en plastique.
- **Déploiement rapide après génération** : si vous préférez une image produite sur ChatGPT Plus, remplacez le fichier correspondant dans `campagnes-meta/creatives-v2/` (ou ajoutez-le en V2B) puis ré-exécutez :
  ```bash
  node scripts/launch-meta-pack-v2.mjs --stage-assets
  ```

---

## Prompt 1 — Angle Écart de Prix `1 850 €` (Style Document Réel sur Table — Native High-Trust)
*Remplace ou complète `v2_ad1_ecart1850_4x5.png` :*

> **Copier-coller dans ChatGPT Plus :**
> Photorealistic editorial flat-lay / 35-degree angle photograph in portrait 4:5 aspect ratio. Morning natural sunlight inside a contemporary Belgian Walloon brick house overlooking a residential tiled roof equipped with sleek all-black solar panels through patio windows in soft background bokeh. On a warm solid oak dining table next to a ceramic espresso cup and a dark matte pen, two crisp clean A4 printed solar installation quotes sit angled side by side.
> On the left white quote sheet, clean printed black header: `"DEVIS A · COMMERCIAL ISOLÉ"`, subtle grey layout lines, and bold crossed-out price in slate grey: `"11 650 €"`.
> On the right white quote sheet subtly framed by an emerald-green marker highlight, clean printed header: `"DEVIS B · COMPARÉ RESCERT"`, subtle grey layout lines, bold emerald-green price: `"9 800 €"`, and a handwritten neat emerald annotation circled next to it: `"-1 850 € d'écart !"`.
> In the clean upper margin above the documents (on warm softly blurred linen/daylight background), ultra-clean dark slate Swiss editorial typography:
> Eyebrow: `"WALLONIE · AUDIT SOLAIRE 2026"`
> Bold headline: `"Même toiture. Mêmes panneaux. Jusqu'à 1 850 € d'écart."`
> Small bottom caption bar on subtle frosted white strip: `"Comparez jusqu'à 3 installateurs certifiés RESCERT en 45 s · Aegis Solaire"`.
> Shot on 35mm lens, shallow depth of field, authentic Belgian lighting, crisp French spelling with exact accents and spaces, zero neon colors, zero fake buttons, zero extra garbled fine print.

---

## Prompt 2 — Angle Rentabilité 2026 / Compteur Intelligent (Style Architectural Wallonie)
*Remplace ou complète `v2_ad2_rentabilite2026_4x5.png` :*

> **Copier-coller dans ChatGPT Plus :**
> Photorealistic architectural photography in portrait 4:5 aspect ratio of a modern-renovated detached Walloon house in Belgium at peaceful blue-hour sunset. Typical Belgian sand-red brick walls, dark grey slate pitched roof featuring clean flush all-black monocrystalline solar panels, warm golden light glowing through contemporary dark-framed living room windows, rolling green Belgian Condroz countryside hills behind. Uncluttered deep twilight blue sky across the upper 35% of the frame, clean dark shaded lawn across the lower 28%.
> Integrated seamlessly as crisp dark-slate & white Swiss Fintech editorial typography in the upper sky (no heavy boxed banner):
> Small amber pill outline: `"WALLONIE 2026 · RENTABILITÉ RÉELLE"`
> Sharp white sans-serif headline (`DM Sans` style): `"Fin du compteur qui tourne à l'envers :"` followed immediately in warm solar amber `"encore rentable chez vous ?"`
> In the lower shadowed foreground, three sleek minimalist rounded white translucent data cards side by side (1px subtle border, clean typography, zero shiny glow):
> Card 1: label `"ÉCONOMIE MOYENNE"` / big emerald number `"1 480 €"` / sub `"par an / foyer"`
> Card 2: label `"AMORTISSEMENT"` / big dark number `"4 à 6 ans"` / sub `"installation calibrée"`
> Card 3: label `"COMPARATIF"` / big amber number `"Max 3"` / sub `"artisans RESCERT"`
> Subtle clean footer text below the cards: `"★ 4,9/5 · Tiers de confiance indépendant Wallonie · Aegis Solaire"`.
> Authentic photography, zero artificial neon glow lines along roof edges, zero fake web CTA buttons, exact French spelling.

---

## Prompt 3 — Angle Anti-Démarchage (Style UGC Smartphone / Matin Serein)
*Remplace ou complète `v2_ad3_anti_demarchage_4x5.png` :*

> **Copier-coller dans ChatGPT Plus :**
> Candid authentic European lifestyle photograph in portrait 4:5 aspect ratio, shot over the shoulder on a 35mm lens at natural morning light in a bright Belgian kitchen (brick accent wall, oak wood table, hot coffee mug, garden visible outside). A calm homeowner in their 40s in casual weekend knitwear holds a modern dark smartphone cleanly angled toward the camera showing a minimalist Swiss-clean light notification card UI on screen reading:
> Header: `"Aegis Solaire · Dossier Wallonie"`
> Emerald status pill: `"1er contact par écrit activé"`
> 3 clean list rows: `"Offre 1 — Installateur RESCERT (Liège)"`, `"Offre 2 — Installateur RESCERT (Liège)"`, `"Offre 3 — Installateur RESCERT (Liège)"`
> Bottom green note: `"0 appel commercial non sollicité"`.
> In the clean bright area at the very top above the background wall, sharp dark slate headline:
> `"Marre d'être appelé 10 fois pour 1 devis solaire ?"`
> Subhead: `"Max 3 artisans RESCERT · Vous gardez le contrôle sur vos coordonnées."`
> Natural filmic tones, genuine residential realism, zero stock-photo fake grin, exact French accents, zero garbled text.


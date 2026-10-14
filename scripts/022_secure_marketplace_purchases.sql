-- Migration 022 : Sécurisation critique de la marketplace & des procédures stockées
-- 
-- 1. Résolution de la faille IDOR et concurrence sur purchase_lead()
-- 2. Herméticité absolue du sas 'available' (rejet des leads en 'pending_review')
-- 3. Ordre de verrouillage anti-deadlock (partners PUIS leads)
-- 4. Contrainte d'unicité stricte sur lead_purchases (anti double-clic)
-- 5. Révocation des droits publics sur add_credits() (réservé au service_role)
-- 6. Restriction de la RLS SELECT sur leads aux dossiers effectivement achetés

-- 1. Contrainte d'unicité obligatoire sur lead_purchases
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'lead_purchases_lead_partner_unique'
  ) THEN
    ALTER TABLE public.lead_purchases
      ADD CONSTRAINT lead_purchases_lead_partner_unique UNIQUE (lead_id, partner_id);
  END IF;
END$$;

-- 2. Procédure stockée purchase_lead() ultra-sécurisée et atomique
CREATE OR REPLACE FUNCTION public.purchase_lead(
  p_lead_id UUID,
  p_partner_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lead            RECORD;
  v_partner         RECORD;
  v_cost            INTEGER;
  v_max_slots       INTEGER;
  v_purchases_count INTEGER;
  v_caller_role     TEXT;
  v_caller_uid      UUID;
BEGIN
  -- A. Vérification d'authentification stricte (Protection Anti-IDOR)
  v_caller_role := current_setting('request.jwt.claim.role', true);
  v_caller_uid := auth.uid();

  -- Si l'appel provient d'un token utilisateur (client direct) et non du service_role serveur :
  IF v_caller_role IS DISTINCT FROM 'service_role' THEN
    IF v_caller_uid IS NULL THEN
      RETURN jsonb_build_object('success', false, 'error', 'Non authentifié');
    END IF;

    PERFORM 1 FROM public.partners 
    WHERE id = p_partner_id 
      AND (auth_user_id = v_caller_uid OR lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')));
    
    IF NOT FOUND THEN
      RETURN jsonb_build_object('success', false, 'error', 'Accès non autorisé à ce compte partenaire');
    END IF;
  END IF;

  -- B. Verrouillage dans un ordre constant anti-deadlock : PARTNER EN PREMIER, PUIS LEAD
  SELECT * INTO v_partner FROM public.partners WHERE id = p_partner_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Partenaire introuvable');
  END IF;

  SELECT * INTO v_lead FROM public.leads WHERE id = p_lead_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Dossier introuvable');
  END IF;

  -- C. Herméticité absolue : SEULS les leads validés ('available') peuvent être achetés
  IF v_lead.marketplace_status != 'available' THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error', 'Ce dossier n''est pas disponible à l''achat (statut: ' || v_lead.marketplace_status || ')'
    );
  END IF;

  -- D. Vérification que ce partenaire n'a pas déjà acheté ce lead (Anti-double débit)
  IF EXISTS (
    SELECT 1 FROM public.lead_purchases 
    WHERE lead_id = p_lead_id AND partner_id = p_partner_id
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Vous avez déjà débloqué ce dossier');
  END IF;

  -- E. Calcul du nombre de places et du coût en crédits
  v_max_slots := CASE WHEN v_lead.segment = 'B2C' THEN 3 ELSE 1 END;
  v_cost := COALESCE(v_lead.credit_cost, CASE WHEN v_lead.segment = 'B2C' THEN 2 ELSE 5 END);

  SELECT COUNT(*) INTO v_purchases_count FROM public.lead_purchases WHERE lead_id = p_lead_id;
  IF v_purchases_count >= v_max_slots THEN
    UPDATE public.leads SET marketplace_status = 'sold_out' WHERE id = p_lead_id;
    RETURN jsonb_build_object('success', false, 'error', 'Plus de places disponibles pour ce dossier');
  END IF;

  -- F. Vérification du solde de crédits
  IF v_partner.credits < v_cost THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error', 'Crédits insuffisants', 
      'required', v_cost, 
      'available', v_partner.credits
    );
  END IF;

  -- G. Débit et écritures comptables atomiques
  UPDATE public.partners 
  SET credits = credits - v_cost, updated_at = NOW() 
  WHERE id = p_partner_id;

  INSERT INTO public.lead_purchases (lead_id, partner_id, credits_spent)
  VALUES (p_lead_id, p_partner_id, v_cost);

  INSERT INTO public.credit_transactions (partner_id, amount, type, reference)
  VALUES (p_partner_id, -v_cost, 'purchase', 'lead:' || p_lead_id::text);

  INSERT INTO public.lead_distributions (lead_id, partner_id, status)
  VALUES (p_lead_id, p_partner_id, 'unlocked')
  ON CONFLICT (lead_id, partner_id)
  DO UPDATE SET status = 'unlocked', updated_at = NOW();

  -- H. Clôture immédiate si saturation des slots
  IF (v_purchases_count + 1) >= v_max_slots THEN
    UPDATE public.leads SET marketplace_status = 'sold_out' WHERE id = p_lead_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'credits_spent', v_cost,
    'credits_remaining', v_partner.credits - v_cost
  );
END;
$$;

-- 3. Révocation des permissions dangereuses sur add_credits()
REVOKE EXECUTE ON FUNCTION public.add_credits(UUID, INTEGER, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.add_credits(UUID, INTEGER, TEXT, TEXT) TO service_role;

-- 4. RLS sur public.leads : un partenaire ne peut lire QUE les leads qu'il a achetés
DROP POLICY IF EXISTS "leads_select" ON public.leads;
CREATE POLICY "leads_select"
  ON public.leads
  FOR SELECT
  TO authenticated
  USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.lead_purchases lp
      JOIN public.partners p ON p.id = lp.partner_id
      WHERE lp.lead_id = leads.id
        AND (p.auth_user_id = auth.uid() OR lower(p.email) = lower(coalesce(auth.jwt() ->> 'email', '')))
    )
  );

-- 5. Vue anonymisée pour le Live Feed de la marketplace (sans aucune PII)
CREATE OR REPLACE VIEW public.marketplace_live_feed AS
SELECT 
  l.id,
  l.segment,
  l.surface_type,
  l.surface_area,
  l.province,
  l.grd,
  l.annual_electricity_bill,
  l.job_title,
  l.lead_score,
  l.credit_cost,
  l.marketplace_status,
  l.created_at,
  (CASE WHEN l.segment = 'B2C' THEN 3 ELSE 1 END) - COALESCE(COUNT(lp.id), 0)::int AS remaining_slots
FROM public.leads l
LEFT JOIN public.lead_purchases lp ON lp.lead_id = l.id
WHERE l.marketplace_status = 'available'
GROUP BY l.id;

GRANT SELECT ON public.marketplace_live_feed TO authenticated;
GRANT SELECT ON public.marketplace_live_feed TO service_role;

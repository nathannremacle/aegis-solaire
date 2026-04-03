-- Migration 017 : Correction lead_purchases — ajout credits_spent si absent
--
-- Cause : si la table lead_purchases a été créée AVANT la migration 015
-- (manuellement ou via un brouillon précédent), la colonne credits_spent
-- est manquante, ce qui fait échouer purchase_lead().
-- Cette migration l'ajoute de manière idempotente.

ALTER TABLE public.lead_purchases
  ADD COLUMN IF NOT EXISTS credits_spent INTEGER NOT NULL DEFAULT 1;

-- Re-créer purchase_lead() au cas où la première tentative (015)
-- aurait échoué à cause de la colonne manquante.
CREATE OR REPLACE FUNCTION public.purchase_lead(p_lead_id UUID, p_partner_id UUID)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lead        RECORD;
  v_partner     RECORD;
  v_cost        INTEGER;
  v_current     INTEGER;
  v_max_slots   INTEGER;
BEGIN
  SELECT * INTO v_lead FROM public.leads WHERE id = p_lead_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Lead introuvable');
  END IF;
  IF v_lead.marketplace_status = 'sold_out' THEN
    RETURN jsonb_build_object('error', 'Ce lead est épuisé');
  END IF;

  IF EXISTS (SELECT 1 FROM public.lead_purchases WHERE lead_id = p_lead_id AND partner_id = p_partner_id) THEN
    RETURN jsonb_build_object('error', 'Vous avez déjà débloqué ce lead');
  END IF;

  v_cost      := COALESCE(v_lead.credit_cost, CASE WHEN v_lead.segment = 'B2C' THEN 2 ELSE 5 END);
  v_max_slots := CASE WHEN v_lead.segment = 'B2C' THEN 3 ELSE 1 END;

  SELECT COUNT(*) INTO v_current FROM public.lead_purchases WHERE lead_id = p_lead_id;
  IF v_current >= v_max_slots THEN
    UPDATE public.leads SET marketplace_status = 'sold_out' WHERE id = p_lead_id;
    RETURN jsonb_build_object('error', 'Plus de places disponibles');
  END IF;

  SELECT * INTO v_partner FROM public.partners WHERE id = p_partner_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Partenaire introuvable');
  END IF;
  IF v_partner.credits < v_cost THEN
    RETURN jsonb_build_object('error', 'Crédits insuffisants', 'required', v_cost, 'available', v_partner.credits);
  END IF;

  UPDATE public.partners SET credits = credits - v_cost WHERE id = p_partner_id;

  INSERT INTO public.lead_purchases (lead_id, partner_id, credits_spent)
  VALUES (p_lead_id, p_partner_id, v_cost);

  INSERT INTO public.credit_transactions (partner_id, amount, type, reference)
  VALUES (p_partner_id, -v_cost, 'purchase', 'lead:' || p_lead_id::text);

  INSERT INTO public.lead_distributions (lead_id, partner_id, status)
  VALUES (p_lead_id, p_partner_id, 'unlocked')
  ON CONFLICT (lead_id, partner_id)
  DO UPDATE SET status = 'unlocked', updated_at = NOW();

  IF (v_current + 1) >= v_max_slots THEN
    UPDATE public.leads SET marketplace_status = 'sold_out' WHERE id = p_lead_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'credits_spent', v_cost,
    'credits_remaining', v_partner.credits - v_cost
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.purchase_lead(UUID, UUID) TO authenticated;

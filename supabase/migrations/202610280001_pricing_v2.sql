-- ============================================================================
-- Migration : 202610280001_pricing_v2.sql
-- Titre : Barème Tarifaire V2 (1 crédit = 11,50 € HTVA | B2C = 3 cr. | B2B = 9 cr.)
-- ============================================================================

BEGIN;

-- 1. Ajout des colonnes de versioning tarifaire sur les leads et commandes
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS pricing_version text DEFAULT 'v2';

ALTER TABLE public.credit_orders
  ADD COLUMN IF NOT EXISTS pricing_version text DEFAULT 'v2';

-- 2. Inventaire et migration des données existantes
-- A. Les commandes créées avant cette migration sont marquées en v1 pour préserver leurs conditions
UPDATE public.credit_orders
   SET pricing_version = 'v1'
 WHERE created_at < NOW() AND pricing_version IS DISTINCT FROM 'v1';

-- B. Les dossiers déjà achetés par au moins un partenaire restent en v1 pour conserver leur tarif historique
UPDATE public.leads
   SET pricing_version = 'v1'
 WHERE id IN (SELECT DISTINCT lead_id FROM public.lead_purchases);

-- C. Les dossiers non achetés disponibles sont revalorisés au barème V2 (3 cr. B2C / 9 cr. B2B)
UPDATE public.leads
   SET credit_cost = CASE WHEN segment = 'B2C' THEN 3 ELSE 9 END,
       pricing_version = 'v2'
 WHERE id NOT IN (SELECT DISTINCT lead_id FROM public.lead_purchases);

-- 3. Mise à jour de la fonction atomique d'achat marketplace
CREATE OR REPLACE FUNCTION public.purchase_marketplace_lead(
  p_lead_id uuid,
  p_partner_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lead record;
  v_partner record;
  v_max_slots int;
  v_taken_slots int;
  v_purchase_id uuid;
  v_cost int;
BEGIN
  -- Verrouillage pessimiste ordonné (partner puis lead) anti-deadlock
  SELECT id, credits
    INTO v_partner
    FROM public.partners
   WHERE id = p_partner_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'PARTNER_NOT_FOUND: Profil partenaire introuvable.';
  END IF;

  SELECT id, segment, marketplace_status, credit_cost, pricing_version
    INTO v_lead
    FROM public.leads
   WHERE id = p_lead_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'LEAD_NOT_FOUND: Ce lead est introuvable.';
  END IF;

  IF v_lead.marketplace_status <> 'available' THEN
    RAISE EXCEPTION 'LEAD_UNAVAILABLE: Ce lead n''est plus disponible sur la marketplace.';
  END IF;

  -- Vérifier si le partenaire a déjà acheté ce lead
  IF EXISTS (
    SELECT 1 FROM public.lead_purchases
    WHERE lead_id = p_lead_id AND partner_id = p_partner_id
  ) THEN
    RAISE EXCEPTION 'ALREADY_PURCHASED: Vous avez déjà acquis ce lead.';
  END IF;

  -- Règle métier Aegis Solaire : 1 seul installateur en B2B exclusif, max 3 en B2C résidentiel
  v_max_slots := CASE WHEN v_lead.segment = 'B2B' THEN 1 ELSE 3 END;

  SELECT count(*)::int INTO v_taken_slots
    FROM public.lead_purchases
   WHERE lead_id = p_lead_id;

  IF v_taken_slots >= v_max_slots THEN
    UPDATE public.leads SET marketplace_status = 'sold_out' WHERE id = p_lead_id;
    RAISE EXCEPTION 'SLOTS_FULL: Tous les créneaux pour ce lead viennent d''être attribués.';
  END IF;

  -- Détermination du coût : prix fixé sur le dossier ou barème v2 standard
  v_cost := COALESCE(v_lead.credit_cost, CASE WHEN v_lead.segment = 'B2B' THEN 9 ELSE 3 END);

  IF v_cost <= 0 THEN
    RAISE EXCEPTION 'INVALID_PRICE: Le coût en crédits du dossier doit être strictement positif.';
  END IF;

  -- Vérification du solde de crédits
  IF v_partner.credits < v_cost THEN
    RAISE EXCEPTION 'INSUFFICIENT_CREDITS: Solde insuffisant (% crédits requis, % disponibles).',
      v_cost, v_partner.credits;
  END IF;

  -- 1. Débiter le solde du partenaire
  UPDATE public.partners
     SET credits = credits - v_cost,
         updated_at = now()
   WHERE id = p_partner_id;

  -- 2. Créer l'achat dans lead_purchases
  INSERT INTO public.lead_purchases (
    lead_id, partner_id, purchased_at, credits_spent, pipeline_status
  ) VALUES (
    p_lead_id, p_partner_id, now(), v_cost, 'to_contact'
  ) RETURNING id INTO v_purchase_id;

  -- 3. Journaliser dans credit_transactions
  INSERT INTO public.credit_transactions (
    partner_id, amount, type, reference, created_at
  ) VALUES (
    p_partner_id, -v_cost, 'purchase', 'LEAD:' || p_lead_id::text, now()
  );

  -- 4. Clôturer le lead si dernier slot acquis
  IF (v_taken_slots + 1) >= v_max_slots THEN
    UPDATE public.leads
       SET marketplace_status = 'sold_out'
     WHERE id = p_lead_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'purchase_id', v_purchase_id,
    'credits_spent', v_cost,
    'remaining_credits', v_partner.credits - v_cost,
    'slots_remaining', v_max_slots - (v_taken_slots + 1)
  );
END;
$$;

-- 4. Mise à jour de la procédure purchase_lead de secours
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
  -- A. Authentification
  v_caller_role := current_setting('request.jwt.claim.role', true);
  v_caller_uid := auth.uid();

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

  -- B. Verrouillage ordonné
  SELECT * INTO v_partner FROM public.partners WHERE id = p_partner_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Partenaire introuvable');
  END IF;

  SELECT * INTO v_lead FROM public.leads WHERE id = p_lead_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Dossier introuvable');
  END IF;

  IF v_lead.marketplace_status != 'available' THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error', 'Ce dossier n''est pas disponible à l''achat (statut: ' || v_lead.marketplace_status || ')'
    );
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.lead_purchases 
    WHERE lead_id = p_lead_id AND partner_id = p_partner_id
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Vous avez déjà débloqué ce dossier');
  END IF;

  -- B2B : 1 place | B2C : 3 places
  v_max_slots := CASE WHEN v_lead.segment = 'B2C' THEN 3 ELSE 1 END;
  -- Barème V2 standard : B2C = 3, B2B = 9
  v_cost := COALESCE(v_lead.credit_cost, CASE WHEN v_lead.segment = 'B2C' THEN 3 ELSE 9 END);

  IF v_cost <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Tarif du dossier invalide');
  END IF;

  SELECT COUNT(*) INTO v_purchases_count FROM public.lead_purchases WHERE lead_id = p_lead_id;
  IF v_purchases_count >= v_max_slots THEN
    UPDATE public.leads SET marketplace_status = 'sold_out' WHERE id = p_lead_id;
    RETURN jsonb_build_object('success', false, 'error', 'Plus de places disponibles pour ce dossier');
  END IF;

  IF v_partner.credits < v_cost THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error', 'Crédits insuffisants', 
      'required', v_cost, 
      'available', v_partner.credits
    );
  END IF;

  UPDATE public.partners 
     SET credits = credits - v_cost, updated_at = NOW() 
   WHERE id = p_partner_id;

  INSERT INTO public.lead_purchases (lead_id, partner_id, credits_spent)
  VALUES (p_lead_id, p_partner_id, v_cost);

  INSERT INTO public.credit_transactions (partner_id, amount, type, reference)
  VALUES (p_partner_id, -v_cost, 'purchase', 'lead:' || p_lead_id::text);

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

-- 5. Procédure atomique de remboursement de litige (Garantie Remplacement)
CREATE OR REPLACE FUNCTION public.refund_lead_dispute(
  p_dispute_id uuid,
  p_admin_email text,
  p_admin_notes text DEFAULT NULL,
  p_refund_credits integer DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_dispute record;
  v_purchase record;
  v_partner record;
  v_credits_to_refund integer;
  v_new_balance integer;
BEGIN
  -- 1. Verrouiller la réclamation
  SELECT * INTO v_dispute
    FROM public.lead_disputes
   WHERE id = p_dispute_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'DISPUTE_NOT_FOUND: Réclamation introuvable.';
  END IF;

  IF v_dispute.status <> 'pending' THEN
    RETURN jsonb_build_object(
      'success', false,
      'already_resolved', true,
      'status', v_dispute.status,
      'message', 'Cette réclamation a déjà été traitée.'
    );
  END IF;

  -- 2. Récupérer l'achat pour obtenir le coût réellement débité
  SELECT * INTO v_purchase
    FROM public.lead_purchases
   WHERE id = v_dispute.purchase_id;

  -- Restitution exacte de credits_spent (ou valeur admin explicite, ou 0 si lead offert)
  v_credits_to_refund := COALESCE(p_refund_credits, v_purchase.credits_spent, 0);

  -- 3. Si crédits > 0, recréditer le partenaire atomiquement
  IF v_credits_to_refund > 0 THEN
    UPDATE public.partners
       SET credits = credits + v_credits_to_refund,
           updated_at = now()
     WHERE id = v_dispute.partner_id
     RETURNING credits INTO v_new_balance;

    INSERT INTO public.credit_transactions (
      partner_id, amount, type, reference, created_at
    ) VALUES (
      v_dispute.partner_id,
      v_credits_to_refund,
      'refund',
      'Garantie Lead Conforme - Réclamation #' || substr(p_dispute_id::text, 1, 8),
      now()
    );
  ELSE
    SELECT credits INTO v_new_balance FROM public.partners WHERE id = v_dispute.partner_id;
  END IF;

  -- 4. Clôturer la réclamation
  UPDATE public.lead_disputes
     SET status = 'approved',
         credits_refunded = v_credits_to_refund,
         admin_notes = COALESCE(p_admin_notes, admin_notes),
         resolved_at = now()
   WHERE id = p_dispute_id;

  RETURN jsonb_build_object(
    'success', true,
    'already_resolved', false,
    'credits_refunded', v_credits_to_refund,
    'new_balance', v_new_balance
  );
END;
$$;

-- 6. Permissions de sécurité
REVOKE ALL ON FUNCTION public.purchase_marketplace_lead(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.purchase_marketplace_lead(uuid, uuid) TO service_role;

REVOKE ALL ON FUNCTION public.purchase_lead(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.purchase_lead(uuid, uuid) TO service_role;

REVOKE ALL ON FUNCTION public.refund_lead_dispute(uuid, text, text, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.refund_lead_dispute(uuid, text, text, integer) TO service_role;

COMMIT;

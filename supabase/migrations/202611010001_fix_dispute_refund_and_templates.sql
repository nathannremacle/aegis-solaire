-- =============================================================================
-- MIGRATION : Correction atomique refund_lead_dispute & Anonymisation Templates
-- =============================================================================

BEGIN;

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

  -- 4. Mettre à jour le statut du lead sur la Marketplace selon le motif
  IF v_dispute.reason IN ('wrong_number', 'already_equipped') THEN
    UPDATE public.leads
       SET marketplace_status = 'archived',
           status = 'lost'
     WHERE id = v_dispute.lead_id;
  ELSIF v_dispute.reason = 'out_of_scope' THEN
    UPDATE public.leads
       SET marketplace_status = 'available'
     WHERE id = v_dispute.lead_id
       AND marketplace_status = 'sold_out';
  END IF;

  -- 5. Clôturer la réclamation
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

REVOKE ALL ON FUNCTION public.refund_lead_dispute(uuid, text, text, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.refund_lead_dispute(uuid, text, text, integer) TO service_role;

COMMIT;


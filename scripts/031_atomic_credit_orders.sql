-- Apply after 030, before deploying the application. All changes are transactional.
BEGIN;

-- Do not silently merge existing duplicate payment IDs: investigate if this fails.
CREATE UNIQUE INDEX IF NOT EXISTS credit_orders_payment_id_unique
  ON public.credit_orders(payment_id) WHERE payment_id IS NOT NULL;

-- Partners must not be able to forge orders or reset a paid order via PostgREST.
DROP POLICY IF EXISTS credit_orders_insert ON public.credit_orders;
DROP POLICY IF EXISTS credit_orders_update ON public.credit_orders;
DROP POLICY IF EXISTS credit_orders_select ON public.credit_orders;
REVOKE INSERT, UPDATE, DELETE ON public.credit_orders FROM anon, authenticated;
CREATE POLICY credit_orders_select ON public.credit_orders
  FOR SELECT TO authenticated USING (partner_id = public.current_partner_id());

CREATE OR REPLACE FUNCTION public.settle_credit_order(
  p_order_id uuid,
  p_provider text,
  p_payment_id text DEFAULT NULL,
  p_amount numeric DEFAULT NULL,
  p_currency text DEFAULT NULL,
  p_notes text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_order public.credit_orders%ROWTYPE;
  v_balance integer;
BEGIN
  SELECT * INTO v_order FROM public.credit_orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Order not found'; END IF;
  IF p_provider IS NULL OR p_provider NOT IN ('bank_transfer', 'mollie') THEN
    RAISE EXCEPTION 'Invalid provider';
  END IF;
  IF p_provider = 'mollie' THEN
    IF p_payment_id IS NULL OR p_payment_id = '' OR p_amount IS DISTINCT FROM v_order.price_ttc
       OR p_currency IS DISTINCT FROM 'EUR' THEN
      RAISE EXCEPTION 'Payment does not match order';
    END IF;
    IF v_order.payment_id IS NOT NULL AND v_order.payment_id <> p_payment_id THEN
      RAISE EXCEPTION 'Payment ID does not match order';
    END IF;
  END IF;
  IF v_order.status = 'paid' THEN
    SELECT credits INTO v_balance FROM public.partners WHERE id = v_order.partner_id;
    RETURN jsonb_build_object('alreadyPaid', true, 'newCredits', v_balance);
  END IF;
  IF v_order.status <> 'pending' OR v_order.credits <= 0 THEN
    RAISE EXCEPTION 'Order is not payable';
  END IF;

  -- This update, the ledger entry and the order transition commit together.
  UPDATE public.partners SET credits = credits + v_order.credits, updated_at = now()
    WHERE id = v_order.partner_id RETURNING credits INTO v_balance;
  IF NOT FOUND THEN RAISE EXCEPTION 'Partner not found'; END IF;
  INSERT INTO public.credit_transactions(partner_id, amount, type, reference)
    VALUES (v_order.partner_id, v_order.credits, 'topup', 'order:' || v_order.id::text);
  UPDATE public.credit_orders SET status = 'paid', validated_at = now(),
    payment_provider = p_provider, payment_id = COALESCE(p_payment_id, payment_id),
    notes = COALESCE(p_notes, notes) WHERE id = v_order.id;
  RETURN jsonb_build_object('alreadyPaid', false, 'newCredits', v_balance);
END;
$$;

CREATE OR REPLACE FUNCTION public.cancel_credit_order(p_order_id uuid, p_notes text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_status text;
BEGIN
  SELECT status INTO v_status FROM public.credit_orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Order not found'; END IF;
  IF v_status = 'paid' THEN RAISE EXCEPTION 'Paid orders cannot be cancelled'; END IF;
  IF v_status = 'cancelled' THEN RETURN jsonb_build_object('alreadyCancelled', true); END IF;
  IF v_status <> 'pending' THEN RAISE EXCEPTION 'Order cannot be cancelled'; END IF;
  UPDATE public.credit_orders SET status = 'cancelled', notes = COALESCE(p_notes, notes)
    WHERE id = p_order_id;
  RETURN jsonb_build_object('alreadyCancelled', false);
END;
$$;

REVOKE ALL ON FUNCTION public.settle_credit_order(uuid,text,text,numeric,text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.settle_credit_order(uuid,text,text,numeric,text,text) TO service_role;
REVOKE ALL ON FUNCTION public.cancel_credit_order(uuid,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_credit_order(uuid,text) TO service_role;
COMMIT;

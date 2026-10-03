CREATE TABLE public.payment_email_receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gmail_message_id text NOT NULL UNIQUE,
  amount_cents integer NOT NULL CHECK (amount_cents > 0),
  sender text NOT NULL,
  received_at timestamptz NOT NULL,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.payment_email_receipts TO service_role;
ALTER TABLE public.payment_email_receipts ENABLE ROW LEVEL SECURITY;
CREATE INDEX payment_email_receipts_received_at_idx ON public.payment_email_receipts (received_at DESC);
CREATE INDEX payment_email_receipts_order_id_idx ON public.payment_email_receipts (order_id);
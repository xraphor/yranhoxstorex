CREATE POLICY "Service role manages payment email receipts"
ON public.payment_email_receipts
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
-- Якорь календарного биллинга (день месяца первой оплаты)
ALTER TABLE core.subscriptions
  ADD COLUMN IF NOT EXISTS billing_anchor_day SMALLINT;

COMMENT ON COLUMN core.subscriptions.billing_anchor_day IS
  '1–31, день месяца первой успешной оплаты; NULL пока trial';

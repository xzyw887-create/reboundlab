-- Сократить активный trial до 1 суток от регистрации (разовая правка после смены политики)

UPDATE core.subscriptions s
SET expires_at = u.created_at + INTERVAL '1 day'
FROM core.users u
WHERE s.user_id = u.id
  AND s.plan_id IN (SELECT id FROM core.plans WHERE tier = 'trial')
  AND s.expires_at IS NOT NULL
  AND s.expires_at > u.created_at + INTERVAL '1 day';

UPDATE core.plans
SET features = jsonb_set(
  COALESCE(features, '{}'::jsonb),
  '{trial_days}',
  '1'::jsonb,
  true
)
WHERE tier = 'trial';
